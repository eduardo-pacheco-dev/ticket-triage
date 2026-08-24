export type QueueStatus = 'waiting' | 'in_review' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'inactive';

export interface QueueEntry {
  id: string;
  protocol: string;
  site_id: string;
  technician_name: string;
  request_type: string;
  status: QueueStatus;
  created_at: Date | string;
  updated_at: Date | string;
  started_at?: Date | string;
  completed_at?: Date | string;
}

export interface PublicQueueEntry {
  protocol: string;
  site_id: string;
  status: QueueStatus;
}

export interface RequestType {
  id: string;
  name: string;
  created_at: Date | string;
}

export interface SlaConfig {
  id: number;
  expectedWaitMin: number;
  expectedServiceMin: number;
}

export interface SafeUser {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: Date | string;
}

export interface DashboardData {
  total: number;
  waiting: number;
  inReview: number;
  approved: number;
  rejected: number;
  avgWaitMin: number;
  avgServiceMin: number;
  recent: QueueEntry[];
}

export interface PaginatedQueue {
  items: QueueEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  protocol: string | null;
  site_id: string | null;
  status: QueueStatus | null;
  read: boolean;
  created_at: Date | string;
}

export interface NotificationsList {
  items: AppNotification[];
  unreadCount: number;
}

export const statusLabel: Record<QueueStatus, string> = {
  waiting: 'Aguardando Análise',
  in_review: 'Em Análise',
  approved: 'Aprovado',
  rejected: 'Recusado',
};
