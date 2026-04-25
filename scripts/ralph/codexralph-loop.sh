#!/usr/bin/env bash

set -euo pipefail

show_help() {
  cat <<'EOF'
Usage:
  ./scripts/ralph/codexralph-loop.sh [options] "long brief here" [iterations]

Examples:
  ./scripts/ralph/codexralph-loop.sh "Design a DynamoDB data model for patient and doctor workflows" 20
  npm run codex:ralph-loop -- "Design a DynamoDB data model for patient and doctor workflows" 20
  ./scripts/ralph/codexralph-loop.sh --prepare-only "Break this feature into Ralph stories"

Options:
  --iterations N     Number of Ralph iterations after PRD generation. Default: 10
  --model MODEL      Optional Codex model override for both generation and loop runs
  --prepare-only     Generate scripts/ralph/prd.json and stop
  -h, --help         Show this help text
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command codex
require_command jq
require_command git

ITERATIONS=10
MODEL=""
PREPARE_ONLY=0
BRIEF=""

positionals=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --iterations)
      ITERATIONS="${2:-}"
      shift 2
      ;;
    --iterations=*)
      ITERATIONS="${1#*=}"
      shift
      ;;
    --model)
      MODEL="${2:-}"
      shift 2
      ;;
    --model=*)
      MODEL="${1#*=}"
      shift
      ;;
    --prepare-only)
      PREPARE_ONLY=1
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      positionals+=("$1")
      shift
      ;;
  esac
done

if [[ ${#positionals[@]} -ge 1 ]]; then
  BRIEF="${positionals[0]}"
fi

if [[ ${#positionals[@]} -ge 2 ]]; then
  ITERATIONS="${positionals[1]}"
fi

if [[ -z "$BRIEF" && ! -t 0 ]]; then
  BRIEF="$(cat)"
fi

if [[ -z "$BRIEF" ]]; then
  echo "Provide a quoted brief or pipe one on stdin." >&2
  show_help >&2
  exit 1
fi

if [[ ! "$ITERATIONS" =~ ^[0-9]+$ ]]; then
  echo "Iterations must be a positive integer." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
PRD_FILE="$SCRIPT_DIR/prd.json"
BOOTSTRAP_PROMPT="$SCRIPT_DIR/bootstrap-prd-prompt.md"
TMP_PROMPT="$(mktemp)"

cleanup() {
  rm -f "$TMP_PROMPT"
}
trap cleanup EXIT

{
  cat "$BOOTSTRAP_PROMPT"
  printf '\n<brief>\n%s\n</brief>\n' "$BRIEF"
} >"$TMP_PROMPT"

echo "Generating scripts/ralph/prd.json from the brief..."

codex_args=(
  exec
  -C "$REPO_ROOT"
  --ephemeral
  --enable codex_hooks
  -c 'approval_policy="never"'
  -c 'sandbox_mode="workspace-write"'
  -
)

if [[ -n "$MODEL" ]]; then
  codex_args+=(-m "$MODEL")
fi

codex "${codex_args[@]}" <"$TMP_PROMPT"

if [[ ! -f "$PRD_FILE" ]]; then
  echo "Codex did not create $PRD_FILE" >&2
  exit 1
fi

jq -e '
  (.project | type == "string") and
  (.branchName | type == "string") and
  (.description | type == "string") and
  (.userStories | type == "array") and
  (.userStories | length > 0)
' "$PRD_FILE" >/dev/null

echo "Generated $PRD_FILE"

if [[ "$PREPARE_ONLY" -eq 1 ]]; then
  echo "Prepare-only mode enabled. Not starting the Ralph loop."
  exit 0
fi

echo "Starting the Codex Ralph loop..."

if [[ -n "$MODEL" ]]; then
  exec "$SCRIPT_DIR/ralph-codex.sh" --model "$MODEL" "$ITERATIONS"
else
  exec "$SCRIPT_DIR/ralph-codex.sh" "$ITERATIONS"
fi
