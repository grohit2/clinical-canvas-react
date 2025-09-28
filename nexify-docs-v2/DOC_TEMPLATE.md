# How to use the templates

Copy any file in `/templates/` and paste it into `/pages/...`.  
Fill the **frontmatter** and section stubs. Keep sections short; link related pages.

**Frontmatter keys to always include:**
- `title`, `role`, `status`, `owner`, `lastReviewed`
- `tags` and `scope` (one of: `frontend|backend|architecture|infra|users|data`)
- Optional: `summary`, `links`, `related`

This aligns with **context engineering** so agents can route requests to the right docs.
