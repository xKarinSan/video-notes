import { useState } from "react";
import { Video } from "../classes/Video";
import { toast } from "react-toastify";
type AddNewVideoProps = {
    onVideoAdded?: (video: Video) => void;
};

function AddNewVideo({ onVideoAdded }: AddNewVideoProps) {
    const [videoUrl, setVideoURL] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    async function addVideo() {
        try {
            setIsUploading(true);
            toast.info("Retrieving video data in progress ...", {
                theme: "dark",
            });

            const res = await window.api.getVideodata(videoUrl);

            setIsUploading(false);

            if (res) {
                onVideoAdded?.(res);
                toast.success("Video added!", {
                    theme: "dark",
                });
                return res;
            } else {
                toast.error("Video failed to add.", {
                    theme: "dark",
                });
                return null;
            }
        } catch (e) {
            setIsUploading(false);
            toast.error("Video failed to add.", {
                theme: "dark",
            });
            return null;
        }
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
                            onClick={() => addVideo()}
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
