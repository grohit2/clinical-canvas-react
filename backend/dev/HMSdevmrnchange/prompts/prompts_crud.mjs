// prompts/prompts_crud.mjs — Business logic for clinician prompt capture
//
// One write per clinician utterance. Optional follow-up writes can append
// `actions[]` and `outcome` once the agent has acted, by re-POSTing the
// same `prompt_id` (idempotent overwrite — last writer wins).
//
// Fields we accept:
//   text          — required, raw user input (max 16 KB)
//   session_id    — optional, client-generated; groups consecutive turns
//   context       — optional, the JSON blocks the user pasted (any shape)
//   intent_hint   — optional, agent's parse: "create_task" | "mark_done" | "record_vitals" | ...
//   actions       — optional, list of { api: "POST /…", result_id, ok }
//   outcome       — optional, "success" | "partial" | "failure" | "clarify"
//   client        — optional, "web" | "mobile" | "agent" | "test"

import {
  promptUserPK, promptAllPK, promptSK, newPromptId,
  putPromptRows, queryUserPrompts, queryAllPrompts,
} from "./prompts_store.mjs";

const MAX_TEXT = 16 * 1024;

const STR = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.length ? s : null;
};

export async function recordPrompt(deps, { body, actor, nowISO }) {
  const text = STR(body?.text);
  if (!text) {
    throw Object.assign(new Error("`text` is required"), { code: "BAD_REQUEST" });
  }
  if (text.length > MAX_TEXT) {
    throw Object.assign(new Error(`text exceeds ${MAX_TEXT} bytes`), { code: "BAD_REQUEST" });
  }

  const promptId = STR(body?.prompt_id) || newPromptId();
  const recordedAt = STR(body?.recorded_at) || nowISO;
  const SK = promptSK(recordedAt, promptId);

  const base = {
    entity: "PROMPT",
    prompt_id: promptId,
    user_id: actor?.user_id || null,
    user_name: actor?.name || null,
    user_role: actor?.role || null,
    text,
    session_id: STR(body?.session_id),
    context: body?.context ?? null,
    intent_hint: STR(body?.intent_hint),
    actions: Array.isArray(body?.actions) ? body.actions : null,
    outcome: STR(body?.outcome),
    client: STR(body?.client) || "agent",
    recorded_at: recordedAt,
    created_at: nowISO,
  };

  const userPK = promptUserPK(actor?.user_id);
  const items = [
    { PK: userPK, SK, ...base },
    { PK: promptAllPK(), SK, ...base },
  ];
  await putPromptRows(deps.ddb, deps.TABLE, items);
  return base;
}

export async function listPromptsForUser(deps, { userId, since, limit }) {
  const items = await queryUserPrompts(deps.ddb, deps.TABLE, userId, { since, limit });
  return { items };
}

export async function listAllPrompts(deps, { since, limit }) {
  const items = await queryAllPrompts(deps.ddb, deps.TABLE, { since, limit });
  return { items };
}
