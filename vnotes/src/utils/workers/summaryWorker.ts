import { parentPort, workerData } from "worker_threads";
import { ChatOpenAI } from "@langchain/openai";
import { summariseChunkPrompt, combineSummariesPrompt } from "../../prompts.ts";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const { chunks, openAiKey } = workerData;

const perChunkModel = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    apiKey: openAiKey,
});
const combinedmodel = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    apiKey: openAiKey,
    temperature: 0.2,
});

const perChunkChain =
    ChatPromptTemplate.fromTemplate(summariseChunkPrompt).pipe(perChunkModel);
const finalChain = ChatPromptTemplate.fromTemplate(combineSummariesPrompt).pipe(
    combinedmodel
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
    return Promise.all(
        chunks.map((c) => summariseIndividualChunk(c))
    );
}

const perChunkSummaries = await summariseAllChunks(chunks);
const combined = await finalChain.invoke({
    summaries: perChunkSummaries.join("\n\n"),
});

parentPort?.postMessage(combined);
