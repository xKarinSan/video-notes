import { useState, useRef, useEffect } from "react";
import { Video } from "../classes/Video";
import { toast } from "react-toastify";
type AddNewVideoProps = {
    onVideoAdded?: (video: Video) => void;
};

function AddNewVideo({ onVideoAdded }: AddNewVideoProps) {
    const [youtubeVideoUrl, setYoutubeVideoURL] = useState("");
    const [uploadedFileUrl, setUploadedFileUrl] = useState("");
    const [uploadedFileName, setUploadedFileName] = useState("");
    const [uploadedVideoThumbnailUrl, setUploadedVideoThumbnailUrl] =
        useState("");
    const [uploadVideoDuration, setUploadVideoDuration] = useState(-1);

    const [isUploading, setIsUploading] = useState(false);
    const fileUploadRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    async function addYoutubeVideo() {
        try {
            toast.info("Video uploading in progress...");
            setIsUploading(true);
            const res = await window.api.addYoutubeVideo(youtubeVideoUrl);
            console.log("addYoutubeVideo | res", res);
            if (res) {
                const { videoMetadata, existingVideo } = res;
                if (existingVideo) {
                    toast.error("Video already exists!");
                } else {
                    onVideoAdded?.(videoMetadata);
                    setYoutubeVideoURL("");
                    toast.success("Video added!");
                }
                return videoMetadata;
            } else {
                throw new Error("Video failed to add");
            }
        } catch (e) {
            console.log("addYoutubeVideo | e", e);
            toast.error(e);
        } finally {
            setIsUploading(false);
        }
    }

    function cancelUploadFile() {
        setUploadedFileUrl("");
        setUploadedFileName("");
        setUploadedVideoThumbnailUrl("");
        setUploadVideoDuration(-1);
        if (fileUploadRef.current) {
            fileUploadRef.current.value = "";
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.removeAttribute("src");
            videoRef.current.load();
        }
        toast.info("Cancelled");
    }

    async function uploadVideoFile() {
        // Check if the video file is there
        // If not there, toast.error -> No valid files found
        // call the IPC endpoint to upload the video
        // if successful then toast.success , else throw error
        if (!uploadedFileUrl) {
            toast.error("No valid video found.");
            return;
        }
        try {
            toast.info("Video uploading in progress...");
            setIsUploading(true);
            // just the metadata will do
            // thumbnail is also needed
            const res = await window.api.uploadVideoFile(
                uploadedFileUrl,
                uploadedFileName,
                uploadVideoDuration
            );
            console.log("uploadVideoFile | res", res);

            if (res) {
                const { videoMetadata } = res;
                videoMetadata.thumbnail = uploadedVideoThumbnailUrl;
                onVideoAdded?.(videoMetadata);
                setUploadedFileUrl("");
                setUploadedFileName("");
                setUploadedVideoThumbnailUrl("");
                if (fileUploadRef.current) {
                    fileUploadRef.current.value = "";
                }
                if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.removeAttribute("src");
                    videoRef.current.load();
                }
                toast.success("Video added!");
                return videoMetadata;
            } else {
                throw new Error("Video failed to add");
            }
        } catch (e) {
            console.log("uploadVideoFile | e", e);
            toast.error(e);
        } finally {
            setIsUploading(false);
        }
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        // get the input from the video file
        // get the temporary URL; turn it into binary cause smaller?
        const files = e.target?.files;

        if (files == null) return;
        const currentFile = files[0];
        const tempUrl = URL.createObjectURL(currentFile);
        setUploadedFileUrl(tempUrl);
        setUploadedFileName(currentFile.name);
        toast.success("File successfully uploaded!");
    }

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = async () => {
            console.log("Video duration:", video.duration);
            console.log("videoRef.current", videoRef.current);
            if (videoRef.current) {
                setUploadVideoDuration(videoRef.current.duration);
                const canvas: HTMLCanvasElement = document.createElement(
                    "canvas"
                ) as HTMLCanvasElement;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            console.error("toBlob failed");
                            return;
                        }
                        const url = URL.createObjectURL(blob);
                        setUploadedVideoThumbnailUrl(url);
                    },
                    "image/jpeg",
                    0.85
                );
                canvas.remove();
            }
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata);

        return () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };
    }, []);

    return (
        <div>
            <div className="card bg-base-300 w-96 shadow-sm m-auto ">
                <div className="card-body">
                    <h2 className="card-title">Add New Video</h2>
                    <p>
                        <p className="m-1">Youtube Video:</p>
                        <input
                            type="text"
                            placeholder="Enter/Paste Youtube Video URL"
                            className="input w-full"
                            onChange={(e) => setYoutubeVideoURL(e.target.value)}
                            value={youtubeVideoUrl}
                        />
                        <button
                            className={"btn bg-blue-700 m-auto w-full mt-2"}
                            onClick={() => addYoutubeVideo()}
                            disabled={isUploading}
                        >
                            {isUploading ? "Adding..." : "Add Youtube Video"}
                        </button>
                    </p>
                    <label className="m-auto">or</label>
                    <p>
                        <p className="m-1">User upload (MP4):</p>
                        <input
                            type="file"
                            accept=".mp4"
                            placeholder="Upload file"
                            className="file-input w-full"
                            multiple={false}
                            ref={fileUploadRef}
                            onChange={(e) => handleFileUpload(e)}
                        />

                        <video
                            className="m-auto"
                            hidden={uploadedFileUrl ? false : true}
                            ref={videoRef}
                            src={uploadedFileUrl}
                            playsInline
                            controls={true}
                        ></video>
                        <button
                            className={"btn bg-blue-700 m-auto w-full mt-2"}
                            onClick={() => uploadVideoFile()}
                            disabled={isUploading}
                        >
                            {isUploading ? "Adding..." : "Upload"}
                        </button>
                        <button
                            className={"btn bg-red-700 m-auto w-full mt-2"}
                            onClick={() => cancelUploadFile()}
                            disabled={isUploading}
                        >
                            Cancel
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AddNewVideo;
