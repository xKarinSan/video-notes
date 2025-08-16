interface Video {
    id: string;
    url: string;
    name: string;
    description: string;
    date_extracted: number;
    thumbnail: string;
    date_uploaded: number;
    op_name: string;
    duration: number;
}

interface Transcript {
    video_id: string;
    contents: TranscriptMessage[];
}

interface TranscriptMessage {
    text: string;
    start: number;
    duration: number;
}

export { Video, Transcript, TranscriptMessage };
