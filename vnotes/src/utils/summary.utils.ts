async function splitToChunks(transcript: string) {
    /*
    1) split into chunks
    2) return the split chunks
*/
}

async function summariseIndividualChunk(chunk: string, openAiKey: string) {
    /*
    1) OpenAI call to summarise (take in the OpenAI key from the main process)
    2) return the result. this does NOT have to be in paragraphs
*/
}

async function summariseCombinedSummaries(chunks: string[], openAiKey: string) {
    /*
    2) run summariseIndividualChunk in parallel 
    3) combine the summaries from 1 and then summarise again. (take in the OpenAI key from the main process)
    3) return the ultimate summary in a string array. 1 item = 1 paragraph

*/
}

export { splitToChunks, summariseIndividualChunk, summariseCombinedSummaries };
