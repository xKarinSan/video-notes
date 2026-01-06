import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Video } from "../classes/Video";
import { NotesMetadata, NotesItem } from "../classes/Notes";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { buildPdf } from "../utils/pdfExport.utils";
import { NotesHeading } from "../classes/Pdf";
import { formatTimestamp } from "../utils/timestamp.utils";
import VideoPlayer from "../components/VideoPlayer";

function CurrentNotesPage() {
    const { notesId } = useParams();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [currentVideo, setCurrentVideo] = useState<Video>();
    const [currentVideoDate, setCurrentVideoDate] = useState<string>("");
    const [currentVideoFilePath, setCurrentVideoFilePath] =
        useState<string>("");
    const [currentNotesMetadata, setCurrentNotesMetadata] =
        useState<NotesMetadata>();
    const [currentNotes, setCurrentNotes] = useState<NotesItem[]>([]);
    const [currentNotesContent, setCurrentNotesContent] = useState<string>("");

    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState<string>("");
    // key: snapshot_id
    // value: generated URL
    const [snapshotIdDict, setSnapshotIdDict] = useState({});

    const videoRef = useRef<HTMLVideoElement>(null);
    const nameChangeRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();

    // on load
    useEffect(() => {
        (async () => {
            await window.notes
                .getCurrentNotes(notesId)
                .then((currentNotesInfo) => {
                    if (!currentNotesInfo) {
                        setIsLoading(false);
                        return;
                    }
                    const {
                        videoMetadata,
                        notesMetadata,
                        currentNotesData,
                        videoPath,
                        urlDict,
                    } = currentNotesInfo;
                    setCurrentVideoDate(
                        new Date(videoMetadata.dateUploaded).toLocaleString()
                    );
                    setCurrentVideo(videoMetadata);
                    setCurrentVideoFilePath(videoPath);
                    setCurrentNotesMetadata(notesMetadata);
                    setCurrentNotes(currentNotesData);
                    setSnapshotIdDict(urlDict);
                    setIsLoading(false);
                });
        })();
    }, []);

    // on save
    useEffect(() => {
        if (!currentNotesMetadata || !currentNotes) return;
        const id = setTimeout(async () => {
            await window.notes
                .saveCurrentNotes(
                    notesId,
                    currentNotesMetadata,
                    currentNotes,
                    snapshotIdDict
                )
                .catch((err) => console.error("Autosave failed:", err));
        }, 1000); // adjust debounce
        return () => clearTimeout(id);
    }, [notesId, currentNotesMetadata, currentNotes, snapshotIdDict]);

    useEffect(() => {
        const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
            // alert("Handle unload")
            event.preventDefault();
            console.log("CurrentNotesPage | handleBeforeUnload");
            console.log("currentNotesMetadata", currentNotesMetadata);
            console.log("currentNotes", currentNotes);
            if (currentNotesMetadata && currentNotes) {
                await window.notes
                    .saveCurrentNotes(
                        notesId,
                        currentNotesMetadata,
                        currentNotes,
                        snapshotIdDict
                    )
                    .catch((err) => {
                        console.error("Auto-save before unload failed:", err);
                    });
            }

            window.notes.requestForceClose();
            // event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [notesId, currentNotes, snapshotIdDict, currentNotesMetadata]);

    async function handleClick(event: MouseEvent) {
        // if inside input ref, disable video seeking
        if (
            nameChangeRef.current &&
            !nameChangeRef.current.contains(event.target as Node)
        ) {
            await window.notes.saveCurrentNotes(
                notesId,
                currentNotesMetadata,
                currentNotes,
                snapshotIdDict
            );
            setIsEditingName(false);
        }
    }

    useEffect(() => {
        document.addEventListener("mousedown", handleClick, { capture: true });
        return () => {
            document.removeEventListener("mousedown", handleClick, {
                capture: true,
            });
        };
    }, []);

    function startEditing(note: NotesItem) {
        setEditingNoteId(note.id);
        setEditContent(note.content);
    }

    function saveEditedNote() {
        if (!editingNoteId) return;
        setCurrentNotes((prev) =>
            prev.map((note) =>
                note.id === editingNoteId
                    ? { ...note, content: editContent }
                    : note
            )
        );
        setEditingNoteId(null);
        setEditContent("");
    }

    function cancelEditing() {
        setEditingNoteId(null);
        setEditContent("");
    }

    function addNoteContent() {
        if (!videoRef.current) return;
        if (!currentNotesContent) return;

        const video = videoRef.current;
        const timestamp = video.currentTime;

        const newNote: NotesItem = {
            id: crypto.randomUUID(),
            isSnapshot: false,
            content: currentNotesContent,
            timestamp: timestamp,
        };
        setCurrentNotes((currentNotes) =>
            [...currentNotes, newNote].sort((a, b) => a.timestamp - b.timestamp)
        );
        setCurrentNotesContent("");
    }

    function deleteNoteContent(id: string) {
        let snapshotToDelete: string | undefined;

        // 1) Update notes and *extract* the related snapshotId in one pass
        setCurrentNotes((prev) => {
            const target = prev.find((n) => n.id === id);
            snapshotToDelete = target?.snapshotId;
            return prev.filter((n) => n.id !== id);
        });

        // 2) Now update the snapshot dict separately (no nested setState)
        if (snapshotToDelete) {
            setSnapshotIdDict((prevDict) => {
                const next = { ...prevDict };
                delete next[snapshotToDelete!];
                return next;
            });
        }
    }

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
        const snapshotId = crypto.randomUUID();
        const dataUrl = canvas.toDataURL("image/png");
        setSnapshotIdDict({ ...snapshotIdDict, [snapshotId]: dataUrl });

        const timestampedSnapshot: NotesItem = {
            id: crypto.randomUUID(),
            isSnapshot: true,
            content: dataUrl,
            timestamp: timestamp,
            snapshotId: snapshotId,
        };

        setCurrentNotes((currentNotes) =>
            [...currentNotes, timestampedSnapshot].sort(
                (a, b) => a.timestamp - b.timestamp
            )
        );

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
        toast.success("Snapshot captured!");
    }

    async function generateAiSummary() {
        try {
            if (!currentVideo || !currentVideo.id) return;
            setIsGeneratingSummary(true);
            const res = await window.notes.generateAISummary(currentVideo.id);
            console.log("generateAiSummary | res",res)
            setIsGeneratingSummary(false);
            if (!(res && res.length > 0)) {
                throw new Error(
                    "No AI summary generated for the current video."
                );
            }
            setCurrentNotes((prevNotes) =>
                [...prevNotes, ...res].sort((a, b) => a.timestamp - b.timestamp)
            );
        } catch (e) {
            console.log("generateAiSummary | e", e);
            setIsGeneratingSummary(false);
            throw e;
        }
    }

    function handleGenerateAiSummary() {
        toast.promise(generateAiSummary(), {
            pending: "Generating summary in progress..",
            success: "AI Summary successfully generated and added to notes.",
            error: "Failed to generate summary",
        });
    }

    function handleClickedTimestamp(timestamp: number) {
        if (!videoRef.current || timestamp == -1) return;
        const video = videoRef.current;
        video.currentTime = timestamp;
        video.play();
    }

    async function exportToPdf() {
        if (!currentNotesMetadata) return;
        const notesHeading: NotesHeading = {
            notesTitle: currentNotesMetadata.title,
            videoTitle: currentVideo?.name ?? "N/A",
            videoUrl: currentVideo?.videoUrl ?? "N/A",
        };
        await buildPdf(notesHeading, currentNotes).then(() => {
            toast.success("PDF exported successfully.");
        });
    }

    async function deleteCurrentNotes() {
        if (!confirm("Are you sure you want to delete this notes?")) {
            return;
        }
        try {
            setIsDeleting(true);
            const deleted = await window.notes.deleteNotesMetadataById(notesId);
            setIsDeleting(false);
            if (deleted) {
                // redirect
                navigate("/notes");
                return;
            }
            throw new Error("Notes failed to delete.");
        } catch (e) {
            console.error("Delete video error:", e);
            setIsDeleting(false);
        }
    }

    function handleDeleteCurrentNotes() {
        toast.promise(deleteCurrentNotes(), {
            pending: "Deleting notes in progress",
            success: "Notes deleted successfully.",
            error: "Notes failed to delete.",
        });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" && event.shiftKey) {
            event.preventDefault();
            if (editContent) {
                saveEditedNote();
            } else {
                addNoteContent();
            }
        }
    };

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => {
            document.removeEventListener("keydown", handleKeyDown, {
                capture: true,
            });
        };
    }, [handleKeyDown]);

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="flex justify-start m-2 w-full">
                <button
                    className="btn m-1 btn-sm w-fit"
                    onClick={() => {
                        navigate("/notes");
                    }}
                >
                    ← Back
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 m-2">
                {/* left column */}
                <div className="flex flex-col items-center">
                    <div className="card w-full bg-base-500 shadow-xl">
                        <h2 className="text-3xl m-2 px-4 text-left">
                            {currentVideo?.name ?? "N/A"}
                        </h2>
                        <h2 className="text-md m-2 px-4 text-left">
                            Uploaded on: {currentVideoDate}
                        </h2>
                        {isLoading ? (
                            <span className="loading loading-spinner loading-lg mt-6"></span>
                        ) : (
                            <VideoPlayer
                                videoRef={videoRef}
                                videoFilePath={currentVideoFilePath}
                            />
                        )}
                    </div>

                    <div className="flex flex-wrap my-2"></div>
                </div>

                <div>
                    <div className="grid items-center">
                        <div>
                            {isEditingName ? (
                                <input
                                    ref={nameChangeRef}
                                    className="input my-5 w-full"
                                    value={currentNotesMetadata?.title}
                                    onChange={(e) => {
                                        setCurrentNotesMetadata({
                                            ...currentNotesMetadata,
                                            title: e.target.value,
                                        });
                                    }}
                                />
                            ) : (
                                <h1
                                    className="card-title text-2xl font-bold my-5 ml-5"
                                    onClick={() => setIsEditingName(true)}
                                >
                                    {currentNotesMetadata?.title ?? "N/A"}
                                </h1>
                            )}
                        </div>
                        <div className="flex">
                            <button
                                className="btn bg-blue-700 mx-1 w-fit text-white flex items-center gap-2"
                                onClick={() => {
                                    captureSnapshot();
                                }}
                            >
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
                                        d="M3 7.5h3l1.5-2h9l1.5 2h3a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 013 7.5z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
                                    />
                                </svg>
                                Snapshot
                            </button>
                            <button
                                className="btn bg-blue-700 mx-1 w-fit text-white flex items-center gap-2"
                                disabled={isGeneratingSummary}
                                onClick={() => {
                                    handleGenerateAiSummary();
                                }}
                            >
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
                                        d="M13 2L3 14h7v8l11-12h-7V2z"
                                    />
                                </svg>
                                AI Notes
                            </button>

                            <button
                                className="btn bg-blue-700 mx-1 w-fit text-white flex items-center gap-2"
                                onClick={exportToPdf}
                            >
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
                                        d="M19.5 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3h6.75l6 6v9.75A2.25 2.25 0 0119.5 21z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 3v6h6"
                                    />
                                </svg>
                                Export
                            </button>

                            <button
                                className={`btn bg-blue-900 mx-1 w-fit text-white flex items-center gap-2 ${
                                    isDeleting
                                        ? "opacity-70 cursor-not-allowed"
                                        : ""
                                }`}
                                onClick={handleDeleteCurrentNotes}
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
                                {isDeleting ? "Deleting..." : "Delete All"}
                            </button>
                        </div>
                    </div>
                    <br />
                    <hr />
                    <div className="overflow-y-auto max-h-[60vh]">
                        {currentNotes.map((note: NotesItem, idx) => {
                            const { timestamp, content, isSnapshot, id } = note;
                            return (
                                <div
                                    key={idx}
                                    className="card bg-base-300 shadow-sm m-2"
                                >
                                    <div className="card-body p-2">
                                        <div className="flex">
                                            <p
                                                className="text-sm text-gray-500 hover:cursor-pointer w-fit"
                                                onClick={() => {
                                                    handleClickedTimestamp(
                                                        timestamp
                                                    );
                                                }}
                                            >
                                                {timestamp > -1
                                                    ? "Timestamp: " +
                                                      formatTimestamp(timestamp)
                                                    : ""}
                                            </p>
                                            <button
                                                className="btn btn-black btn-xs btn-square"
                                                onClick={() =>
                                                    deleteNoteContent(id)
                                                }
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={1.5}
                                                    stroke="currentColor"
                                                    className="w-4 h-4"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        </div>

                                        {isSnapshot ? (
                                            <img
                                                src={content}
                                                alt={`Snapshot at ${timestamp}`}
                                                className="rounded-lg"
                                            />
                                        ) : editingNoteId === id ? (
                                            <div className="flex flex-col gap-2">
                                                <textarea
                                                    className="textarea textarea-bordered w-full"
                                                    value={editContent}
                                                    onChange={(e) =>
                                                        setEditContent(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        className="btn btn-sm bg-blue-700"
                                                        onClick={saveEditedNote}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={cancelEditing}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className=""
                                                onClick={() =>
                                                    startEditing(note)
                                                }
                                            >
                                                {content
                                                    .split("\n")
                                                    .map((line: string) => {
                                                        return (
                                                            <p className="my-2">
                                                                {line}
                                                            </p>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex  mt-2">
                        <textarea
                            className="textarea textarea-bordered w-full"
                            placeholder="Write your notes here... (Press Shift + Enter to save)"
                            value={currentNotesContent}
                            onChange={(e) =>
                                setCurrentNotesContent(e.target.value)
                            }
                        ></textarea>
                        <button
                            className="btn bg-blue-700 w-fit"
                            onClick={addNoteContent}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                className="w-5 h-5"
                            >
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CurrentNotesPage;
