from agents import Agent, Runner, handoff
from .tools import download_video
from ..models import VideoInfo
from ..notes_agent.main import notes_agent

# video_agent = Agent(
#     name="Video Agent",
#     instructions="""
# You are the video_agent. Your job is to extract metadata from a YouTube video URL.

# ✔️ Always:
# - Use `download_video` to fetch metadata
# - Return:
#   {
#     "video_info": <VideoInfo>,
#     "video_id": "<uuid>"
#   }

# 🔁 If the original user request (passed from main agent) includes any of:
#   "summarize", "summary", "notes", "overview", "explain"
# → Then you MUST hand off to `notes_agent`, passing the metadata as input.

# 🚫 Never:
# - Generate summaries or notes
# - Say anything to the user
# - Skip the handoff if summarization is requested

# Return an error if the input URL is invalid or download fails.
# """,
#     model="o3-mini",
#     tools=[download_video],
#     handoffs=[handoff(notes_agent)],
# )
video_agent = Agent(
    name="Video Agent",
    instructions="""
You are the `video_agent`. Your job is to download a YouTube video's metadata and return the `video_id`.

✔️ Always:
- Use the `download_video` tool FIRST to fetch metadata and return the `video_id`
- If the user asks for summarization (includes words like "summarize", "summary", "notes", "overview", "explain"):
    → You MUST hand off to the `notes_agent`, passing the `video_id` as input.

✔️ If no summarization is requested:
- Respond with:
    ✅ "Video processed successfully. ID: {video_id}"

✋ Never:
- Generate summaries or notes yourself
- Skip the `download_video` call
- Talk directly to the user without using the above logic

✔️ If handing off to `notes_agent`:
- First call `download_video` to get the `video_id`
- Then return:
    ✅ "Video processed. Now generating notes..."
    (Let the `notes_agent` do the rest)

Return an error if:
- The video cannot be downloaded
- The YouTube URL is invalid
""",
    model="o3-mini",
    tools=[download_video],
    handoffs=[handoff(notes_agent)],
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
        continue_running = (
            input("Continue?(Y to continue, anything else to stop) ").lower() == "y"
        )
        if not continue_running:
            break
