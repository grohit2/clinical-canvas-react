#!/usr/bin/env bash
# install_gcc_parallel.sh
# Installs Git Context Controller (GCC) v2 into many repos in parallel.
# Per repo: copies .claude/skills/gcc/, runs gcc_init.sh on main (or master)
# and on the currently-checked-out branch, auto-commits any dirty state first.
#
# Usage:
#   ./install_gcc_parallel.sh [--repos-file FILE] [--root DIR] [--parallel N] [--dry-run]
#
# Defaults:
#   --repos-file  ./target_repos.txt  (one repo dir name per line, relative to --root)
#   --root        parent of this script (i.e. the GitHub folder containing the repos)
#   --parallel    8
#
# Output: logs per repo in ./gcc-install-logs/<repo>.log and a summary CSV.

set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GCC_SRC="$SCRIPT_DIR"                 # this folder holds scripts/, SKILL.md, etc.
GCC_INIT="$GCC_SRC/scripts/gcc_init.sh"

# --- arg parsing ---
REPOS_FILE=""
ROOT=""
PARALLEL=8
DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --repos-file) REPOS_FILE="$2"; shift 2;;
    --root)       ROOT="$2"; shift 2;;
    --parallel)   PARALLEL="$2"; shift 2;;
    --dry-run)    DRY_RUN=1; shift;;
    -h|--help)
      sed -n '2,20p' "$0"; exit 0;;
    *) echo "unknown arg: $1"; exit 2;;
  esac
done

# default root = parent of script dir (so /GitHub/git-context-controller-v2 -> /GitHub)
[ -z "$ROOT" ] && ROOT="$(dirname "$SCRIPT_DIR")"
[ -z "$REPOS_FILE" ] && REPOS_FILE="$ROOT/target_repos.txt"

if [ ! -f "$REPOS_FILE" ]; then
  echo "repos file not found: $REPOS_FILE" >&2
  exit 1
fi
if [ ! -x "$GCC_INIT" ]; then
  chmod +x "$GCC_SRC/scripts"/*.sh 2>/dev/null || true
fi
if [ ! -f "$GCC_INIT" ]; then
  echo "gcc_init.sh not found at $GCC_INIT" >&2
  exit 1
fi

LOG_DIR="$ROOT/gcc-install-logs"
mkdir -p "$LOG_DIR"
SUMMARY="$LOG_DIR/summary.csv"
echo "repo,status,main_branch,current_branch,dirty_autocommit,skill_copied,init_main,init_current,notes" > "$SUMMARY"

export GCC_SRC GCC_INIT ROOT DRY_RUN LOG_DIR SUMMARY

install_one() {
  local repo="$1"
  local repo_path="$ROOT/$repo"
  local log="$LOG_DIR/${repo// /_}.log"
  : > "$log"

  {
    echo "=== $(date -Iseconds) installing GCC into: $repo ==="
    if [ ! -d "$repo_path/.git" ]; then
      echo "SKIP: no .git directory"
      echo "$repo,skip,,,,,,,no .git" >> "$SUMMARY"
      return 0
    fi

    cd "$repo_path" || { echo "cd failed"; return 1; }

    # detect branches
    local cur main dirty=no copied=no init_main=no init_cur=no
    cur="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"
    if git show-ref --verify --quiet refs/heads/main; then
      main=main
    elif git show-ref --verify --quiet refs/heads/master; then
      main=master
    else
      main="$cur"
    fi
    echo "current=$cur main=$main"

    if [ "$DRY_RUN" = "1" ]; then
      echo "DRY: would init on $main and $cur"
      echo "$repo,dry,$main,$cur,,,,," >> "$SUMMARY"
      return 0
    fi

    # auto-commit dirty
    if [ -n "$(git status --porcelain)" ]; then
      echo "auto-committing dirty working tree on $cur"
      git add -A
      git -c user.email="gcc-installer@local" -c user.name="gcc-installer" \
        commit -m "chore: auto-commit before GCC v2 setup" >/dev/null 2>&1 || true
      dirty=yes
    fi

    do_branch() {
      local b="$1"
      echo "-- branch: $b --"
      # checkout if not already on it
      if [ "$(git rev-parse --abbrev-ref HEAD)" != "$b" ]; then
        git checkout "$b" >/dev/null 2>&1 || { echo "checkout $b failed"; return 1; }
      fi
      # copy skill
      mkdir -p .claude/skills
      if [ ! -d .claude/skills/gcc ]; then
        cp -r "$GCC_SRC" .claude/skills/gcc
        # strip installer script + logs from copied skill
        rm -f .claude/skills/gcc/install_gcc_parallel.sh 2>/dev/null || true
        rm -rf .claude/skills/gcc/gcc-install-logs 2>/dev/null || true
        copied=yes
      fi
      # run init (creates .GCC/)
      bash "$GCC_INIT" .GCC >/dev/null 2>&1 || true
      # commit if there is anything to commit
      if [ -n "$(git status --porcelain)" ]; then
        git add -A
        git -c user.email="gcc-installer@local" -c user.name="gcc-installer" \
          commit -m "chore: install GCC v2 skill + init on $b" >/dev/null 2>&1 || true
      fi
      return 0
    }

    # init on main
    if do_branch "$main"; then init_main=yes; fi
    # init on current (if different)
    if [ "$main" != "$cur" ]; then
      if do_branch "$cur"; then init_cur=yes; fi
    else
      init_cur="(same as main)"
    fi

    echo "$repo,ok,$main,$cur,$dirty,$copied,$init_main,$init_cur," >> "$SUMMARY"
    echo "=== done $repo ==="
  } >> "$log" 2>&1
}

export -f install_one

# Run in parallel using xargs
tr -d '\r' < "$REPOS_FILE" | awk 'NF' | \
  xargs -I{} -P "$PARALLEL" bash -c 'install_one "$@"' _ {}

echo
echo "=== summary ==="
cat "$SUMMARY"
echo
echo "logs: $LOG_DIR"
