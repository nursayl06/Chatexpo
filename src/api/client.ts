import type { z } from 'zod';

import { API_URL } from '@/config';
import { clearSession, loadSession, saveSession, type Session } from '@/auth/tokenStorage';
import { ApiError } from './errors';
import { AuthResponseSchema, ErrorBodySchema, type AuthResponse } from './schemas';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Send the access token. Default true. */
  auth?: boolean;
};

let onSessionExpired: (() => void) | null = null;

/** AuthProvider registers here so the app logs out when the refresh token is no longer valid. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function toSession(response: AuthResponse): Session {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: Date.now() + response.expiresIn * 1000,
  };
}

let refreshInFlight: Promise<Session | null> | null = null;

/**
 * Exchanges the refresh token for a new pair. Several requests can fail with 401 at the same time,
 * so the refresh is shared: only one call reaches the server.
 */
export function refreshSession(): Promise<Session | null> {
  refreshInFlight ??= (async () => {
    const current = await loadSession();
    if (!current) return null;
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
    } catch {
      throw new ApiError('No connection to the server', 'network');
    }
    if (res.status === 401) {
      await clearSession();
      onSessionExpired?.();
      return null;
    }
    if (!res.ok) throw new ApiError('Could not refresh the session', 'http', res.status);
    const parsed = AuthResponseSchema.safeParse(await res.json());
    if (!parsed.success) throw new ApiError('Unexpected server response', 'invalid-response', res.status);
    const next = toSession(parsed.data);
    await saveSession(next);
    return next;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Returns an access token that is valid for at least another minute (refreshing it if needed). */
export async function getFreshAccessToken(): Promise<string | null> {
  const session = await loadSession();
  if (!session) return null;
  if (session.expiresAt - 60_000 > Date.now()) return session.accessToken;
  const refreshed = await refreshSession();
  return refreshed?.accessToken ?? null;
}

async function toApiError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  try {
    const body = ErrorBodySchema.safeParse(await res.json());
    if (body.success) message = body.data.error;
  } catch {
    // body was not JSON; keep the generic message
  }
  return new ApiError(message, 'http', res.status);
}

/**
 * fetch + JSON + token + one automatic refresh on 401 + Zod validation of the response.
 * Throws ApiError with kind "network" when the phone cannot reach the server.
 */
export async function apiFetch<S extends z.ZodType>(path: string, schema: S, options: RequestOptions = {}): Promise<z.infer<S>> {
  const { body, auth = true, headers, ...rest } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const send = async (token: string | null) => {
    try {
      return await fetch(`${API_URL}${path}`, {
        ...rest,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('No connection to the server', 'network');
    }
  };

  let res = await send(auth ? await getFreshAccessToken() : null);

  if (res.status === 401 && auth) {
    const refreshed = await refreshSession();
    if (!refreshed) throw new ApiError('Session expired, please log in again', 'session-expired', 401);
    res = await send(refreshed.accessToken);
  }

  if (!res.ok) throw await toApiError(res);

  const json: unknown = res.status === 204 ? undefined : await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    if (__DEV__) console.warn(`Unexpected response from ${path}`, parsed.error.issues);
    throw new ApiError('Unexpected server response', 'invalid-response', res.status);
  }
  return parsed.data;
}
