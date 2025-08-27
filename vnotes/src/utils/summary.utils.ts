import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { combineSummariesPrompt, summariseChunkPrompt } from "../prompts";

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
    console.log("summariseCombinedSummaries | openAiKey", openAiKey);

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

export { splitToChunks, summariseCombinedSummaries };
