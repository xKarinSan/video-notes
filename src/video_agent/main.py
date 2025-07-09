from agents import Agent, Runner
from .tools import download_video,check_video_saved

video_agent = Agent(
    name="Video Agent",
    instructions = """
    You are a helpful video agent. Based on the user's URL and intent, decide whether to:
    - download video
    - search a video based on URL
    
    Scenario(s):
    - user intends to download video: call download_video
    - user intends to get video info: call 
    
    
    IMPORTANT:
    - if the intent is vague, return an error message
    - if the user attempts to upload a video that already exists, return the metadata of the existing video
    - if the user attempts to search for a video that does not exist, return an error message
    """,
    model = "o3-mini",
    tools = [download_video, check_video_saved],
)

if __name__ == "main":
    command ="download from this youtube link"
    Runner.run_sync(video_agent,command)

