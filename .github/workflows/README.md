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
   - Posts a summary comment on the PR with:
     - Overview of changes
     - Key changes by category (features, fixes, refactoring, etc.)
     - Notable file changes
     - Potential impacts or areas needing attention
   - Updates the same comment if the PR is updated (avoids comment spam)

4. **Permissions**:
   - The workflow uses `GITHUB_TOKEN` (automatically provided) to post comments
   - Requires `pull-requests: write` and `contents: read` permissions (already configured)

### Cost Considerations

- Each PR summary uses Claude Sonnet 4.5
- Typical cost: ~$0.01-0.05 per PR (depending on PR size)
- The workflow only runs on PR creation/updates, not on every commit

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
