"""
Tools:
- extract content
- save content
- upload content to docs/notion
- content records
"""
from langchain_core.tools import tool
import yt_dlp
import tempfile
from openai import OpenAI
import os
import imageio_ffmpeg
from dotenv import load_dotenv
load_dotenv()

client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))
ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

@tool
async def extractAudioText(url:str) -> str:
    """
    Get the text audio
    """
    
    # 1) download from youtube
    with tempfile.TemporaryDirectory() as tmp_dir:
        output_path = os.path.join(tmp_dir, "audio.%(ext)s")

        ydl_opts = {
            'ffmpeg_location': ffmpeg_path,
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
                ydl.download([url])

            audio_path = next(
                os.path.join(tmp_dir, f) for f in os.listdir(tmp_dir) if f.endswith(".mp3")
            )

            # 3) return the text
            with open(audio_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )

            return transcript.text

        except Exception as e:
            return f"Error processing video: {str(e)}"




tools = [extractAudioText]