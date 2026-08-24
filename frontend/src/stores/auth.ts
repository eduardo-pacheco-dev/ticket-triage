import { create } from 'zustand';
import { clearAuth, getStoredAuth, setStoredAuth } from '../lib/auth-store';
import * as api from '../lib/api';

interface AuthState {
  token: string | null;
  username: string | null;
  mustChangePassword: boolean;
  login: (username: string, password: string) => Promise<void>;
  applyAccessToken: (token: string) => void;
  clearMustChangePassword: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredAuth()?.token ?? null,
  username: getStoredAuth()?.username ?? null,
  mustChangePassword: getStoredAuth()?.mustChangePassword ?? false,

  async login(username: string, password: string) {
    const res = await api.login(username, password);
    const next = {
      token: res.access_token,
      username: res.user.username,
      mustChangePassword: res.mustChangePassword,
    };
    setStoredAuth(next);
    set(next);
  },

  applyAccessToken(token: string) {
    const current = getStoredAuth();
    if (!current) return;
    const next = { ...current, token };
    setStoredAuth(next);
    set({ token });
  },

  clearMustChangePassword() {
    const current = getStoredAuth();
    if (current) {
      setStoredAuth({ ...current, mustChangePassword: false });
    }
    set({ mustChangePassword: false });
  },

  logout() {
    const current = getStoredAuth();
    clearAuth();
    set({ token: null, username: null, mustChangePassword: false });
    if (current?.token) void api.logout(current.token).catch(() => {});
  },
}));

window.addEventListener('triagem:unauthorized', () => {
  useAuthStore.setState({ token: null, username: null, mustChangePassword: false });
});
