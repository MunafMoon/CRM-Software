let token: string | null = null;
let refreshing: Promise<boolean> | null = null;
export function setToken(value: string | null) {
  token = value;
}
export async function restore() {
  if (!refreshing)
    refreshing = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (r) => {
        if (!r.ok) {
          token = null;
          return false;
        }
        token = (await r.json()).accessToken;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await restore()) return api(path, options, false);
    window.dispatchEvent(new Event('auth-expired'));
  }
  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: 'The server could not complete the request' }));
    const fields = body.details?.fieldErrors;
    throw new Error(
      fields
        ? Object.entries(fields)
            .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
            .join('; ') || body.error
        : body.error || 'Request failed',
    );
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
export const send = (path: string, body: unknown, method = 'POST') =>
  api(path, { method, body: JSON.stringify(body) });
