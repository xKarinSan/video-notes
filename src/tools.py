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
from .models import VideoInfo
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from uuid import uuid4
import json


class Tools:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))
        self.ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    
    def extract_audio_text(self,url:str) -> Optional[VideoInfo]:
        """
        Get the text audio
        """
        start_time = time.time()
        # 1) download from youtube
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = os.path.join(tmp_dir, "audio.%(ext)s")

            ydl_opts = {
                'ffmpeg_location': self.ffmpeg_path,
                'ffprobe_location': self.ffmpeg_path,
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

                audio_path = next(
                    os.path.join(tmp_dir, f) for f in os.listdir(tmp_dir) if f.endswith(".mp3")
                )

                # 3) return the text
                with open(audio_path, "rb") as audio_file:
                    transcript = self.client.audio.transcriptions.create(
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

    def save_docs(self,video:VideoInfo) -> None:
        """
        save the video
        """
        print("Saving transcript.....")
        video_id =  str(uuid4())
        metadata = video.model_dump()
        contents = metadata["contents"]
        metadata.pop("contents")
        
        # add splitters
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", ".", " ", ""],
        )
        chunks = splitter.split_text(contents)
        
        
        # save in vector database
        embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        vector_store = Chroma(
            collection_name="raw_video_transcripts",
            embedding_function=embeddings,
            persist_directory="./chroma",  # Where to save data locally, remove if not necessary
        )
        
        documents = [
            Document(page_content=chunk, metadata={**metadata, "chunk_index": i, "total_chunks": len(chunks)})
            for i, chunk in enumerate(chunks)
        ]
        vector_store.add_documents(documents)
        
        # save in file
        os.makedirs("./transcripts", exist_ok=True)
        with open(f"./transcripts/{video_id}.txt","w") as f:
            f.write(contents)
            
        os.makedirs("./metadata", exist_ok=True)
        with open(f"./metadata/{video_id}.json","w",encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
                    
        print("Notes saved!")


