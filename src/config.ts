/**
 * Server address. Set EXPO_PUBLIC_API_URL in .env (see .env.example).
 * The default 10.0.2.2 is how the Android emulator reaches the computer it runs on;
 * "localhost" would point at the phone itself.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080').replace(/\/+$/, '');

export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws`;

/** The server returns photo paths like "/uploads/abc.jpg"; turn them into full URLs. */
export function fileUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return /^(https?|file|content|data):/.test(path) ? path : `${API_URL}${path}`;
}
