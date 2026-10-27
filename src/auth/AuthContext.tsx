import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as authApi from '@/api/auth';
import { setSessionExpiredHandler, toSession } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { Credentials, User } from '@/api/schemas';
import { outbox } from '@/chat/outbox';
import { readJson, storage, writeJson } from '@/storage/mmkv';
import { clearSession, loadSession, saveSession } from './tokenStorage';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: User };

type AuthContextValue = AuthState & {
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const USER_KEY = 'user';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  const signOutLocally = useCallback(async () => {
    await clearSession();
    storage.remove(USER_KEY);
    outbox.clear();
    queryClient.clear();
    setState({ status: 'signedOut', user: null });
  }, [queryClient]);

  const setUser = useCallback((user: User) => {
    writeJson(USER_KEY, user);
    setState({ status: 'signedIn', user });
  }, []);

  // Start: restore the session. The cached user lets the app open offline; /api/me refreshes it when online.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await loadSession();
      const cachedUser = readJson<User>(USER_KEY);
      if (!session || !cachedUser) {
        if (!cancelled) setState({ status: 'signedOut', user: null });
        return;
      }
      if (!cancelled) setState({ status: 'signedIn', user: cachedUser });
      try {
        const fresh = await authApi.fetchMe();
        if (!cancelled) setUser(fresh);
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'session-expired' && !cancelled) await signOutLocally();
        // network errors: stay signed in with the cached user (offline mode)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, signOutLocally]);

  useEffect(() => {
    setSessionExpiredHandler(() => void signOutLocally());
    return () => setSessionExpiredHandler(null);
  }, [signOutLocally]);

  const login = useCallback(
    async (credentials: Credentials) => {
      const response = await authApi.login(credentials);
      await saveSession(toSession(response));
      setUser(response.user);
    },
    [setUser],
  );

  const register = useCallback(
    async (credentials: Credentials) => {
      const response = await authApi.register(credentials);
      await saveSession(toSession(response));
      setUser(response.user);
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    const session = await loadSession();
    if (session) authApi.logout(session.refreshToken).catch(() => undefined); // best effort
    await signOutLocally();
  }, [signOutLocally]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, setUser }),
    [state, login, register, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** For screens that are only reachable when signed in. */
export function useCurrentUser(): User {
  const auth = useAuth();
  if (auth.status !== 'signedIn') throw new Error('useCurrentUser used while signed out');
  return auth.user;
}
