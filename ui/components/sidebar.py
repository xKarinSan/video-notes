import streamlit as st
import os
import json

def sidebar():

    # part 1: video themselves
    name_to_id = {}
    item_bar = st.sidebar
    videoList = []

    for root, _, files in os.walk("./user_data/metadata"):
        for file in files:
            filename = os.path.join(root, file)
            video_id = file.strip(".json")
            with open(filename) as f:
                d = json.load(f)
                videoList.append((d["name"],d["date_extracted"]))
                name_to_id[d["name"]] = video_id
        
    videoList = [video[0] for video in sorted(videoList, key=lambda x: x[1], reverse=True)]

    videoList_display = ["-- Select a video --"] + videoList
    if "selected_video" not in st.session_state:
        st.session_state.selected_video = "-- Select a video --"

    if item_bar.button("Reset", type="primary"):
        st.session_state.selected_video = "-- Select a video --"

    selected_video = item_bar.radio(
        "Choose a saved video",
        videoList_display,
        key="selected_video",
    )

    if selected_video != "-- Select a video --":
        item_bar.write(f"Selected: {selected_video}")

    return name_to_id.get(selected_video, "")
