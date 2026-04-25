#!/usr/bin/env bash

set -euo pipefail

MAX_ITERATIONS=10
MODEL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)
      MODEL="${2:-}"
      shift 2
      ;;
    --model=*)
      MODEL="${1#*=}"
      shift
      ;;
    *)
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command codex
require_command git
require_command jq

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
PROMPT_FILE="$SCRIPT_DIR/codex-prompt.md"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
STATE_DIR="$SCRIPT_DIR/.state"
LAST_BRANCH_FILE="$STATE_DIR/last-branch"
LAST_MESSAGE_FILE="$STATE_DIR/last-message.txt"

mkdir -p "$STATE_DIR" "$ARCHIVE_DIR"

if [[ ! -f "$PRD_FILE" ]]; then
  echo "Missing $PRD_FILE" >&2
  echo "Copy scripts/ralph/prd.json.example to scripts/ralph/prd.json and edit it first." >&2
  exit 1
fi

initialize_progress_file() {
  if [[ -f "$PROGRESS_FILE" ]]; then
    return
  fi

  cat >"$PROGRESS_FILE" <<EOF
# Ralph Progress Log
Started: $(date)

## Codebase Patterns
- Ralph state lives under scripts/ralph/. Do not overwrite the repo root prd.json.

---
EOF
}

archive_previous_run_if_branch_changed() {
  local current_branch last_branch date folder_name archive_folder

  if [[ ! -f "$LAST_BRANCH_FILE" ]]; then
    return
  fi

  current_branch="$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || true)"
  last_branch="$(cat "$LAST_BRANCH_FILE" 2>/dev/null || true)"

  if [[ -z "$current_branch" || -z "$last_branch" || "$current_branch" == "$last_branch" ]]; then
    return
  fi

  date="$(date +%Y-%m-%d)"
  folder_name="$(echo "$last_branch" | sed 's|^codex/||')"
  archive_folder="$ARCHIVE_DIR/$date-$folder_name"

  echo "Archiving previous run: $last_branch"
  mkdir -p "$archive_folder"

  [[ -f "$PRD_FILE" ]] && cp "$PRD_FILE" "$archive_folder/"
  [[ -f "$PROGRESS_FILE" ]] && cp "$PROGRESS_FILE" "$archive_folder/"

  cat >"$PROGRESS_FILE" <<EOF
# Ralph Progress Log
Started: $(date)

## Codebase Patterns
- Ralph state lives under scripts/ralph/. Do not overwrite the repo root prd.json.

---
EOF
}

track_current_branch() {
  local current_branch
  current_branch="$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || true)"
  if [[ -n "$current_branch" ]]; then
    printf '%s\n' "$current_branch" >"$LAST_BRANCH_FILE"
  fi
}

all_stories_pass() {
  jq -e '
    (.userStories | type == "array") and
    (.userStories | length > 0) and
    all(.userStories[]; .passes == true)
  ' "$PRD_FILE" >/dev/null 2>&1
}

initialize_progress_file
archive_previous_run_if_branch_changed
track_current_branch

echo "Starting Codex Ralph"
echo "Repo: $REPO_ROOT"
echo "Max iterations: $MAX_ITERATIONS"
if [[ -n "$MODEL" ]]; then
  echo "Model override: $MODEL"
fi

for iteration in $(seq 1 "$MAX_ITERATIONS"); do
  echo
  echo "==============================================================="
  echo "  Codex Ralph Iteration $iteration of $MAX_ITERATIONS"
  echo "==============================================================="

  : >"$LAST_MESSAGE_FILE"

  codex_args=(
    exec
    -C "$REPO_ROOT"
    --enable codex_hooks
    --ephemeral
    -c 'approval_policy="never"'
    -c 'sandbox_mode="workspace-write"'
    --output-last-message "$LAST_MESSAGE_FILE"
    -
  )

  if [[ -n "$MODEL" ]]; then
    codex_args+=(-m "$MODEL")
  fi

  set +e
  codex_output="$(codex "${codex_args[@]}" <"$PROMPT_FILE" 2>&1)"
  codex_exit=$?
  set -e

  printf '%s\n' "$codex_output"

  last_message=""
  if [[ -f "$LAST_MESSAGE_FILE" ]]; then
    last_message="$(cat "$LAST_MESSAGE_FILE")"
  fi

  if grep -q "<promise>COMPLETE</promise>" <<<"$last_message" || all_stories_pass; then
    echo
    echo "Codex Ralph completed all stories."
    echo "Completed at iteration $iteration of $MAX_ITERATIONS"
    exit 0
  fi

  if [[ $codex_exit -ne 0 ]]; then
    if grep -Eqi 'not logged in|authentication|api key|401|403' <<<"$codex_output"; then
      echo "Codex execution failed because authentication is not ready." >&2
      exit "$codex_exit"
    fi
  fi

  echo "Iteration $iteration complete. Continuing..."
  sleep 2
done

echo
echo "Codex Ralph reached max iterations ($MAX_ITERATIONS) without completing all stories."
echo "Check $PROGRESS_FILE for the latest context."
exit 1
