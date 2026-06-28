import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/types';
import { useAuthStore } from '../store/authStore';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket'],   // skip HTTP polling — more reliable on mobile
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 10000,
  // Sent on every (re)connect — the callback runs each time, so it always picks
  // up the latest Firebase ID token (kept fresh by onIdTokenChanged in useAuth).
  auth: (cb: (data: { token: string }) => void) => {
    cb({ token: useAuthStore.getState().token ?? '' });
  },
});
