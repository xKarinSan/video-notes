import { useState, useEffect } from "react";
import { NotesMetadata } from "../classes/Notes";
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

    return (
        <div>
            <h1 className="text-3xl m-5 text-center ">Notes Library</h1>
            <NotesListComponent notesMetadataList={notesMetadataList} />
        </div>
    );
}

export default MainNotesPage;
