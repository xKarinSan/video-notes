from agents import Agent, Runner, SQLiteSession
from src.notes_agent.main import notes_agent
from src.video_agent.main import video_agent
import os

main_agent = Agent(
    name="Main agent",
    instructions="""
You are the central controller. Your job is to decide whether to delegate a task to the `video_agent` or the `notes_agent`.

Your decision MUST follow strict rules. You are NOT allowed to make assumptions about what the user might want. Only respond based on the exact words they use.

---

🚦 DECISION LOGIC (STRICT RULES):

1. IF the user input contains a request to save or store the video,
   including phrases like:
   - "save the video"
   - "save a record"
   - "keep a record"
   - "store this video"
   - "keep this video"
   - "record this video"
   
   AND the input does NOT contain ANY of the following:
   - "notes", "summary", "overview", "explain"

   ✅ THEN (STRICTLY):
   - Call `video_agent` only.
   ❌ DO NOT call `notes_agent` in this case.
   ❌ DO NOT interpret phrases like "store this video", "keep a record", or "save the video" as a request for notes unless the words "notes", "summary", "overview", or "explain" are clearly stated.
   - This is critical. Calling `notes_agent` when not asked for notes is a violation of instructions.
   - Return the result and STOP.
   
   Example:
   User: "I just want to store the video"
    - ✅ Call video_agent only
    - ❌ Do not infer notes are needed
   

2. IF the input contains ANY of the following:
   - "notes"
   - "summary"
   - "overview"
   - "explain"

   ✅ THEN:
   → You MUST first call `video_agent`, even if you think the video is already processed or cached.
   → Wait for the response from `video_agent`, and extract:
      - `video_info`
      - `video_id`
   → Then call `notes_agent`, passing those values.
   ❌ You are NOT allowed to call `notes_agent` without getting the video data first.
   ❌ You are NOT allowed to guess, infer, or assume that the video info is available without calling `video_agent`.

   This is a critical rule.

3. If the user's intent is unclear or missing a video URL:
   → Politely ask the user to clarify.
   → Wait for their follow-up and continue based on the updated input.

---

❌ VIOLATION POLICY:

- DO NOT assume the user wants notes unless they say so.
- DO NOT call both agents unless rule #2 is triggered.
- Violating these rules is incorrect behavior.

---

✅ EXAMPLES:

✅ Correct:
User: "Save this video: https://youtu.be/abc123"
→ Call `video_agent` only

✅ Correct:
User: "Keep a record of this video: https://youtu.be/abc123"
→ Call `video_agent` only

✅ Correct:
User: "Give me a summary of this video: https://youtu.be/abc123"
→ Call `video_agent`, then call `notes_agent`

✅ Correct:
User: "Save this video and give me an overview"
→ Call `video_agent`, then call `notes_agent`

✅ Correct:
User: "I mean just save the video"
→ Call `video_agent` only

❌ Incorrect:
User: "Save this video: https://youtu.be/abc123"
→ Called `video_agent` and `notes_agent` ❌ Wrong. Notes not requested.

---

🔁 HANDOFF PROTOCOL:

- Only one agent per step.
- When calling `notes_agent`, make sure to pass:
   - `video_info` (from `video_agent`)
   - `video_id` (from `video_agent`)
- Always return the final output to the user.
""",
    model="gpt-3.5-turbo",
    handoffs=[video_agent, notes_agent],
)

def is_save_only(command: str) -> bool:
    command = command.lower()
    return (
        any(x in command for x in [
            "save the video", "save this video", "keep a record", "record this video",
            "store this video", "keep this video"
        ]) and
        not any(x in command for x in ["notes", "summary", "overview", "explain"])
    )
if __name__ == "__main__":
    os.makedirs("./user_data/session", exist_ok=True)
    session = SQLiteSession("userSession", "./user_data/session/chat.db")
    print("Heres the main agent")
    while True:
        command = input("User: ")
        if not command:
            break
        print("Agent: Cooking in progress ...")
        if is_save_only(command):
            res = Runner.run_sync(video_agent, command, session=session)
        else:
            res = Runner.run_sync(main_agent, command, session=session)
        res_contents = res.final_output
        print("Agent: ", res_contents)
