import { clearAuth, getToken } from './auth-store';
import type {
  AnalyticsChecklist,
  BulkStation,
  DashboardData,
  ImportJob,
  NotificationsList,
  PaginatedQueue,
  PaginatedStations,
  PublicQueueEntry,
  StationMapPoint,
  QueueEntry,
  QueueStatus,
  RequestType,
  ServiceOrder,
  Station,
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
  polling: boolean;
  chatId: string | null;
  tokenMasked: string | null;
  chatsCount: number;
}

export function fetchTelegramConfig() {
  return request<TelegramStatus>('/admin/telegram');
}

export function updateTelegramConfig(data: { token?: string; chatId?: string; polling?: boolean }) {
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

export function fetchServiceOrders() {
  return request<ServiceOrder[]>('/service-orders');
}

export function fetchServiceOrder(id: string) {
  return request<ServiceOrder>(`/service-orders/${id}`);
}

export interface CreateServiceOrderInput {
  clientName: string;
  clientContact?: string;
  siteId?: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  scheduledDate?: string;
  notes?: string;
}

export interface UpdateServiceOrderInput {
  clientName?: string;
  clientContact?: string;
  siteId?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  scheduledDate?: string;
  notes?: string;
}

export function createServiceOrder(data: CreateServiceOrderInput) {
  return request<ServiceOrder>('/service-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateServiceOrder(id: string, data: UpdateServiceOrderInput) {
  return request<ServiceOrder>(`/service-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteServiceOrder(id: string) {
  return request<void>(`/service-orders/${id}`, { method: 'DELETE' });
}

export function fetchStations(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  state?: string;
}): Promise<PaginatedStations> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.state) searchParams.set('state', params.state);
  const qs = searchParams.toString();
  return request<PaginatedStations>(`/stations${qs ? `?${qs}` : ''}`);
}

export function fetchStation(id: string) {
  return request<Station>(`/stations/${id}`);
}

export function fetchStationsMap(
  state?: string,
  bounds?: { south: number; north: number; west: number; east: number },
  search?: string,
): Promise<StationMapPoint[]> {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (search) params.set('search', search);
  if (bounds) {
    params.set('south', String(bounds.south));
    params.set('north', String(bounds.north));
    params.set('west', String(bounds.west));
    params.set('east', String(bounds.east));
  }
  const qs = params.toString();
  return request<StationMapPoint[]>(`/stations/map${qs ? `?${qs}` : ''}`);
}

export interface CreateStationInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  responsible?: string;
  notes?: string;
}

export interface UpdateStationInput {
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  responsible?: string;
  notes?: string;
}

export function createStation(data: CreateStationInput) {
  return request<Station>('/stations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateStation(id: string, data: UpdateStationInput) {
  return request<Station>(`/stations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteStation(id: string) {
  return request<void>(`/stations/${id}`, { method: 'DELETE' });
}

export function fetchAnalyticsChecklists() {
  return request<AnalyticsChecklist[]>('/analytics-checklists');
}

export function fetchAnalyticsChecklist(id: string) {
  return request<AnalyticsChecklist>(`/analytics-checklists/${id}`);
}

export function uploadAnalyticsExcel(file: File): Promise<ImportJob> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  return new Promise<ImportJob>((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    fetch(`${BASE}/analytics-checklists/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timer);
        if (!res.ok) {
          let message = `Erro ${res.status}`;
          try {
            const body = await res.json();
            message = extractMessage(body) ?? message;
          } catch {}
          throw new ApiError(res.status, message);
        }
        resolve(await res.json());
      })
      .catch((err) => {
        clearTimeout(timer);
        if (err instanceof ApiError) reject(err);
        else reject(new ApiError(0, 'Não foi possível conectar ao servidor.'));
      });
  });
}

export function fetchImportJob(jobId: string) {
  return request<ImportJob>(`/analytics-checklists/jobs/${jobId}`);
}

export function downloadAnalyticsExcel(): Promise<void> {
  const token = getToken();
  const url = `${BASE}/analytics-checklists/export`;

  return new Promise<void>((resolve, reject) => {
    if (!token) {
      reject(new ApiError(401, 'Não autenticado.'));
      return;
    }

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new ApiError(res.status, 'Erro ao exportar.');
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `analytics_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
        resolve();
      })
      .catch(reject);
  });
}

export function deleteAnalyticsChecklist(id: string) {
  return request<void>(`/analytics-checklists/${id}`, { method: 'DELETE' });
}

export function deleteAllAnalyticsChecklists() {
  return request<void>('/analytics-checklists', { method: 'DELETE' });
}

export function fetchBulkStations() {
  return request<BulkStation[]>('/bulk-stations');
}

export function fetchBulkStationsCount() {
  return request<{ count: number }>('/bulk-stations/count');
}

export function fetchBulkStation(id: string) {
  return request<BulkStation>(`/bulk-stations/${id}`);
}

export function uploadBulkStationsExcel(file: File): Promise<ImportJob> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  return new Promise<ImportJob>((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);

    fetch(`${BASE}/bulk-stations/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timer);
        if (!res.ok) {
          let message = `Erro ${res.status}`;
          try {
            const body = await res.json();
            message = extractMessage(body) ?? message;
          } catch {}
          throw new ApiError(res.status, message);
        }
        resolve(await res.json());
      })
      .catch((err) => {
        clearTimeout(timer);
        if (err instanceof ApiError) reject(err);
        else reject(new ApiError(0, 'Não foi possível conectar ao servidor.'));
      });
  });
}

export function fetchBulkStationJob(jobId: string) {
  return request<ImportJob>(`/bulk-stations/jobs/${jobId}`);
}

export function downloadBulkStationsExcel(): Promise<void> {
  const token = getToken();
  const url = `${BASE}/bulk-stations/export`;

  return new Promise<void>((resolve, reject) => {
    if (!token) {
      reject(new ApiError(401, 'Não autenticado.'));
      return;
    }

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new ApiError(res.status, 'Erro ao exportar.');
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `stations_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
        resolve();
      })
      .catch(reject);
  });
}

export function deleteBulkStation(id: string) {
  return request<void>(`/bulk-stations/${id}`, { method: 'DELETE' });
}

export function deleteAllBulkStations() {
  return request<void>('/bulk-stations', { method: 'DELETE' });
}
