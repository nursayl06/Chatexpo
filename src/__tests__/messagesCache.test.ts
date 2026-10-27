import type { Message } from '@/api/schemas';
import { addMessageToData, type MessagesData } from '@/chat/messagesCache';

const make = (id: number): Message => ({
  id,
  clientId: `c-${id}`,
  text: `message ${id}`,
  imageUrl: null,
  author: { id: 1, username: 'ann', avatarUrl: null },
  createdAt: '2026-10-26T12:00:00Z',
});

describe('addMessageToData', () => {
  it('creates the first page when the cache is empty', () => {
    const data = addMessageToData(undefined, make(1));
    expect(data.pages[0].items.map((m) => m.id)).toEqual([1]);
  });

  it('puts a new message on top of the first page', () => {
    const start: MessagesData = { pages: [{ items: [make(2), make(1)], nextCursor: null }], pageParams: [null] };
    const next = addMessageToData(start, make(3));
    expect(next.pages[0].items.map((m) => m.id)).toEqual([3, 2, 1]);
  });

  it('ignores a message that is already in the cache (REST response + WebSocket event)', () => {
    const start: MessagesData = {
      pages: [
        { items: [make(5)], nextCursor: 4 },
        { items: [make(4)], nextCursor: null },
      ],
      pageParams: [null, 4],
    };
    expect(addMessageToData(start, make(4))).toBe(start);
  });
});
