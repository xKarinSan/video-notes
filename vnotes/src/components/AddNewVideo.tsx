import { useState } from "react";
import { Video } from "../classes/Video";
import { toast } from "react-toastify";
type AddNewVideoProps = {
    onVideoAdded?: (video: Video) => void;
};

function AddNewVideo({ onVideoAdded }: AddNewVideoProps) {
    const [videoUrl, setVideoURL] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    async function addYoutubeVideo() {
        try {
            toast.info("Video uploading in progress...")
            setIsUploading(true);
            const res = await window.api.addYoutubeVideo(videoUrl);
            if (res) {
                const { videoMetadata, existingVideo } = res;
                if (existingVideo) {
                    toast.error("Video already exists!");
                } else {
                    onVideoAdded?.(videoMetadata);
                    setVideoURL("");
                    toast.success("Video added!");
                }
                return videoMetadata;
            } else {
                throw new Error("Video failed to add");
            }
        } catch (e) {
            toast.error(e);
        }
        finally{
            setIsUploading(false)
        }
    }

    async function uploadVideoFile()
    {
        // Check if the video file is there
        // If not there, toast.error -> No valid files found
        // call the IPC endpoint to upload the video
        // if successful then toast.success , else throw error

    }

    function handleFileUpload()
    {
        // get the input from the video file
    }

    return (
        <div>
            <div className="card bg-base-300 w-96 shadow-sm m-auto ">
                <div className="card-body">
                    <h2 className="card-title">Add New Video</h2>
                    <p>
                        <input
                            type="text"
                            placeholder="Type here"
                            className="input w-full"
                            onChange={(e) => setVideoURL(e.target.value)}
                            value={videoUrl}
                        />
                        <button
                            className={"btn bg-blue-700 m-auto w-full mt-2"}
                            onClick={() => addYoutubeVideo()}
                            disabled={isUploading}
                        >
                            {isUploading ? "Adding..." : "Add Video"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AddNewVideo;
