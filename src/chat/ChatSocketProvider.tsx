import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { getFreshAccessToken } from '@/api/client';
import { ServerEventSchema } from '@/api/schemas';
import { useCurrentUser } from '@/auth/AuthContext';
import { WS_URL } from '@/config';
import { notifyNewMessage } from '@/notifications/notifications';
import { messagesKey, upsertMessage } from './messagesCache';
import { outbox } from './outbox';
import { flushOutbox } from './sender';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

type ChatSocketValue = { status: ConnectionStatus; onlineUsers: string[] };

const ChatSocketContext = createContext<ChatSocketValue>({ status: 'connecting', onlineUsers: [] });

const HEARTBEAT_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;

/** Delay before reconnect attempt n: 1s, 2s, 4s ... up to 30s, plus random jitter so clients do not reconnect all at once. */
export function backoffDelay(attempt: number): number {
  return Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
}

/**
 * Keeps one WebSocket open while the user is signed in.
 * - reconnects with exponential backoff when the connection drops;
 * - pauses while NetInfo says there is no internet and reconnects immediately when it is back;
 * - after every (re)connect: refetches history (to catch messages missed while offline) and sends the outbox;
 * - every incoming event is validated with Zod before it touches the cache.
 */
export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const me = useCurrentUser();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const myName = useRef(me.username);
  myName.current = me.username;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let hasInternet = true;
    let disposed = false;

    const clearTimers = () => {
      clearTimeout(reconnectTimer);
      clearInterval(heartbeat);
    };

    const scheduleReconnect = () => {
      if (disposed || !hasInternet) return;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, backoffDelay(attempt++));
    };

    async function connect() {
      if (disposed || !hasInternet) return;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
      setStatus('connecting');

      let token: string | null;
      try {
        token = await getFreshAccessToken();
      } catch {
        scheduleReconnect(); // server unreachable while refreshing the token
        return;
      }
      if (!token || disposed) return; // signed out

      const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      socket = ws;

      ws.onopen = () => {
        attempt = 0;
        setStatus('online');
        void queryClient.invalidateQueries({ queryKey: messagesKey });
        void flushOutbox(queryClient);
        clearInterval(heartbeat);
        heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        }, HEARTBEAT_MS);
      };

      ws.onmessage = (event) => {
        let json: unknown;
        try {
          json = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const parsed = ServerEventSchema.safeParse(json);
        if (!parsed.success) {
          if (__DEV__) console.warn('Ignored invalid WebSocket event', parsed.error.issues);
          return;
        }
        const data = parsed.data;
        if (data.type === 'message.new') {
          upsertMessage(queryClient, data.message);
          const mine = data.message.author.username === myName.current;
          if (mine) outbox.remove(data.message.clientId);
          else if (AppState.currentState !== 'active') void notifyNewMessage(data.message);
        } else if (data.type === 'presence') {
          setOnlineUsers(data.online);
        }
      };

      ws.onclose = () => {
        clearInterval(heartbeat);
        if (socket === ws) socket = null;
        if (disposed) return;
        setStatus(hasInternet ? 'connecting' : 'offline');
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose always follows; reconnect is handled there
      };
    }

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false;
      if (connected === hasInternet) return;
      hasInternet = connected;
      if (!connected) {
        clearTimers();
        setStatus('offline');
        socket?.close();
      } else {
        attempt = 0;
        void connect();
      }
    });

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !socket) {
        attempt = 0;
        void connect();
      }
    });

    void connect();

    return () => {
      disposed = true;
      clearTimers();
      unsubscribeNet();
      appStateSub.remove();
      socket?.close();
    };
  }, [queryClient]);

  return <ChatSocketContext.Provider value={{ status, onlineUsers }}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket(): ChatSocketValue {
  return useContext(ChatSocketContext);
}
