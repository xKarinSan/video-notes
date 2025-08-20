import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Video } from "../classes/Video";
import { NotesMetadata, NotesItem } from "../classes/Notes";
import { jsPDF } from "jspdf";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";

function CurrentNotesPage() {
    const { notesId } = useParams();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
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

    const videoRef = useRef();
    const navigate = useNavigate();

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
                    setCurrentVideoDate(
                        new Date(videoMetadata.dateUploaded).toLocaleString()
                    );
                    setCurrentVideo(videoMetadata);
                    setCurrentVideoFilePath(videoPath);
                    setCurrentNotesMetadata(notesMetadata);
                    setIsLoading(false);
                });
        })();
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
        setCurrentNotes(
            [...currentNotes, newNote].sort((a, b) => a.timestamp - b.timestamp)
        );
        setCurrentNotesContent("");
    }

    function deleteNoteContent(id) {
        setCurrentNotes(currentNotes.filter((note) => note.id !== id));
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

        const dataUrl = canvas.toDataURL("image/png");
        const timestampedSnapshot: NotesItem = {
            id: crypto.randomUUID(),
            isSnapshot: true,
            content: dataUrl,
            timestamp: timestamp,
        };

        setCurrentNotes(
            [...currentNotes, timestampedSnapshot].sort(
                (a, b) => a.timestamp - b.timestamp
            )
        );

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
    }

    function formatTimestamp(timestampSeconds) {
        const hours = Math.floor(timestampSeconds / 3600);
        const minutes = Math.floor((timestampSeconds % 3600) / 60);
        const seconds = timestampSeconds % 60;

        // Pad hours/minutes
        const hh = String(hours).padStart(2, "0");
        const mm = String(minutes).padStart(2, "0");

        // Seconds with 3 decimal places
        const ss = seconds.toFixed(3).padStart(6, "0");

        return `${hh}:${mm}:${ss}`;
    }

    async function exportToPdf() {
        if (!currentNotesMetadata) return;

        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        let y = 20;

        // title
        doc.setFontSize(16);
        doc.text(currentNotesMetadata.title, 10, y);
        y += 10;

        // notes contents
        doc.setFontSize(12);

        for (const note of currentNotes) {
            if (note.isSnapshot) {
                // convert blob URL if needed
                let imgData = note.content;
                const img = new Image();
                img.src = imgData;

                await new Promise((resolve) => {
                    img.onload = () => resolve(null);
                });
                const aspectRatio = img.naturalWidth / img.naturalHeight;

                const imgWidth = 150;
                const imgHeight = imgWidth / aspectRatio;
                // page break if needed
                if (y + imgHeight > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }
                doc.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);
                y += imgHeight + 10;
            } else {
                // wrap text automatically
                const splitText = doc.splitTextToSize(
                    note.content,
                    pageWidth - 20
                );

                // page break if needed
                if (y + splitText.length * 7 > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }

                doc.text(splitText, 10, y);
                y += splitText.length * 7 + 5;
            }
        }

        // Save with UUID
        const docId = uuidv4();
        doc.save(`${docId}.pdf`);
    }

    async function deleteCurrentNotes() {
        if (!confirm("Are you sure you want to delete this notes?")) {
            return;
        }
        try {
            setIsDeleting(true);
            const deleted = await window.notes.deleteNotesMetadataById(notesId);
            if (deleted) {
                alert("Notes deleted successfully.");
                // redirect
                setIsDeleting(false);
                navigate("/notes");
            } else {
                alert("Failed to delete video.");
            }
        } catch (e) {
            console.error("Delete video error:", e);
            setIsDeleting(false);
            alert("Error deleting video.");
        }
    }

    async function saveVideoMetadata() {
        // mainly for video
    }
    return (
        <div className="flex flex-col items-center justify-center">
            <div className="flex justify-start m-2 w-full">
                <button
                    className="btn m-1 btn-sm w-fit"
                    onClick={() => navigate("/notes")}
                >
                    ← Back
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 w-full">
                {/* Left column */}
                <div className="flex flex-col items-center">
                    <div className="card w-full bg-base-500 shadow-xl">
                        <div className="card-body items-center text-center">
                            {isLoading ? (
                                <span className="loading loading-spinner loading-lg mt-6"></span>
                            ) : (
                                <video
                                    className="rounded-lg border border-base-300 mt-4"
                                    ref={videoRef}
                                    controls
                                >
                                    <source
                                        src={currentVideoFilePath}
                                        type="video/mp4"
                                    />
                                </video>
                            )}
                        </div>
                        <h2 className="m-2 px-4 text-left">
                            {currentVideo?.name ?? "N/A"}
                        </h2>
                        <h2 className="m-2 px-4 text-left">
                            Uploaded on: {currentVideoDate}
                        </h2>
                    </div>

                    <div className="flex flex-wrap my-2">
                        <button
                            className="btn bg-blue-700 mx-1 w-fit text-white flex items-center gap-2"
                            onClick={captureSnapshot}
                        >
                            {/* Camera icon */}
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
                            Capture Snapshot
                        </button>
                        <button
                            className="btn bg-blue-700 mx-1 w-fit text-white flex items-center gap-2"
                            onClick={exportToPdf}
                        >
                            {/* Document file icon */}
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
                            Export to PDF
                        </button>
                        <button
                            className={`btn bg-red-700 mx-1  w-fit text-white flex items-center gap-2 ${
                                isDeleting ? "loading btn-disabled" : ""
                            }`}
                            onClick={deleteCurrentNotes}
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
                            {isDeleting ? "Deleting..." : "Delete Notes"}
                        </button>
                    </div>

                    <textarea
                        className="textarea textarea-bordered w-full mt-4"
                        placeholder="Type your note here..."
                        value={currentNotesContent}
                        onChange={(e) => setCurrentNotesContent(e.target.value)}
                    ></textarea>
                    <button
                        className="btn bg-blue-700 mt-2 w-full"
                        onClick={addNoteContent}
                    >
                        Add Note
                    </button>
                </div>

                <div>
                    <div className="flex items-center">
                        {isEditingName ? (
                            <>
                                <input
                                    className="input my-5 ml-5"
                                    value={currentNotesMetadata?.title}
                                    onChange={(e) => {
                                        setCurrentNotesMetadata({
                                            ...currentNotesMetadata,
                                            title: e.target.value,
                                        });
                                    }}
                                />
                                <svg
                                    onClick={async () => {
                                        await window.notes.saveCurrentNotes(
                                            notesId,
                                            currentNotesMetadata
                                        );
                                        setIsEditingName(false);
                                    }}
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-gray-600 hover:cursor-pointer"
                                    fill="none"
                                    viewBox="0 0 12 24"
                                    stroke="currentColor"
                                    strokeWidth={1}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3zM5 13v6h6l8-8-6-6-8 8z"
                                    />
                                </svg>
                            </>
                        ) : (
                            <>
                                <h1 className="card-title text-2xl font-bold my-5 ml-5">
                                    {currentNotesMetadata?.title ?? "N/A"}
                                </h1>
                                <svg
                                    onClick={() => setIsEditingName(true)}
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-gray-600 hover:cursor-pointer"
                                    fill="none"
                                    viewBox="0 0 12 24"
                                    stroke="currentColor"
                                    strokeWidth={1}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3zM5 13v6h6l8-8-6-6-8 8z"
                                    />
                                </svg>
                            </>
                        )}
                    </div>

                    <div className="overflow-y-auto max-h-[80vh]">
                        {currentNotes.map((note: NotesItem, idx) => {
                            const { timestamp, content, isSnapshot, id } = note;
                            return (
                                <div
                                    key={idx}
                                    className="card bg-base-300 shadow-sm m-2"
                                >
                                    <div className="card-body p-2">
                                        <div className="flex">
                                            <p className="text-sm text-gray-500">
                                                Timestamp:{" "}
                                                {formatTimestamp(timestamp)}
                                            </p>
                                            {!isSnapshot &&
                                            !(editingNoteId === id) ? (
                                                <button
                                                    className="btn btn-xs bg-blue-700"
                                                    onClick={() =>
                                                        startEditing(note)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                            ) : (
                                                <></>
                                            )}
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
                                            <div className="flex justify-between items-center">
                                                <p className="my-2">
                                                    {content}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CurrentNotesPage;
