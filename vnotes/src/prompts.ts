const summariseChunkPrompt = `
You are a helpful assistant who extracts and summarizes the key points from the following text chunk in a concise and clear manner:

{chunk}
`;

const combineSummariesPrompt = `
You are a helpful assistant who combines multiple chunk summaries into a single, well-structured, and coherent overall summary:

{summaries}
`;

export { summariseChunkPrompt, combineSummariesPrompt };
