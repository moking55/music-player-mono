# YouTube Watch Together — Development Plan

---

## 1. Project Overview

A real-time watch-together web app where a **host** controls YouTube playback on a large screen (TV/desktop) and **clients** (phone/desktop) join the room to control playback, queue videos, send danmu text, and send meme images — all synced via **Socket.io**.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| Frontend | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS 4 + shadcn/ui + CSS Modules |
| State Management | `use-immer` (in hooks) |
| Real-time Client | `socket.io-client` via Context + Hook |
| HTTP Client | `ky` through Next.js API proxy |
| Backend | NestJS 11 |
| Real-time Server | `@nestjs/websockets` + `@nestjs/platform-socket.io` |
| ORM | TypeORM + PostgreSQL |
| Validation | `class-validator` + `class-transformer` |
| Shared Types | `packages/shared-types` |
| Video Playback | YouTube IFrame Player API |
| QR Code | `qrcode.react` |
| YouTube Search | YouTube Data API v3 (server-side proxy) |
| File Upload (meme) | NestJS `MulterModule`, stored in `/uploads` |

---

## 3. Project Structure

```
next-nest-monorepo-boilerplate/
├── apps/
│   ├── frontend/                         # Next.js 16 App Router
│   │   ├── app/
│   │   │   ├── layout.tsx                # Root layout (SocketProvider)
│   │   │   ├── (screens)/
│   │   │   │   └── watch/
│   │   │   │       ├── page.tsx          # Landing — Create / Join Room
│   │   │   │       ├── host/
│   │   │   │       │   └── page.tsx      # Host screen
│   │   │   │       └── client/
│   │   │   │           └── page.tsx      # Client control panel
│   │   │   └── api/
│   │   │       └── proxy/
│   │   │           └── [...path]/route.ts # API proxy (existing)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/                   # shadcn primitives (existing)
│   │   │   │   └── watch/
│   │   │   │       ├── qr-code/          # QR code display component
│   │   │   │       ├── danmu-overlay/    # Danmu animation component
│   │   │   │       ├── meme-modal/       # Meme popup component
│   │   │   │       ├── queue-panel/      # Queue list component
│   │   │   │       ├── video-search/     # YouTube search + results
│   │   │   │       ├── playback-controls/# Play/Pause/Seek/Skip
│   │   │   │       └── tab-navigation/   # YouTube / Text / Meme tabs
│   │   │   ├── containers/
│   │   │   │   └── watch/
│   │   │   │       ├── landing-container.tsx
│   │   │   │       ├── host-container.tsx
│   │   │   │       └── client-container.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-watch-room/       # Room join/create + state sync
│   │   │   │   ├── use-player-control/   # Emit play/pause/seek/skip
│   │   │   │   ├── use-queue/            # Queue add/remove/sync
│   │   │   │   ├── use-danmu/            # Danmu send + receive
│   │   │   │   ├── use-meme/             # Meme upload + send
│   │   │   │   └── use-youtube-search/   # YouTube Data API search
│   │   │   ├── contexts/
│   │   │   │   └── socket-context.tsx    # (existing) Socket.io provider
│   │   │   └── lib/
│   │   │       └── utils.ts              # cn() helper (existing)
│   │   └── public/
│   │       └── uploads/                  # Served meme images (if needed)
│   └── backend/
│       └── src/
│           ├── modules/
│           │   ├── watch-together/       # New feature module
│           │   │   ├── watch-together.module.ts
│           │   │   ├── watch-together.gateway.ts   # WebSocketGateway
│           │   │   ├── watch-together.service.ts   # Room + queue logic
│           │   │   ├── watch-together.controller.ts# Meme upload endpoint
│           │   │   ├── dto/
│           │   │   │   ├── join-room.dto.ts
│           │   │   │   ├── add-to-queue.dto.ts
│           │   │   │   ├── send-danmu.dto.ts
│           │   │   │   └── player-state.dto.ts
│           │   │   └── interfaces/
│           │   │       └── room.interface.ts
│           │   └── socket/               # (existing) socket module
│           └── common/
│               └── utils/                # (existing) base classes
└── packages/
    └── shared-types/
        └── src/
            ├── index.ts
            ├── enums/
            │   └── watch/                # Watch-specific enums
            │       ├── player-state.enum.ts  # PLAYING | PAUSED | BUFFERING
            │       └── room-event.enum.ts    # Socket event constants
            └── model/
                └── watch/
                    ├── room.ts            # Room, VideoItem, PlayerState types
                    └── watch-events.ts    # Event payload types
```

