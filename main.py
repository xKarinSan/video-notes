from dotenv import load_dotenv
from typing import Annotated, Literal
import asyncio
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from pydantic import BaseModel, Field

from langchain.agents import initialize_agent
from langchain.agents.agent_types import AgentType

from tools import tools
from state import State

# import os
load_dotenv()

llm = init_chat_model("o3-mini")

def run_extraction(state: State) -> State:
    from tools import extractAudioText  # Make sure it's defined as async def with @tool
    url = state["input"]
    text = asyncio.run(extractAudioText.arun(url))
    return {"input": url, "result": text}



graph_builder = StateGraph(State)

graph_builder.add_node("extract_audio_text", run_extraction)
graph_builder.set_entry_point("extract_audio_text")
graph_builder.add_edge("extract_audio_text", END)

graph = graph_builder.compile()


url = input("Enter YouTube URL: ")
result = graph.invoke({"input": url})
print(result["result"])