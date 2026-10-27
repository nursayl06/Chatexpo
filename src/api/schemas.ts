import { z } from 'zod';

/**
 * Every response from the server is checked against these schemas before the app uses it.
 * If the backend changes a field, the app fails with a clear error instead of crashing somewhere in the UI.
 */
export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});
export type User = z.infer<typeof UserSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: UserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const MessageSchema = z.object({
  id: z.number(),
  clientId: z.string(),
  text: z.string().nullable(),
  imageUrl: z.string().nullable(),
  author: UserSchema,
  createdAt: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

export const MessagesPageSchema = z.object({
  items: z.array(MessageSchema),
  nextCursor: z.number().nullable(),
});
export type MessagesPage = z.infer<typeof MessagesPageSchema>;

export const UploadResponseSchema = z.object({ url: z.string() });

export const ErrorBodySchema = z.object({ error: z.string() });

/** Events the server pushes over the WebSocket. */
export const ServerEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('message.new'), message: MessageSchema }),
  z.object({ type: z.literal('presence'), online: z.array(z.string()) }),
  z.object({ type: z.literal('pong') }),
]);
export type ServerEvent = z.infer<typeof ServerEventSchema>;

/** Form validation for the login / register screens. */
export const CredentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[A-Za-z0-9_.]+$/, 'Only letters, digits, _ and .'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password is too long'),
});
export type Credentials = z.infer<typeof CredentialsSchema>;
