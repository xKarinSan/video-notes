from agents import function_tool

@function_tool
def download_video(url:str):
    """
    Takes in the youtube URL and download the video's metadata into the user's device
    """
    
    """
    1. check the cache (youtube URL).
     a) exists in cache? -> return the metadata
     b) does not exist in cache? go to step 2
    2. check if its a valid youtube URL (if no, return error)
    3. use the youtube API to download the video
    4. Extract the transcript WITH timestamps and metadata
    5. Save the youtube data (metadata and timestamps)
    6. Return the metadata
    """
    return {}



@function_tool
def check_video_saved(url:str) -> bool:
    """
    This is used to check if a video is present or not
    
    """
    return True
    