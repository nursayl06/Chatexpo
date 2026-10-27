import { createMMKV } from 'react-native-mmkv';

/** Fast synchronous key-value storage. Holds the query cache, the outbox and the last known user. */
export const storage = createMMKV({ id: 'chatexpo' });

export function readJson<T>(key: string): T | undefined {
  const raw = storage.getString(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.remove(key);
    return undefined;
  }
}

export function writeJson(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
