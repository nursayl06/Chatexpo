import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/errors';
import * as messagesApi from '@/api/messages';
import type { Message } from '@/api/schemas';
import { messagesKey, type MessagesData } from '@/chat/messagesCache';
import { outbox } from '@/chat/outbox';
import { flushOutbox, queueMessage } from '@/chat/sender';

jest.mock('@/api/messages');
const api = jest.mocked(messagesApi);

// gcTime Infinity: no garbage-collection timers left running after the test
const makeClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

const saved = (clientId: string): Message => ({
  id: 1,
  clientId,
  text: 'hi',
  imageUrl: null,
  author: { id: 1, username: 'me', avatarUrl: null },
  createdAt: '2026-10-26T12:00:00Z',
});

describe('offline sending', () => {
  beforeEach(() => {
    outbox.clear();
    jest.resetAllMocks();
  });

  it('keeps the message in the outbox while offline and sends it on reconnect', async () => {
    const queryClient = makeClient();
    api.sendMessage.mockRejectedValueOnce(new ApiError('No connection to the server', 'network'));

    await queueMessage(queryClient, { text: 'hi', localImageUri: null });
    expect(outbox.all()).toHaveLength(1);
    expect(outbox.all()[0].status).toBe('queued');

    const { clientId } = outbox.all()[0];
    api.sendMessage.mockResolvedValueOnce(saved(clientId));
    await flushOutbox(queryClient);

    expect(outbox.all()).toHaveLength(0);
    const data = queryClient.getQueryData<MessagesData>(messagesKey);
    expect(data?.pages[0].items[0].clientId).toBe(clientId);
    // the same clientId is sent both times, so the server can ignore a duplicate
    expect(api.sendMessage.mock.calls[0][0].clientId).toBe(clientId);
    expect(api.sendMessage.mock.calls[1][0].clientId).toBe(clientId);
  });

  it('marks a message as failed when the server rejects it', async () => {
    api.sendMessage.mockRejectedValueOnce(new ApiError('Message must contain text or a photo', 'http', 400));
    await queueMessage(makeClient(), { text: 'hi', localImageUri: null });
    expect(outbox.all()[0]).toMatchObject({ status: 'failed', error: 'Message must contain text or a photo' });
  });

  it('uploads the photo once and reuses its url on retry', async () => {
    const queryClient = makeClient();
    api.uploadImage.mockResolvedValue('/uploads/a.jpg');
    api.sendMessage.mockRejectedValueOnce(new ApiError('No connection to the server', 'network'));

    await queueMessage(queryClient, { text: '', localImageUri: 'file:///photo.jpg' });
    const { clientId } = outbox.all()[0];
    api.sendMessage.mockResolvedValueOnce({ ...saved(clientId), text: null, imageUrl: '/uploads/a.jpg' });
    await flushOutbox(queryClient);

    expect(api.uploadImage).toHaveBeenCalledTimes(1);
    expect(api.sendMessage).toHaveBeenLastCalledWith({ clientId, text: null, imageUrl: '/uploads/a.jpg' });
  });
});
