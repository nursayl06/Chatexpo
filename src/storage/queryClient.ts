import NetInfo from '@react-native-community/netinfo';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { ApiError } from '@/api/errors';
import { storage } from './mmkv';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data for a day so the persisted cache is still there after the app was closed.
      gcTime: 24 * 60 * 60 * 1000,
      staleTime: 30 * 1000,
      retry: (failureCount, error) =>
        error instanceof ApiError && error.isRetryable ? failureCount < 3 : false,
    },
  },
});

/** The TanStack Query cache is saved to MMKV, so the last messages show up instantly and without internet. */
export const queryPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => {
      storage.remove(key);
    },
  },
  key: 'query-cache',
  throttleTime: 1000,
});

/** Tell TanStack Query about the real network state (NetInfo) and app foreground (AppState). */
export function connectQueryManagers(): () => void {
  const unsubscribeNet = NetInfo.addEventListener((state) => {
    onlineManager.setOnline(state.isConnected !== false);
  });
  const appState = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });
  return () => {
    unsubscribeNet();
    appState.remove();
  };
}
