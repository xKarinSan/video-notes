import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NotesMetadata } from "../classes/Notes";
import { toast } from "react-toastify";
import EmptyPlaceholder from "../components/EmptyPlaceholder";
function MainNotesPage() {
    const [loading, setLoading] = useState<boolean>(false);
    const [notesMetadataList, setNotesMetadataList] = useState<NotesMetadata[]>(
        []
    );
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);

        (async () => {
            try {
                const allNotes = await window.notes.getAllNotesMetadata();
                setNotesMetadataList(allNotes);
            } catch (e) {
                console.log("E", e);
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function deleteCurrentNotes(notesId) {
        if (!confirm("Are you sure you want to delete this notes?")) {
            return;
        }
        try {
            const deleted = await window.notes.deleteNotesMetadataById(notesId);
            if (deleted) {
                setNotesMetadataList((prev) =>
                    prev.filter((note) => note.id !== notesId)
                );
                return;
            }
            throw new Error("Failed to delete");
        } catch (e) {
            throw e;
        }
    }

    function handleDeleteCurrentNotes(notesId) {
        toast.promise(deleteCurrentNotes(notesId), {
            pending: "Deleting notes in progress..",
            success: "Notes deleted successfully.",
            error: "Failed to delete notes",
        });
    }
    return (
        <div>
            <h1 className="text-3xl m-5 text-center ">Notes Library</h1>
            <div className="overflow-x-scroll">
                {notesMetadataList && notesMetadataList.length > 0 ? (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Id</th>
                                    <th>Title</th>
                                    <th>Created At</th>
                                    <th>Last Edited At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notesMetadataList?.map(
                                    (currentNotesMetadata) => {
                                        const {
                                            id,
                                            title,
                                            createdDate,
                                            lastEdited,
                                        } = currentNotesMetadata;
                                        const createdDateString = new Date(
                                            createdDate
                                        ).toLocaleString();
                                        const lastEditedDateString =
                                            lastEdited != -1
                                                ? new Date(
                                                      createdDate
                                                  ).toLocaleString()
                                                : "N/A";
                                        return (
                                            <tr>
                                                <td>{id}</td>
                                                <td>{title}</td>
                                                <td>{createdDateString}</td>
                                                <td>{lastEditedDateString}</td>
                                                <td>
                                                    <button
                                                        onClick={() =>
                                                            navigate(
                                                                `/notes/${id}`
                                                            )
                                                        }
                                                        className="btn btn-black btn-xs btn-square m-2"
                                                        title="View note"
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
                                                                d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
                                                            />
                                                            <circle
                                                                cx="12"
                                                                cy="12"
                                                                r="3"
                                                            />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDeleteCurrentNotes(
                                                                id
                                                            )
                                                        }
                                                        className="btn btn-black btn-xs btn-square m-2"
                                                        title="Delete note"
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
                                                                d="M6 7h12M9 7V4h6v3m-9 0v12a2 2 0 002 2h6a2 2 0 002-2V7"
                                                            />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <>
                        <EmptyPlaceholder
                            title="Looks a bit empty..."
                            message="How about writing something down?"
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default MainNotesPage;
