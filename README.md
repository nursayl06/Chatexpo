# ChatExpo

Real-time mobile chat built with **React Native + Expo** and a **Spring Boot** backend.
Users register, chat in a shared room, send photos from the camera or gallery, see who is online,
and keep reading and writing messages without internet — everything typed offline is sent automatically
when the connection comes back.

## Features

| Feature | How it works |
| --- | --- |
| Sign up / log in | Spring Security + JWT. Short-lived access token (15 min) and refresh token with rotation. Tokens are stored in `expo-secure-store`. A 401 triggers one automatic refresh and the request is retried. |
| Message history | `useInfiniteQuery` (TanStack Query) with cursor pagination — older messages load while scrolling up. |
| Real-time messages | Native `WebSocket` to Spring (`/ws?token=…`). New messages are written straight into the TanStack Query cache. |
| Response validation | Every REST response and WebSocket event is validated with **Zod** (`src/api/schemas.ts`); types come from `z.infer`. |
| Reconnect | Exponential backoff with jitter, heartbeat ping every 25 s, NetInfo-aware (pauses offline, reconnects instantly when online), reconnects when the app returns to the foreground. After each reconnect the history is invalidated to pick up missed messages. |
| Offline mode | The query cache is persisted to **MMKV**, so the chat opens instantly without internet. Unsent messages live in an MMKV-backed outbox and are flushed on reconnect. Each message has a `clientId`, so retries never create duplicates on the server. |
| Photos | Camera or gallery via `expo-image-picker`, permissions requested only when needed, image resized with `expo-image-manipulator` before upload. Full-screen viewer opens as a modal. |
| Notifications | `expo-notifications` with an Android channel; a local notification is shown for messages that arrive while the app is in the background. |
| Online status | The server broadcasts who is connected; shown in the header and on the profile screen. |
| Navigation | Expo Router: protected route groups (`Stack.Protected`), tabs, modal screen, deep links (`chatexpo://`). |
| Tests | Jest + React Native Testing Library: components, Zod schemas, cache logic and the offline sending flow. Backend: JUnit test for JWT. |

## Architecture

```
 Phone (Expo / React Native)                         Server (Spring Boot)
 ┌───────────────────────────────┐   REST + JWT    ┌──────────────────────────┐
 │ screens (Expo Router)         │ ──────────────► │ /api/auth  register/login│
 │   ↓                           │                 │ /api/messages  history,  │
 │ TanStack Query cache ◄── MMKV │                 │                send      │
 │   ↑            ↑              │                 │ /api/uploads   photos    │
 │ apiFetch     WebSocket client │ ◄────────────── │ /ws  message.new,        │
 │ (Zod, 401 →  (backoff,        │   WebSocket     │      presence            │
 │  refresh)     NetInfo)        │                 │ H2 / PostgreSQL          │
 │ outbox (MMKV) → flush on      │                 └──────────────────────────┘
 │ reconnect                     │
 └───────────────────────────────┘
```

Messages are **sent over REST** (simple to retry and to get an error code) and **received over the WebSocket**.
The same message may arrive twice — as the POST response and as a WebSocket event — so the cache deduplicates by id.

## Project structure

```
src/
  app/                    Expo Router screens
    (auth)/login, register
    (app)/(tabs)/index    chat
    (app)/(tabs)/profile  avatar, who is online, logout
    (app)/photo           full-screen photo (modal)
  api/                    fetch wrapper, Zod schemas, endpoints
  auth/                   AuthContext, secure token storage
  chat/                   WebSocket provider, outbox, sending, cache helpers
  components/             MessageBubble, Composer, ConnectionBanner, Avatar
  storage/                MMKV, TanStack Query client + persister
  notifications/          expo-notifications setup
server/                   Spring Boot backend (Java 21)
```

## Running it

### 1. Server

Requirements: Java 21 and Maven (or open `server/` in IntelliJ IDEA and run `ChatServerApplication`).

```bash
cd server
mvn spring-boot:run
```

The server starts on port 8080 with an H2 database in `server/data/` (no installation needed).
For PostgreSQL: `mvn spring-boot:run -Dspring-boot.run.profiles=postgres` with `DB_URL`, `DB_USER`, `DB_PASSWORD`.

### 2. App

MMKV is a native module, so the app runs in a **development build**, not in Expo Go.

```bash
npm install
cp .env.example .env        # then set EXPO_PUBLIC_API_URL
npx expo run:android        # needs Android Studio + emulator or a phone with USB debugging
```

`EXPO_PUBLIC_API_URL` must be reachable **from the phone**:

- Android emulator: `http://10.0.2.2:8080`
- Real phone on the same Wi-Fi: `http://<your computer's IP>:8080`

Without Android Studio you can build an installable APK in the cloud:
`npx eas-cli@latest build --profile development --platform android` (profiles are in `eas.json`).

### 3. Tests

```bash
npm test             # Jest + React Native Testing Library
npm run typecheck    # TypeScript
cd server && mvn test
```

## Next steps

- Push notifications when the app is closed (FCM / APNs from the server).
- Private chats and a chat list.
- "Typing…" indicator over the WebSocket.
- Voice and video calls with `react-native-webrtc`.
- Crash reporting with Sentry.

## Credits

Based on [react-native-chat-app](https://github.com/pinaki3majumder/react-native-chat-app) by Pinaki Majumder (MIT, see `LICENSE`).
The original was a single-screen Socket.IO demo; the backend, authentication, offline mode, photos, notifications,
navigation and tests were added in this project.
