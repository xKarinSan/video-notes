import streamlit as st
import pandas as pd
import os
import json
from const import NOTES_CATEGORIES
from components.cards import card
from components.sidebar import sidebar
from datetime import datetime

st.set_page_config(layout="wide")
st.title("Video Notes")

selected_video_id = sidebar()
# st.write(selected_video_id)

notes_col, chat_col = st.columns([3, 2.5], gap="medium")
existing_notes = []

with notes_col:
    # retrieve the metadata from the container
    video_metadata = None
    if selected_video_id != "":
        with open(f"./user_data/metadata/{selected_video_id}.json") as f:
            video_metadata = json.load(f)

        if video_metadata:
            uploaded_date_dt = datetime.fromtimestamp(
                video_metadata["date_uploaded"] / 1000
            )
            uploaded_date_string = uploaded_date_dt.strftime("%d-%m-%Y, %H:%M:%S")
            curr_video_expander = notes_col.expander(video_metadata["name"],expanded=False)
            with curr_video_expander:
                st.image(video_metadata["thumbnail"])
                st.text(f"OP: {video_metadata["op_name"]}")
                st.text(f"Uploaded on: {uploaded_date_string}")
                st.link_button("Original Video", video_metadata["url"])

            for root, _, files in os.walk(
                f"./user_data/results_metadata/{selected_video_id}"
            ):
                for file in files:
                    filename = os.path.join(root, file)
                    notes_id = file.strip(".json")

                    with open(filename) as f:
                        note_metadata = json.load(f)
                        generated_date_dt = datetime.now()
                        generated_date_string = generated_date_dt.strftime(
                            "%d-%m-%Y, %H:%M:%S"
                        )

                        notes_container = notes_col.container(border=True)
                        existing_notes.append(notes_id)
                        notes_container.subheader(notes_id)
                        notes_container.text(f"Generated on: {generated_date_string}")
                        notes_container.badge(
                            NOTES_CATEGORIES[note_metadata["category"]]
                        )
                        with notes_container:
                            with st.expander("View Notes",expanded=False):
                                with open(
                                    f"./user_data/results/{selected_video_id}/{notes_id}.txt"
                                ) as f:
                                    content_lines = f.readlines()
                                    contents = ""
                                    for line in content_lines:
                                        contents += line
                                    st.write(contents)


with chat_col:
    st.header("Agent chat")
    # add a chat component
    st.image("https://static.streamlit.io/examples/owl.jpg")
