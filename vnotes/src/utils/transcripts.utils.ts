import fsp from "node:fs/promises";
import fs from "node:fs";
import * as os from "os";
import path from "node:path";
import { PATHS } from "../../const";
import { ensureDir, fileExists } from "./files.utils";
import { TranscriptResponse } from "youtube-transcript-plus/dist/types";
import { whisper } from "whisper-node";
import { spawn } from "child_process";
import { createRequire } from "node:module";

const requireRuntime = createRequire(import.meta.url);

function resolveFfmpegPath(): string {
    let p = requireRuntime("ffmpeg-static") as string; // absolute path to ffmpeg
    if (p.includes("app.asar")) p = p.replace("app.asar", "app.asar.unpacked");
    return p;
}

async function toSafePath(srcWavPath: string, videoId: string) {
    const safeDir = path.join(os.tmpdir(), "vnotes-whisper"); // no spaces
    await ensureDir(safeDir);
    const safeWav = path.join(safeDir, `${videoId}.wav`);
    await fsp.copyFile(srcWavPath, safeWav);
    return safeWav;
}

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

async function deleteTranscript(videoId: string) {
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

async function getTextTranscript(videoId: string) {
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



async function extractAudio(videoPath: string, videoId: string) {
    const startTime = Date.now();

    const tempDir = path.join(PATHS.USER_DATA_BASE + "/temp");
    await ensureDir(tempDir);
    const tempPath = path.join(tempDir, `${videoId}.wav`);
    const ffmpegPath = resolveFfmpegPath();

    return new Promise((resolve) => {
        const args = [
        "-y",
        "-i", videoPath,
        "-vn", "-sn", "-dn",
        "-ac", "1",
        "-ar", "16000",
        "-b:a", "64k",
         "-c:a", "pcm_s16le", 
        tempPath // e.g. "temp/output.mp3"
        ];

        const proc = spawn(ffmpegPath as string, args, { stdio: "inherit" });
        proc.on("close", (code) => {
            const endTime = Date.now();
            console.log(
                `extractAudio | time taken in ms:${endTime - startTime}`
            );
            if (code === 0) {
                // successful
                resolve(tempPath);
            } else {
                resolve("");
            }
        });
    });
}

// can remove the openAI API key
async function writeTranscriptFallback(videoId: string) {
    let audioPath: string | null = null;
    const startWriteTime = Date.now();
    try {
        const videoFilePath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
        audioPath = (await extractAudio(videoFilePath, videoId)) as string;

        console.log("writeTranscriptFallback | audioPath", audioPath);
        // use the node whisper

        const whisperStartTime = Date.now();
        let resultantTranscript = "";
        // const fileStream = fs.createReadStream(audioPath);
        const options = {
            modelName: "base.en",
            whisperOptions: {
                // gen_file_vtt: true,
                gen_file_txt: false,
            },
        };
        console.log("options", options);
        const safePath = await toSafePath(audioPath, videoId);
        console.log("writeTranscriptFallback | safePath", safePath);
        const resultantTranscriptLines = await whisper(safePath, options);
        console.log("writeTranscriptFallback | resultantTranscriptLines", resultantTranscriptLines);
        if (!resultantTranscriptLines) {
            throw Error("Failed to create transcript");
        }
        resultantTranscriptLines.forEach((transcriptLine: any) => {
            const { speech } = transcriptLine;
            resultantTranscript += speech + " ";
        });

        const whisperEndTime = Date.now();
        console.log(
            `writeTranscriptFallback | whisper lib | time taken in ms:${whisperEndTime - whisperStartTime}`
        );
        // then combine the transcript
        return resultantTranscript;
    } catch (e) {
        console.log("writeTranscriptFallback | e", e);
        return null;
    } finally {
        const endWriteTime = Date.now();
        console.log(
            `writeTranscriptFallback | whole process |time taken in ms:${endWriteTime - startWriteTime}`
        );
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
