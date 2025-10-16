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
// const MODEL = "Falconsai/text_summarization"
// const MODEL = "openai/gpt-oss-20b";
const MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct";
// const TASK = "summarization"
const TASK = "text-generation";

const pipe = await pipeline(TASK, MODEL);

async function summariseIndividualChunk(
    chunk: string,
    isFinal: boolean = false
) {
    console.log("summariseIndividualChunk | chunk", chunk);
    console.log("summariseIndividualChunk | isFinal", isFinal);

    const messages = [
        {
            role: "system",
            content: isFinal ? combineSummariesPrompt : summariseChunkPrompt,
        },
        { role: "user", content: chunk },
    ];
    const pipeRes = await pipe(messages, {
        max_new_tokens: 500,
    });
    console.log("summariseIndividualChunk | pipeRes", pipeRes);

    const generatedRes = pipeRes[0].generated_text;
    console.log(
        "summariseIndividualChunk | pipeRes[0]",
        pipeRes[0].generated_text
    );

    const lastMessage = generatedRes[generatedRes.length - 1];
    console.log("summariseIndividualChunk | lastMessage", lastMessage);
    const output = lastMessage.content;
    return String(output);
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
