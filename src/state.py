from typing import TypedDict, Optional
from .models import VideoInfo

class State(TypedDict):
    input: str
    text: str
    video_info: Optional[VideoInfo]
