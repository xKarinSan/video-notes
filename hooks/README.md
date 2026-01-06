# Git Hooks for CLAUDE.md Management

This directory contains Git hooks for automatically managing the `CLAUDE.md` documentation file using Claude AI.

## Overview

The pre-commit hook ensures that `CLAUDE.md` stays up-to-date with your codebase changes by:

1. **Checking for existence**: If `CLAUDE.md` doesn't exist, it generates a new one
2. **Analyzing changes**: Reviews staged changes to detect if documentation needs updating
3. **Updating documentation**: Automatically updates `CLAUDE.md` when significant changes are detected
4. **Blocking commits**: Prevents commits if `CLAUDE.md` is updated (so you can review and amend)

## Installation

### Quick Install

```bash
cd hooks
chmod +x install.sh
./install.sh
```

### Manual Install

```bash
# Copy the pre-commit hook
cp hooks/pre-commit .git/hooks/pre-commit

# Make it executable
chmod +x .git/hooks/pre-commit
chmod +x hooks/check-claude-md.js
```

## Configuration

### Required: Set API Key

The hook requires an Anthropic API key to work. You can get one from [console.anthropic.com](https://console.anthropic.com/).

**Option 1: Environment Variable (Recommended)**

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

Add to your shell profile to make it permanent:

```bash
# For bash
echo 'export ANTHROPIC_API_KEY=your_api_key_here' >> ~/.bashrc

# For zsh
echo 'export ANTHROPIC_API_KEY=your_api_key_here' >> ~/.zshrc
```

**Option 2: .env File**

Create a `.env` file in either location:

```bash
# Option A: Project root (recommended)
echo 'ANTHROPIC_API_KEY=your_api_key_here' > .env

# Option B: hooks directory
echo 'ANTHROPIC_API_KEY=your_api_key_here' > hooks/.env
```

The hook will automatically check both locations and load the file.

**Note**: Make sure `.env` is in your `.gitignore`!

## How It Works

### When You Commit

1. **Hook triggers**: The pre-commit hook runs automatically
2. **Checks CLAUDE.md**:
   - If missing → Generates new documentation
   - If exists → Analyzes your staged changes
3. **Updates if needed**:
   - Compares changes against current documentation
   - Determines if updates are needed
   - Writes updated content to `CLAUDE.md`
4. **Requires review**: If updated, the commit is blocked so you can review and amend

### Example Workflow

```bash
# Make changes to your code
git add src/new-feature.js

# Try to commit
git commit -m "Add new feature"

# Hook runs and updates CLAUDE.md
# ✅ CLAUDE.md was updated. Please review and stage the changes.
#    Run: git add CLAUDE.md && git commit --amend --no-edit

# Review the changes
git diff CLAUDE.md

# Stage and amend
git add CLAUDE.md
git commit --amend --no-edit
```

## Bypass Hook

If you need to commit without running the hook:

```bash
git commit --no-verify -m "Your commit message"
```

**Use sparingly!** This bypasses the documentation check.

## What Gets Analyzed

The hook analyzes:

- **File changes**: Which files are being modified
- **Diff content**: What's actually changing in the code
- **Current documentation**: Existing `CLAUDE.md` content
- **Project structure**: Directory layout and key files

It determines if updates are needed based on:

- New features or components
- Architecture changes
- New patterns or conventions
- Important behavioral changes

## API Request Logging

**All API requests and responses are automatically logged** to `hooks/log/` with timestamped filenames.

Each log includes:
- **Full request**: Complete prompt sent to Claude
- **Full response**: Complete API response
- **Token usage**: Input/output/total tokens used
- **Performance**: API call duration
- **Context**: What operation was being performed

Example log structure:
```json
{
  "timestamp": "2026-01-06T21:30:00.000Z",
  "context": {
    "action": "check_claude_md_consistency",
    "staged_files": ["src/feature.js"]
  },
  "token_usage": {
    "input_tokens": 12500,
    "output_tokens": 3200,
    "total_tokens": 15700
  },
  "duration_ms": 8450
}
```

**View logs:**
```bash
# List all logs
ls -lt hooks/log/*.json

# View latest log
cat "$(ls -t hooks/log/*.json | head -1)" | jq .

# Check token usage
jq .token_usage hooks/log/*.json
```

**Log files are gitignored** and won't be committed.

See [hooks/log/README.md](./log/README.md) for detailed logging documentation.

## Exit Codes

The hook uses specific exit codes:

- `0` - Success (no updates needed or CLAUDE.md generated)
- `1` - Error occurred
- `2` - CLAUDE.md was updated (commit should be amended)

## Files

- **`pre-commit`** - Shell script that Git runs before each commit
- **`check-claude-md.js`** - Node.js script that does the actual checking and generation
- **`install.sh`** - Installation script for easy setup
- **`README.md`** - This file

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable not set"

**Solution**: Set your API key as described in the Configuration section.

### "Node.js not found"

**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)

### Hook isn't running

**Solution**:

```bash
# Check if hook is installed
ls -la .git/hooks/pre-commit

# Make sure it's executable
chmod +x .git/hooks/pre-commit
```

### API errors

**Solution**:

- Check your API key is valid
- Verify you have API credits
- Check your internet connection

## Advanced Usage

### Customize the Hook

You can modify `check-claude-md.js` to:

- Change the Claude model used (default: `claude-sonnet-4-5-20250929`)
- Adjust the prompt for generating documentation
- Change which files trigger documentation updates
- Modify the output format

### Skip Certain Commits

Add patterns to skip checking:

```javascript
// In check-claude-md.js
const skipPatterns = [
  'docs/',
  'tests/',
  'README.md'
];
```

### Integration with CI/CD

The hook can also run in CI/CD pipelines:

```yaml
# .github/workflows/check-docs.yml
- name: Check CLAUDE.md
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: node hooks/check-claude-md.js
```

## Best Practices

1. **Review updates**: Always review CLAUDE.md changes before committing
2. **Keep API key secure**: Never commit your API key to the repository
3. **Run on significant changes**: The hook is smart about when to update
4. **Trust the AI, but verify**: Claude does a good job, but you know your codebase best

## Contributing

To improve the hook:

1. Test changes thoroughly
2. Update this README
3. Consider backward compatibility
4. Document any new environment variables or configuration options

## License

Same as the parent project.
