#!/bin/bash
# Install pre-commit hook for CLAUDE.md checking

set -e

echo "🔧 Installing CLAUDE.md pre-commit hook..."

# Get the repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
HOOKS_DIR="$REPO_ROOT/.git/hooks"
SOURCE_HOOK="$REPO_ROOT/hooks/pre-commit"

# Check if hooks directory exists
if [ ! -d "$HOOKS_DIR" ]; then
    echo "❌ Error: .git/hooks directory not found"
    echo "   Make sure you're in a git repository"
    exit 1
fi

# Check if source hook exists
if [ ! -f "$SOURCE_HOOK" ]; then
    echo "❌ Error: Source hook not found at $SOURCE_HOOK"
    exit 1
fi

# Backup existing pre-commit hook if it exists
if [ -f "$HOOKS_DIR/pre-commit" ]; then
    echo "⚠️  Existing pre-commit hook found"
    BACKUP_FILE="$HOOKS_DIR/pre-commit.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$HOOKS_DIR/pre-commit" "$BACKUP_FILE"
    echo "   Backed up to: $BACKUP_FILE"
fi

# Copy the hook
cp "$SOURCE_HOOK" "$HOOKS_DIR/pre-commit"

# Make it executable
chmod +x "$HOOKS_DIR/pre-commit"
chmod +x "$REPO_ROOT/hooks/check-claude-md.js"

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "📝 Setup instructions:"
echo "   1. Set your Anthropic API key:"
echo "      export ANTHROPIC_API_KEY=your_api_key_here"
echo ""
echo "   2. (Optional) Add to your shell profile (~/.bashrc, ~/.zshrc):"
echo "      echo 'export ANTHROPIC_API_KEY=your_api_key_here' >> ~/.zshrc"
echo ""
echo "   3. The hook will now run automatically on every commit!"
echo ""
echo "🔍 What the hook does:"
echo "   • Checks if CLAUDE.md exists"
echo "   • If not, generates a new one using Claude API"
echo "   • If yes, checks if your changes require updates to CLAUDE.md"
echo "   • Updates CLAUDE.md automatically if needed"
echo ""
echo "💡 To temporarily skip the hook, use: git commit --no-verify"
