"""
Tools:
- extract content
- save content
- upload content to docs/notion
- content records
"""
import os
import tempfile
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

from langchain_core.tools import tool
import yt_dlp
import imageio_ffmpeg
from openai import OpenAI

from models import VideoInfo

load_dotenv()

client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))
ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

def extractAudioText(url:str) -> Optional[VideoInfo]:
    """
    Get the text audio
    """
    
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
            return VideoInfo(
                url = url,
                name=title,
                contents = contents,
                date_extracted=datetime.now()
            )

        except Exception as e:
            print(f"Error processing video: {e}")
            return None
