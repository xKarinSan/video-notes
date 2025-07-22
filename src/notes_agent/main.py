from agents import Agent, Runner

# from .tools import download_video, check_video_saved
from ..models import VideoInfo
from .tools import save_notes

notes_agent = Agent(
    name="Notes Agent",
    instructions="""
You are a helpful agent that generates and retrieves notes from video transcripts.

Your goal is to make sure the user always gets the notes they want.

---

Behavior:
1. Infer the note type from the user's prompt:
   - "summary" → mode = 0
   - "overview" → mode = 1
   - "explain like I'm 12" → mode = 2
   - If none are matched, default to mode = 0

2. Call `save_notes(video_info, mode, video_id)` to generate and store notes
3. Then return the output from `save_notes`
---

Important:
- Never attempt to download or fetch the video contents yourself.
- Assume any necessary video info will be available in the context or passed to the tools.
- Always return the output of the `save_notes` tool after notes are created.
- If `save_notes` returns a response with "done": true, return that response to the user and end the task.
""",
    model="o3-mini",
    tools=[save_notes],
)


if __name__ == "__main__":
    while True:
        command = input("What do you want? ")
        res = Runner.run_sync(notes_agent, command)
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
