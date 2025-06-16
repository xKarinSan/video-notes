summary = """
Summarize this video transcript into a clear and concise overview. Focus on the main points, key arguments, and any conclusions. Keep the language accessible and avoid unnecessary repetition.
{content}
"""

outline = """
Generate a structured outline of this transcript. Break down the content into major sections and subpoints, using time markers to indicate when each section begins.
{content}
"""

explain_like_12 = """
Explain the contents of this transcript in simple terms, as if you're talking to a 12-year-old. Use analogies, plain language, and avoid jargon unless you define it clearly.
{content}
"""

prompt_templates = [
    summary,
    outline,
    explain_like_12
]