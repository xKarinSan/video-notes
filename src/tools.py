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
from .prompts import prompt_templates, summarise_chunk_prompt, combine_sumamries_prompt
from .utils.time_tracker import time_counter

from dotenv import load_dotenv

import yt_dlp
import imageio_ffmpeg
from openai import OpenAI
from .models import VideoInfo
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnableParallel,Runnable, RunnableLambda

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate

from uuid import uuid4
from typing import Any
from .utils.cache import Cache
from pydub import AudioSegment
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess


class Tools:
    @time_counter
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))
        self.langchain_client = ChatOpenAI(model="gpt-4", api_key=os.getenv("OPENAI_API_KEY"))
        self.ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        self.cache = Cache()
        
        self._results_path = "./results"
        
    @time_counter
    def extract_video_info(self,url:str) -> dict[Any]:
        """
        Get all the video info
        """
        # check the URL in the cache
        video_contents, doc_id = self.cache.get_video_metadata(url)
        if video_contents and doc_id:
            return {"video_info":video_contents,"video_id":doc_id}
        
        # get the video contents
        video_contents = self._extract_audio_text(url)
        doc_id = self._save_docs(video_contents)        
        return {"video_info":video_contents,"video_id":doc_id}
    
    @time_counter
    def _extract_audio_text(self,url:str) -> Optional[VideoInfo]:
        """
        Get the text audio
        """        
        # 1) download from youtube
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = os.path.join(tmp_dir, "audio.%(ext)s")

            ydl_opts = {
                'ffmpeg_location': self.ffmpeg_path,
                'ffprobe_location': self.ffmpeg_path,
                
                # Prefer m4a (fast and Whisper-compatible)
                'format': 'bestaudio[ext=m4a]/bestaudio/best',
                'outtmpl': output_path,
                'quiet': False,

                # Prefer highest quality audio
                'format_sort': ['abr', 'acodec'],
                'format_sort_order': 'desc',
                'extract_audio': True,
                
                # Performance tuning
                'concurrent_fragment_downloads': 32,
                'socket_timeout': 10,
                'http_chunk_size': 1048576 * 2,  # 1 MB
                'retries': 3,
                'fragment_retries': 3,
                
                # streaming optimisation
                'hls_use_mpegts': True,
                'hls_prefer_native': True,

                # Download speedup
                'external_downloader': 'aria2c',
                'external_downloader_args': ['-x', '32', '-k', '2M'],

                'noprogress': False,

                # Network
                'nocheckcertificate': True,
                'max_sleep_interval': 5,
                'min_sleep_interval': 1,
                'sleep_interval': 1,
                
            }

            # try:
            extracted_time = datetime.now()
            # 2) extract the audio
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get("title", "Unknown Title")

            audio_path = None
            for ext in ['.m4a', '.mp3']:
                files = [f for f in os.listdir(tmp_dir) if f.endswith(ext)]
                if files:
                    audio_path = os.path.join(tmp_dir, files[0])
                    break
            
            if not audio_path:
                print("Error: No audio file found in temporary directory")
                return None
    
            
            chunk_paths = self._chunk_audio_ffmpeg(audio_path)
            contents = self._transcribe_chunks(chunk_paths)
            video_contents = VideoInfo(
                url=url,
                name=title,
                contents=contents,
                date_extracted=extracted_time.timestamp() * 1000
            )
            
            return video_contents

            # except Exception as e:
            #     print(f"Error processing video: {e}")
            #     return None
    

    @time_counter
    def _chunk_audio_ffmpeg(self, audio_path, chunk_length_sec=60):
        temp_dir = tempfile.mkdtemp()
        output_pattern = os.path.join(temp_dir, "chunk_%03d.m4a")

        subprocess.run([
            self.ffmpeg_path,
            "-hide_banner",
            "-loglevel", "error",
            "-i", audio_path,
            "-f", "segment",
            "-segment_time", str(chunk_length_sec),
            "-c", "copy",
            output_pattern
        ], check=True)

        return sorted(Path(temp_dir).glob("chunk_*.m4a"))

    def _transcribe_chunks(self, chunk_paths):
        results = [None] * len(chunk_paths)

        def transcribe_file(path, index):
            with open(path, "rb") as f:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f
                )
            return index, transcript.text

        with ThreadPoolExecutor() as executor:
            futures = [
                executor.submit(transcribe_file, path, i)
                for i, path in enumerate(chunk_paths)
            ]

            for future in futures:
                index, text = future.result()
                results[index] = text

        return "\n".join(results)

    @time_counter
    def _save_docs(self,video:VideoInfo) -> str:
        """
        save the video
        """
        print("Saving transcript.....")
        
        video_id =  str(uuid4())
        self.cache.save_video(video_id,video)
        return video_id
    
    
    @time_counter
    def save_notes(self,video:VideoInfo,mode:int,video_id:str) -> None:
        """
        generate notes based on the prompts; user chooses the mode and then trigger the prompt template  
        """
        if not mode:
            mode = 0
        contents = video.contents
        
        video_summary = self.cache.get_video_summary(video_id)
        
        # check if there is a summary in the cache
        if not video_summary:
            # split further
            chunks = self._split_chunks(contents)
            summaries = self._summarise_all_chunks(chunks)
            video_summary = self._combine_summaries(summaries)
            # save the video summary in cache
            self.cache.save_video_summary(video_id, video_summary)
        
        
        mode = mode if mode in range(len(prompt_templates)) else 0
        current_template = PromptTemplate.from_template(prompt_templates[mode])
        chain = current_template | self.langchain_client
        res = chain.invoke({"content":video_summary})
        
        notes_id = str(uuid4())
        os.makedirs(self._results_path,exist_ok=True)
        with open(f"{self._results_path}/{notes_id}.txt","w") as f:
            f.write(res.content)
        print("Notes saved!")

    @time_counter
    def _split_chunks(self,original_content = str) -> list[str]:
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", ".", " ", ""],
        )
        return splitter.split_text(original_content)
    
    def _summarise_single_chunk(self,chunk:str) -> Runnable:
        summarise_chunk_template = PromptTemplate.from_template(summarise_chunk_prompt)
        chain = summarise_chunk_template | self.langchain_client
        return RunnableLambda(lambda x: chain.invoke({"chunk": chunk}).content)
    
    @time_counter
    def _summarise_all_chunks(self,chunks:list[str]) -> list[str]:
        parallel_chains = RunnableParallel(
            {
                f"chunk_{i}": self._summarise_single_chunk(chunk)
                for i, chunk in enumerate(chunks)
            }
        )
        results_dict = parallel_chains.invoke({})
        sorted_results = [results_dict[f"chunk_{i}"] for i in range(len(chunks))]
        return sorted_results
        
    @time_counter
    def _combine_summaries(self,summaries:list[str]) -> str:
        combine_template = PromptTemplate.from_template(combine_sumamries_prompt)
        chain = combine_template | self.langchain_client
        combined_summaries = chain.invoke({"summaries":"\n".join(summaries)})
        return combined_summaries.content