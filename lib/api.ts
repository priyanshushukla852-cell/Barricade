import { useAuthStore } from '../store/authStore';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

type ApiOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  retries?: number;
  timeoutMs?: number;
};

/**
 * fetch wrapper for the game backend. Adds the base URL, JSON + Firebase auth
 * headers, a per-attempt timeout, and retries on transient network failures.
 *
 * Mobile networks (and Android's OkHttp connection pool reusing stale keep-alive
 * connections behind Railway's proxy) intermittently throw "Network request
 * failed". A couple of quick retries on a fresh connection clears it. HTTP error
 * responses (4xx/5xx) are NOT retried — they're returned for the caller to handle.
 */
export async function apiFetch(path: string, opts: ApiOptions = {}): Promise<Response> {
  const { method = 'GET', body, retries = 2, timeoutMs = 15000 } = opts;
  const token = useAuthStore.getState().token;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${SERVER_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // Back off briefly before retrying a transient failure.
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}
