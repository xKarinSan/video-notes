import { parentPort } from "worker_threads";
import { summariseChunkPrompt, combineSummariesPrompt } from "../../prompts.ts";
import { pipeline } from "@huggingface/transformers";
import util from "node:util";

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

const pipe = await pipeline(TASK, MODEL, {
    device: "cpu",
});

// token safe helpers
const MAX_INPUT_TOKENS_PER_CHUNK = 768;
const MAX_INPUT_TOKENS_FINAL = 1024;

const MAX_NEW_TOKENS_CHUNK = 192;
const MAX_NEW_TOKENS_FINAL = 256;

// truncate tokens
function truncateByTokens(text: string, maxTokens: number): string {
    const tok: any = (pipe as any)?.tokenizer;
    if (!tok?.encode) return text.length > 8000 ? text.slice(-8000) : text; // char fallback
    const ids = tok.encode(text, { addSpecialTokens: false });
    if (ids.length <= maxTokens) return text;
    return tok.decode(ids.slice(-maxTokens), { skipSpecialTokens: true });
}

function applyChatTemplate(messages: ChatMessage[]): string {
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
function buildPromptFromMessages(
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
    return applyChatTemplate(truncated);
}
async function generateText(prompt: string, maxNew: number, isFinal: boolean) {
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
        const messages: ChatMessage[] = [
            {
                role: "system",
                content: isFinal
                    ? combineSummariesPrompt
                    : summariseChunkPrompt,
            },
            { role: "user", content: chunk },
        ];
        const prompt = buildPromptFromMessages(messages, isFinal);
        // keep new tokens modest for CPU stability
        const out = await generateText(
            prompt,
            isFinal ? MAX_NEW_TOKENS_FINAL : MAX_NEW_TOKENS_CHUNK,
            isFinal
        );

        // Debug print (expanded)
        console.log(
            "summariseIndividualChunk | isFinal:",
            isFinal,
            "| out.len:",
            out?.length ?? 0
        );
        return out ?? "";
    } catch (e: any) {
        console.error("summariseIndividualChunk | ERROR:", e);
        return "";
    }
}

// async function summariseIndividualChunk(
//     chunk: string,
//     isFinal: boolean = false
// ) {
//     try {
//         console.log("summariseIndividualChunk | chunk", chunk);
//         console.log("summariseIndividualChunk | isFinal", isFinal);

//         const messages = [
//             {
//                 role: "system",
//                 content: isFinal
//                     ? combineSummariesPrompt
//                     : summariseChunkPrompt,
//             },
//             { role: "user", content: chunk },
//         ];
//         const pipeRes = await pipe(messages, {
//             max_new_tokens: isFinal ? 256 : 500,
//             do_sample: false,
//             repetition_penalty: 1.2,
//             return_full_text: false,
//         });
//         console.log(
//             "summariseIndividualChunk | pipeRes",
//             util.inspect(pipeRes, {
//                 depth: null, // or Infinity
//                 colors: true,
//                 compact: false,
//                 maxArrayLength: null, // show full arrays
//                 maxStringLength: null, // don't truncate long strings
//             })
//         );

//         const generatedRes = pipeRes?.[0]?.generated_text;
//         if (!generatedRes) return "";

//         // Case 1: chat-shaped
//         if (Array.isArray(generatedRes)) {
//             const last = generatedRes[generatedRes.length - 1];
//             return typeof last?.content === "string" ? last.content.trim() : "";
//         }

//         // Case 2: single string (prompt + completion)
//         if (typeof generatedRes === "string") return generatedRes.trim();

//         return "";
//     } catch (e) {
//         console.log("summariseIndividualChunk | e", e);
//         return null;
//     }
// }

async function summariseAllChunks(chunks: string[]) {
    return Promise.all(chunks.map((c) => summariseIndividualChunk(c, false)));
}

parentPort?.on("message", async (m: SummaryWorkerInput) => {
    const { id, chunks } = m;
    let outMsg = {};
    try {
        const perChunkSummaries = await summariseAllChunks(chunks);
        console.log(
            "summaryWorker | perChunkSummaries",
            util.inspect(perChunkSummaries, {
                depth: null, // or Infinity
                colors: true,
                compact: false,
                maxArrayLength: null, // show full arrays
                maxStringLength: null, // don't truncate long strings
            })
        );
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
        console.log("summaryWorker | outMsg", outMsg);
        parentPort!.postMessage(outMsg as SummaryWorkerOutput);
    }
});

export type { SummaryWorkerOutput };
