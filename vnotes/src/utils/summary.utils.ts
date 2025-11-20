import { ChatOpenAI } from "@langchain/openai";
import path from "node:path";
import { PATHS } from "../../const";
import {
    createPartFromUri,
    createUserContent,
    GoogleGenAI,
} from "@google/genai";

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import {
    combineSummariesPrompt,
    summariseChunkPrompt,
    videoSummaryPrompt,
} from "../prompts";
import { execFile } from "node:child_process";
import { ensureDir, fileExists } from "./files.utils";
import Store from "electron-store";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface FileAPIMetadata {
    fileName: string;
    expirationTime: string; // date timestamp
}

async function splitToChunks(transcript: string) {
    /*
    1) split into chunks
    2) return the split chunks
*/

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    return splitter.splitText(transcript);
}

async function summariseIndividualChunk(chunk: string, openAiKey: string) {
    /*
    1) OpenAI call to summarise (take in the OpenAI key from the main process)
    2) return the result. this does NOT have to be in paragraphs
*/
    const model = new ChatOpenAI({
        model: "gpt-3.5-turbo",
        apiKey: openAiKey,
    });
    const prompt = ChatPromptTemplate.fromTemplate(summariseChunkPrompt);
    const chain = prompt.pipe(model);
    const msg = await chain.invoke({ chunk });
    return typeof msg.content === "string" ? msg.content : String(msg.content);
}

async function summariseAllChunks(chunks: string[], openAiKey: string) {
    return Promise.all(
        chunks.map((c) => summariseIndividualChunk(c, openAiKey))
    );
}

function splitToParagraphs(text: string): string[] {
    return text
        .split(/\r?\n\s*\r?\n+/) // blank-line delimiters
        .map((p) => p.trim())
        .filter(Boolean);
}

async function summariseCombinedSummaries(chunks: string[], openAiKey: string) {
    /*
    1) get the openai key
    2) run summariseIndividualChunk in parallel 
    3) combine the summaries from 1 and then summarise again. (take in the OpenAI key from the main process)
    3) return the ultimate summary in a string array. 1 item = 1 paragraph
*/
    const perChunkSummaries = await summariseAllChunks(chunks, openAiKey);
    const model = new ChatOpenAI({
        model: "gpt-3.5-turbo",
        apiKey: openAiKey,
        temperature: 0.2,
    });

    const prompt = ChatPromptTemplate.fromTemplate(combineSummariesPrompt);
    const chain = prompt.pipe(model);
    const combined = await chain.invoke({
        summaries: perChunkSummaries.join("\n\n"),
    });

    const combinedText =
        typeof combined.content === "string"
            ? combined.content
            : String(combined.content);

    return splitToParagraphs(combinedText);
}
// const getFileMeta = async (f: any) => {
//     if (ai.files.get) {
//         try {
//             return await ai.files.get(f.name ?? f.uri ?? f);
//         } catch (err) {
//             return null;
//         }
//     }
//     return f;
// };

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
        // TO DO: preprocess the video to 1FPS
        const ffmpeg_cmd = "ffmpeg"; // Ensure 'ffmpeg' is in your system's PATH, or provide the full path.

        const cmd = [
            "-y",
            "-i",
            notesItemFilePath,
            "-vf",
            "scale=640:-2", // downscale resolution
            "-r",
            "1", // 1 FPS
            "-vcodec",
            "libx264",
            "-crf",
            "30", // more compression
            "-preset",
            "veryfast",
            "-acodec",
            "aac",
            "-b:a",
            "64k",
            tempOutputPath,
        ];
        await runFfmpeg(ffmpeg_cmd, cmd);
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

export { splitToChunks, summariseCombinedSummaries, summariseVideo };
