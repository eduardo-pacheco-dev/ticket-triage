import { create } from 'zustand';
import { clearAuth, getStoredAuth, setStoredAuth } from '../lib/auth-store';
import * as api from '../lib/api';

interface AuthState {
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredAuth()?.token ?? null,
  username: getStoredAuth()?.username ?? null,

  async login(username: string, password: string) {
    const res = await api.login(username, password);
    const next = { token: res.access_token, username: res.user.username };
    setStoredAuth(next);
    set(next);
  },

  logout() {
    clearAuth();
    set({ token: null, username: null });
  },
}));

window.addEventListener('triagem:unauthorized', () => {
  useAuthStore.setState({ token: null, username: null });
});