---

## 4. Shared Types (`packages/shared-types`)

### 4.1 Enums

```typescript
// enums/watch/player-state.enum.ts
export enum PlayerState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  BUFFERING = 'buffering',
}

// enums/watch/room-event.enum.ts
export enum RoomEvent {
  // Host → Server
  CREATE_ROOM = 'create-room',
  PLAYER_STATE_UPDATE = 'player-state-update',

  // Client → Server
  JOIN_ROOM = 'join-room',
  PLAY = 'play',
  PAUSE = 'pause',
  SEEK = 'seek',
  SKIP = 'skip',
  ADD_TO_QUEUE = 'add-to-queue',
  SEND_DANMU = 'send-danmu',
  SEND_MEME = 'send-meme',

  // Server → All
  QUEUE_UPDATED = 'queue-updated',
  ROOM_JOINED = 'room-joined',
  CLIENT_COUNT_UPDATED = 'client-count-updated',

  // Server → Host
  CMD_PLAY = 'cmd-play',
  CMD_PAUSE = 'cmd-pause',
  CMD_SEEK = 'cmd-seek',
  CMD_SKIP = 'cmd-skip',
  DANMU = 'danmu',
  MEME = 'meme',
}
```

### 4.2 Model Types

```typescript
// model/watch/room.ts
export interface VideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  addedBy?: string;
}

export interface PlayerStateData {
  playing: boolean;
  currentTime: number;
  videoId: string;
}

export interface RoomData {
  roomId: string;
  queue: VideoItem[];
  currentIndex: number;
  playerState: PlayerStateData;
  clientCount: number;
}

// model/watch/watch-events.ts
export interface JoinRoomPayload {
  roomId: string;
}

export interface AddToQueuePayload {
  roomId: string;
  videoId: string;
  title: string;
  thumbnail: string;
}

export interface SeekPayload {
  roomId: string;
  time: number;
}

export interface SendDanmuPayload {
  roomId: string;
  text: string;
}

export interface SendMemePayload {
  roomId: string;
  imageUrl: string;
}

export interface PlayerStateUpdatePayload {
  playing: boolean;
  currentTime: number;
  videoId: string;
}
```

---

## 5. Backend Architecture (NestJS Module)

### 5.1 Room Model (in-memory store in `WatchTogetherService`)

```typescript
interface Room {
  roomId: string;              // 6-char alphanumeric
  hostSocketId: string;
  clients: Set<string>;        // socketIds
  queue: VideoItem[];
  currentIndex: number;
  playerState: {
    playing: boolean;
    currentTime: number;
    videoId: string;
  };
}
```

### 5.2 Module Structure

```typescript
// watch-together.module.ts
@Module({
  controllers: [WatchTogetherController],
  providers: [WatchTogetherGateway, WatchTogetherService],
  exports: [WatchTogetherService],
})
export class WatchTogetherModule {}
```

### 5.3 WebSocket Gateway

- `@WebSocketGateway({ cors: { origin: '*' } })`
- Implements `OnGatewayConnection`, `OnGatewayDisconnect`
- Room management using Socket.io rooms (`socket.join(roomId)`)
- `@SubscribeMessage()` handlers for all RoomEvent types
- Host-only commands relayed via `server.to(hostSocketId).emit()`
- Queue/state broadcasts via `server.to(roomId).emit()`

