interface Video {
    id: string;
    url: string;
    name: string;
    description: string;
    dateExtracted: number;
    thumbnail: string;
    dateUploaded: number;
    opName: string;
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
