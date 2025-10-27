const summariseChunkPrompt = (content: string) => `
Summarize the following text into concise bullet points grouped by topic.

Text:
${content}

Rules:
- Start each section with a bold title (e.g., **Overview:**)  
- Use "- " for bullets only  
- Each bullet ≤ 16 words  
- Merge duplicate ideas and keep facts accurate  
- Exclude filler, greetings, or redundant phrasing  

Example:
**Overview:**
- Describes main topic and goals.

**Details:**
- Summarizes key examples or performance notes.
`;

const combineSummariesPrompt = (providedSummaries: string) => {
    return `
You are an AI summarization model. Your task is to merge several summary chunks into a single, well‑structured set of concise bullet points.


Provided Summaries:
${providedSummaries}


Instructions:
- Integrate all key ideas from the summaries into 1 unified list.
- Deduplicate overlapping points without losing unique information.
- Use 5–10 total bullets, ≤ 16 words each.
- Group related points under bold section titles (e.g., **Overview:**, **Performance**, **Examples:**).
- Keep factual consistency and neutral style—no opinions, meta‑comments, or text outside of the list.
- Ensure smooth logical flow and complete coverage of all original ideas.
- Output should be markdown‑safe: only bold titles and "- " bullets are allowed.

Example Output:

**Overview:**
- Summarizes overall objective and context of the text.

**Details:**
- Merges repeated technical points into one concise statement.
- Retains all specific metrics or comparisons.

**Key Takeaways:**
- Highlights patterns or conclusions found across multiple chunks.
- Avoids general filler, commentary, or redundant phrasing.
`;
};

const reformatFinalRes = (content: string) => `
You are a precise technical editor.
Rewrite the content into a high-quality **Markdown** study summary for backend engineers.

Output format:
- A short **one-line overview**.
- **6–8** compact sections with **H3** headings (###). Use occasional relevant emojis in headings (e.g., 🔍 ⚙️ 📊 ⚠️ 🧠).
- Use bulleted lists where helpful.
- **Bold** key terms (e.g., **index**, **B-tree**, **sequential scan**).
- End with **4–6 crisp takeaways** under a "### Takeaways" heading.

Strict rules:
- **Markdown only.** No JSON, no code fences, no brackets/arrays, no backticks.
- Be factual, concise, and helpful; avoid fluff.
- Keep the whole output **≤ 500 words**.

Content:
${content}
`;

export { summariseChunkPrompt, combineSummariesPrompt, reformatFinalRes };

