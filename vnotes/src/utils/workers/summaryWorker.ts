import { parentPort, workerData } from "worker_threads";
import { ChatOpenAI } from "@langchain/openai";
import { summariseChunkPrompt, combineSummariesPrompt } from "../../prompts.ts";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pipeline } from "@huggingface/transformers";

interface SummaryWorkerInput {
    id: number;
    chunks: string[];
}
interface SummaryWorkerOutput {
    id: number;
    success: boolean;
    finalCombined: string | null;
}

const PER_CHUNK_MAX_NEW_TOKENS = 120; // short-ish, fast per chunk
const PER_CHUNK_MIN_NEW_TOKENS = 40;

const FINAL_MAX_NEW_TOKENS = 400; // longer final pass
const FINAL_MIN_NEW_TOKENS = 150;

const summariser = await pipeline("summarization", "Falconsai/text_summarization");

async function summariseIndividualChunk(
    chunk: string,
    isFinal: boolean = false
) {
    /*
    1) OpenAI call to summarise (take in the OpenAI key from the main process)
    2) return the result. this does NOT have to be in paragraphs
    */
    const summarisedChunk = await summariser([chunk], {
        // Give the model room, esp. for the final pass
        max_new_tokens: isFinal
            ? FINAL_MAX_NEW_TOKENS
            : PER_CHUNK_MAX_NEW_TOKENS,
        min_new_tokens: isFinal
            ? FINAL_MIN_NEW_TOKENS
            : PER_CHUNK_MIN_NEW_TOKENS,
        // Be explicit about truncation behavior
        // Optional but often helpful:
        no_repeat_ngram_size: 3,
        // temperature / top_p can help detail; keep default if you want determinism
    });

    if (Array.isArray(summarisedChunk)) {
        return summarisedChunk
            .map((r: any) => r.summary_text || r.summary || r.text || String(r))
            .join("\n");
    }

    if (typeof summarisedChunk === "object" && summarisedChunk !== null) {
        return (
            summarisedChunk.summary_text ||
            summarisedChunk.summary ||
            summarisedChunk.text ||
            JSON.stringify(summarisedChunk)
        );
    }
    return String(summarisedChunk);
}

async function summariseAllChunks(chunks: string[]) {
    return Promise.all(chunks.map((c) => summariseIndividualChunk(c, false)));
}

parentPort?.on("message", async (m: SummaryWorkerInput) => {
    const { id, chunks } = m;
    let outMsg = {};
    try {
        const perChunkSummaries = await summariseAllChunks(chunks);
        const summary = await summariseIndividualChunk(
            perChunkSummaries.join("\n\n"),
            true
        );
        outMsg = {
            id,
            success: true,
            finalCombined: summary,
        };
    } catch (e) {
        console.log("summaryWorker | e", e);
        outMsg = {
            id,
            success: false,
            finalCombined: null,
        };
    } finally {
        console.log("summaryWorker | outMsg", outMsg);
        parentPort!.postMessage(outMsg as SummaryWorkerOutput);
    }
});

export type { SummaryWorkerOutput };
