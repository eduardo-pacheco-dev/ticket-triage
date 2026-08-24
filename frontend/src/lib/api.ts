import { clearAuth, getToken } from './auth-store';
import type {
  DashboardData,
  NotificationsList,
  PaginatedQueue,
  PublicQueueEntry,
  QueueEntry,
  QueueStatus,
  RequestType,
  SlaConfig,
  SafeUser,
} from './types';

const BASE = '/api';
const REQUEST_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function extractMessage(body: unknown): string | null {
  if (body && typeof body === 'object' && 'message' in body) {
    const msg = (body as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return String(msg[0]);
  }
  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { ...(options.headers as Record<string, string> | undefined), ...headers },
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message = extractMessage(body) ?? `Erro ${res.status}`;
    if (res.status === 401) {
      clearAuth();
      window.dispatchEvent(new CustomEvent('triagem:unauthorized'));
    }
    if (res.status === 403 && message.includes('Troque a senha')) {
      window.dispatchEvent(new CustomEvent('triagem:must-change-password'));
    }
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export interface LoginResponse {
  access_token: string;
  user: { id: string; username: string };
  mustChangePassword?: boolean;
}

export function login(username: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function changePassword(data: { currentPassword: string; newPassword: string }) {
  return request<{ ok: boolean; access_token: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logout(token: string) {
  return request<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface CheckInInput {
  site_id: string;
  technician_name: string;
  request_type: string;
}

export function createCheckIn(input: CheckInInput) {
  return request<QueueEntry>('/checkin', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchRequestTypes() {
  return request<RequestType[]>('/request-types');
}

export function addRequestType(name: string) {
  return request<RequestType>('/request-types', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function deleteRequestType(id: string) {
  return request<void>(`/request-types/${id}`, { method: 'DELETE' });
}

export function fetchActiveQueue() {
  return request<QueueEntry[]>('/queue/active');
}

export function fetchArchivedQueue(page = 1, pageSize = 20): Promise<PaginatedQueue> {
  return request<PaginatedQueue>(`/queue/archived?page=${page}&pageSize=${pageSize}`);
}

export function fetchBySiteId(siteId: string) {
  const encoded = encodeURIComponent(siteId.trim());
  return request<{ entries: PublicQueueEntry[]; position: number | null }>(
    `/public/status/${encoded}`,
  );
}

export function updateStatus(id: string, status: QueueStatus) {
  return request<QueueEntry>(`/queue/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function fetchDashboard() {
  return request<DashboardData>('/admin/dashboard');
}

export function fetchNotifications() {
  return request<NotificationsList>('/notifications');
}

export function markNotificationRead(id: string) {
  return request<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return request<{ ok: boolean }>('/notifications/read-all', { method: 'POST' });
}

export function fetchSlaConfig() {
  return request<SlaConfig>('/sla-config');
}

export function updateSlaConfig(data: { expectedWaitMin: number; expectedServiceMin: number }) {
  return request<SlaConfig>('/sla-config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export interface TelegramStatus {
  configured: boolean;
  receiving: boolean;
  chatId: string | null;
  tokenMasked: string | null;
}

export function fetchTelegramConfig() {
  return request<TelegramStatus>('/admin/telegram');
}

export function updateTelegramConfig(data: { token?: string; chatId?: string }) {
  return request<TelegramStatus>('/admin/telegram', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function testTelegram() {
  return request<{ ok: boolean; error?: string }>('/admin/telegram/test', { method: 'POST' });
}


export function fetchUsers() {
  return request<SafeUser[]>('/users');
}

export interface CreateUserInput {
  username: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserInput {
  username?: string;
  password?: string;
  mustChangePassword?: boolean;
  role?: 'admin' | 'user';
  status?: 'active' | 'inactive';
}

export function createUser(data: CreateUserInput) {
  return request<SafeUser>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateUser(id: string, data: UpdateUserInput) {
  return request<SafeUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteUser(id: string) {
  return request<void>(`/users/${id}`, { method: 'DELETE' });
}
