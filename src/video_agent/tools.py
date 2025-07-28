from agents import function_tool
from ..utils.cache import cache
from uuid import uuid4
from ..utils.youtube_client import youtube_client
from typing import Tuple
from ..models import VideoInfo


@function_tool
def download_video(url: str) -> str:
    """
    Takes in the youtube URL and download the video's metadata into the user's device and return the video id
    """

    """
    1. check the cache (youtube URL).
     a) exists in cache? -> return the metadata
     b) does not exist in cache? go to step 2
    2. check if its a valid youtube URL (if no, return error)
    3. use the youtube API to download the video
    4. Extract the transcript WITH timestamps and metadata
    5. Save the youtube data (metadata and timestamps)
    6. Return the video id
    """
    try:
        print("Video agent cooking")
        [video_info, video_id] = cache.get_video_metadata(url)
        if video_info and video_id:
            print("Video found!")
            # return [video_info, video_id]
            return video_id

        # check if valid URL (handled by YT client)
        extracted_video_contents = youtube_client.extract_video_data(url)
        if not extracted_video_contents:
            return None

        # video downloaded and all
        metadata = extracted_video_contents["metadata"]
        json_transcript = extracted_video_contents["json_transcript"]
        text_transcript = extracted_video_contents["text_transcript"]

        video_info = VideoInfo(
            url=metadata.url,
            name=metadata.name,
            description=metadata.description,
            date_extracted=metadata.date_extracted,
            contents=text_transcript,
            thumbnail=metadata.thumbnail,
            date_uploaded=metadata.date_uploaded,
            op_name=metadata.op_name,
            duration=metadata.duration,
        )
        video_id = str(uuid4())
        cache.save_video(video_id, video_info, json_transcript)
        return video_id

    except Exception as e:
        print("Failed to save!")
        print(e)
        return None

@function_tool
def check_video_saved(url: str) -> bool:
    """
    This is used to check if a video is present or not

    """
    [video_info, video_id] = cache.get_video_metadata(url)
    return video_info != None and video_id != None


if __name__ == "__main__":
    res = download_video("https://www.youtube.com/watch?v=MG6tuszAIT8")
    # print(res)
