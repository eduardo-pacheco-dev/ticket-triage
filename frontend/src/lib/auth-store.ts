const KEY = 'triagem_auth';

export interface StoredAuth {
  token: string;
  username: string;
}

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getStoredAuth()?.token ?? null;
}

export function setStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  localStorage.removeItem(KEY);
}
