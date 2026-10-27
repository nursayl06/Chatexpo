import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchMessagesPage } from '@/api/messages';
import type { Message } from '@/api/schemas';
import { messagesKey } from './messagesCache';

/** History from the server, newest first, 30 per page. Older pages load when the user scrolls up. */
export function useMessages() {
  const query = useInfiniteQuery({
    queryKey: messagesKey,
    queryFn: ({ pageParam }) => fetchMessagesPage(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const messages = useMemo<Message[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return { ...query, messages };
}
