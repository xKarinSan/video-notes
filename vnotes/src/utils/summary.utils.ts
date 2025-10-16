import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Worker } from "worker_threads";
import path from "node:path";
import { SummaryWorkerOutput } from "./workers/summaryWorker";

let worker: Worker | null = null;
let seq = 1;
const pending = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: any) => void }
>();

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

function getSummaryWorker() {
    if (worker) return worker;
    worker = new Worker(path.resolve("./src/utils/workers/summaryWorker.ts"), {
        workerData: {
            id: seq,
        },
    });
    worker.on("message", (msg: any) => {
        const { id, success, finalCombined } = msg;
        const p = pending.get(id);
        if (!p) return;
        pending.delete(id);
        success
            ? p.resolve(finalCombined)
            : p.reject(new Error("Worker failed"));
    });
    return worker;
}

function callSummaryWorker(
    chunks: string[]
): Promise<SummaryWorkerOutput> {
    const id = seq++;
    return new Promise<SummaryWorkerOutput>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        getSummaryWorker().postMessage({ id, chunks });
    });
}

async function summariseCombinedSummaries(chunks: string[]) {
    /*
    1) get the openai key
    2) run summariseIndividualChunk in parallel 
    3) combine the summaries from 1 and then summarise again. (take in the OpenAI key from the main process)
    3) return the ultimate summary in a string array. 1 item = 1 paragraph
*/
    try {
        const startTime = Date.now();
        const combinedResults = await callSummaryWorker(chunks);
        const endTime = Date.now();
        console.log(
            `summariseCombinedSummaries | time taken in ms:${endTime - startTime}`
        );

        if (!combinedResults) {
            throw new Error("Failed to get summary");
        }

        const combinedText =
            typeof combinedResults === "string" ? combinedResults : String(combinedResults);

        return splitToParagraphs(combinedText);
    } catch (e) {
        console.log("summariseCombinedSummaries | E", e);
        return null;
    }
}

export { splitToChunks, summariseCombinedSummaries };
