# Quick Start: CLAUDE.md Pre-commit Hook

Get your pre-commit hook running in 3 minutes!

## Step 1: Get an API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new key
5. Copy the key (starts with `sk-ant-`)

## Step 2: Install the Hook

```bash
cd hooks
./install.sh
```

This will:
- Copy the pre-commit hook to `.git/hooks/`
- Make the necessary scripts executable
- Show you next steps

## Step 3: Set Your API Key

**Option A: Temporary (Current Session)**

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Option B: Permanent (Recommended)**

For Zsh (macOS default):
```bash
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-...' >> ~/.zshrc
source ~/.zshrc
```

For Bash:
```bash
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-...' >> ~/.bashrc
source ~/.bashrc
```

**Option C: Project-Specific .env**

```bash
# Create .env in project root (recommended)
echo 'ANTHROPIC_API_KEY=sk-ant-api03-...' > .env

# OR create it in hooks directory
echo 'ANTHROPIC_API_KEY=sk-ant-api03-...' > hooks/.env
```

The hook automatically checks both locations!

## Step 4: Test It!

```bash
# Make a small change
echo "# Test" >> test-file.txt
git add test-file.txt

# Try to commit (this will trigger the hook)
git commit -m "test: trigger hook"

# The hook should run and check CLAUDE.md!
```

## What to Expect

### First Commit (No CLAUDE.md)

```
🤖 Running CLAUDE.md check...
🤖 CLAUDE.md Pre-commit Hook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Generating new CLAUDE.md...
✅ Successfully generated CLAUDE.md
📝 Staged CLAUDE.md for commit
✅ CLAUDE.md check passed
```

### Subsequent Commits (CLAUDE.md Exists)

**No update needed:**
```
🤖 Running CLAUDE.md check...
🤖 CLAUDE.md Pre-commit Hook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Checking CLAUDE.md for consistency with changes...
✅ CLAUDE.md is up-to-date
   No updates needed
✅ CLAUDE.md check passed
```

**Update needed:**
```
🤖 Running CLAUDE.md check...
🤖 CLAUDE.md Pre-commit Hook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Checking CLAUDE.md for consistency with changes...
📝 CLAUDE.md needs updating:
   Added new feature that changes architecture
✅ Updated CLAUDE.md
📝 Staged updated CLAUDE.md
📝 CLAUDE.md was updated. Please review and stage the changes.
   Run: git add CLAUDE.md && git commit --amend --no-edit
```

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable not set"

Your API key isn't configured. Follow Step 3 above.

### "Node.js not found"

Install Node.js:
```bash
# macOS (with Homebrew)
brew install node

# Or download from: https://nodejs.org/
```

### Hook not running

Make sure it's installed:
```bash
ls -la .git/hooks/pre-commit
# Should show an executable file

# If not, run install.sh again
cd hooks && ./install.sh
```

### Want to skip the hook once?

```bash
git commit --no-verify -m "Skip hook for this commit"
```

## Next Steps

- Read [hooks/README.md](./README.md) for detailed documentation
- Customize the hook behavior if needed
- Share your API key setup with your team

## Cost Considerations

- The hook uses Claude Sonnet 4.5
- Typical cost per check: ~$0.01-0.05
- Only runs when you commit (not on every save)
- Can be disabled with `--no-verify` if needed

## Tips

1. **Review updates**: Always check what Claude changed in CLAUDE.md
2. **Trust but verify**: The AI is smart, but you know your code best
3. **Keep it current**: Let the hook do its job on every commit
4. **Share with team**: Make sure everyone has their API key set up

---

**Need help?** Check the full [README.md](./README.md) or open an issue!
