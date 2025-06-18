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
        graph_builder.add_node("extract_video_content", self.run_extraction)
        graph_builder.add_node("save_notes",self.save_notes)

        graph_builder.add_edge(START, "extract_video_content")
        graph_builder.add_edge("extract_video_content", "save_notes")
        graph_builder.add_edge("save_notes", END)
        return graph_builder.compile()
    

    def run_extraction(self,state: State) -> State:
        url = state["input"]
        res = self.tools.extract_video_info(url)
        
        return {"input": url, "video_info": res["video_info"], "video_id": res["video_id"]}

    def save_notes(self,state:State) -> None:
        video_metadata = state["video_info"]
        mode = state["mode"]
        self.tools.save_notes(video_metadata,mode,state["video_id"])
        

    def run(self,url:str,mode:int) -> State:
        
        return self.workflow.invoke({"input": url,"mode":mode})

