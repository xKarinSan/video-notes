import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Video } from "../classes/Video";
import { NotesMetadata } from "../classes/Notes";
import { toast } from "react-toastify";
import NotesListComponent from "../components/NotesListComponent";

function CurrentVideoPage() {
    const { videoId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentVideo, setCurrentVideo] = useState<Video>();
    const [currentVideoFilePath, setCurrentVideoFilePath] =
        useState<string>("");
    const [currentNotesMetadataList, setCurrentNotesMetadataList] = useState<
        NotesMetadata[]
    >([]);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            const currentVideoInfo = await window.api.getCurrentVideo(videoId);
            if (!currentVideoInfo) {
                setIsLoading(false);
                return;
            }
            const { metadata, video_url } = currentVideoInfo;
            setCurrentVideo(metadata);
            setCurrentVideoFilePath(video_url);
            // also load the notes metadata
            const notesMetadata = await window.notes.getNotesByVideoId(videoId);
            if (notesMetadata) {
                setCurrentNotesMetadataList(notesMetadata);
            }
            setIsLoading(false);
        })();
    }, []);

    async function createNewNotes() {
        setIsCreating(true);
        await window.notes
            .createNewNotes(videoId)
            .then((newNotes) => {
                setIsCreating(false);

                if (newNotes) {
                    const { id } = newNotes;
                    navigate(`/notes/${id}`);
                    return;
                } else {
                    throw new Error("Failed to create notes");
                }
            })
            .catch((e) => {
                console.log("E", e);
                setIsCreating(false);
                throw e;
            });
    }
    function handleCreateNewNotes() {
        toast.promise(createNewNotes(), {
            pending: "Creating notes in progress..",
            success: "Notes created successfully!",
            error: "Failed to create notes.",
        });
    }

    async function deleteVideo() {
        if (!confirm("Are you sure you want to delete this video?")) {
            return;
        }
        setIsDeleting(true);
        try {
            const deleted = await window.api.deleteCurrentVideo(videoId);
            if (deleted) {
                navigate("/videos");
            }
        } catch (e) {
            console.error("Delete video error:", e);
        } finally {
            setIsDeleting(false);
        }
    }
    function handleDeleteVideo() {
        toast.promise(deleteVideo(), {
            pending: "Deleting video in progress..",
            success: "Video deleted successfully.",
            error: "Failed to delete video.",
        });
    }

    async function deleteCurrentNotes(notesId: string) {
        if (!confirm("Are you sure you want to delete this notes?")) {
            return;
        }
        try {
            const deleted = await window.notes.deleteNotesMetadataById(notesId);
            if (deleted) {
                setCurrentNotesMetadataList((prev) =>
                    prev.filter((note) => note.id !== notesId)
                );
            }
        } catch (e) {
            console.error("Delete video error:", e);
        }
    }

    function handleDeleteCurrentNotes(notesId: string) {
        toast.promise(deleteCurrentNotes(notesId), {
            pending: "Deleting notes in progress..",
            success: "Notes deleted successfully.",
            error: "Failed to delete notes.",
        });
    }
    return (
        <div className="flex flex-col items-center justify-center">
            <div className="flex flejustify-start m-2 w-full">
                <button
                    className="btn m-1 btn-sm"
                    onClick={() => navigate("/videos")} // go back in history
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
                            <div className="flex mt-4 gap-2">
                                <button
                                    className={`btn bg-blue-700 w-fit text-white flex items-center ${
                                        isCreating ? "btn-disabled loading" : ""
                                    }`}
                                    disabled={isCreating}
                                    onClick={handleCreateNewNotes}
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
                                <button
                                    className={`btn bg-red-700 w-fit text-white flex items-center ${
                                        isDeleting ? "loading btn-disabled" : ""
                                    }`}
                                    onClick={handleDeleteVideo}
                                    disabled={isDeleting}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 
                   01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 
                   012-2h2a2 2 0 012 2v2m-7 0h8"
                                        />
                                    </svg>
                                    {isDeleting
                                        ? "Deleting..."
                                        : "Delete Video"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div>
                <NotesListComponent
                    notesMetadataList={currentNotesMetadataList}
                    deleteNotes={handleDeleteCurrentNotes}
                />
            </div>
        </div>
    );
}

export default CurrentVideoPage;
