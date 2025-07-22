import streamlit as st
import pandas as pd
import os
import json
from components.cards import card
from components.sidebar import sidebar

st.set_page_config(layout="wide")
st.title("Video Notes")

ans = sidebar()
st.write(ans)

notes_col, chat_col = st.columns([3,2.5], gap="medium")


# with videos_col:
#     st.header("Saved Videos")
#     # render the list of videos (file directories)

#     filelist = []
#     for root, dirs, files in os.walk("./user_data/metadata"):
#         for file in files:
#             video_id = file.split()
#             filename = os.path.join(root, file)
#             with open(filename) as f:
#                 d = json.load(f)
#                 card(d["name"], d["url"])
                
                
with notes_col:
    st.header("Video info")
    # add a box to show the metadata of a current video
    st.image("https://static.streamlit.io/examples/dog.jpg")

with chat_col:
    st.header("Agent chat")
    # add a chat component
    st.image("https://static.streamlit.io/examples/owl.jpg")
