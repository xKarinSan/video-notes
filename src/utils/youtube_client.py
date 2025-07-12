import os
from dotenv import load_dotenv
from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi, FetchedTranscriptSnippet
from ..models import VideoMetaData
from datetime import datetime
from typing import Dict, Optional, Any, List


import json
import re

load_dotenv()


class YoutubeClient:
    def __init__(self):

        self.API_KEY = os.getenv("CLIENT_ID")
        self.client = build("youtube", "v3", developerKey=self.API_KEY)
        self.transcript_client = YouTubeTranscriptApi()

    def _extract_video_id(self, url: str):
        pattern = (
            r"(?:youtube\.com/(?:watch\?v=|embed/|v/)|youtu\.be/)([0-9A-Za-z_-]{11})"
        )
        match = re.search(pattern, url)
        if match:
            return match.group(1)
        else:
            return None

    def _process_transcript(
        self, raw_transcript: List[FetchedTranscriptSnippet]
    ) -> str:
        res = []
        for line in raw_transcript:
            res.append(line.text)

        return " ".join(res)

    def extract_video_data(self, url: str) -> Optional[Dict[str, Any]]:
        try:
            query_date = datetime.now()
            # returns metadata video transcript
            video_id = self._extract_video_id(url)
            if not video_id:
                return None
            response = (
                self.client.videos()
                .list(part="snippet,contentDetails,statistics", id=video_id)
                .execute()
            )
            if "items" not in response:
                return None
            response_contents = response["items"]
            video_metadata = VideoMetaData(
                url=url,
                name=response_contents[0]["snippet"]["localized"]["title"],
                description=response_contents[0]["snippet"]["localized"]["description"],
                date_extracted=query_date.timestamp() * 1000,
            )

            raw_video_transcript = self.transcript_client.fetch(video_id)
            # print("raw_video_transcript\n", raw_video_transcript)
            json_video_transcript = raw_video_transcript.to_raw_data()
            text_video_transcipt = self._process_transcript(raw_video_transcript)
            # print("text_video_transcipt\n", text_video_transcipt)

            # print(
            #     f"type(video_metadata) in client: {type(video_metadata)}\n",
            #     video_metadata,
            # )
            return {
                "metadata": video_metadata,
                "json_transcript": json_video_transcript,
                "text_transcript": text_video_transcipt,
            }
        except Exception as e:

            # return error message in log
            print(e)
            return None


youtube_client = YoutubeClient()
if __name__ == "__main__":
    first_url = "https://www.youtube.com/watch?v=XbnSIsgv8nc"
    first_video_res = youtube_client.extract_video_data(first_url)
    print(first_video_res)
