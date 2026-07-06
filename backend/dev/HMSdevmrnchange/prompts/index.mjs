// prompts/index.mjs — Route mount for the prompts module (Node 22 ESM)
//
//   POST /prompts                              — capture one clinician prompt
//   GET  /prompts?user_id=&since=&limit=       — recent prompts for a user
//                                                 (defaults to the caller from
//                                                  x-user-id)
//   GET  /prompts/all?since=&limit=            — recent prompts across all users
//                                                 (fine-tuning corpus pull)

import { recordPrompt, listPromptsForUser, listAllPrompts } from "./prompts_crud.mjs";

const mapError = (err, resp) => {
  if (err?.code === "BAD_REQUEST") return resp(400, { error: err.message });
  if (err?.code === "NOT_FOUND") return resp(404, { error: err.message });
  console.error("prompts route error:", err);
  return resp(500, { error: "Internal server error" });
};

const actorOf = (event) => {
  const h = event?.headers || {};
  return {
    user_id: h["x-user-id"] || h["X-User-Id"] || null,
    name: h["x-user-name"] || h["X-User-Name"] || null,
    role: h["x-user-role"] || h["X-User-Role"] || null,
  };
};

export function mountPromptsRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;
  const deps = { ddb, TABLE };

  router.add("POST", /^\/?prompts\/?$/, async ({ event }) => {
    try {
      const body = parseBody(event);
      const item = await recordPrompt(deps, {
        body, actor: actorOf(event), nowISO: nowISO(),
      });
      return resp(201, { prompt: item });
    } catch (e) { return mapError(e, resp); }
  });

  // /all first — more specific path
  router.add("GET", /^\/?prompts\/all\/?$/, async ({ qs }) => {
    try {
      const out = await listAllPrompts(deps, { since: qs?.since, limit: qs?.limit });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });

  router.add("GET", /^\/?prompts\/?$/, async ({ event, qs }) => {
    try {
      const userId = qs?.user_id || actorOf(event).user_id;
      if (!userId) return resp(400, { error: "user_id required (query or x-user-id header)" });
      const out = await listPromptsForUser(deps, {
        userId, since: qs?.since, limit: qs?.limit,
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });
}
