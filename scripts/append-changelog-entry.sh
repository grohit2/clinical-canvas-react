#!/usr/bin/env sh
set -e

CHANGELOG_FILE=".planning/changelog.md"

mkdir -p ".planning"

if [ ! -f "$CHANGELOG_FILE" ]; then
  cat > "$CHANGELOG_FILE" <<'EOF'
============================================

date  commit version
goal
reasons
changes

what files were wouched
=========================================
EOF
  git add "$CHANGELOG_FILE"
  exit 0
fi

STAGED_FILES="$(git diff --cached --name-only)"

{
  printf "\n============================================\n\n"
  printf "date  commit version\n"
  printf "goal\n"
  printf "reasons\n"
  printf "changes\n\n"
  printf "what files were wouched\n"
  if [ -n "$STAGED_FILES" ]; then
    printf "%s\n" "$STAGED_FILES"
  fi
  printf "=========================================\n"
} >> "$CHANGELOG_FILE"

git add "$CHANGELOG_FILE"
