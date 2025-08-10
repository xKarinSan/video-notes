import os
import sys
import asyncio
import time
import math
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from streamlit_player import st_player, _SUPPORTED_EVENTS
import streamlit as st
import pandas as pd
import json
from uuid import uuid4

# Project imports
from const import NOTES_CATEGORIES
from components.sidebar import sidebar
from agents import Agent, Runner, SQLiteSession, handoff
from src.main import main_agent
from src.video_agent.main import video_agent

st.set_page_config(layout="wide")
st.title("Video Notes")

selected_video_id = sidebar()
notes_col, chat_col = st.columns([3, 2.5], gap="medium")
existing_notes = []
# st.session_state0


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def format_seconds_to_hms(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def render_video_metadata(video_id):
    metadata_path = f"./user_data/metadata/{video_id}.json"
    if not os.path.exists(metadata_path):
        return None

    metadata = load_json(metadata_path)
    uploaded_date = datetime.fromtimestamp(metadata["date_uploaded"] / 1000).strftime(
        "%d-%m-%Y, %H:%M:%S"
    )

    defaults = {
        "current_second": 0,
        "hours": 0,
        "minutes": 0,
        "seconds": 0,
        "editing_time_manually": False,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value
    
    video_path = f"./user_data/videos/{video_id}.mp4"
    video_file = open(video_path, "rb")  # Replace "my_video.mp4" with your file path
    video_bytes = video_file.read()
    # st.video(video_bytes)


    with notes_col.expander(metadata["name"], expanded=False):
        options = {"events": _SUPPORTED_EVENTS, "progress_interval": 1000}
        player = st_player(metadata["url"], **options)
        st.video(video_bytes)

        # Update current time from video only if not editing manually
        if player and player.data and not st.session_state.editing_time_manually:
            new_time = math.floor(player.data["playedSeconds"])
            if new_time != st.session_state.current_second:
                st.session_state.current_second = new_time
                st.session_state.hours = new_time // 3600
                rem = new_time % 3600
                st.session_state.minutes = rem // 60
                st.session_state.seconds = rem % 60

        hour_col, min_col, sec_col = st.columns([1, 1, 1], gap="medium")
        with hour_col:
            input_hours = st.number_input(
                "Hours", min_value=0, value=st.session_state.hours, key="input_hours"
            )
        with min_col:
            input_minutes = st.number_input(
                "Minutes", min_value=0, max_value=59, value=st.session_state.minutes, key="input_minutes"
            )
        with sec_col:
            input_seconds = st.number_input(
                "Seconds", min_value=0, max_value=59, value=st.session_state.seconds, key="input_seconds"
            )

        total_seconds = input_seconds + 60 * input_minutes + 3600 * input_hours
        if total_seconds != st.session_state.current_second and total_seconds <= metadata["duration"]:
            st.session_state.editing_time_manually = True
            st.session_state.current_second = total_seconds
            st.session_state.hours = input_hours
            st.session_state.minutes = input_minutes
            st.session_state.seconds = input_seconds
        else:
            st.session_state.editing_time_manually = False

        hms_time = format_seconds_to_hms(st.session_state.current_second)
        st.text(f"Current video time: {hms_time}")

        name_col, upload_date_col = st.columns([1, 1], gap="medium")
        name_col.text(f"OP: {metadata['op_name']}")
        upload_date_col.text(f"Uploaded on: {uploaded_date}")

        if current_timestamp_notes := st.chat_input("Your notes here (current timestamp):"):
            timestamp_notes_root = f"./user_data/timestamp_notes/{video_id}/{st.session_state.current_second}_s"
            os.makedirs(timestamp_notes_root, exist_ok=True)
            notes_id = str(uuid4())
            with open(f"{timestamp_notes_root}/{notes_id}.txt", "w") as f:
                f.write(current_timestamp_notes)

        render_existing_timestamp_notes(video_id, st.session_state.current_second)

def render_existing_timestamp_notes(video_id, timestamp):
    # display the notes per timestamp contents
    rounded_timestamp = math.floor(timestamp)
    timestamp_notes_root = (
        f"./user_data/timestamp_notes/{video_id}/{rounded_timestamp}_s"
    )
    if not os.path.exists(timestamp_notes_root):
        return
    for _, _, files in os.walk(timestamp_notes_root):
        for file in files:
            timestamp_notes_id = file.replace(".txt", "")
            with st.container(border=True):
                timestamp_notes_txt_path = (
                    f"{timestamp_notes_root}/{timestamp_notes_id}.txt"
                )
                if os.path.exists(timestamp_notes_txt_path):
                    with open(timestamp_notes_txt_path, "r") as f:
                        st.write(f.read())


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
                st.text(
                    f"Generated on: {datetime.now().strftime('%d-%m-%Y, %H:%M:%S')}"
                )
                st.badge(NOTES_CATEGORIES[note_metadata["category"]])
                with st.expander("View Notes", expanded=False):
                    notes_txt_path = f"./user_data/results/{video_id}/{notes_id}.txt"
                    if os.path.exists(notes_txt_path):
                        with open(notes_txt_path, "r") as f:
                            st.write(f.read())


async def process_with_agent_system(prompt, chat_container):
    res = Runner.run_streamed(main_agent, prompt)
    last_tool_name = ""
    async for event in res.stream_events():
        if event.type == "agent_updated_stream_event":
            current_agent = event.new_agent.name

            handoff_msg = f"Handoff to **{current_agent}**"
            st.session_state.messages.append(
                {
                    "role": "agent",
                    "content": handoff_msg,
                }
            )
            chat_container.chat_message("agent").write(handoff_msg)

        elif event.type == "run_item_stream_event":
            if event.item.type == "tool_call_item":
                last_tool_name = event.item.raw_item.name
                tool_start_msg = f"Tool {last_tool_name} is starting"
                st.session_state.messages.append(
                    {
                        "role": "agent",
                        "content": tool_start_msg,
                    }
                )
                chat_container.chat_message("agent").write(tool_start_msg)

            elif event.item.type == "tool_call_output_item":
                tool_finish_msg = f"Tool {last_tool_name} is done"
                st.session_state.messages.append(
                    {
                        "role": "agent",
                        "content": tool_finish_msg,
                    }
                )
                chat_container.chat_message("agent").write(tool_finish_msg)

        elif event.type == "message_output_item":
            response += event.message.content
            st.session_state.messages.append(
                {
                    "role": "agent",
                    "content": response,
                }
            )
            chat_container.chat_message("agent").write(response)
    output = (
        res.final_output
        if res.last_agent.name != video_agent.name
        else "The video has been saved successfully."
    )
    # output = res.final_output
    st.session_state.messages.append({"role": "agent", "content": output})


def render_chat():
    if "messages" not in st.session_state:
        st.session_state.messages = []

    messages_container = st.container(height=500)

    for msg in st.session_state.messages:
        if msg.get("handoff"):
            messages_container.markdown(
                f"🔄 **Handoff:** Routed to **{msg['agent']}** for specialized assistance"
            )
        messages_container.chat_message(msg["role"]).write(msg["content"])

    if prompt := st.chat_input("Say something"):

        messages_container.chat_message("user").write(prompt)
        st.session_state.messages.append({"role": "user", "content": prompt})

        messages_container.chat_message("agent").write("Cooking in progress ...")
        st.session_state.messages.append(
            {"role": "agent", "content": "Cooking in progress ..."}
        )

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(process_with_agent_system(prompt, messages_container))
        loop.close()
        st.rerun()


with notes_col:
    st.header("Current video")
    if selected_video_id:
        render_video_metadata(selected_video_id)
        render_existing_notes(selected_video_id)

with chat_col:
    st.header("Agent chat")
    os.makedirs("./user_data/session", exist_ok=True)
    render_chat()