### 5.4 Controller (REST endpoints)

- `POST /watch/upload-meme` — Meme image upload via `MulterModule`
- Returns `{ imageUrl: string }` for the uploaded file

### 5.5 Socket.io Events

#### Host → Server
| Event | Payload | Description |
|---|---|---|
| `create-room` | — | Create a new room, get roomId |
| `player-state-update` | `PlayerStateUpdatePayload` | Broadcast current state to all clients |

#### Client → Server → Host
| Event | Payload | Description |
|---|---|---|
| `join-room` | `JoinRoomPayload` | Join a room as client |
| `play` | `{ roomId }` | Resume playback |
| `pause` | `{ roomId }` | Pause playback |
| `seek` | `SeekPayload` | Seek to time in seconds |
| `skip` | `{ roomId }` | Skip to next queue item |
| `add-to-queue` | `AddToQueuePayload` | Add video to queue |
| `send-danmu` | `SendDanmuPayload` | Send danmu text (host renders only) |
| `send-meme` | `SendMemePayload` | Send meme popup (host renders only) |

#### Server → All (room broadcast)
| Event | Payload | Description |
|---|---|---|
| `queue-updated` | `{ queue: VideoItem[] }` | Queue changed |
| `room-joined` | `RoomData` | Confirmed join + initial state |
| `client-count-updated` | `{ count: number }` | Client count changed |

#### Server → Host only
| Event | Payload | Description |
|---|---|---|
| `cmd-play` | — | Execute play |
| `cmd-pause` | — | Execute pause |
| `cmd-seek` | `{ time: number }` | Execute seek |
| `cmd-skip` | — | Execute skip |
| `danmu` | `{ text: string }` | Render danmu on host |
| `meme` | `{ imageUrl: string }` | Show meme popup on host |

---

## 6. Frontend Architecture (4-Layer Pattern)

### 6.1 Routes

| Route | Page | Container | Auth |
|---|---|---|---|
| `/watch` | `page.tsx` | `LandingContainer` | No |
| `/watch/host` | `page.tsx` | `HostContainer` | No |
| `/watch/client` | `page.tsx` | `ClientContainer` | No |

### 6.2 Layer 1 — Pages (Server Components)

Each page is a thin wrapper that renders its container:

```typescript
// app/(screens)/watch/page.tsx
export default function WatchPage() {
  return <LandingContainer />;
}

// app/(screens)/watch/host/page.tsx
export default function WatchHostPage() {
  return <HostContainer />;
}

// app/(screens)/watch/client/page.tsx
export default function WatchClientPage() {
  return <ClientContainer />;
}
```

### 6.3 Layer 2 — Containers (Smart Components)

**`LandingContainer`** — `"use client"`
- Renders landing UI with "Create Room" and "Join Room" actions
- On create: emits `create-room` via socket, navigates to `/watch/host?room=XXXXXX`
- On join: navigates to `/watch/client?room=XXXXXX`

**`HostContainer`** — `"use client"`
- Uses `useWatchRoom()` — manages room creation, socket connection, state sync
- Uses `usePlayerControl()` — handles play/pause/seek/skip commands from server
- Uses `useDanmu({ mode: 'receive' })` — listens for danmu events, renders overlay
- Uses `useMeme({ mode: 'receive' })` — listens for meme events, shows modal
- Two states: Idle (QR + background) → Playing (player + queue + overlays)
- Renders: `<QRCode>`, `<DanmuOverlay>`, `<MemeModal>`, `<QueuePanel>`

**`ClientContainer`** — `"use client"`
- Reads `room` query param from URL
- Uses `useWatchRoom()` — joins room, syncs state
- Uses `usePlayerControl()` — emits play/pause/seek/skip
- Uses `useQueue()` — add to queue, view queue
- Uses `useDanmu({ mode: 'send' })` — sends danmu text
- Uses `useMeme({ mode: 'send' })` — uploads and sends meme
- Uses `useYouTubeSearch()` — search YouTube, add results to queue
- Renders tabbed UI: `<VideoSearch>`, `<PlaybackControls>`, `<QueuePanel>`, danmu textarea, `<MemeUpload>`

