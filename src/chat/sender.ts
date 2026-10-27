import type { QueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { ApiError, errorMessage } from '@/api/errors';
import { sendMessage, uploadImage } from '@/api/messages';
import { upsertMessage } from './messagesCache';
import { outbox, type PendingMessage } from './outbox';

/**
 * Sending flow:
 *  1. the message is put into the outbox right away, so it shows up in the chat as "sending";
 *  2. the photo (if any) is uploaded, then the message is POSTed with its clientId;
 *  3. on success it moves from the outbox into the TanStack Query cache;
 *     without connection it stays "queued" and flushOutbox() sends it later.
 * The server ignores a repeated clientId, so retries never create duplicates.
 */
export async function queueMessage(queryClient: QueryClient, input: { text: string; localImageUri: string | null }) {
  const text = input.text.trim();
  if (!text && !input.localImageUri) return;
  const item: PendingMessage = {
    clientId: randomUUID(),
    text: text || null,
    localImageUri: input.localImageUri,
    imageUrl: null,
    createdAt: new Date().toISOString(),
    status: 'sending',
  };
  outbox.add(item);
  await deliver(queryClient, item);
}

async function deliver(queryClient: QueryClient, item: PendingMessage): Promise<void> {
  outbox.update(item.clientId, { status: 'sending', error: undefined });
  try {
    let imageUrl = item.imageUrl;
    if (item.localImageUri && !imageUrl) {
      imageUrl = await uploadImage(item.localImageUri);
      outbox.update(item.clientId, { imageUrl });
    }
    const saved = await sendMessage({ clientId: item.clientId, text: item.text, imageUrl });
    upsertMessage(queryClient, saved);
    outbox.remove(item.clientId);
  } catch (error) {
    const retryable = error instanceof ApiError && error.isRetryable;
    outbox.update(item.clientId, { status: retryable ? 'queued' : 'failed', error: errorMessage(error) });
  }
}

let flushing = false;

/** Sends everything that is waiting, oldest first. Called when the WebSocket (re)connects. */
export async function flushOutbox(queryClient: QueryClient): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const waiting = outbox
      .all()
      .filter((item) => item.status !== 'failed')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const item of waiting) {
      await deliver(queryClient, item);
      if (outbox.get(item.clientId)?.status === 'queued') break; // still offline, try again on next reconnect
    }
  } finally {
    flushing = false;
  }
}

export function retryMessage(queryClient: QueryClient, clientId: string) {
  const item = outbox.get(clientId);
  if (item) void deliver(queryClient, item);
}
