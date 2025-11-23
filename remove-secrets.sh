#!/bin/bash
# This will remove sensitive files from git history

# Install git-filter-repo if needed (requires Python)
# pip install git-filter-repo

# Remove the files from entire git history
git filter-repo --invert-paths \
  --path buy-organics-online/EC2-2-ACTIVE-SYNC-DISCOVERY.md \
  --path buy-organics-online/TEELIXIR-UNLEASHED-SHOPIFY-ANALYSIS.md \
  --path buy-organics-online/ec2-2-source-code/ \
  --force

# Force push the cleaned history
git push origin --force --all
git push origin --force --tags

echo "✅ Secrets removed from git history!"
echo "⚠️  All team members need to re-clone the repository"
