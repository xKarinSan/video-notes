import { useParams } from "react-router-dom";

function CurrentNotesPage() {
    const { notesId } = useParams();
    return (
        <div>
            <p>Current Notes ID: {notesId}</p>
        </div>
    );
}

export default CurrentNotesPage;
