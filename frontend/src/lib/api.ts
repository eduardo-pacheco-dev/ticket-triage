import { clearAuth, getToken } from './auth-store';
import type {
  DashboardData,
  PublicQueueEntry,
  QueueEntry,
  QueueStatus,
  RequestType,
  SlaConfig,
} from './types';

const BASE = '/api';

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

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.');
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      window.dispatchEvent(new CustomEvent('triagem:unauthorized'));
    }
    throw new ApiError(res.status, extractMessage(body) ?? `Erro ${res.status}`);
  }

  return body as T;
}

export interface LoginResponse {
  access_token: string;
  user: { id: string; username: string };
}

export function login(username: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function changePassword(data: { currentPassword: string; newPassword: string }) {
  return request<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
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

export function fetchArchivedQueue() {
  return request<QueueEntry[]>('/queue/archived');
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

export function fetchSlaConfig() {
  return request<SlaConfig>('/sla-config');
}

export function updateSlaConfig(data: {
  expectedWaitMin: number;
  expectedServiceMin: number;
}) {
  return request<SlaConfig>('/sla-config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