### 6.4 Layer 3 — Components (Presentational)

All under `src/components/watch/`:

| Component | Purpose |
|---|---|
| `qr-code/` | Renders QR code + room code display |
| `danmu-overlay/` | Absolute overlay with CSS-animated flying text |
| `meme-modal/` | Centered modal with image, auto-close after 5s |
| `queue-panel/` | Scrollable list of queued videos with current indicator |
| `video-search/` | Search input + results list with "Add to Queue" buttons |
| `playback-controls/` | Prev / Play-Pause / Skip / Seek slider |
| `tab-navigation/` | Tab switcher (YouTube / Text / Meme) |

Each component: `<name>.tsx`, `types.ts` (Props interface), `index.ts` barrel export.

### 6.5 Layer 4 — Hooks (Business Logic)

All under `src/hooks/`:

**`use-watch-room/`**
- Manages socket room lifecycle (create/join/leave)
- Syncs `RoomData` state via `use-immer`
- Provides: `roomId`, `roomState`, `isHost`, `clientCount`, `createRoom()`, `joinRoom()`

**`use-player-control/`**
- Emits `play`, `pause`, `seek`, `skip` events
- Listens for `cmd-*` events (host mode) or `player-state-update` (client mode)
- Provides: `play()`, `pause()`, `seek()`, `skip()`, `playerState`, `isPlaying`

**`use-queue/`**
- Emits `add-to-queue` event
- Listens for `queue-updated` events
- Provides: `queue`, `currentIndex`, `addToQueue()`

**`use-danmu/`**
- `mode: 'send'` — emits `send-danmu` event, provides `sendDanmu(text)`
- `mode: 'receive'` — listens for `danmu` events, provides `danmuList` (animated)

**`use-meme/`**
- `mode: 'send'` — uploads image via `useApi`, emits `send-meme`, provides `sendMeme(file)`
- `mode: 'receive'` — listens for `meme` events, provides `currentMeme` + auto-dismiss

**`use-youtube-search/`**
- Calls backend proxy endpoint for YouTube Data API search
- Provides: `search(query)`, `results`, `loading`, `error`

Each hook: `use-<name>.ts`, `types.ts`, `index.ts` barrel export.

---

## 7. Screen Designs

### 7.1 Landing Page (`/watch`)

```
┌─────────────────────────────────────────┐
│                                           │
│          YouTube Watch Together           │
│                                           │
│       ┌─────────────────────────┐        │
│       │     Create Room         │        │
│       └─────────────────────────┘        │
│                                           │
│       ┌─────────────────────────┐        │
│       │  Join: [____] [Join]    │        │
│       └─────────────────────────┘        │
│                                           │
└─────────────────────────────────────────┘
```

- Clean centered layout using Tailwind + shadcn Card
- "Create Room" button → socket emit → redirect to `/watch/host?room=XXXXXX`
- "Join Room" input + button → redirect to `/watch/client?room=XXXXXX`

### 7.2 Host Screen (`/watch/host?room=XXXXXX`)

#### State A — Idle (no video playing)

```
┌─────────────────────────────────────────────────┐
│                                                   │
│         [Fullscreen gradient background]          │
│                                                   │
│  ┌──────────────┐                                 │
│  │  [QR Code]   │                                 │
│  │              │                                 │
│  │ Join Code:   │                                 │
│  │  ABC123      │                                 │
│  └──────────────┘                                 │
│                                                   │
└─────────────────────────────────────────────────┘
```

- Background: Tailwind gradient or full-screen art
- QR code encodes join URL (using `qrcode.react`)
- Join code displayed below QR with copy button

#### State B — Playing

