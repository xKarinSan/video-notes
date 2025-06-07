from pydantic import BaseModel
from datetime import datetime

class VideoInfo(BaseModel):
    url: str
    name: str
    date_extracted: datetime