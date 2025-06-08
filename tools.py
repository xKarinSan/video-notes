"""
Tools:
- extract content
- save content
- upload content to docs/notion
- content records
"""
import time
import os
import tempfile
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

import yt_dlp
import imageio_ffmpeg
from openai import OpenAI

from models import VideoInfo

from uuid import uuid4
import json



load_dotenv()

client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))
ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

def extractAudioText(url:str) -> Optional[VideoInfo]:
    """
    Get the text audio
    """
    start_time = time.time()
    # 1) download from youtube
    with tempfile.TemporaryDirectory() as tmp_dir:
        output_path = os.path.join(tmp_dir, "audio.%(ext)s")

        ydl_opts = {
            'ffmpeg_location': ffmpeg_path,
            'ffprobe_location': ffmpeg_path,
            'format': 'bestaudio/best',
            'outtmpl': output_path,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '64',
            }],
            'quiet': True,
        }
        try:
            extracted_time = datetime.now()
            # 2) extract the audio
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get("title", "Unknown Title")
                # ydl.download([url])

            audio_path = next(
                os.path.join(tmp_dir, f) for f in os.listdir(tmp_dir) if f.endswith(".mp3")
            )

            # 3) return the text
            with open(audio_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )

            contents = transcript.text
            end_time = time.time()
            print(f"Processing completed in {end_time-start_time}s")
            return VideoInfo(
                url=url,
                name=title,
                contents=contents,
                date_extracted=extracted_time.timestamp() * 1000
            )

        except Exception as e:
            end_time = time.time()
            print(f"Processing stopped in {end_time-start_time}s")
            print(f"Error processing video: {e}")
            return None


def saveDocs(video:VideoInfo) -> None:
    print("Saving transcript.....")
    transcript_id =  uuid4()
    metadata = video.model_dump()
    contents = metadata["contents"]
    metadata.pop("contents")
    
    with open(f"transcripts/{transcript_id}.txt","w") as f:
        f.write(contents)
    
    with open(f"metadata/{transcript_id}.json","w",encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print("Notes saved!")

