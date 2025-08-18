import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Video } from "../classes/Video";
import { NotesMetadata } from "../classes/Notes";

function CurrentVideoPage() {
    const { videoId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [currentVideo, setCurrentVideo] = useState<Video>();
    const [currentVideoFilePath, setCurrentVideoFilePath] =
        useState<string>("");

    const [currentNotesMetadata, setCurrentNotesMetadata] =
        useState<NotesMetadata>([]);

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
            // also load the notes metadata
            const notesMetadata = await window.notes.getNotesByVideoId(videoId);
            console.log("notesMetadata", notesMetadata);

            if (notesMetadata) {
                setCurrentNotesMetadata(notesMetadata);
            }
            setIsLoading(false);
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
        <div className="flex flex-col items-center justify-center">
            <div className="flex flejustify-start m-2 w-full">
                <button
                    className="btn m-1 btn-sm"
                    onClick={() => navigate("/")} // go back in history
                >
                    ← Back
                </button>
            </div>
            <div className="card w-full bg-base-500 shadow-xl">
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
                                controls
                            >
                                <source
                                    src={currentVideoFilePath}
                                    type="video/mp4"
                                />
                            </video>
                            <button
                                className={`btn bg-blue-700 w-fit mt-4 text-white flex items-center gap-2 ${
                                    isCreating ? "btn-disabled loading" : ""
                                }`}
                                disabled={isCreating}
                                onClick={createNewNotes}
                            >
                                {!isCreating && (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652l-9.193 9.193a4.5 4.5 0 01-1.897 1.13L7.5 16.5l.426-2.611a4.5 4.5 0 011.13-1.897l7.806-7.805z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19.5 7.125L16.862 4.487"
                                        />
                                    </svg>
                                )}
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
