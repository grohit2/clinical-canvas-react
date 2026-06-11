/* api.js — thin wrapper over the deployed HMS Lambda Function URL.
   Plain script, exposes `window.api`. No bundler. */
(function () {
  const BASE = "https://kfzsv6at3amrxzl5kzuehljfju0rhkup.lambda-url.ap-south-1.on.aws";

  // ---- Identity (persisted) ----
  const IDENTITY_KEY = "duty.identity.v1";
  function getIdentity() {
    try { return JSON.parse(localStorage.getItem(IDENTITY_KEY) || "null"); } catch { return null; }
  }
  function setIdentity(me) {
    if (me) localStorage.setItem(IDENTITY_KEY, JSON.stringify(me));
    else localStorage.removeItem(IDENTITY_KEY);
  }

  function actorHeaders() {
    const me = getIdentity();
    if (!me) return {};
    return {
      "x-user-id": me.userId || me.id || "",
      "x-user-name": me.name || "",
      "x-user-role": me.role || "doctor",
    };
  }

  // ---- low-level fetch ----
  async function call(method, path, body) {
    const url = BASE + path;
    const headers = { ...actorHeaders() };
    // Only set Content-Type when there's a body — avoids unnecessary CORS preflight on GETs.
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      // Network / CORS error — surface it
      const err = new Error(`Network: ${e.message || e}`);
      err.cause = e;
      console.error("[api]", method, url, err);
      throw err;
    }
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { json = { _raw: text }; }
    if (!res.ok) {
      const err = new Error((json && json.error) || `HTTP ${res.status}`);
      err.status = res.status; err.body = json;
      console.error("[api]", method, url, "→", res.status, json);
      throw err;
    }
    return json;
  }

  // ---- Tasks ----
  function listPatientTasks(patientId, status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return call("GET", `/patients/${encodeURIComponent(patientId)}/tasks${q}`);
  }
  function getTask(patientId, taskId, withUpdates = true) {
    return call("GET", `/patients/${encodeURIComponent(patientId)}/tasks/${encodeURIComponent(taskId)}${withUpdates ? "?updates=1" : ""}`);
  }
  function createTask(patientId, body) {
    return call("POST", `/patients/${encodeURIComponent(patientId)}/tasks`, body);
  }
  function patchTask(patientId, taskId, body) {
    return call("PATCH", `/patients/${encodeURIComponent(patientId)}/tasks/${encodeURIComponent(taskId)}`, body);
  }
  function lifecycle(patientId, taskId, action, body) {
    return call("POST", `/patients/${encodeURIComponent(patientId)}/tasks/${encodeURIComponent(taskId)}/${action}`, body || {});
  }
  function copyTask(patientId, taskId, format = "human") {
    return call("GET", `/patients/${encodeURIComponent(patientId)}/tasks/${encodeURIComponent(taskId)}/copy?format=${format}`);
  }

  // ---- Sync / changes ----
  function changes(scope, id, after) {
    const q = new URLSearchParams({ scope, id, limit: "100" });
    if (after) q.set("after", after);
    return call("GET", `/tasks/changes?${q.toString()}`);
  }
  function latest(scope, id) {
    const q = new URLSearchParams({ scope, id, limit: "100" });
    return call("GET", `/tasks/changes/latest?${q.toString()}`);
  }

  // ---- Directory ----
  function listStaff({ department, q, role } = {}) {
    const params = new URLSearchParams();
    if (department) params.set("department", department);
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    return call("GET", `/directory/staff?${params.toString()}`);
  }
  function getPatient(patientId) {
    return call("GET", `/patients/${encodeURIComponent(patientId)}`);
  }
  function listPatients({ department, q } = {}) {
    const params = new URLSearchParams();
    if (department) params.set("department", department);
    if (q) params.set("q", q);
    params.set("limit", "200");
    return call("GET", `/directory/patients?${params.toString()}`);
  }
  function createDoctor(body) {
    return call("POST", "/doctors", body);
  }

  // ---- Unified change feed ----
  function getChanges(scope, id, after, limit) {
    const q = new URLSearchParams({ scope, id });
    if (after) q.set("after", after);
    if (limit) q.set("limit", String(limit));
    return call("GET", `/changes?${q.toString()}`);
  }

  // ---- Vitals ----
  function recordVitals(patientId, body) {
    return call("POST", `/patients/${encodeURIComponent(patientId)}/vitals`, body);
  }
  function listVitals(patientId, limit) {
    const q = limit ? `?limit=${encodeURIComponent(limit)}` : "";
    return call("GET", `/patients/${encodeURIComponent(patientId)}/vitals${q}`);
  }
  function latestVitals(patientId) {
    return call("GET", `/patients/${encodeURIComponent(patientId)}/vitals/latest`);
  }

  // ---- Agent context (patient-scope) — used for "copy entire patient context" ----
  function patientContext(patientId) {
    return call("GET", `/patients/${encodeURIComponent(patientId)}/agent-context`);
  }

  window.api = {
    BASE,
    getIdentity, setIdentity,
    listPatientTasks, getTask, createTask, patchTask, lifecycle, copyTask,
    changes, latest,
    listStaff, listPatients, getPatient, createDoctor,
    recordVitals, listVitals, latestVitals,
    getChanges,
    patientContext,
  };
})();
