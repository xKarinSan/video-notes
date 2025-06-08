from pydantic import BaseModel

class VideoInfo(BaseModel):
    url: str
    name: str
    date_extracted: float
    contents: str
    