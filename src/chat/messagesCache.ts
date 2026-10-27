import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { Message, MessagesPage } from '@/api/schemas';

export const messagesKey = ['messages'] as const;

export type MessagesData = InfiniteData<MessagesPage, number | null>;

/**
 * Inserts a message that arrived over the WebSocket (or as a send response) at the top of the cached list.
 * The same message can arrive twice (REST response + WebSocket event), so it is deduplicated by id.
 */
export function addMessageToData(data: MessagesData | undefined, message: Message): MessagesData {
  if (!data || data.pages.length === 0) {
    return { pages: [{ items: [message], nextCursor: null }], pageParams: [null] };
  }
  const exists = data.pages.some((page) => page.items.some((item) => item.id === message.id));
  if (exists) return data;
  const [first, ...rest] = data.pages;
  return { ...data, pages: [{ ...first, items: [message, ...first.items] }, ...rest] };
}

export function upsertMessage(queryClient: QueryClient, message: Message): void {
  queryClient.setQueryData<MessagesData>(messagesKey, (data) => addMessageToData(data, message));
}
