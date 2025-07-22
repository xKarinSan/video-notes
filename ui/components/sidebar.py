import streamlit as st
import os
import json
from .cards import card


def sidebar():

    # part 1: video themselves
    item_bar = st.sidebar
    item_bar.header("Video notes")
    videoList = []

    for root, dirs, files in os.walk("./user_data/metadata"):
        for file in files:
            filename = os.path.join(root, file)
            print(file.strip(".json"))
            with open(filename) as f:
                d = json.load(f)
                videoList.append(d["name"])

    videoList_display = ["-- Select a video --"] + videoList
    if "selected_video" not in st.session_state:

        st.session_state.selected_video = "-- Select a video --"

    if st.button("Reset", type="primary"):
        st.session_state.selected_video = "-- Select a video --"
        st.experimental_rerun()

    selected_video = item_bar.radio(
        "Choose a saved video",
        videoList_display,
        key="selected_video",
    )

    if selected_video != "-- Select a video --":
        item_bar.write(f"Selected: {selected_video}")


    # part 2: the notes
