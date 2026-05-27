import { create } from 'zustand';

interface AuthStoreState {
  userId: string | null;
  nickname: string | null;
  token: string | null;
  hydrated: boolean;
}

interface AuthStoreActions {
  setUser: (userId: string, nickname: string, token: string) => void;
  clearUser: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthStoreState & AuthStoreActions>()((set) => ({
  userId: null,
  nickname: null,
  token: null,
  hydrated: false,

  setUser: (userId, nickname, token) => set({ userId, nickname, token }),
  clearUser: () => set({ userId: null, nickname: null, token: null }),
  setHydrated: () => set({ hydrated: true }),
}));
