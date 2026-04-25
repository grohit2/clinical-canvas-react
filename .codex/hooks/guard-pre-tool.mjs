#!/usr/bin/env node

import { stdin, stdout } from "node:process";

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

const blockedMatchers = [
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    reason: "git reset --hard discards local work",
  },
  {
    pattern: /\bgit\s+checkout\s+--\b/,
    reason: "git checkout -- discards tracked file changes",
  },
  {
    pattern: /\bgit\s+clean\s+-f(?:d|x|dx|xdf)\b/,
    reason: "git clean can remove untracked work",
  },
  {
    pattern: /\brm\s+-rf\s+(?:\/|\.(?:\s|$)|\*|\*\/)/,
    reason: "rm -rf can remove the workspace irreversibly",
  },
  {
    pattern: /\.git\/hooks\//,
    reason: "writing into .git/hooks changes local git behavior",
  },
];

const rawInput = await readStdin();
const payload = rawInput ? JSON.parse(rawInput) : {};
const command = String(payload?.tool_input?.command ?? "");
const blocked = blockedMatchers.find(({ pattern }) => pattern.test(command));

if (!blocked) {
  stdout.write(JSON.stringify({ suppressOutput: true }));
  process.exit(0);
}

stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Blocked potentially destructive command: ${blocked.reason}. Use a non-destructive alternative instead.`,
    },
    systemMessage:
      "A repo-local Codex hook blocked a destructive shell command. Choose a safer command.",
  }),
);
