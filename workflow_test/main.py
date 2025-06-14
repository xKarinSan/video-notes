from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langchain.chat_models import init_chat_model
from state import State

# import os
load_dotenv()

llm = init_chat_model("o3-mini")

def run_extraction(state: State) -> State:
    from tools import extract_audio_text
    url = state["input"]
    res = extract_audio_text(url)
    
    return {"input": url, "video_info": res}

def save_notes(state:State) -> State:
    from tools import save_docs
    video_metadata = state["video_info"]
    save_docs(video_metadata)
    return {}

graph_builder = StateGraph(State)

graph_builder.add_node("extract_audio_text", run_extraction)
graph_builder.add_node("save_video_data", save_notes)

graph_builder.add_edge(START, "extract_audio_text")
graph_builder.add_edge("extract_audio_text", "save_video_data")
graph_builder.add_edge("save_video_data", END)

graph = graph_builder.compile()

image_data = graph.get_graph().draw_mermaid_png()
with open("graph_diagram.png", "wb") as f:
    f.write(image_data)
    

if __name__ == "__main__":
    url = input("Copy and paste a youtube video URL here:")
    result = graph.invoke({"input": url})
