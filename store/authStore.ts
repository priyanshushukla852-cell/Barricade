import { create } from 'zustand';

interface AuthStoreState {
  userId: string | null;
  nickname: string | null;
  token: string | null;
}

interface AuthStoreActions {
  setUser: (userId: string, nickname: string, token: string) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthStoreState & AuthStoreActions>()((set) => ({
  userId: null,
  nickname: null,
  token: null,

  setUser: (userId, nickname, token) => set({ userId, nickname, token }),
  clearUser: () => set({ userId: null, nickname: null, token: null }),
}));
