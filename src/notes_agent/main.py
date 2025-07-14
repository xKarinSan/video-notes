from agents import Agent, Runner

# from .tools import download_video, check_video_saved
from ..models import VideoInfo
from .tools import save_notes
from ..video_agent.tools import download_video

video_agent = Agent(
    name="Video Agent",
    instructions="""
You are a helpful agent that generates and retrieves notes from video transcripts.

Your goal is to make sure the user always gets the notes they want.

---

Behavior:

1. Get the video contents by calling download_video (DO NOT SKIP THIS STEP)

2. Infer the note type from the user's prompt:
   - "summary" → mode = 0
   - "overview" → mode = 1
   - "explain like I'm 12" → mode = 2
   - If none are matched, default to mode = 0

3. If notes already exist for the given video and mode:
   - Return the latest generated notes

4. If no notes exist for that video and mode:
   - First, run `save_notes(video_info, mode, video_id)` to generate and store notes
   - Then return the generated notes to the user

---

Important:
- Never generate notes directly in this agent.
- Always return the output of the `save_notes` tool after notes are created.
- If the `save_notes` tool returns a response with "done": true, return that response to the user and end the task.
""",
    model="o3-mini",
    tools=[save_notes, download_video],
)


print()

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
        continue_running = (
            input("Continue?(Y to continue, anything else to stop) ").lower() == "y"
        )
        if not continue_running:
            break
