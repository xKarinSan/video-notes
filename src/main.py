from agents import Agent, Runner, SQLiteSession
from src.notes_agent.main import notes_agent
from src.video_agent.main import video_agent
import os

main_agent = Agent(
    name="Main agent",
    instructions="""
You are the central controller. Your job is to decide whether to delegate a task to the `video_agent` or the `notes_agent`.

You do NOT have access to any tools yourself.

❌ You MUST NOT call any tool directly (e.g., download_video, summarise_all_chunks).
✅ You may ONLY delegate to one of the two agents: `video_agent` or `notes_agent`.

You must follow the rules in the handoff_description exactly and never improvise, guess, or act on your own.
""",
    model="gpt-4",
    handoffs=[video_agent, notes_agent],
    handoff_description="""
Follow these strict rules:

1. If input includes phrases like:
   - "save this video", "store this video", "record this video", "keep a record", etc.
   AND does NOT mention:
   - "notes", "summary", "overview", "explain"
→ Call `video_agent` only. Do NOT call `notes_agent`.

2. If input includes any of:
   - "notes", "summary", "overview", "explain"
→ First call `video_agent`, extract `video_info` and `video_id`. Then call `notes_agent` with those values.

3. If unclear or missing video URL → Ask for clarification.

Examples:
- "Save this video" → ✅ `video_agent`
- "Give me a summary" → ✅ `video_agent` → `notes_agent`
- "Just store the video" → ✅ `video_agent`
- "Explain this video" → ✅ `video_agent` → `notes_agent`

Handoff rules:
- Only one agent per step.
- Only call `notes_agent` if both `video_info` and `video_id` are available.
- Always return final output to the user.
- Never assume, guess, or infer — follow input words exactly.
    """,
)


def is_save_only(command: str) -> bool:
    command = command.lower()
    return any(
        x in command
        for x in [
            "save the video",
            "save this video",
            "keep a record",
            "record this video",
            "store this video",
            "keep this video",
        ]
    ) and not any(x in command for x in ["notes", "summary", "overview", "explain"])


if __name__ == "__main__":
    os.makedirs("./user_data/session", exist_ok=True)
    session = SQLiteSession("userSession", "./user_data/session/chat.db")
    print("Heres the main agent")
    while True:
        command = input("User: ")
        if not command:
            break
        print("Agent: Cooking in progress ...")
        # if is_save_only(command):
        #     res = Runner.run_sync(video_agent, command, session=session)
        # else:
        #     res = Runner.run_sync(main_agent, command, session=session)
        res = Runner.run_sync(main_agent, command, session=session)
        res_contents = res.final_output
        print("Agent: ", res_contents)
