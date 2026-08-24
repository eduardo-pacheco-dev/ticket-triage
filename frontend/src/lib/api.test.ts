import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, changePassword, fetchActiveQueue, login, logout } from './api';

const AUTH_KEY = 'triagem_auth';

function stubFetch(impl: (input: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('wrapper request()', () => {
  it('anexa Authorization do token armazenado e faz parse do JSON', async () => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token: 'jwt-1', username: 'admin' }));
    const fetchMock = stubFetch(() => Promise.resolve(jsonResponse(200, { ok: true })));

    const result = await login('admin', 'secret');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-1' }),
      }),
    );
  });

  it('preserva headers explícitos (logout com token já limpo)', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(jsonResponse(200, { ok: true })));

    await logout('jwt-explicito');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-explicito');
  });

  it('converte erros HTTP em ApiError com mensagem do backend', async () => {
    stubFetch(() => Promise.resolve(jsonResponse(400, { message: 'Dados inválidos.' })));

    await expect(changePassword({ currentPassword: 'a', newPassword: 'b' })).rejects.toMatchObject({
      status: 400,
      message: 'Dados inválidos.',
    });
  });

  it('em 401 limpa a autenticação e dispara o evento global', async () => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token: 'x', username: 'a' }));
    const listener = vi.fn();
    window.addEventListener('triagem:unauthorized', listener);
    stubFetch(() => Promise.resolve(jsonResponse(401, { message: 'Sessão expirada.' })));

    await expect(login('a', 'b')).rejects.toBeInstanceOf(ApiError);

    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('triagem:unauthorized', listener);
  });

  it('falha de rede vira ApiError status 0', async () => {
    stubFetch(() => Promise.reject(new Error('down')));

    await expect(fetchActiveQueue()).rejects.toMatchObject({ status: 0 });
  });

  it('aborta requisições que excedem o timeout', async () => {
    vi.useFakeTimers();
    try {
      stubFetch(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      );

      const pending = login('a', 'b');
      const expectation = expect(pending).rejects.toMatchObject({
        status: 0,
        message: 'Não foi possível conectar ao servidor.',
      });
      await vi.advanceTimersByTimeAsync(15000);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });
});
