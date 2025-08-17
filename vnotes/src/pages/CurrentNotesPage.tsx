import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Video } from "../classes/Video";
import { NotesMetadata } from "../classes/Notes";

function CurrentNotesPage() {
    const { notesId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [currentVideo, setCurrentVideo] = useState<Video>();
    const [currentVideoFilePath, setCurrentVideoFilePath] =
        useState<string>("");
    const [currentNotesMetadata, setCurrentNotesMetadata] =
        useState<NotesMetadata>();
    const videoRef = useRef();
    useEffect(() => {
        (async () => {
            await window.notes
                .getCurrentNotes(notesId)
                .then((currentNotesInfo) => {
                    if (!currentNotesInfo) {
                        setIsLoading(false);
                        return;
                    }
                    const { videoMetadata, notesMetadata, videoPath } =
                        currentNotesInfo;
                    setCurrentVideo(videoMetadata);
                    setCurrentVideoFilePath(videoPath);
                    setCurrentNotesMetadata(notesMetadata);
                    setIsLoading(false);
                });
        })();
    }, []);

    async function captureSnapshot() {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const timestamp = video.currentTime;

        let canvas: HTMLCanvasElement | null = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/png");

        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `snapshot-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 🧹 Explicitly clear and drop reference
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        canvas = null; // let GC reclaim

        return dataUrl;
    }
    return (
        <div className="flex flex-col items-center justify-center p-6">
            <p>Current Notes ID: {notesId}</p>
            <div className="grid">
                <div className="card w-full max-w-2xl bg-base-200 shadow-xl">
                    <div className="card-body items-center text-center">
                        <h1 className="card-title text-2xl font-bold">
                            {currentVideo?.name ?? "N/A"}
                        </h1>
                        {isLoading ? (
                            <span className="loading loading-spinner loading-lg mt-6"></span>
                        ) : (
                            <video
                                className="rounded-lg border border-base-300 mt-4"
                                height="500"
                                width="500"
                                ref={videoRef}
                                controls
                            >
                                <source
                                    src={currentVideoFilePath}
                                    type="video/mp4"
                                />
                            </video>
                        )}
                        <button
                            className="btn btn-primary mt-4 w-full"
                            onClick={() => {
                                captureSnapshot();
                            }}
                        >
                            Capture Snapshot
                        </button>
                    </div>
                </div>
                <div>
                    
                </div>
            </div>
        </div>
    );
}

export default CurrentNotesPage;
