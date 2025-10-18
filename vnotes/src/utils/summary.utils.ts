import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path from "node:path";

let worker: Worker | null = null;
let seq = 1;
const pending = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: any) => void }
>();

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
// approx worker path "./src/utils/workers/summariseIndividualChunk.ts",

export { splitToChunks };
