import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Video } from "../classes/Video";

function CurrentVideoPage() {
    const { videoId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [currentVideo, setCurrentVideo] = useState<Video>();
    const [currentVideoFilePath, setCurrentVideoFilePath] =
        useState<string>("");

    const navigate = useNavigate();
    useEffect(() => {
        (async () => {
            const currentVideoInfo = await window.api.getCurrentVideo(videoId);
            if (!currentVideoInfo) {
                setIsLoading(false);
                return;
            }
            const { metadata, video_path } = currentVideoInfo;
            setCurrentVideo(metadata);
            setCurrentVideoFilePath(video_path);
            setIsLoading(false);
            console.log(currentVideoInfo);
            console.log(video_path);
        })();
    }, []);

    async function createNewNotes() {
        setIsCreating(true);

        const newNotes = await window.notes
            .createNewNotes(videoId)
            .then((newNotes) => {
                if (newNotes) {
                    setIsCreating(false);
                    alert("Notes created successfully!");
                    // redirect to the notes with the notes.id
                    console.log("newNotes", newNotes);
                    const { id } = newNotes;
                    navigate(`/notes/${id}`);
                    return;
                }
                alert("Failed to create notes.");
                setIsCreating(false);
            })
            .catch((e) => {
                console.log("E", e);
                alert("Failed to create notes.");
                setIsCreating(false);
            });
    }

    return (
        <div className="flex flex-col items-center justify-center p-6">
            <div className="card w-full max-w-2xl bg-base-200 shadow-xl">
                <div className="card-body items-center text-center">
                    <h1 className="card-title text-2xl font-bold">
                        {currentVideo?.name ?? "N/A"}
                    </h1>

                    {isLoading ? (
                        <span className="loading loading-spinner loading-lg mt-6"></span>
                    ) : (
                        <>
                            <video
                                className="rounded-lg border border-base-300 mt-4"
                                height="500"
                                width="500"
                                controls
                            >
                                <source
                                    src={currentVideoFilePath}
                                    type="video/mp4"
                                />
                            </video>
                            <button
                                className={`btn btn-primary w-fit mt-4 ${
                                    isCreating ? "btn-disabled loading" : ""
                                }`}
                                disabled={isCreating}
                                onClick={createNewNotes}
                            >
                                {isCreating
                                    ? "Creating..."
                                    : "Create New Notes"}
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div></div>
        </div>
    );
}

export default CurrentVideoPage;
