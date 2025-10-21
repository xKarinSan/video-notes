import "onnxruntime-web/webgpu";
import * as ort from "onnxruntime-web";

import { summariseChunkPrompt, combineSummariesPrompt } from "../../prompts.ts";
import { env as HFenv } from "@huggingface/transformers";

console.log("[worker] navigator.gpu?", !!navigator?.gpu);
console.log("[worker] ORT webgpu object exists?", !!ort.env.webgpu);

HFenv.backends.onnx.preferredBackend = "webgpu";
HFenv.backends.onnx.wasm.numThreads = 1;
HFenv.backends.onnx.webgpu?.setDefaultDeviceType?.("gpu");

import { pipeline, ChatMessage } from "@huggingface/transformers";
interface SummaryWorkerInput {
    id: number;
    chunks: string[];
}
interface SummaryWorkerOutput {
    id: number;
    success: boolean;
    finalCombined: string | null;
}

// type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct";
const TASK = "text-generation";

// token safe helpers
const MAX_INPUT_TOKENS_PER_CHUNK = 768;
const MAX_INPUT_TOKENS_FINAL = 1024;

const MAX_NEW_TOKENS_CHUNK = 192;
const MAX_NEW_TOKENS_FINAL = 256;

// get pipe
let pipePromise: Promise<any> | null = null;
async function getPipe() {
    if (!pipePromise) {
        console.log("[worker] creating pipeline…");
        pipePromise = await pipeline(TASK, MODEL, {
            device: "webgpu",
            dtype: "fp32",
        });
    }
    return pipePromise;
}

async function formatChat(messages: ChatMessage[]): Promise<string> {
    const pipe = await getPipe();
    const token: any = (pipe as any)?.tokenizer;
    if (token?.apply_chat_template) {
        return token.apply_chat_template(messages, {
            add_generation_prompt: true,
            tokenize: false,
        });
    }
    const lines = messages.map((m) => {
        const role = m.role.toUpperCase();
        return role === "SYSTEM"
            ? `<<SYS>>\n${m.content}\n<</SYS>>`
            : `${role}: ${m.content}`;
    });
    lines.push("ASSISTANT:");
    return lines.join("\n");
}

function extractBetweenTags(text: string, tag: string): string {
    const start = `<${tag}>`;
    const end = `</${tag}>`;

    const i = text.indexOf(start);
    const j = text.indexOf(end, i + start.length);

    if (i !== -1 && j !== -1) {
        const inner = text.slice(i + start.length, j).trim();
        return stripLeadingQuotes(inner);
    }

    if (i !== -1) {
        const inner = text.slice(i + start.length).trim();
        return stripLeadingQuotes(inner);
    }

    return stripLeadingQuotes(
        text
            .replace(
                /^(\s*here('|’)?s|\s*this\s*(is|are)|\s*your)\b[^:]*:/i,
                ""
            )
            .trim()
    );
}

function stripLeadingQuotes(s: string): string {
    return s.replace(/^["“”]+/, "").replace(/["“”]+$/, "");
}

async function truncateByTokens(
    text: string,
    maxTokens: number
): Promise<string> {
    const pipe = await getPipe();
    const token: any = (pipe as any)?.tokenizer;
    if (!token?.encode) return text.length > 8000 ? text.slice(0, 8000) : text;

    const ids = token.encode(text, { addSpecialTokens: false });
    const cut = ids.length <= maxTokens ? ids : ids.slice(0, maxTokens);
    return token.decode(cut, { skipSpecialTokens: true });
}

async function generateText(messages: ChatMessage[], maxNew: number) {
    console.log("generateText | starting");
    const prompt = await formatChat(messages);
    const pipe = await getPipe();
    const res = await pipe(prompt, {
        max_new_tokens: maxNew,
        do_sample: false,
        temperature: 0,
        repetition_penalty: 1.0,
        return_full_text: false,
        stop: [
            "\n\n",
            "</CHUNK_SUMMARY>",
            "</FINAL_SUMMARY>",
            "ASSISTANT:",
            "<<SYS>>",
            "```",
            '"}\n',
        ],
    });
    const full = res?.[0]?.generated_text ?? "";
    return full;
}

async function summariseIndividualChunk(
    chunk: string,
    isFinal = false
): Promise<string> {
    try {
        const truncatedChunk = await truncateByTokens(
            chunk,
            isFinal ? MAX_INPUT_TOKENS_FINAL : MAX_INPUT_TOKENS_PER_CHUNK
        );

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: isFinal
                    ? combineSummariesPrompt
                    : summariseChunkPrompt,
            },
            { role: "user", content: truncatedChunk },
        ];
        const rawRes = await generateText(
            messages,
            isFinal ? MAX_NEW_TOKENS_FINAL : MAX_NEW_TOKENS_CHUNK
        );
        const res = isFinal
            ? extractBetweenTags(rawRes, "FINAL_SUMMARY")
            : extractBetweenTags(rawRes, "CHUNK_SUMMARY");
        return res ?? "";
    } catch (e: any) {
        console.error("summariseIndividualChunk | ERROR:", e);
        return "";
    }
}

async function summariseAllChunks(chunks: string[]) {
    console.log("summariseAllChunks | starting");
    console.log("summariseAllChunks | chunks", chunks);
    const results = [];
    for (const c of chunks) {
        const s = await summariseIndividualChunk(c, false);
        results.push(s.trim());
    }
    return results;
}

self.onmessage = async (m: MessageEvent<SummaryWorkerInput>) => {
    console.log("summaryWorker | message | received!");
    const { id, chunks } = m.data;
    console.log("summaryWorker | id", id);
    let outMsg = {};
    try {
        const perChunkSummaries = await summariseAllChunks(chunks);
        let combinedSummaries = "";
        perChunkSummaries.forEach((summary: string) => {
            // const currentAns = chat[chat.length - 1].content;
            combinedSummaries += summary + "\n\n";
        });
        console.log("summaryWorker | perChunkSummaries", combinedSummaries);

        const finalCombined: string = await summariseIndividualChunk(
            combinedSummaries,
            true
        );
        console.log("summaryWorker | finalCombined", finalCombined);
        outMsg = {
            id,
            success: true,
            finalCombined,
        };
    } catch (e) {
        console.log("summaryWorker | e", e);
        outMsg = {
            id,
            success: false,
            finalCombined: null,
        };
    } finally {
        // console.log("summaryWorker | outMsg", outMsg);
        self!.postMessage(outMsg);
    }
};

async function benchOnce(msg: string) {
    console.time(msg);
    const pipe = await getPipe();
    const out = await pipe("hello", { max_new_tokens: 8, do_sample: false });
    console.timeEnd(msg);
}

// Warm-up + run a few
await benchOnce("[webgpu] warmup");
await benchOnce("[webgpu] gen1");
await benchOnce("[webgpu] gen2");

export type { SummaryWorkerOutput };
