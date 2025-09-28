import fsp from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../../const";
import { ensureDir, fileExists } from "./files.utils";
import { TranscriptResponse } from "youtube-transcript-plus/dist/types";
import OpenAI, { Uploadable, toFile } from "openai";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";

async function writeYoutubeTranscript(
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
        console.error("writeYoutubeTranscript | e", e);
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
    if (!videoTranscriptExists) {
        return null;
    }

    const notesItemContent = await fsp.readFile(
        videoTranscriptTextPath,
        "utf-8"
    );
    return notesItemContent;
}

async function extractAudio(videoPath, videoId) {
    const tempDir = path.join(PATHS.USER_DATA_BASE + "/temp");
    await ensureDir(tempDir);
    const tempPath = path.join(tempDir, `${videoId}.mp3`);
    return new Promise((resolve) => {
        const args = [
            "-y",
            "-i",
            videoPath,
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "48k",
            tempPath,
        ];

        const proc = spawn(ffmpegPath as string, args, { stdio: "inherit" });
        proc.on("close", (code) => {
            if (code === 0) {
                // successful
                resolve(tempPath);
            } else {
                resolve("");
            }
        });
    });
}

async function writeTranscriptFallback(videoId, openAIKey) {
    let audioPath: string | null = null;
    try {
        console.log("writeTranscriptFallback | started");
        let openaiClient = new OpenAI({ apiKey: openAIKey });

        const videoFilePath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
        // const fileStream = fs.createReadStream(videoFilePath);

        // file size limit is 25MB
        audioPath = (await extractAudio(videoFilePath, videoId)) as string;
        const fileStream = fs.createReadStream(audioPath);

        const { text } = await openaiClient.audio.transcriptions.create({
            file: fileStream,
            model: "whisper-1",
        });
        console.log("writeTranscriptFallback | transcript", text);
        return text;
    } catch (e) {
        console.log("writeTranscriptFallback | e", e);
        return null;
    } finally {
        if (audioPath) {
            try {
                await fsp.unlink(audioPath);
                console.log("writeTranscriptFallback | cleaned up", audioPath);
            } catch (cleanupErr) {
                console.warn(
                    "writeTranscriptFallback | cleanup failed",
                    cleanupErr
                );
            }
        }
    }
}

async function writeFallbackTranscript(videoId: string, transcript: string) {
    try {
        let transcriptText = "";
        await ensureDir(PATHS.TRANSCRIPTS_DIR);
        await ensureDir(PATHS.TIMESTAMPED_TRANSCRIPTS_DIR);

        const transcriptTextFilePath = path.join(
            PATHS.TRANSCRIPTS_DIR,
            `${videoId}.txt`
        );
        await fsp.writeFile(transcriptTextFilePath, transcript);
        return true;
    } catch (e) {
        console.error("writeFallbackTranscript | e", e);
        return false;
    }
}

export {
    writeYoutubeTranscript,
    deleteTranscript,
    getTextTranscript,
    writeTranscriptFallback,
    writeFallbackTranscript,
};
