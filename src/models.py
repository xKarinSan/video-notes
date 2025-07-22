from pydantic import BaseModel


# Times

# for input
class VideoInfo(BaseModel):
    url: str
    name: str
    description: str
    date_extracted: float
    contents: str
    
    # the URL for the thumbnail
    thumbnail: str
    
    # when video is uploaded on yt
    date_uploaded: float
    
    # name of channel poster
    op_name: str
    
# for the cache
class VideoMetaData(BaseModel):
    url: str
    name: str
    description: str
    date_extracted: float
    
    # the URL for the thumbnail
    thumbnail: str
    
    # when video is uploaded on yt
    date_uploaded: float
    
    # name of channel poster
    op_name: str