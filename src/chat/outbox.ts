import { useSyncExternalStore } from 'react';

import { readJson, writeJson } from '@/storage/mmkv';

/**
 * Messages that are not confirmed by the server yet. Saved in MMKV, so a message typed without internet
 * survives an app restart and is sent automatically when the connection comes back.
 */
export type PendingMessage = {
  clientId: string;
  text: string | null;
  /** Photo on the phone that still has to be uploaded. */
  localImageUri: string | null;
  /** Server path after the photo was uploaded (so a retry does not upload it twice). */
  imageUrl: string | null;
  createdAt: string;
  status: 'sending' | 'queued' | 'failed';
  error?: string;
};

const KEY = 'outbox';
let items: PendingMessage[] = readJson<PendingMessage[]>(KEY) ?? [];
const listeners = new Set<() => void>();

function commit(next: PendingMessage[]) {
  items = next;
  writeJson(KEY, items);
  listeners.forEach((listener) => listener());
}

export const outbox = {
  all: () => items,
  get: (clientId: string) => items.find((item) => item.clientId === clientId),
  add: (item: PendingMessage) => commit([item, ...items]),
  update: (clientId: string, patch: Partial<PendingMessage>) =>
    commit(items.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item))),
  remove: (clientId: string) => commit(items.filter((item) => item.clientId !== clientId)),
  clear: () => commit([]),
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useOutbox(): PendingMessage[] {
  return useSyncExternalStore(outbox.subscribe, outbox.all, outbox.all);
}
