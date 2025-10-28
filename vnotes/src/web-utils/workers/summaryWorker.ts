import "onnxruntime-web/webgpu";
import * as ort from "onnxruntime-web";
import { env as HFenv } from "@huggingface/transformers";
import { SUMMARISATION_MODEL, SUMMARISATION_TASK } from "../../const";

HFenv.backends.onnx.preferredBackend = "webgpu";
HFenv.useBrowserCache = true;

(ort.env as any).webgpu = (ort.env as any).webgpu || {};
(ort.env as any).webgpu.powerPreference = "high-performance";
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

// get pipe
let summaryPipe: any = null;

async function makePipes(device: "webgpu" | "cpu" = "webgpu") {
    try {
        console.log("makePipes | cooking");

        const summaryPipe = await pipeline(
            SUMMARISATION_TASK,
            SUMMARISATION_MODEL,
            { device, dtype: "fp32" }
        );

        return { sp: summaryPipe };
    } catch (e) {
        console.log("makePipes | e", e);
        return { sp: null, rp: null };
    }
}
// for individual chunk
async function summariseIndividualChunk(chunk: string): Promise<string> {
    try {
        console.log("summariseIndividualChunk | chunk", chunk);
        const chunkSummary = await summaryPipe(chunk, {
            num_beams: 8,
            do_sample: false,
        });
        const summaryContent = chunkSummary?.[0]?.summary_text ?? "";
        console.log(
            "summariseIndividualChunk | summaryContent",
            summaryContent
        );

        return summaryContent ?? "";
    } catch (e: any) {
        console.error("summariseIndividualChunk | ERROR:", e);
        return "";
    }
}

const limit = <T>(jobs: Array<() => Promise<T>>, n: number) => {
    let i = 0; // shared cursor
    console.log("limit | triggered");
    const worker = async () => {
        const out: T[] = [];
        while (i < jobs.length) {
            const j = i++; // capture index synchronously (no race in JS)
            out.push(await jobs[j]());
        }
        return out;
    };
    return Promise.all(new Array(n).fill(0).map(worker)).then((x) => x.flat());
};

async function summariseAllChunks(chunks: string[]) {
    console.log("summariseAllChunks | triggered");
    const jobs = chunks.map((c) => () => summariseIndividualChunk(c));
    return limit(jobs, 4);
}

self.onmessage = async (m: MessageEvent<SummaryWorkerInput>) => {
    const { id, chunks } = m.data;
    let outMsg = {};
    try {
        console.log("onmessage | m", m);
        const { sp } = await makePipes("webgpu");
        console.log("pipes made");
        summaryPipe = sp;
        console.log("summaryWorker | message received");
        // 1) summaris all chunks
        const perChunkSummaries = await summariseAllChunks(chunks);
        let combinedSummaries = "";
        console.log("summaryWorker | perChunkSummaries", perChunkSummaries);

        // 2) combine the summaries
        perChunkSummaries.forEach((summary: string) => {
            combinedSummaries += summary + "\n\n";
        });

        console.log("summaryWorker | perChunkSummaries", combinedSummaries);
        // 3) combine results from step 2 and reformat

        outMsg = {
            id,
            success: true,
            finalCombined: combinedSummaries,
        };
    } catch (e) {
        console.log("summaryWorker | e", e);
        outMsg = {
            id,
            success: false,
            finalCombined: null,
        };
    } finally {
        console.log("summaryWorker | ended");
        self!.postMessage(outMsg);
    }
};

export type { SummaryWorkerOutput };
