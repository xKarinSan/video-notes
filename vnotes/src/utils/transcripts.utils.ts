import fsp from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../../const";
import { ensureDir, fileExists } from "./files.utils";
import { TranscriptResponse } from "youtube-transcript-plus/dist/types";

async function writeTranscript(
    videoId: string,
    transcript: TranscriptResponse[]
) {
    try {
        let transcriptText = "";
        await ensureDir(PATHS.TRANSCRIPTS_DIR);
        await ensureDir(PATHS.TIMESTAMPED_TRANSCRIPTS_DIR);
        const timestampedTranscriptFilePath = path.join(
            PATHS.TIMESTAMPED_TRANSCRIPTS_DIR,
            `${videoId}.json`
        );
        const transcriptString = JSON.stringify(transcript, null, 2);
        await fsp.writeFile(timestampedTranscriptFilePath, transcriptString);

        transcript.forEach((transcriptItem) => {
            transcriptText += transcriptItem.text + " ";
        });
        const transcriptTextFilePath = path.join(
            PATHS.TRANSCRIPTS_DIR,
            `${videoId}.txt`
        );
        await fsp.writeFile(transcriptTextFilePath, transcriptText);
        return true;
    } catch (e) {
        console.error("writeTranscript | e", e);
        return false;
    }
}

async function deleteTranscript(videoId) {
    try {
        await ensureDir(PATHS.TRANSCRIPTS_DIR);
        await ensureDir(PATHS.TIMESTAMPED_TRANSCRIPTS_DIR);
        const timestampedTranscriptFilePath = path.join(
            PATHS.TIMESTAMPED_TRANSCRIPTS_DIR,
            `${videoId}.json`
        );
        const timestampedTranscriptExists = await fileExists(
            timestampedTranscriptFilePath
        );
        if (timestampedTranscriptExists) {
            await fsp.unlink(timestampedTranscriptFilePath);
        }
        const transcriptTextFilePath = path.join(
            PATHS.TRANSCRIPTS_DIR,
            `${videoId}.txt`
        );
        const transcriptTextExists = await fileExists(transcriptTextFilePath);
        if (transcriptTextExists) {
            await fsp.unlink(transcriptTextFilePath);
        }
        return true;
    } catch (e) {
        console.error("deleteTranscript | e", e);
        return false;
    }
}

async function getTextTranscript(videoId) {
    const videoTranscriptTextPath = path.join(
        PATHS.TRANSCRIPTS_DIR,
        `${videoId}.txt`
    );
    const videoTranscriptExists = await fsp
        .access(videoTranscriptTextPath)
        .then(() => true)
        .catch(() => false);
    console.log(
        "getTextTranscript | videoTranscriptExists",
        videoTranscriptExists
    );
    if (!videoTranscriptExists) {
        return null;
    }

    const notesItemContent = await fsp.readFile(
        videoTranscriptTextPath,
        "utf-8"
    );
    console.log(
        "getTextTranscript | notesItemContent",
        videoTranscriptExists
    );
    return notesItemContent;
}

export { writeTranscript, deleteTranscript, getTextTranscript };
