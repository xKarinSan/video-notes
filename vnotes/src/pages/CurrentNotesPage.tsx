import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Video } from "../classes/Video";
import { NotesMetadata, NotesItem } from "../classes/Notes";
import { jsPDF } from "jspdf";
import { v4 as uuidv4 } from "uuid";

function CurrentNotesPage() {
    const { notesId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [currentVideo, setCurrentVideo] = useState<Video>();
    const [currentVideoFilePath, setCurrentVideoFilePath] =
        useState<string>("");
    const [currentNotesMetadata, setCurrentNotesMetadata] =
        useState<NotesMetadata>();

    const [currentNotes, setCurrentNotes] = useState<NotesItem[]>([]);
    const [currentNotesContent, setCurrentNotesContent] = useState<string>("");
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
        // const snapshotUrl = `snapshot-${Date.now()}.png`;

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
    return (
        <div className="flex flex-col items-center justify-center p-6">
            {/* <p>Current Notes ID: {notesId}</p> */}
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
                    </div>
                </div>
                <div>
                    <div className="flex">
                        <button
                            className="btn btn-primary m-2 w-fit"
                            onClick={() => {
                                captureSnapshot();
                            }}
                        >
                            Capture Snapshot
                        </button>
                        <button
                            className="btn btn-secondary m-2 w-fit"
                            onClick={() => exportToPdf()}
                        >
                            Export to PDF
                        </button>
                    </div>

                    <textarea
                        className="textarea textarea-bordered w-full mt-4"
                        placeholder="Type your note here..."
                        value={currentNotesContent}
                        onChange={(e) => {
                            setCurrentNotesContent(e.target.value);
                        }}
                    ></textarea>
                    <button
                        className="btn btn-secondary mt-2 w-full"
                        onClick={() => addNoteContent()}
                    >
                        Add Note
                    </button>

                    {currentNotes.map((note: NotesItem) => {
                        const { timestamp, content, isSnapshot } = note;

                        return (
                            <div>
                                <div className="card bg-base-300 shadow-sm m-2">
                                    <div className="card-body">
                                        <p>
                                            {isSnapshot === true ? (
                                                <img
                                                    src={content}
                                                    alt={`Snapshot at ${timestamp}`}
                                                    className="rounded-lg"
                                                />
                                            ) : (
                                                content
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Timestamp: {timestamp}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default CurrentNotesPage;
