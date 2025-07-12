from pydantic import BaseModel


# Times

# for input
class VideoInfo(BaseModel):
    url: str
    name: str
    description: str
    date_extracted: float
    contents: str
    
# for the cache
class VideoMetaData(BaseModel):
    url: str
    name: str
    description: str
    date_extracted: float