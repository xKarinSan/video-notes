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
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
const getFileMeta = async (f: any) => {
    if (ai.files.get) {
        try {
            return await ai.files.get(f.name ?? f.uri ?? f);
        } catch (err) {
            return null;
        }
    }
    return f;
};

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

async function summariseVideo(videoId: string) {
    const start = performance.now();
    const notesItemFilePath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
    let file = await ai.files.upload({
        file: notesItemFilePath,
        config: { mimeType: "video/mp4" },
    });

    file = await waitUntilActive(file.name);
    console.log("File processed!");

    const results = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: createUserContent([
            createPartFromUri(file.uri, file.mimeType),
            videoSummaryPrompt,
        ]),
    });
    const end = performance.now();
    const duration = end - start;
    console.log(`Execution time: ${duration} ms`);
    const combinedText =
        typeof results.text === "string" ? results.text : String(results.text);
    return splitToParagraphs(combinedText);
}

export { splitToChunks, summariseCombinedSummaries, summariseVideo };
