import streamlit as st


def card(video_name, video_url, parent=None):
    card_container = parent if parent else st.container(border=True)
    try:
        card_container.text(video_name)
        # card_container.divider()
        card_container.caption(video_url)
    except:
        return
