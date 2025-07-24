"""
Tools:
- summarise based on:
 - explain like im 12
 - comprehensive notes
 - read

- retrieve summary based on video URL -> takes metadata
"""

from ..models import VideoInfo
from ..prompts import prompt_templates
from ..utils.cache import cache
from ..utils.chunking import split_chunks
from ..utils.summary import summarise_all_chunks, combine_summaries
from ..utils.client import langchain_client
from ..utils.const import RESULTS_PATH, RESULTS_METADATA_OATH
from agents import function_tool
from langchain_core.prompts import PromptTemplate
from uuid import uuid4
from datetime import datetime

import os
import json


@function_tool
def save_notes(video: VideoInfo, mode: int, video_id: str) -> dict:
    """
    generate notes based on the prompts; user chooses the mode and then trigger the prompt template
    """
    try:
        print("Saving notes ...")
        if not mode:
            mode = 0
        contents = video.contents

        # split further
        chunks = split_chunks(contents)
        summaries = summarise_all_chunks(chunks)
        video_summary = combine_summaries(summaries)
        # save the video summary in cache
        cache.save_video_summary(video_id, video_summary)

        mode = mode if mode in range(len(prompt_templates)) else 0
        current_template = PromptTemplate.from_template(prompt_templates[mode])
        chain = current_template | langchain_client
        res = chain.invoke({"content": video_summary})

        notes_id = str(uuid4())
        generated_date = datetime.now()
        os.makedirs(f"{RESULTS_PATH}/{video_id}/", exist_ok=True)
        res_notes = f"{RESULTS_PATH}/{video_id}/{notes_id}.txt"

        with open(res_notes, "w") as f:
            f.write(res.content)

        os.makedirs(f"{RESULTS_METADATA_OATH}/{video_id}/", exist_ok=True)
        with open(
            f"{RESULTS_METADATA_OATH}/{video_id}/{notes_id}.json", "w", encoding="utf-8"
        ) as f:
            notes_metadata = {
                "extracted_date": int(generated_date.timestamp()) * 1000,
                "category": mode,
            }
            json.dump(notes_metadata, f, indent=2, ensure_ascii=False)
        print({"notes_type": mode, "notes_path": res_notes})

        return {"video_name": video.name, "notes_type": mode, "notes_path": res_notes}

    except Exception as e:
        print("e", e)
        return {"video_name": None, "notes_type": None, "notes_path": None}
