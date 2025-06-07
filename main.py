from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langchain.chat_models import init_chat_model
from state import State

# import os
load_dotenv()

llm = init_chat_model("o3-mini")

def run_extraction(state: State) -> State:
    from tools import extractAudioText  # Make sure it's defined as async def with @tool
    url = state["input"]
    res = extractAudioText(url)
    print(res)
    return {"input": url, "result": res}



graph_builder = StateGraph(State)

graph_builder.add_node("extract_audio_text", run_extraction)
graph_builder.add_edge(START, "extract_audio_text")
graph_builder.add_edge("extract_audio_text", END)

graph = graph_builder.compile()

image_data = graph.get_graph().draw_mermaid_png()
with open("graph_diagram.png", "wb") as f:
    f.write(image_data)

# url = "https://www.youtube.com/watch?v=XBuv4HHTRjI"
# result = graph.invoke({"input": url})
