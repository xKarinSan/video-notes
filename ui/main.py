import os
import sys
import asyncio
import time
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


import streamlit as st
import pandas as pd
import json

# Project imports
from const import NOTES_CATEGORIES
from components.cards import card
from components.sidebar import sidebar
from agents import Agent, Runner, SQLiteSession, handoff
from src.main import main_agent
from src.video_agent.main import video_agent

st.set_page_config(layout="wide")
st.title("Video Notes")

selected_video_id = sidebar()
notes_col, chat_col = st.columns([3, 2.5], gap="medium")
existing_notes = []


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)

def render_video_metadata(video_id):
    metadata_path = f"./user_data/metadata/{video_id}.json"
    if not os.path.exists(metadata_path):
        return None

    metadata = load_json(metadata_path)
    uploaded_date = datetime.fromtimestamp(metadata["date_uploaded"] / 1000).strftime("%d-%m-%Y, %H:%M:%S")
    
    with notes_col.expander(metadata["name"], expanded=False):
        st.image(metadata["thumbnail"])
        st.text(f"OP: {metadata['op_name']}")
        st.text(f"Uploaded on: {uploaded_date}")
        st.link_button("Original Video", metadata["url"])
    
    return metadata

def render_existing_notes(video_id):
    notes_root = f"./user_data/results_metadata/{video_id}"
    if not os.path.exists(notes_root):
        return

    for root, _, files in os.walk(notes_root):
        for file in files:
            note_path = os.path.join(root, file)
            notes_id = file.replace(".json", "")
            note_metadata = load_json(note_path)

            with notes_col.container(border=True):
                st.subheader(notes_id)
                st.text(f"Generated on: {datetime.now().strftime('%d-%m-%Y, %H:%M:%S')}")
                st.badge(NOTES_CATEGORIES[note_metadata["category"]])
                with st.expander("View Notes", expanded=False):
                    notes_txt_path = f"./user_data/results/{video_id}/{notes_id}.txt"
                    if os.path.exists(notes_txt_path):
                        with open(notes_txt_path, "r") as f:
                            st.write(f.read())

async def process_with_agent_system(prompt):
    try:
        return
    
    except Exception as e:
        return

def render_chat():
    if "messages" not in st.session_state:
        st.session_state.messages = []

    messages_container = st.container(height=500)

    for msg in st.session_state.messages:
        messages_container.chat_message(msg["role"]).write(msg["content"])

    if prompt := st.chat_input("Say something"):
        start_time = time.time()

        messages_container.chat_message("user").write(prompt)
        st.session_state.messages.append({"role": "user", "content": prompt})

        messages_container.chat_message("agent").write("Cooking in progress ...")
        st.session_state.messages.append(
            {"role": "agent", "content": "Cooking in progress ..."}
        )

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        result = loop.run_until_complete(Runner.run(main_agent, prompt))
        loop.close()

        output = (
            result.final_output
            if result.last_agent.name != video_agent.name
            else "The video has been saved successfully."
        )

        st.session_state.messages.append({"role": "agent", "content": output})
        messages_container.chat_message("agent").write(output)
        print(f"{time.time() - start_time:.4f}")
        st.rerun()

with notes_col:
    st.header("Current chat")
    if selected_video_id:
        metadata = render_video_metadata(selected_video_id)
        render_existing_notes(selected_video_id)

with chat_col:
    st.header("Agent chat")
    os.makedirs("./user_data/session", exist_ok=True)
    render_chat()
