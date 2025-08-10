const BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim()) || "/api";

export class ApiError extends Error {
  status: number; body?: any;
  constructor(message: string, status: number, body?: any) { super(message); this.status = status; this.body = body; }
}

type Method = "GET"|"POST"|"PUT"|"PATCH"|"DELETE";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const shouldRetry = (method: Method, status: number) =>
  ["GET","PUT","PATCH","DELETE"].includes(method) && [408,429,500,502,503,504].includes(status);

export async function apiFetch<T>(path: string, opts: RequestInit & { method?: Method } = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const method = (opts.method || "GET") as Method;
  const headers: HeadersInit = { "Content-Type": "application/json", ...(opts.headers || {}) };

  if (import.meta.env.VITE_API_AUTH_TOKEN) headers["Authorization"] = `Bearer ${import.meta.env.VITE_API_AUTH_TOKEN}`;

  const body = typeof opts.body === "object" && opts.body != null && (headers as any)["Content-Type"] === "application/json"
    ? JSON.stringify(opts.body) : (opts.body as BodyInit | undefined);

  let attempt = 0, lastErr: any;
  while (attempt < 3) {
    const res = await fetch(url, { ...opts, method, headers, body });
    if (res.ok) {
      if (res.status === 204) return undefined as unknown as T;
      const text = await res.text();
      return text ? JSON.parse(text) as T : (undefined as unknown as T);
    }
    const errBody = await res.clone().json().catch(() => undefined);
    if (!shouldRetry(method, res.status)) throw new ApiError(errBody?.error || res.statusText, res.status, errBody);
    lastErr = new ApiError(errBody?.error || res.statusText, res.status, errBody);
    attempt++; await sleep(200 * attempt);
  }
  throw lastErr;
}