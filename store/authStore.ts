import { create } from 'zustand';

interface AuthStoreState {
  userId: string | null;
  nickname: string | null;
  token: string | null;
  hydrated: boolean;
  rating: number | null;
}

interface AuthStoreActions {
  setUser: (userId: string, nickname: string, token: string) => void;
  clearUser: () => void;
  setHydrated: () => void;
  setRating: (rating: number) => void;
  setNickname: (nickname: string) => void;
}

export const useAuthStore = create<AuthStoreState & AuthStoreActions>()((set) => ({
  userId: null,
  nickname: null,
  token: null,
  hydrated: false,
  rating: null,

  setUser: (userId, nickname, token) => set({ userId, nickname, token }),
  clearUser: () => set({ userId: null, nickname: null, token: null, rating: null }),
  setHydrated: () => set({ hydrated: true }),
  setRating: (rating) => set({ rating }),
  setNickname: (nickname) => set({ nickname }),
}));
