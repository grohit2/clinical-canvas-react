#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { stdin, stdout } from "node:process";

const RALPH_MARKER = "RALPH_EXEC_MODE=1";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.on("end", () => resolve(data));
    stdin.on("error", reject);
  });
}

function findRepoRoot(cwd) {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return cwd;
  }
  return result.stdout.trim() || cwd;
}

function extractPatterns(progressText) {
  const lines = progressText.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "## Codebase Patterns");
  if (start === -1) {
    return [];
  }

  const patterns = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("## ") || line === "---") {
      break;
    }
    if (line.startsWith("- ")) {
      patterns.push(line.slice(2));
    }
  }

  return patterns.slice(0, 4);
}

function summarizeNextStory(story) {
  if (!story) {
    return [];
  }

  const lines = [`- Next story: ${story.id} - ${story.title}.`];
  const criteria = Array.isArray(story.acceptanceCriteria)
    ? story.acceptanceCriteria.slice(0, 4)
    : [];

  if (criteria.length > 0) {
    lines.push("- Acceptance criteria for the next story:");
    for (const criterion of criteria) {
      lines.push(`  - ${criterion}`);
    }
  }

  return lines;
}

const rawInput = await readStdin();
const payload = rawInput ? JSON.parse(rawInput) : {};
const prompt = String(payload?.prompt ?? "");

if (!prompt.includes(RALPH_MARKER)) {
  stdout.write(JSON.stringify({ suppressOutput: true }));
  process.exit(0);
}

const repoRoot = findRepoRoot(String(payload?.cwd ?? process.cwd()));
const prdPath = path.join(repoRoot, "scripts", "ralph", "prd.json");
const progressPath = path.join(repoRoot, "scripts", "ralph", "progress.txt");

if (!fs.existsSync(prdPath)) {
  stdout.write(JSON.stringify({ suppressOutput: true }));
  process.exit(0);
}

const prd = JSON.parse(fs.readFileSync(prdPath, "utf8"));
const pendingStories = Array.isArray(prd?.userStories)
  ? prd.userStories
      .filter((story) => !story?.passes)
      .sort((left, right) => (left?.priority ?? 999999) - (right?.priority ?? 999999))
  : [];
const nextStory = pendingStories[0];
const progressText = fs.existsSync(progressPath)
  ? fs.readFileSync(progressPath, "utf8")
  : "";
const patterns = extractPatterns(progressText);

const contextLines = [
  "Ralph loop context:",
  "- Edit Ralph state only in scripts/ralph/. The repo root prd.json is unrelated planning state.",
  `- Pending stories: ${pendingStories.length}.`,
  ...summarizeNextStory(nextStory),
  "- Default validation commands for this repo: npm run typecheck, npm run lint, npm run build.",
];

if (patterns.length > 0) {
  contextLines.push("- Reusable patterns from progress.txt:");
  for (const pattern of patterns) {
    contextLines.push(`  - ${pattern}`);
  }
}

stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: contextLines.join("\n"),
    },
    suppressOutput: true,
  }),
);
