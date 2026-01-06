# API Request Logs

This directory contains logs of all Claude API requests and responses made by the pre-commit hook.

## Log Format

Each log file is named with a timestamp: `YYYY-MM-DDTHH-MM-SS.json`

### Log Structure

```json
{
  "timestamp": "2026-01-06T21:30:00.000Z",
  "context": {
    "action": "generate_new_claude_md" | "check_claude_md_consistency",
    "staged_files_count": 5,
    "staged_files": ["file1.js", "file2.ts"],
    "has_significant_changes": true
  },
  "request": {
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 8000,
    "prompt_length": 15234,
    "prompt_preview": "First 500 chars of the prompt...",
    "full_prompt": "Complete prompt sent to Claude"
  },
  "response": {
    "status_code": 200,
    "full_response": { /* Complete API response */ },
    "content_preview": "First 500 chars of response..."
  },
  "token_usage": {
    "input_tokens": 12500,
    "output_tokens": 3200,
    "total_tokens": 15700
  },
  "duration_ms": 8450,
  "error": null
}
```

## What Gets Logged

### Request Information
- **Model**: Which Claude model was used
- **Max tokens**: Maximum tokens allowed in response
- **Prompt length**: Character count of the prompt
- **Prompt preview**: First 500 characters (for quick reference)
- **Full prompt**: Complete prompt sent to the API

### Response Information
- **Status code**: HTTP status code
- **Full response**: Complete API response including all metadata
- **Content preview**: First 500 characters of the generated text

### Token Usage
- **Input tokens**: Tokens used for the prompt
- **Output tokens**: Tokens used in the response
- **Total tokens**: Sum of input and output tokens

### Performance
- **Duration**: Time taken for the API call (in milliseconds)

### Context
- **Action**: What operation was being performed
- **Staged files**: List of files being committed
- **File count**: Number of files changed
- **Has significant changes**: Whether changes warrant documentation updates

## Privacy & Security

**Important Notes:**

1. **Log files are gitignored** - They won't be committed to the repository
2. **Contains full prompts** - Logs include complete code snippets and diffs
3. **Sensitive data** - May contain code that should remain private
4. **API responses** - Full responses from Claude are saved

## Managing Logs

### View Recent Logs

```bash
# List all logs
ls -lt hooks/log/*.json

# View latest log
cat "$(ls -t hooks/log/*.json | head -1)" | jq .

# View token usage from latest log
cat "$(ls -t hooks/log/*.json | head -1)" | jq .token_usage
```

### Clean Up Old Logs

```bash
# Delete logs older than 7 days
find hooks/log -name "*.json" -mtime +7 -delete

# Delete all logs
rm hooks/log/*.json
```

### Analyze Token Usage

```bash
# Sum total tokens from all logs
jq -s 'map(.token_usage.total_tokens // 0) | add' hooks/log/*.json

# Get average response time
jq -s 'map(.duration_ms // 0) | add / length' hooks/log/*.json
```

## Cost Estimation

Based on Claude Sonnet 4.5 pricing (as of 2026):
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

Example calculation for a typical run:
- Input: 12,500 tokens = $0.0375
- Output: 3,200 tokens = $0.048
- **Total: ~$0.09 per run**

Check your logs to monitor actual usage:

```bash
# Calculate approximate cost
jq -s '
  map(.token_usage) |
  map({
    input: (.input_tokens // 0) * 0.000003,
    output: (.output_tokens // 0) * 0.000015
  }) |
  map(.input + .output) |
  add
' hooks/log/*.json
```

## Troubleshooting

If you see errors in logs:

1. **Authentication errors**: Check your `ANTHROPIC_API_KEY`
2. **Rate limits**: Space out commits or wait a few seconds
3. **Token limits**: Prompts are automatically truncated, but very large codebases may hit limits
4. **Network errors**: Check internet connection

## Disable Logging

To disable logging (not recommended), modify `check-claude-md.js`:

```javascript
// Comment out the saveLogFile calls
// saveLogFile(logData);
```

Or move/delete the `hooks/log` directory.
