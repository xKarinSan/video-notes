# GitHub Actions Workflows

## PR Commit Summary with Claude

This workflow automatically generates AI-powered summaries of pull requests using Claude Sonnet 4.5.

### Setup Instructions

1. **Get an Anthropic API Key**:
   - Visit [https://console.anthropic.com/](https://console.anthropic.com/)
   - Create an account or sign in
   - Navigate to API Keys section
   - Generate a new API key

2. **Add the API Key to GitHub Secrets**:
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: Paste your Anthropic API key
   - Click **Add secret**

3. **How It Works**:
   - Triggers automatically when a PR is **opened** or **updated** (synchronize)
   - Collects all commit messages and file changes from the PR
   - Sends the information to Claude Sonnet 4.5 for analysis
   - **Logs all API requests and responses** to workflow artifacts
   - Posts a summary comment on the PR with:
     - Overview of changes
     - Key changes by category (features, fixes, refactoring, etc.)
     - Notable file changes
     - Potential impacts or areas needing attention
     - **Token usage statistics** (in collapsible section)
   - Updates the same comment if the PR is updated (avoids comment spam)

4. **Permissions**:
   - The workflow uses `GITHUB_TOKEN` (automatically provided) to post comments
   - Requires `pull-requests: write` and `contents: read` permissions (already configured)

### API Logging & Monitoring

**All API interactions are automatically logged!**

#### What Gets Logged

Each workflow run creates a timestamped JSON file containing:
- Full request (prompt, model, settings)
- Full response (summary, metadata)
- Token usage (input/output/total)
- Performance metrics (duration, status codes)
- PR context (number, title, files changed)

#### Accessing Logs

**In PR Comments:**
Token usage is shown in a collapsible "📊 API Usage Details" section at the bottom of each summary.

**Download as Artifacts:**
1. Go to the workflow run in the **Actions** tab
2. Scroll to the **Artifacts** section at the bottom
3. Download `claude-api-logs-pr-{number}.zip`
4. Extract and view the JSON files

**Via GitHub CLI:**
```bash
# Download logs for a specific workflow run
gh run download <run-id> -n claude-api-logs-pr-123

# View token usage
jq .token_usage claude-api-logs-pr-123/*.json
```

#### Artifact Retention

- Logs are kept for **30 days**
- Automatically deleted after expiration
- Only accessible to repository collaborators

### Cost Considerations

- Each PR summary uses Claude Sonnet 4.5
- Typical cost: ~$0.01-0.05 per PR (depending on PR size)
- The workflow only runs on PR creation/updates, not on every commit
- **Monitor costs** by checking token usage in PR comments or downloaded logs

**Calculate total costs from logs:**
```bash
# Download and sum all token usage
jq -s 'map(.token_usage.total_tokens) | add' *.json

# Estimate cost (Sonnet 4.5: $3/M input, $15/M output)
jq -s 'map(.token_usage) | map((.input_tokens // 0) * 0.000003 + (.output_tokens // 0) * 0.000015) | add' *.json
```

### Customization

You can customize the workflow by editing [`.github/workflows/pr-commit-summary.yml`](.github/workflows/pr-commit-summary.yml):

- **Change the model**: Modify `"model": "claude-sonnet-4-5-20250929"` to use a different Claude model
- **Adjust the prompt**: Edit the `PROMPT` variable to change what Claude analyzes
- **Change trigger conditions**: Modify the `on.pull_request.types` array to trigger on different events
- **Modify the output format**: Edit the prompt to request different markdown formatting

### Troubleshooting

**The workflow doesn't run**:
- Check that you've added the `ANTHROPIC_API_KEY` secret
- Verify the workflow file is in `.github/workflows/` directory
- Check the Actions tab for any error messages

**Summary is incomplete or incorrect**:
- The prompt may need adjustment for your specific needs
- Check the PR size - very large PRs may hit token limits
- Review the workflow run logs in the Actions tab

**Permission errors**:
- Ensure your repository has Actions enabled
- Verify the workflow has the correct permissions in the YAML file