```
┌─────────────────────────────────────────────────┐
│                                                   │
│         [YouTube Player — fullscreen]            │
│                                                   │
│  [QR+Code]        [Danmu floating across]        │
│  (bottom-left,                                    │
│   small)                        ┌──────────────┐ │
│                                 │  Queue       │ │
│                                 │  > Video 1   │ │
│                                 │    Video 2   │ │
│                                 │    Video 3   │ │
│                                 └──────────────┘ │
│  [Meme popup — centered modal, auto-close 5s]    │
└─────────────────────────────────────────────────┘
```

- YouTube player fills viewport (IFrame API, no native controls)
- QR + code: small overlay, bottom-left
- Queue panel: right side, semi-transparent, scrollable
- Danmu: CSS-animated text flying right-to-left
- Meme popup: shadcn Dialog with image, auto-close after 5s

### 7.3 Client Screen (`/watch/client?room=XXXXXX`)

```
┌────────────────────────────────┐
│  Room: ABC123         🟢      │  ← connection status
├────────────────────────────────┤
│  [YouTube] [Text] [Meme]       │  ← tabs (shadcn Tabs)
├────────────────────────────────┤
│                                │
│       Tab content area         │
│                                │
└────────────────────────────────┘
```

#### Tab 1 — YouTube
- Search bar + Search button → `useYouTubeSearch` hook
- OR paste YouTube URL/ID directly
- Results: thumbnail + title + "Add to Queue" button
- Playback controls: Prev / Play-Pause / Skip / Seek slider
- Queue list at bottom

#### Tab 2 — Send Text (Danmu)
- Large textarea (shadcn Textarea)
- "Send" button → emits `send-danmu`
- Client does NOT see the danmu (host only)

#### Tab 3 — Send Meme
- File upload area (drag-and-drop or file picker)
- Image preview
- "Send to Screen" button → upload via API proxy → emit `send-meme`

---

## 8. Feature Implementation Details

### 8.1 YouTube IFrame API (Host)

- Load YouTube IFrame API script in `HostContainer` via `useEffect`
- Create player in a dedicated div, reveal on first play
- Listen to `onStateChange` → emit `player-state-update` to server
- Natural video end → auto-advance queue via `cmd-skip`

### 8.2 Danmu Engine (`DanmuOverlay` component)

- Absolutely positioned overlay covering the player (`pointer-events: none`)
- Each danmu item: random vertical lane, CSS animation `translateX` right-to-left
- Duration: 6–8s, random delay to avoid collisions
- Remove DOM element after animation completes (via `onAnimationEnd`)
- State managed in `useDanmu({ mode: 'receive' })` hook with `use-immer`

### 8.3 Queue Management

- Server is source of truth (in-memory in `WatchTogetherService`)
- Host and clients receive `queue-updated` broadcasts
- Host auto-plays next item when current video ends
- Skip command advances `currentIndex` on server, emits `cmd-skip` to host

### 8.4 Meme Upload Flow

1. Client selects image in `useMeme({ mode: 'send' })` hook
2. Upload via `useApi().post('watch/upload-meme', { body: formData })` → proxied to backend
3. Backend `WatchTogetherController` saves file with `MulterModule`, returns `{ imageUrl }`
4. Client emits `send-meme` with `{ roomId, imageUrl }`
5. `WatchTogetherGateway` relays `meme` event to host socket only
6. Host `useMeme({ mode: 'receive' })` receives event, shows `MemeModal`
7. Modal auto-closes after 5s
8. Backend uses `@nestjs/schedule` cron to clean up files after TTL

### 8.5 Seek Sync

- Server broadcasts `player-state-update` (from host) to all clients every 2s
- Client seek slider tracks `playerState.currentTime`
- On client seek: emit `seek` → server → host seeks player
- Debounce flag prevents feedback loop

### 8.6 QR Code

- Uses `qrcode.react` library (npm package)
- Encodes join URL: `https://<host>/watch/client?room=ABC123`
- Idle screen: large, centered
- Playing screen: small (80×80px), bottom-left overlay

### 8.7 YouTube Search (Server-Side Proxy)

