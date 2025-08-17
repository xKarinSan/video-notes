interface NotesMetadata {
    id: string;
    videoId: string;
    title: string;
    createdDate: number;
    lastEdited: number;
}

interface VideoNotesMapping {
    videoId: string;
    notesId: string;
}

export { NotesMetadata, VideoNotesMapping };
