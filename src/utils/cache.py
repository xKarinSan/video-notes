from typing import Optional, Tuple
from ..models import VideoMetaData, VideoInfo
from .time_tracker import time_counter
import os
import json
import dbm

class Cache:
    @time_counter
    def __init__(self):
        self._cache_path = "cache"
        self._transcripts_path = "./transcripts"
        self._metadata_path = "./metadata"
        self._summaries_path = "./summaries"
    
    @time_counter
    def get_video_metadata(self,url:str) -> Tuple[Optional[VideoInfo], Optional[str]]:
        video_id = self._get_videoid_from_url(url)
        if not video_id:
            return [None, None]
        
        transcript = self._get_transcript(video_id)
        metadata = self._get_metadata(video_id)

        if (not transcript or not metadata) or (not transcript and not metadata):
            return [None, None]
        
        video_info = VideoInfo(
            url=url,
            date_extracted=metadata.date_extracted,
            name=metadata.name,
            contents=transcript
        )
        
        return [video_info, video_id]
    
    @time_counter
    def _get_videoid_from_url(self,url:str) -> Optional[str]:
        video_id = None
        with dbm.open(self._cache_path, 'c') as db:
            value = db.get(url,None)
            if value is not None:
                video_id = value.decode("utf-8")
        return video_id

    @time_counter
    def _get_transcript(self,video_id) -> Optional[str]:
        try:
            with open(f"{self._transcripts_path}/{video_id}.txt","r") as f:
                return f.read()
        except FileNotFoundError:
            return None
    @time_counter
    def _get_metadata(self,video_id) -> Optional[VideoMetaData]:
        try:
            with open(f"{self._metadata_path}/{video_id}.json","r") as f:
                data = json.load(f)
                if not data:
                    return None
                return VideoMetaData(**data)
        except FileNotFoundError:            
            return None
    
    
    @time_counter
    def save_video(self,video_id:str,video_info:VideoInfo) -> None:
        url = video_info.url
        with dbm.open(self._cache_path , 'c') as db:
            db[url] = video_id
            
        metadata = video_info.model_dump()
        contents = metadata.pop("contents")
        
        # save in file
        os.makedirs(self._transcripts_path, exist_ok=True)
        with open(f"{self._transcripts_path}/{video_id}.txt","w") as f:
            f.write(contents)
            
        os.makedirs(self._metadata_path, exist_ok=True)
        with open(f"{self._metadata_path}/{video_id}.json","w",encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
            
    @time_counter
    def save_video_summary(self,video_id:str,video_summary:str) -> None:
        """
        caches the video summary
        """
        summary_path = os.path.join(self._summaries_path, f"{video_id}.txt")
        os.makedirs(self._summaries_path, exist_ok=True)
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write(video_summary)
            
    def get_video_summary(self,video_id:str) -> Optional[str]:
        """
        retrieves video summary from cache
        """
        summary_path = os.path.join(self._summaries_path, f"{video_id}.txt")
        if os.path.exists(summary_path):
            with open(summary_path, 'r', encoding='utf-8') as f:
                return f.read()
        return None