- Frontend calls `GET /api/proxy/watch/youtube-search?q=...`
- Backend `WatchTogetherController` calls YouTube Data API v3 with `YOUTUBE_API_KEY`
- Returns normalized `VideoItem[]` results
- API key stays server-side (never exposed to client)

---

## 9. Development Phases

### Phase 1 — Shared Types & Backend Foundation
- [ ] Add watch-related types to `packages/shared-types` (enums, models)
- [ ] Create `WatchTogetherModule` with Gateway + Service + Controller
- [ ] Implement room creation and join logic in `WatchTogetherService`
- [ ] Implement in-memory room store
- [ ] Implement socket event handlers in `WatchTogetherGateway`
- [ ] Implement meme upload endpoint in `WatchTogetherController`
- [ ] Add YouTube search proxy endpoint in `WatchTogetherController`

### Phase 2 — Frontend Hooks & Socket Integration
- [ ] Create `use-watch-room` hook (room lifecycle, state sync)
- [ ] Create `use-player-control` hook (play/pause/seek/skip)
- [ ] Create `use-queue` hook (add/remove/sync)
- [ ] Create `use-danmu` hook (send + receive modes)
- [ ] Create `use-meme` hook (upload + send + receive)
- [ ] Create `use-youtube-search` hook (search via proxy)

### Phase 3 — Host Screen
- [ ] Landing page (`/watch`) with Create/Join UI
- [ ] `HostContainer` with idle state (QR + background)
- [ ] YouTube IFrame player integration
- [ ] Transition: idle → playing state
- [ ] `QueuePanel` component (right side overlay)
- [ ] `QRCode` component (small, bottom-left while playing)
- [ ] Receive and execute player commands from server

### Phase 4 — Client Screen
- [ ] `ClientContainer` with room join flow (URL param)
- [ ] `TabNavigation` component (YouTube / Text / Meme)
- [ ] `VideoSearch` component + `useYouTubeSearch` hook
- [ ] `PlaybackControls` component (play, pause, seek, skip)
- [ ] Seek slider synced to host player state
- [ ] `QueuePanel` component (client view)

### Phase 5 — Danmu & Meme
- [ ] `DanmuOverlay` component with CSS animation engine
- [ ] Send Text tab → `useDanmu({ mode: 'send' })` → host renders
- [ ] Meme upload form on client
- [ ] `MemeModal` component on host with auto-close

### Phase 6 — Polish & UX
- [ ] Mobile-responsive client layout (Tailwind responsive classes)
- [ ] Connection status indicator on client (shadcn Badge)
- [ ] Reconnection handling (Socket.io auto-reconnect + state resync)
- [ ] Room code copy button (shadcn CopyToClipboard)
- [ ] Error states (room not found, YouTube API error) — shadcn Alert
- [ ] Background art / visual design pass
- [ ] Replace example routes with watch-together routes in sidebar

---

## 10. Environment Variables

### Backend (`apps/backend/.env`)

```env
# Existing vars...
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### Frontend (`apps/frontend/.env`)

```env
# Existing vars (already configured)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

YouTube Data API v3 key needed for search. Get from [Google Cloud Console](https://console.cloud.google.com/).

---

## 11. API Endpoints Summary

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/watch/upload-meme` | Upload meme image (multipart) |
| `GET` | `/api/v1/watch/youtube-search?q=` | Search YouTube (server-side proxy) |

---

## 12. Known Constraints

| Constraint | Note |
|---|---|
| YouTube IFrame API | Cannot be embedded in sandboxed iframes; requires full viewport page |
| Meme storage | Files stored locally; use TTL cleanup cron or S3 for production |
| Socket.io rooms | All room state is in-memory; server restart clears all rooms |
| YouTube Search API | Free tier: 10,000 units/day; search = 100 units/call |
| Mobile browsers | Some restrict autoplay; host should interact with page once to unlock audio |
| No auth required | Watch-together routes are public (outside `(authenticated)` route group) |
