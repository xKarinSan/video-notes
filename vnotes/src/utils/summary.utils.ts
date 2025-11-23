import { ChatOpenAI } from "@langchain/openai";
import path from "node:path";
import { PATHS } from "../../const";
import {
    createPartFromUri,
    createUserContent,
    GoogleGenAI,
} from "@google/genai";

import { videoSummaryPrompt } from "../prompts";
import { execFile } from "node:child_process";
import { ensureDir, fileExists } from "./files.utils";
import Store from "electron-store";

import { spawn } from "child_process";
import { createRequire } from "node:module";
import { logErrorToFile, logMessageToFile } from "./logging.utils";

interface FileAPIMetadata {
    fileName: string;
    expirationTime: string; // date timestamp
}

let ai: GoogleGenAI | null = null;
// new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
function initGeminiClient(apiKey: string) {
    logMessageToFile(apiKey, "summary.utils.js", "initGeminiClient");

    try {
        if (!apiKey) {
            throw new Error("Gemini API key is missing");
        }
        if (!ai) {
            ai = new GoogleGenAI({ apiKey });
        }
    } catch (e) {
        logErrorToFile(e as Error, "summary.utils.ts", "initGeminiClient");
    }
}

const requireRuntime = createRequire(import.meta.url);

export function resolveFfmpegPath(): string {
    let p = requireRuntime("ffmpeg-static") as string; // absolute path to ffmpeg
    // When packaged, make sure we point to the unpacked copy
    if (p.includes("app.asar")) p = p.replace("app.asar", "app.asar.unpacked");
    return p;
}

async function compressVideoTo1FPS(
    inputPath: string,
    outputPath: string
): Promise<string> {
    const ffmpegPath = resolveFfmpegPath();
    return new Promise((resolve) => {
        const args = [
            "-y",
            "-i",
            inputPath,

            // video filters / compression
            "-vf",
            "scale=640:-2", // downscale width to 640, keep aspect
            "-r",
            "1", // 1 FPS

            // video codec settings
            "-vcodec",
            "libx264",
            "-crf",
            "30",
            "-preset",
            "veryfast",

            // audio settings (optional but same as your original)
            "-acodec",
            "aac",
            "-b:a",
            "64k",

            outputPath,
        ];

        const proc = spawn(ffmpegPath as string, args, { stdio: "inherit" });

        proc.on("close", (code) => {
            if (code === 0) resolve(outputPath);
            else resolve("");
        });
    });
}

function splitToParagraphs(text: string): string[] {
    return text
        .split(/\r?\n\s*\r?\n+/) // blank-line delimiters
        .map((p) => p.trim())
        .filter(Boolean);
}

async function waitUntilActive(
    fileOrName: string,
    maxAttempts = 30,
    delayMs = 2000
) {
    let file =
        typeof fileOrName === "string"
            ? await ai.files.get({ name: fileOrName })
            : fileOrName;

    for (let i = 0; i < maxAttempts; i++) {
        console.log("waitUntilActive | file", file);
        console.log("waitUntilActive | attempt", i);
        if (file.state === "ACTIVE") return file;

        if (file.state === "FAILED") {
            const reason =
                file?.error?.message ||
                file?.error ||
                "Unknown processing error";
            throw new Error(`File processing failed: ${reason}`);
        }

        await new Promise((r) => setTimeout(r, delayMs));

        // re-fetch updated state
        file = await ai.files.get({ name: file.name });
    }
}

function runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        execFile(ffmpegPath, args, (error, stdout, stderr) => {
            if (error) {
                console.error(`ffmpeg stderr: ${stderr}`);
                reject(error);
                return;
            }
            // Optional: log success output
            // console.log(`ffmpeg stdout: ${stdout}`);
            resolve();
        });
    });
}

async function summariseVideo(videoId: string) {
    const store = new Store();
    const start = performance.now();

    await ensureDir(PATHS.COMPRESSED_VIDEOS_DIR);
    const tempFileName = `${videoId}.mp4`;
    const tempOutputPath = path.join(PATHS.COMPRESSED_VIDEOS_DIR, tempFileName);

    const isCompressed = await fileExists(tempOutputPath);
    if (!isCompressed) {
        console.log("Compressing ....");
        const compressionStart = performance.now();
        const notesItemFilePath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
        await compressVideoTo1FPS(notesItemFilePath, tempOutputPath);
        const compressionEnd = performance.now();
        console.log(
            `Execution time (compression): ${compressionEnd - compressionStart} ms`
        );
    }
    let file = null;
    let fileInStore = true;
    let cached: FileAPIMetadata | null = store.get(
        "geminiFile." + videoId
    ) as FileAPIMetadata;
    if (cached == null) {
        fileInStore = false;
    } else {
        // retrieve from the API
        const { fileName, expirationTime } = cached;
        const expirationDate = new Date(expirationTime);
        const currDate = new Date();

        if (currDate <= expirationDate) {
            file = await ai.files.get({ name: fileName });
        } else {
            fileInStore = false;
        }
    }

    if (!fileInStore) {
        console.log("Uploading to Google's file API ....");
        const uploadStart = performance.now();
        file = await ai.files.upload({
            file: tempOutputPath,
            config: { mimeType: "video/mp4" },
        });
        file = await waitUntilActive(file?.name || "");
        store.set("geminiFile." + videoId, {
            fileName: file?.name || "",
            expirationTime: file?.expirationTime,
        });
        const uploadEnd = performance.now();
        console.log(`Execution time (upload): ${uploadEnd - uploadStart} ms`);
        console.log("File processed!");
    }

    console.log("Summarising video ....");
    const summaryStart = performance.now();
    const results = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: createUserContent([
            createPartFromUri(file.uri, file.mimeType),
            videoSummaryPrompt,
        ]),
    });
    const summaryEnd = performance.now();
    console.log(`Execution time (summary): ${summaryEnd - summaryStart} ms`);

    const end = performance.now();
    const duration = end - start;
    console.log(`Execution time: ${duration} ms`);
    const combinedText =
        typeof results.text === "string" ? results.text : String(results.text);
    return splitToParagraphs(combinedText);
}

export { summariseVideo, initGeminiClient };
