#!/bin/bash
# Commit and push your changes

echo "💾 Saving your work to GitHub..."

# Add all changes
git add .

# Ask for commit message (or use default)
if [ -z "$1" ]; then
    MESSAGE="Work update - $(date +%Y-%m-%d)"
else
    MESSAGE="$1"
fi

# Commit
git commit -m "$MESSAGE"

# Push to GitHub
git push

echo "✅ All changes saved to GitHub!"
echo ""
echo "Next time you work, run: ./sync.sh"
