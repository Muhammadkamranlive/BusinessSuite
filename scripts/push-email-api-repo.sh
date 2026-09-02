#!/usr/bin/env bash
# Push BusinessSuite Email API to its own GitHub repo (run once).
set -euo pipefail

REPO_DIR="${EMAIL_API_REPO:-$HOME/Documents/BusinessSuite-Email-API}"
cd "$REPO_DIR"

REMOTE="${1:-https://github.com/Muhammadkamranlive/BusinessSuite-Email-API.git}"

echo "→ Repo: $REPO_DIR"
echo "→ Remote: $REMOTE"
echo ""
echo "Create an EMPTY repo on GitHub first: BusinessSuite-Email-API"
read -r -p "Press Enter when the GitHub repo exists..."

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

git push -u origin main

echo ""
echo "Done. Next:"
echo "  1. Vercel → email-api → Settings → Git → Disconnect BusinessSuite"
echo "  2. Connect repository BusinessSuite-Email-API (Root Directory blank)"
echo "  3. Redeploy"
echo "  4. ERP monorepo: git rm -rf email-api && git add email-api/README.md docs/EMAIL-API-REPO.md && git commit"
