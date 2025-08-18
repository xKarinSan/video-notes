interface NotesMetadata {
    id: string;
    videoId: string;
    title: string;
    createdDate: number;
    lastEdited: number;
}

interface NotesItem {
    id: string;
    isSnapshot: boolean; // true if snapshot, else return false
    content: string; // either the URL of the snapshot or what the user typed
    timestamp: number; // -1 if not timestamped if not exact timestamp
}

export { NotesMetadata, NotesItem };
