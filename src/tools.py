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
import json


class Tools:
    @time_counter
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))
        self.langchain_client = ChatOpenAI(model="gpt-4", api_key=os.getenv("OPENAI_API_KEY"))
        self.ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    
    @time_counter
    def extract_audio_text(self,url:str) -> Optional[VideoInfo]:
        """
        Get the text audio
        """
        # check if cache is present
        video_contents = None
        
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
                video_contents = VideoInfo(
                    url=url,
                    name=title,
                    contents=contents,
                    date_extracted=extracted_time.timestamp() * 1000
                )
                
                print("video_contents",video_contents)
                return video_contents

            except Exception as e:
                print(f"Error processing video: {e}")
                return None
            
    @time_counter
    def save_docs(self,video:VideoInfo) -> str:
        """
        save the video
        """
        print("Saving transcript.....")
        
        video_id =  str(uuid4())
        metadata = video.model_dump()
        contents = metadata["contents"]
        metadata.pop("contents")
        
        # save in file
        os.makedirs("./transcripts", exist_ok=True)
        with open(f"./transcripts/{video_id}.txt","w") as f:
            f.write(contents)
            
        os.makedirs("./metadata", exist_ok=True)
        with open(f"./metadata/{video_id}.json","w",encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        return video_id
    
    
    @time_counter
    def save_notes(self,video:VideoInfo,mode:int,video_id) -> None:
        """
        generate notes based on the prompts
        """
        
        """
        user chooses the mode and then trigger the prompt template
        """
        if not mode:
            mode = 0
        contents = video.contents
                
        #  split further
        chunks = self._split_chunks(contents)
        summaries = self._summarise_all_chunks(chunks)
        combined_summary = self._combine_summaries(summaries)
        
        mode = mode if mode in range(len(prompt_templates)) else 0
        
        current_template = PromptTemplate.from_template(prompt_templates[mode])
        chain = current_template | self.langchain_client

        res = chain.invoke({"content":combined_summary})
        
        os.makedirs("./results",exist_ok=True)
        with open(f"./results/{video_id}.txt","w") as f:
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
        return combined_summaries

