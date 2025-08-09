Below is a **lab-manual-style guide** you can drop into the project README or share with anyone on the team.
It covers (1) first-time local setup, (2) the env-var / Vite fix we added, and (3) how code edits propagate instantly via Vite’s Hot-Module-Replacement (HMR).

---

## 0 Prerequisites

| Tool        | Version (tested)        | Notes                              |
| ----------- | ----------------------- | ---------------------------------- |
| **Node.js** | ≥ 18.x LTS              | `node -v`                          |
| **npm**     | ≥ 9.x                   | Ships with Node; `npm -v`          |
| **Git**     | any modern              | `git clone`                        |
| **Browser** | Chrome / Edge / Firefox | HMR overlay works best in Chromium |

*(Mac users: Homebrew versions of Node & Git are fine. Windows: use Windows Terminal + WSL2 or PowerShell.)*

---

## 1 Clone & Install

```bash
# 1 – Clone
git clone https://github.com/<you>/clinical-canvas-react.git
cd clinical-canvas-react

# 2 – Install dependencies
npm install           # installs 496 pkgs, ~30 s on fast net
```

> **Tip:** if corporate proxies interfere, configure `npm config set proxy http://proxy:port`.

---

## 2 Environment Variables

### 2.1 Quick-start shim (already committed)

`vite.config.ts` now contains:

```ts
define: {
  'process.env': {
    VITE_API_BASE_URL: JSON.stringify('http://localhost:3000/api'),
    VITE_USE_REAL_API: JSON.stringify('false'),
    /* feature flags … */
  },
},
```

*No further action required*—those values are hard-wired for local dev.

### 2.2 Preferred long-term approach (optional)

1. **Rename** `.env.example` ➜ `.env` (create if absent).

2. Add keys:

   ```
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_USE_REAL_API=false
   ```

3. Replace `process.env.*` usages in the code with `import.meta.env.*`.

*(Skip if you’re just testing the UI with mock data.)*

---

## 3 Run the Dev Server

```bash
npm run dev -- --host 127.0.0.1 --port 8080
```

Output should show:

```
VITE v5.x  ready in 200 ms
➜  Local:   http://127.0.0.1:8080/
➜  Network: http://<LAN-IP>:8080/
```

**Verify the bind**

```bash
netstat -an | grep 8080   # should show LISTEN
```

---

## 4 Open the App

1. Navigate to **`http://127.0.0.1:8080/login`** (root redirects to /login).
2. Use any demo credential:
   `sarah.wilson@hospital.com / password123` etc.
3. You should land on the dashboard.

---

## 5 Seeing Code Changes Live (HMR)

| Action                                                   | Result                                                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Edit any `.tsx`, `.css`, or `.ts` file inside `src/`     | Vite detects save, pushes a **Hot Module Replacement** payload to the browser, re-renders only the changed component. |
| Edit **route config, context provider, Tailwind config** | Most changes still hot-swap; a full page reload happens automatically if HMR can’t patch safely.                      |
| Edit **vite.config.ts** or add new env vars              | **Restart** dev server (`Ctrl-C` then `npm run dev …`)—config is build-time.                                          |
| Edit **tailwind.config.ts**                              | Save ➜ HMR reloads affected styles; no server restart needed.                                                         |

> **VS Code**: enable *“File > Auto Save”* to watch changes flow instantly.

### 5.1 If edits don’t appear

1. **Check browser console** – Vite shows overlay if a compile error occurred.
2. **Force refresh** – `Ctrl/Cmd + R` clears stale module cache.
3. **Restart dev server** – sometimes needed if you add new file paths Vite didn’t see.
4. **Kill rogue processes** – `pkill -f "vite|node"`, then rerun.

---

## 6 Typical Debug Commands

| Goal                                        | Command                             |         |
| ------------------------------------------- | ----------------------------------- | ------- |
| Kill every Vite / Node proc on current user | \`pkill -f "vite                    | node"\` |
| Verify nothing else owns the port           | `lsof -i :8080`                     |         |
| Change port quickly                         | `npm run dev -- --port 6006`        |         |
| Watch env vars in build                     | `grep -R "VITE_API_BASE_URL" dist/` |         |

---

## 7 Troubleshooting FAQ

| Symptom                                 | Probable Cause                                              | Fix                                                                                 |
| --------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **ERR\_CONNECTION\_REFUSED**            | IPv6 bind, stale process, blocked port                      | Use `--host 127.0.0.1`, kill rogue processes, pick new port                         |
| **Blank page @ root**                   | Auth redirect → /login                                      | Go straight to `/login`                                                             |
| **“process is not defined”** in console | Missing `define` shim or used `import.meta.env` incorrectly | Keep `define` block or refactor env usage                                           |
| CSS not updating                        | Cached Tailwind JIT output                                  | Save the file again or restart dev server                                           |
| 404 on API calls                        | Backend not running / using mock mode                       | Set `VITE_USE_REAL_API=true` & start backend at 3000, or keep `false` for mock data |

---

## 8 One-liner for repeat runs

```bash
# From project root
pkill -f "vite|node" 2>/dev/null; npm run dev -- --host 127.0.0.1 --port 8080 &
```

The ampersand (`&`) backgrounds Vite so your terminal stays free for git commands.

---

### You’re set!

Hack away, hit **Save**, and check the browser—Vite handles everything else.
