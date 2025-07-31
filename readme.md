# 🎥 Video Notes Agent

**Automatically extract and summarize YouTube videos** using a Python-based agent powered by OpenAI's SDK.  
Perfect for learners, developers, and anyone who wants to **save time while learning from videos**.

---

## ✨ Key Features

- 🔍 Extracts metadata and full transcripts from YouTube videos  
- 📝 Generates multiple note types from video transcripts:
  - Summary  
  - Content Overview  
  - Explain Like I’m 12  
- 💾 Saves notes in both `.json` and `.txt` formats for fast local access  
- ⚡ Designed for **read-heavy** workflows — generate once, reuse anytime  
- ⚙️ Live demo available via [Bolt](https://video-notes-demo.netlify.app/) *(limited to one sample video)*

---

## ⚠️ Demo Limitations

The Bolt-based demo is a preview of the core experience:

- Currently supports a **single demo video only**  
- **Note type selection** is fixed *(custom options coming soon)*

---

## 🔮 Vision & Roadmap

- 🖥️ Develop into a full **desktop app** — distraction-free, browser-free, offline-friendly  
- 🧩 Stay **model-agnostic** — currently uses OpenAI, but easily swappable  
- 👐 Embrace **open source** — extensible, hackable, and built with the community

---

## 🛠 Tech Stack

- **Python** – main language  
- **OpenAI Agent SDK** – core logic and orchestration
- **Streamlit** – first prototype UI (might change in future) 
- **Bolt.new** – demo interface and landing  

---

## 📁 Project Structure *(coming soon)*

```
video-notes-agent/
│
├── data/         # Transcripts and generated notes
├── ui/           # Streamlit and Bolt UIs
├── utils/        # YouTube processing and helpers
├── models/       # Note generation logic
├── README.md
└── ...
```