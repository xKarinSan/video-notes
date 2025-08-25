import fsp from "node:fs/promises";
import path from "node:path";
import { TRANSCRIPTS_DIR, TIMESTAMPED_TRANSCRIPTS_DIR } from "../../const";
import { ensureDir, fileExists } from "./files.utils";
import { TranscriptResponse } from "youtube-transcript-plus/dist/types";

async function writeTranscript(
    videoId: string,
    transcript: TranscriptResponse[]
) {
    try {
        let transcriptText = "";
        await ensureDir(TRANSCRIPTS_DIR);
        await ensureDir(TIMESTAMPED_TRANSCRIPTS_DIR);
        const timestampedTranscriptFilePath = path.join(
            TIMESTAMPED_TRANSCRIPTS_DIR,
            `${videoId}.json`
        );
        const transcriptString = JSON.stringify(transcript, null, 2);
        await fsp.writeFile(timestampedTranscriptFilePath, transcriptString);

        transcript.forEach((transcriptItem) => {
            transcriptText += transcriptItem.text + " ";
        });
        const transcriptTextFilePath = path.join(
            TRANSCRIPTS_DIR,
            `${videoId}.txt`
        );
        await fsp.writeFile(transcriptTextFilePath, transcriptText);
        return true;
    } catch (e) {
        console.error("writeTranscript | e", e);
        return false;
    }
}

export { writeTranscript };
