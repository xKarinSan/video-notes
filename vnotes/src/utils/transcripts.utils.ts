import fsp from "node:fs/promises";
import pLimit from "p-limit";

import fs from "node:fs";
import * as os from "os";
import path from "node:path";
import { PATHS } from "../../const";
import { ensureDir, fileExists } from "./files.utils";
import { TranscriptResponse } from "youtube-transcript-plus/dist/types";
import whisper from "./whisper.utils";
import { spawn } from "child_process";
import { createRequire } from "node:module";
import { decode } from "node-wav";

const requireRuntime = createRequire(import.meta.url);

function resolveFfmpegPath(): string {
    let p = requireRuntime("ffmpeg-static") as string; // absolute path to ffmpeg
    if (p.includes("app.asar")) p = p.replace("app.asar", "app.asar.unpacked");
    return p;
}

async function toSafePath(srcWavPath: string, videoId: string) {
    const safeDir = path.join(os.tmpdir(), "vnotes-whisper");
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
            "-i",
            videoPath,
            "-map",
            "0:a:0",
            "-vn",
            "-sn",
            "-dn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            tempPath,
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

function pickConcurrency(chunkSec: number, nThreadsPerJob = 4) {
    // no of cpus in the user's device
    const cores = os.cpus().length;
    console.log("pickConcurrency | cores", cores);
    const maxByThreads = Math.max(
        1,
        Math.floor((0.7 * cores) / nThreadsPerJob)
    );
    const maxByWall = Math.max(1, Math.floor(300 / Math.max(1, chunkSec)));

    return maxByThreads;
}

async function splitAudioToWavChunks(videoPath: string, seconds = 60) {
    const ffmpegPath = resolveFfmpegPath();
    const outDir = path.join(os.tmpdir(), "vnotes-whisper");
    await ensureDir(outDir);
    await fsp.mkdir(outDir, { recursive: true });
    const wavPattern = path.join(outDir, "audio_%03d.wav");

    const args = [
        "-y",
        "-i",
        videoPath,
        "-map",
        "0:a:0",
        "-vn",
        "-sn",
        "-dn",
        "-f",
        "segment",
        "-segment_time",
        String(seconds),
        "-reset_timestamps",
        "1",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        wavPattern,
    ];

    return new Promise<string[]>(async (resolve) => {
        const proc = spawn(ffmpegPath as string, args, { stdio: "inherit" });
        proc.on("close", async (code) => {
            if (code !== 0) return resolve([]);
            const files = (await fsp.readdir(outDir))
                .filter((f) => /^audio_\d{3}\.wav$/.test(f))
                .sort() // sorts in order
                .map((f) => path.join(outDir, f));

            resolve(files);
        });
    });
}

async function transcribeChunk(path: string) {
    let resultantChunkTranscript = "";

    const { channelData } = decode(fs.readFileSync(path));
    const chunkTranscriptionResult = await whisper.transcribe(channelData[0]);
    // console.log(await whisper.getSystemInfo());

    const { result } = chunkTranscriptionResult;

    return result;
}

async function transcribeInParallel(chunkPaths: string[], chunkSize: number) {
    const concurrencyCount = pickConcurrency(chunkSize);
    const limit = pLimit(concurrencyCount);
    const tasks = chunkPaths.map((chunkPath, idx) =>
        limit(async () => {
            const text = await transcribeChunk(chunkPath);
            return { index: idx, content: text };
        })
    );
    const out = await Promise.all(tasks);
    out.sort((a, b) => a.index - b.index);
    let resultantTranscript = "";
    out.forEach((result) => {
        resultantTranscript += result.content + " ";
    });
    return resultantTranscript;
}

async function writeTranscriptFallback(videoId: string) {
    let audioPath: string | null = null;
    const startWriteTime = Date.now();
    try {
        let resultantTranscript = "";
        const videoFilePath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
        const audioPath = (await extractAudio(
            videoFilePath,
            videoId
        )) as string;
        const safePath = await toSafePath(audioPath, videoId);

        const whisperStartTime = Date.now();
        const { channelData } = decode(fs.readFileSync(safePath));
        const transcriptResults = await whisper.transcribe(channelData[0],{
            speed_up: true,
            
        });
        const finalTranscript = await new Promise((resolve, reject) => {
            try {
                transcriptResults.on("transcribed", (result) => {
                    console.log("Transcribed", result.text);
                    resultantTranscript += result.text + " ";
                });

                transcriptResults.on("finish", () => {
                    console.log("writeTranscriptFallback | finished!");
                    const whisperEndTime = Date.now();
                    console.log(
                        `writeTranscriptFallback | whisper lib | time taken in ms: ${
                            whisperEndTime - whisperStartTime
                        }`
                    );
                    resolve(resultantTranscript);
                });
            } catch (e) {
                reject("Error in transcription");
            }
        });

        return finalTranscript;
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
