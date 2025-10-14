import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { combineSummariesPrompt, summariseChunkPrompt } from "../prompts";
import { Worker } from "worker_threads";
import path from "node:path";
import { AIMessageChunk } from "@langchain/core/messages";

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
// approx worker path "./src/utils/workers/summariseIndividualChunk.ts",

function splitToParagraphs(text: string): string[] {
    return text
        .split(/\r?\n\s*\r?\n+/) // blank-line delimiters
        .map((p) => p.trim())
        .filter(Boolean);
}

async function runSummaryWorker(chunks: string[], openAiKey: string) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            path.resolve("./src/utils/workers/summaryWorker.ts"),
            {
                workerData: {
                    chunks: chunks,
                    openAiKey: openAiKey,
                },
            }
        );
        worker.on("message", resolve);
        worker.on("error", reject);
    });
}

async function summariseCombinedSummaries(chunks: string[], openAiKey: string) {
    /*
    1) get the openai key
    2) run summariseIndividualChunk in parallel 
    3) combine the summaries from 1 and then summarise again. (take in the OpenAI key from the main process)
    3) return the ultimate summary in a string array. 1 item = 1 paragraph
*/
    const startTime = Date.now();
    const combinedResults = (await runSummaryWorker(
        chunks,
        openAiKey
    )) as AIMessageChunk;
    const endTime = Date.now();

    console.log(
        `summariseCombinedSummaries | time taken in ms:${endTime - startTime}`
    );
    const combinedText =
        typeof combinedResults.content === "string"
            ? combinedResults.content
            : String(combinedResults.content);

    return splitToParagraphs(combinedText);
}

export { splitToChunks, summariseCombinedSummaries };
