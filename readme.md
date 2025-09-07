# 🎥 VNotes
It aims to streamline video-learning for video-learners that have limited time and feel that AI summaries alone are insufficient.
**Watch. Snap. Replay. Learn.**
Perfect for learners, developers, and anyone who wants to **save time while learning from videos**.

---

## ✨ Key Features

- 🔍 Extracts metadata and full transcripts from YouTube videos  
- 📝 Generates multiple note types from video transcripts:
  - Summary
  - Content Overview (Coming soon)
  - Explain Like I’m 12 (Coming soon)
- 💾 Saves notes in both `.json` and `.txt` formats for fast local access  
- ⚡ Designed for **read-heavy** workflows — generate once, reuse anytime  
- Generates interactable timestamps: Notes and snapshots, both which can be clicked to replay.

---

## 🔮 Vision & Roadmap

- 🖥️ Develop into a full **desktop app** — distraction-free, browser-free, offline-friendly  
- 🧩 Stay **model-agnostic** — currently uses OpenAI, but easily swappable  
- 👐 Embrace **open source** — extensible, hackable, and built with the community
---

## 🛠 Tech Stack

- **Electron** – For the desktop app
- **Typescript** - For the UI logic and helper functions
- **React** - For the UI
- **Langchain** - For the AI summary portion (will be improved in future)

---

## 📁 Project Structure *General overview*
```
video-notes/
│
├── src/         # The actual agent
├── ui/           # Streamlit UI
├── vnotes/        # The main desktop app
├── README.md
```
