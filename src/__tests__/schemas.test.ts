import { CredentialsSchema, ServerEventSchema } from '@/api/schemas';

const message = {
  id: 7,
  clientId: 'c-1',
  text: 'Hello',
  imageUrl: null,
  author: { id: 1, username: 'nurasyl', avatarUrl: null },
  createdAt: '2026-10-26T12:00:00Z',
};

describe('ServerEventSchema', () => {
  it('accepts a valid message.new event', () => {
    const result = ServerEventSchema.safeParse({ type: 'message.new', message });
    expect(result.success).toBe(true);
  });

  it('rejects a message with a missing author', () => {
    const { author: _author, ...broken } = message;
    expect(ServerEventSchema.safeParse({ type: 'message.new', message: broken }).success).toBe(false);
  });

  it('rejects unknown event types', () => {
    expect(ServerEventSchema.safeParse({ type: 'hack', payload: 1 }).success).toBe(false);
  });

  it('parses presence', () => {
    const result = ServerEventSchema.parse({ type: 'presence', online: ['ann', 'bob'] });
    expect(result).toEqual({ type: 'presence', online: ['ann', 'bob'] });
  });
});

describe('CredentialsSchema', () => {
  it('trims the username and accepts valid input', () => {
    expect(CredentialsSchema.parse({ username: ' nurasyl ', password: 'secret1' }).username).toBe('nurasyl');
  });

  it('explains what is wrong', () => {
    const result = CredentialsSchema.safeParse({ username: 'ab', password: '123' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toContain('Username must be at least 3 characters');
  });
});
