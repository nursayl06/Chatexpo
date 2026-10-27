import * as SecureStore from 'expo-secure-store';

/**
 * Tokens live in the secure keychain/keystore (not in MMKV) and are mirrored in memory,
 * so every request does not have to wait for SecureStore.
 */
export type Session = {
  accessToken: string;
  refreshToken: string;
  /** Unix ms when the access token expires. */
  expiresAt: number;
};

const KEY = 'chatexpo.session';
let cached: Session | null | undefined;

export async function loadSession(): Promise<Session | null> {
  if (cached !== undefined) return cached;
  const raw = await SecureStore.getItemAsync(KEY);
  try {
    cached = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function saveSession(session: Session): Promise<void> {
  cached = session;
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  cached = null;
  await SecureStore.deleteItemAsync(KEY);
}
