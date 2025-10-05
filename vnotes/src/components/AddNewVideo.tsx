import { useState, useRef } from "react";
import { Video } from "../classes/Video";
import { toast } from "react-toastify";
import { FileUploader } from "react-drag-drop-files";

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
    const fileTypes = ["MP4"];

    async function addYoutubeVideo() {
        try {
            toast.info("Retrieving Youtube Video in progress...");
            setIsUploading(true);
            const res = await window.api.addYoutubeVideo(youtubeVideoUrl);
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
            toast.error("Failed to upload video");
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

    function handleFileUpload(file: File | File[]) {
        // get the input from the video file
        // get the temporary URL; turn it into binary cause smaller
        const currFile = file as File;
        if (file == null) return;
        const tempUrl = URL.createObjectURL(currFile);
        setUploadedFileUrl(tempUrl);
        setUploadedFileName(currFile.name);
        toast.success("File successfully uploaded!");
    }
    function handleVideoLoadedMetadata(
        e: React.SyntheticEvent<HTMLVideoElement>
    ) {
        const video = e.currentTarget;
        setUploadVideoDuration(video.duration);
    }

    return (
        <div>
            <div className="card bg-base-300 w-96 shadow-sm m-auto ">
                <div className="card-body">
                    <h2 className="text-2xl px-2">Add New Video</h2>
                    <div className="tabs tabs-border">
                        <input
                            type="radio"
                            name="uploadOption"
                            className="tab cursor-pointer"
                            aria-label="YouTube"
                            defaultChecked
                        />
                        <div className="tab-content p-2">
                            <p className="text-xl my-2">YouTube Link</p>
                            <input
                                type="text"
                                placeholder="Paste full YouTube link here (e.g., https://youtu.be/abc123)"
                                className="input w-full"
                                onChange={(e) =>
                                    setYoutubeVideoURL(e.target.value)
                                }
                                value={youtubeVideoUrl}
                            />
                            <button
                                className={"btn bg-blue-700 m-auto w-full mt-2"}
                                onClick={() => addYoutubeVideo()}
                                disabled={isUploading}
                            >
                                {isUploading ? "Adding..." : "Add"}
                            </button>
                        </div>
                        <input
                            type="radio"
                            name="uploadOption"
                            className="tab cursor-pointer"
                            aria-label="User Upload"
                        />
                        <div className="tab-content p-2">
                            <p className="text-xl my-2">Upload MP4</p>
                            <div className="grid items-center gap-1">
                                <FileUploader
                                    handleChange={handleFileUpload}
                                    label={"Drag a video here"}
                                    classes={"w-1"}
                                    multiple={false}
                                    name="file"
                                    types={fileTypes}
                                />
                            </div>
                            <div className="flex my-2">
                                <button
                                    className={"btn bg-blue-900 w-fit"}
                                    onClick={() => cancelUploadFile()}
                                    disabled={isUploading}
                                >
                                    Remove
                                </button>
                                <button
                                    className={"btn bg-blue-700 w-fit"}
                                    onClick={() => uploadVideoFile()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? "Adding..." : "Add"}
                                </button>
                            </div>

                            {uploadedFileUrl ? (
                                <>
                                    <video
                                        className="m-auto"
                                        ref={videoRef}
                                        src={uploadedFileUrl}
                                        playsInline
                                        controls={true}
                                        onLoadedMetadata={
                                            handleVideoLoadedMetadata
                                        }
                                    ></video>
                                </>
                            ) : (
                                <></>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddNewVideo;
