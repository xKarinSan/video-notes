export interface SummaryWorkerOutput {
    id: number;
    success: boolean;
    finalCombined: string | null;
}

let worker: Worker | null = null;
const pending = new Map<
    number,
    {
        resolve: (s: SummaryWorkerOutput) => void;
        reject: (e: any) => void;
    }
>();

let seq = 1;

function splitToParagraphs(text: string): string[] {
    const res = text
        .split(/\r?\n\s*\r?\n+/) // blank-line delimiters
        .map((p) => p.trim())
        .filter(Boolean);
    console.log("splitToParagraphs | res", res);
    return res;
}

function getSummaryWorker() {
    console.log(
        "[worker] navigator.gpu present?",
        !!(self as any)?.navigator?.gpu
    );

    if (worker) return worker;
    worker = new Worker(
        new URL("./workers/summaryWorker.ts", import.meta.url),
        {
            type: "module",
            name: "summaryWorker",
        }
    );

    worker.onmessage = (ev: MessageEvent<SummaryWorkerOutput>) => {
        const { id, success, finalCombined } = ev.data;
        const p = pending.get(id);
        if (!p) return;
        pending.delete(id);
        success ? p.resolve(ev.data) : p.reject(new Error("Worker failed"));
    };
    console.log("getSummaryWorker | worker created");
    return worker;
}

function callSummaryWorker(chunks: string[]): Promise<SummaryWorkerOutput> {
    const id = seq++;
    return new Promise<SummaryWorkerOutput>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        getSummaryWorker();
        worker?.postMessage({ id, chunks });
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
        console.log("summariseCombinedSummaries | starting now");
        const startTime = Date.now();
        const combinedResults: SummaryWorkerOutput =
            await callSummaryWorker(chunks);
        console.log(
            "summariseCombinedSummaries | combinedResults",
            combinedResults
        );
        const endTime = Date.now();
        console.log(
            `summariseCombinedSummaries | time taken in ms:${endTime - startTime}`
        );

        if (!combinedResults.success) {
            throw new Error("Failed to get summary");
        }
        // const { finalCombined } = combinedResults;
        return splitToParagraphs(combinedResults?.finalCombined ?? "");
    } catch (e) {
        console.log("summariseCombinedSummaries | E", e);
        return null;
    }
}

export { summariseCombinedSummaries };
