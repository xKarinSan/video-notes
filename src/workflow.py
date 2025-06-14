from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from .state import State
from .tools import Tools


class Workflow:
    def __init__(self):
        load_dotenv()
        self.workflow = self.create_workflow()
        self.tools = Tools()
    
    def create_workflow(self):
        graph_builder = StateGraph(State)
        graph_builder.add_node("extract_audio_text", self.run_extraction)
        graph_builder.add_node("save_notes", self.save_notes)

        graph_builder.add_edge(START, "extract_audio_text")
        graph_builder.add_edge("extract_audio_text", "save_notes")
        graph_builder.add_edge("save_notes", END)
        return graph_builder.compile()
    

    def run_extraction(self,state: State) -> State:
        url = state["input"]
        res = self.tools.extract_audio_text(url)
        
        return {"input": url, "video_info": res}

    def save_notes(self,state:State) -> State:
        video_metadata = state["video_info"]
        self.tools.save_docs(video_metadata)
        return state

    def run(self,url:str) -> State:
        return self.workflow.invoke({"input": url})

