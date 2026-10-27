import { z } from 'zod';

import { apiFetch } from './client';
import { AuthResponseSchema, UserSchema, type Credentials } from './schemas';

export const register = (credentials: Credentials) =>
  apiFetch('/api/auth/register', AuthResponseSchema, { method: 'POST', body: credentials, auth: false });

export const login = (credentials: Credentials) =>
  apiFetch('/api/auth/login', AuthResponseSchema, { method: 'POST', body: credentials, auth: false });

export const logout = (refreshToken: string) =>
  apiFetch('/api/auth/logout', z.undefined(), { method: 'POST', body: { refreshToken }, auth: false });

export const fetchMe = () => apiFetch('/api/me', UserSchema);

export const updateAvatar = (avatarUrl: string) =>
  apiFetch('/api/me', UserSchema, { method: 'PATCH', body: { avatarUrl } });
