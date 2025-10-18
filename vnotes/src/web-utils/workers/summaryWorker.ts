import "onnxruntime-web/webgpu";
import * as ort from "onnxruntime-web";

import { summariseChunkPrompt, combineSummariesPrompt } from "../../prompts.ts";
import { env as HFenv } from "@huggingface/transformers";

console.log("[worker] navigator.gpu?", !!navigator?.gpu);
console.log("[worker] ORT webgpu object exists?", !!ort.env.webgpu);

// Prefer ONNX backend + WebGPU explicitly
HFenv.backends.onnx.preferredBackend = "webgpu";
// Optional: reduce WASM thread noise and memory pressure
HFenv.backends.onnx.wasm.numThreads = 1;
// Optional: pick fp16 when possible (faster on many GPUs)
HFenv.backends.onnx.webgpu?.setDefaultDeviceType?.("gpu"); // defensive

import { pipeline } from "@huggingface/transformers"; // 5) create pipeline after prefs
interface SummaryWorkerInput {
    id: number;
    chunks: string[];
}
interface SummaryWorkerOutput {
    id: number;
    success: boolean;
    finalCombined: string | null;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct";
const TASK = "text-generation";

// const pipe = await pipeline(TASK, MODEL, {
//     device: "webgpu",
//     dtype: "fp16",
// });

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
            dtype: "fp16",
        });
    }
    return pipePromise;
}

// truncate tokens
async function truncateByTokens(text: string, maxTokens: number): string {
    const pipe = await getPipe();
    const tok: any = (pipe as any)?.tokenizer;
    if (!tok?.encode) return text.length > 8000 ? text.slice(-8000) : text; // char fallback
    const ids = tok.encode(text, { addSpecialTokens: false });
    if (ids.length <= maxTokens) return text;
    return tok.decode(ids.slice(-maxTokens), { skipSpecialTokens: true });
}

async function applyChatTemplate(messages: ChatMessage[]): string {
    const pipe = await getPipe();
    const tok: any = (pipe as any)?.tokenizer;
    if (tok?.apply_chat_template) {
        return tok.apply_chat_template(messages, {
            tokenize: false,
            add_generation_prompt: true, // tells the model it's the assistant's turn
        });
    }
    const lines: string[] = [];
    for (const m of messages) {
        if (m.role === "system") lines.push(`### System:\n${m.content}`);
        else if (m.role === "user") lines.push(`### User:\n${m.content}`);
        else lines.push(`### Assistant:\n${m.content}`);
    }
    lines.push("### Assistant:\n");
    return lines.join("\n\n");
}

// chat prompt
async function buildPromptFromMessages(
    messages: ChatMessage[],
    isFinal: boolean
): string {
    const maxTokens = isFinal
        ? MAX_INPUT_TOKENS_FINAL
        : MAX_INPUT_TOKENS_PER_CHUNK;
    const truncated = messages.map((m) =>
        m.role === "user"
            ? { ...m, content: truncateByTokens(m.content, maxTokens) }
            : m
    );
    return await applyChatTemplate(truncated);
}
async function generateText(prompt: string, maxNew: number, isFinal: boolean) {
    console.log("generateText | starting");
    const pipe = await getPipe();
    const res = await pipe(prompt, {
        max_new_tokens: maxNew,
        do_sample: false,
        temperature: 0,
        repetition_penalty: 1.1,
        return_full_text: !isFinal,
    });
    const full = res?.[0]?.generated_text ?? "";
    return full.startsWith(prompt)
        ? full.slice(prompt.length).trim()
        : full.trim();
}

async function summariseIndividualChunk(
    chunk: string,
    isFinal = false
): Promise<string> {
    try {
        console.log("summariseIndividualChunk | starting");
        const messages: ChatMessage[] = [
            {
                role: "system",
                content: isFinal
                    ? combineSummariesPrompt
                    : summariseChunkPrompt,
            },
            { role: "user", content: chunk },
        ];
        const prompt = await buildPromptFromMessages(messages, isFinal);
        // keep new tokens modest for CPU stability
        const out = await generateText(
            prompt,
            isFinal ? MAX_NEW_TOKENS_FINAL : MAX_NEW_TOKENS_CHUNK,
            isFinal
        );

        // Debug print (expanded)
        // console.log(
        //     "summariseIndividualChunk | isFinal:",
        //     isFinal,
        //     "| out.len:",
        //     out?.length ?? 0
        // );
        return out ?? "";
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
        results.push(s);
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
        const combinedSummaries = perChunkSummaries.join("\n\n");
        console.log("summaryWorker | combinedSummaries", combinedSummaries);
        const summary = await summariseIndividualChunk(combinedSummaries, true);
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
