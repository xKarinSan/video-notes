import { parentPort, workerData } from "worker_threads";
import { ChatOpenAI } from "@langchain/openai";
import { summariseChunkPrompt, combineSummariesPrompt } from "../../prompts.ts";
import { ChatPromptTemplate } from "@langchain/core/prompts";

interface SummaryWorkerInput {
    id: number;
    chunks: string[];
}
interface SummaryWorkerOutput {
    id: number;
    success: boolean;
    finalCombined: string | null;
}

const { openAiKey } = workerData;

const model = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    apiKey: openAiKey,
});

const perChunkChain =
    ChatPromptTemplate.fromTemplate(summariseChunkPrompt).pipe(model);
const finalChain = ChatPromptTemplate.fromTemplate(combineSummariesPrompt).pipe(
    model
);

async function summariseIndividualChunk(chunk: string) {
    /*
    1) OpenAI call to summarise (take in the OpenAI key from the main process)
    2) return the result. this does NOT have to be in paragraphs
*/
    const msg = await perChunkChain.invoke({ chunk });
    return typeof msg.content === "string" ? msg.content : String(msg.content);
}

async function summariseAllChunks(chunks: string[]) {
    return Promise.all(chunks.map((c) => summariseIndividualChunk(c)));
}

parentPort?.on("message", async (m: SummaryWorkerInput) => {
    const { id, chunks } = m;
    let outMsg = {};
    try {
        const perChunkSummaries = await summariseAllChunks(chunks);
        const summary = await finalChain.invoke({
            summaries: perChunkSummaries.join("\n\n"),
        });
        outMsg = {
            id,
            success: true,
            finalCombined: summary.content,
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
