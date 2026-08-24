import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './auth';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  login: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn().mockResolvedValue({ ok: true }),
}));

function resetState() {
  useAuthStore.setState({ token: null, username: null, mustChangePassword: false });
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    resetState();
    vi.clearAllMocks();
  });

  it('login armazena token, usuário e flag de troca de senha', async () => {
    vi.mocked(api.login).mockResolvedValueOnce({
      access_token: 'jwt-123',
      user: { id: 'u1', username: 'admin' },
      mustChangePassword: true,
    });

    await useAuthStore.getState().login('admin', 'secret');

    expect(api.login).toHaveBeenCalledWith('admin', 'secret');
    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt-123');
    expect(state.username).toBe('admin');
    expect(state.mustChangePassword).toBe(true);
    expect(JSON.parse(localStorage.getItem('triagem_auth') ?? '{}')).toMatchObject({
      token: 'jwt-123',
      mustChangePassword: true,
    });
  });

  it('applyAccessToken troca o token preservando os demais campos', () => {
    localStorage.setItem(
      'triagem_auth',
      JSON.stringify({ token: 'antigo', username: 'admin', mustChangePassword: true }),
    );
    resetState();
    useAuthStore.setState({ token: 'antigo', username: 'admin', mustChangePassword: true });

    useAuthStore.getState().applyAccessToken('novo');

    expect(useAuthStore.getState().token).toBe('novo');
    expect(useAuthStore.getState().username).toBe('admin');
    expect(JSON.parse(localStorage.getItem('triagem_auth') ?? '{}').token).toBe('novo');
  });

  it('logout limpa o estado local na hora e invalida o token no servidor', () => {
    localStorage.setItem('triagem_auth', JSON.stringify({ token: 'jwt-abc', username: 'admin' }));
    useAuthStore.setState({ token: 'jwt-abc', username: 'admin' });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem('triagem_auth')).toBeNull();
    expect(api.logout).toHaveBeenCalledWith('jwt-abc');
  });

  it('logout não quebra se a chamada ao servidor falhar', () => {
    vi.mocked(api.logout).mockRejectedValueOnce(new Error('offline'));
    localStorage.setItem('triagem_auth', JSON.stringify({ token: 'x', username: 'a' }));
    useAuthStore.setState({ token: 'x', username: 'a' });

    expect(() => useAuthStore.getState().logout()).not.toThrow();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
