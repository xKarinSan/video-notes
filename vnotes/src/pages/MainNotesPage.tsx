import { useState, useEffect } from "react";
import { NotesMetadata } from "../classes/Notes";
import { toast } from "react-toastify";
import NotesListComponent from "../components/NotesListComponent";

function MainNotesPage() {
    const [loading, setLoading] = useState<boolean>(false);
    const [notesMetadataList, setNotesMetadataList] = useState<NotesMetadata[]>(
        []
    );

    useEffect(() => {
        setLoading(true);

        (async () => {
            try {
                const allNotes = await window.notes.getAllNotesMetadata();
                console.log("allNotes", allNotes);
                setNotesMetadataList(allNotes);
            } catch (e) {
                console.log("e", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function deleteCurrentNotes(notesId: string) {
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

    function handleDeleteCurrentNotes(notesId: string) {
        toast.promise(deleteCurrentNotes(notesId), {
            pending: "Deleting notes in progress..",
            success: "Notes deleted successfully.",
            error: "Failed to delete notes",
        });
    }
    return (
        <div>
            <h1 className="text-3xl m-5 text-center ">Notes Library</h1>
            <NotesListComponent
                notesMetadataList={notesMetadataList}
                deleteNotes={handleDeleteCurrentNotes}
            />
        </div>
    );
}

export default MainNotesPage;
