from agents import Agent, Runner, SQLiteSession, handoff
import tiktoken
from src.notes_agent.main import notes_agent
from src.video_agent.main import video_agent
import os

main_agent = Agent(
    name="Main agent",
    instructions="""
You are the main routing agent. You NEVER perform tasks directly.

✔️ You MUST:
- Always delegate video-related requests to `video_agent`
- NEVER summarize, explain, or process the video yourself

🚫 Do NOT call `notes_agent` yourself.
Let `video_agent` handle follow-up routing if needed.
""",
    model="gpt-4",
    handoffs=[handoff(video_agent)],
    handoff_description="""
🚨 ABSOLUTE RULE:
You are never allowed to generate notes, summaries, or explanations.
Only `notes_agent` is permitted to do that.

🔁 DELEGATION RULES:

1️⃣ If input includes phrases like:
   - "save this video", "store this video", "record this video", "keep a record"
   AND does NOT include:
   - "notes", "summary", "overview", "explain"
→ ✅ Call `video_agent` only  
→ ❌ DO NOT call `notes_agent`  
→ ❌ DO NOT summarize or explain anything

2️⃣ If input includes any of:
   - "notes", "summary", "overview", "explain"
→ ✅ First call `video_agent`  
→ ✅ Extract `video_info` and `video_id` from response  
→ ✅ Then call `notes_agent` with:
   {
     "video_info": <value>,
     "video_id": <value>
   }

→ ❌ NEVER summarize anything yourself  
→ ❌ NEVER skip calling `notes_agent` for summaries

3️⃣ If the input is unclear or missing a video URL:
→ Ask the user to clarify.

✅ EXAMPLES:

- "Save this video" → `video_agent` only  
- "Explain this video" → `video_agent`, then `notes_agent`  
- "Summarize this" → `video_agent`, then `notes_agent`  
- "I want a summary" → Ask for URL first  

⚠️ Handoff rules:
- One agent per step
- Only call `notes_agent` after `video_agent`
- Always return only the final agent's output
- Never guess or act on your own

""",
)


if __name__ == "__main__":
    os.makedirs("./user_data/session", exist_ok=True)
    session = SQLiteSession("userSession", "./user_data/session/chat.db")
    while True:
        command = input("User: ")        
        if not command:
            break
        
        current_agent = main_agent
        current_input = command

        while True:
            print("Main Agent: Cooking in progress ...")
            res = Runner.run_sync(current_agent, current_input)
            output = res.final_output
            # Final step, print and break
            print("Agent:", output)
            break
