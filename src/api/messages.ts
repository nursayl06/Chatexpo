import { apiFetch } from './client';
import { MessageSchema, MessagesPageSchema, UploadResponseSchema } from './schemas';

export const fetchMessagesPage = (before: number | null) =>
  apiFetch(`/api/messages${before === null ? '' : `?before=${before}`}`, MessagesPageSchema);

export const sendMessage = (input: { clientId: string; text: string | null; imageUrl: string | null }) =>
  apiFetch('/api/messages', MessageSchema, { method: 'POST', body: input });

/** Uploads a local photo (file:// uri) and returns its server path, e.g. "/uploads/abc.jpg". */
export async function uploadImage(localUri: string): Promise<string> {
  const form = new FormData();
  // React Native's FormData accepts {uri, name, type} objects for files.
  form.append('file', { uri: localUri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  const result = await apiFetch('/api/uploads', UploadResponseSchema, { method: 'POST', body: form });
  return result.url;
}
