import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import * as store from '../lib/auth-store';
import * as api from '../lib/api';

interface AuthContextValue {
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<store.StoredAuth | null>(() =>
    store.getStoredAuth(),
  );

  useEffect(() => {
    function onUnauthorized() {
      setAuth(null);
    }
    window.addEventListener('triagem:unauthorized', onUnauthorized);
    return () => window.removeEventListener('triagem:unauthorized', onUnauthorized);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: auth?.token ?? null,
      username: auth?.username ?? null,
      async login(username: string, password: string) {
        const res = await api.login(username, password);
        const next: store.StoredAuth = {
          token: res.access_token,
          username: res.user.username,
        };
        store.setStoredAuth(next);
        setAuth(next);
      },
      logout() {
        store.clearAuth();
        setAuth(null);
      },
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
