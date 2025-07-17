from agents import Agent, Runner
from .tools import download_video, check_video_saved
from ..models import VideoInfo

video_agent = Agent(
    name="Video Agent",
    instructions="""
    You are a helpful video agent. Based on the user's URL and intent, decide whether to:
    - download video
    - search a video based on URL
    
    Scenario(s):
    - user intends to download video: call download_video
    - user intends to get video info: call check_video_saved

    IMPORTANT:
    - if the intent is vague, return an error message
    - if the user attempts to upload a video that already exists, return the metadata of the existing video
    - if the user attempts to search for a video that does not exist, return an error message
    """,
    model="o3-mini",
    tools=[download_video, check_video_saved],
)

if __name__ == "__main__":
    while True:
        command = input("What do you want? ")
        res = Runner.run_sync(video_agent, command)
        res_contents = res.final_output

        # format output
        if isinstance(res_contents, bool):
            print(f"Video {'exists' if res_contents else 'does not exist'}")
        elif isinstance(res_contents, list) and isinstance(res[0], VideoInfo):
            print(f"Contents saved here: video_id = {res_contents[1]}")
        elif res_contents is None or res_contents == [None, None]:
            print(f"Could not process video, please try again later")
        else:
            print(res_contents)
        continue_running = input("Continue?(Y to continue, anything else to stop) ").lower() == "y"
        if not continue_running:
            break
