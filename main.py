from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langchain.chat_models import init_chat_model
from state import State

# import os
load_dotenv()

llm = init_chat_model("o3-mini")

def run_extraction(state: State) -> State:
    from tools import extractAudioText
    url = state["input"]
    res = extractAudioText(url)
    
    return {"input": url, "video_info": res}

def save_notes(state:State) -> State:
    from tools import saveDocs
    video_metadata = state["video_info"]
    saveDocs(video_metadata)
    return {}

graph_builder = StateGraph(State)

graph_builder.add_node("extract_audio_text", run_extraction)
graph_builder.add_node("upload_notes", save_notes)

graph_builder.add_edge(START, "extract_audio_text")
graph_builder.add_edge("extract_audio_text", "upload_notes")
graph_builder.add_edge("upload_notes", END)

graph = graph_builder.compile()

image_data = graph.get_graph().draw_mermaid_png()
with open("graph_diagram.png", "wb") as f:
    f.write(image_data)

url = "https://www.youtube.com/watch?v=6RMRPrjdpKM"
result = graph.invoke({"input": url})
