from langchain_core.runnables import RunnableParallel,Runnable, RunnableLambda
from langchain_core.prompts import PromptTemplate
from ..prompts import prompt_templates, summarise_chunk_prompt, combine_sumamries_prompt
from .time_tracker import time_counter
from langchain_openai import ChatOpenAI
from .client import langchain_client

def summarise_single_chunk(chunk:str) -> Runnable:
    summarise_chunk_template = PromptTemplate.from_template(summarise_chunk_prompt)
    chain = summarise_chunk_template | langchain_client
    return RunnableLambda(lambda x: chain.invoke({"chunk": chunk}).content)

@time_counter
def summarise_all_chunks(chunks:list[str]) -> list[str]:
    
    parallel_chains = RunnableParallel(
        {
            f"chunk_{i}": summarise_single_chunk(chunk)
            for i, chunk in enumerate(chunks)
        }
    )
    results_dict = parallel_chains.invoke({})
    sorted_results = [results_dict[f"chunk_{i}"] for i in range(len(chunks))]
    return sorted_results

@time_counter
def combine_summaries(summaries:list[str]) -> str:
    combine_template = PromptTemplate.from_template(combine_sumamries_prompt)
    chain = combine_template | langchain_client
    combined_summaries = chain.invoke({"summaries":"\n".join(summaries)})
    return combined_summaries.content

