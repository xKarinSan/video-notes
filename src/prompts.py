# prompts.py
summary = """
Given this video transcript:
{content}

Generate a clear and concise summary focusing on:
1. The main topic and its significance
2. Key concepts and their relationships
3. Practical applications or implications
4. Important conclusions or takeaways

Format:
- Start with a 2-3 sentence overview
- Use bullet points for key points
- Include relevant examples if present
- End with actionable insights

Keep the language accessible but maintain technical accuracy.
Avoid unnecessary repetition and focus on the most important aspects.
"""

outline = """
Given this video transcript:
{content}

Create a structured outline that includes:
1. Main topic sections with clear headings
2. Key subtopics under each section
3. Time markers for each section (e.g., [00:05:00])
4. Important examples or demonstrations
5. Cross-references between related concepts

Format:
- Use hierarchical numbering (1.1, 1.2, etc.)
- Include timestamps in square brackets
- Add notes about important examples
- Highlight key technical concepts
- Include references to related topics
"""

explain_like_12 = """
Given this video transcript:
{content}

Explain this content as if teaching a 12-year-old:
1. Break down complex concepts into simple ideas
2. Use everyday analogies and examples
3. Avoid jargon - explain any technical terms
4. Focus on why things work rather than just how
5. Include practical examples

Format:
- Start with a simple overview
- Use numbered steps for explanations
- Include visual examples where possible
- Use comparisons to familiar concepts
- End with a summary of key points

Use simple, clear language but maintain accuracy.
"""

prompt_templates = [
    summary,
    outline,
    explain_like_12
]



# misc
summarise_chunk_prompt = """
You are a helpful assistant that is professional in extracting and summarising out the contents of the chunk
{chunk}
"""

combine_sumamries_prompt = """
You are a helpful assistant. You are brilliant in combining the summaries of each chunk.
{summaries}
"""