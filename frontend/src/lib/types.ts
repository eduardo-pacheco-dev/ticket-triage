export type QueueStatus = 'waiting' | 'in_review' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'inactive';
export type ServiceOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ServiceOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AnalyticsChecklistStatus = string;

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

export interface ServiceOrder {
  id: string;
  orderNumber: number;
  clientName: string;
  clientContact: string | null;
  siteId: string | null;
  description: string;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  assignedTo: string | null;
  scheduledDate: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt: Date | string | null;
}

export interface AnalyticsChecklist {
  id: string;
  project: string;
  regional: string | null;
  estado: string | null;
  siteId: string | null;
  oc: string | null;
  smpName: string | null;
  scope: string | null;
  smpId: string | null;
  module: string | null;
  moduleId: string | null;
  implementationVendor: string | null;
  moduleStartDate: Date | string | null;
  section: string | null;
  checklistItem: string | null;
  status: AnalyticsChecklistStatus;
  rejectionComment: string | null;
  rejectionDate: Date | string | null;
  modifiedBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  total: number;
  processed: number;
  inserted?: number;
  skipped?: number;
  errors: number;
  errorMessages: string[];
  createdAt: Date | string;
  completedAt: Date | string | null;
}

export interface BulkStation {
  id: string;
  siteId: string;
  elementType: string | null;
  technology: string | null;
  connectionType: string | null;
  addressId: string | null;
  classification: string | null;
  acquisitionDate: Date | string | null;
  constructionDate: Date | string | null;
  activationDate: Date | string | null;
  deactivationDate: Date | string | null;
  cancellationDate: Date | string | null;
  areaContractType: string | null;
  areaHolder: string | null;
  infraContractType: string | null;
  infraHolder: string | null;
  infraType: string | null;
  evType: string | null;
  evProvider: string | null;
  observation: string | null;
  justification: string | null;
  streetType: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  regional: string | null;
  latitude: string | null;
  longitude: string | null;
  status: string | null;
  towerType: string | null;
  aevNominal: string | null;
  groundArea: string | null;
  structureHeight: string | null;
  stationId: string | null;
  complexOrder: string | null;
  thqObservation: string | null;
  situation: string | null;
  ots: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  responsible: string | null;
  notes: string | null;
  siteId: string | null;
  elementType: string | null;
  technology: string | null;
  connectionType: string | null;
  addressId: string | null;
  classification: string | null;
  acquisitionDate: Date | string | null;
  constructionDate: Date | string | null;
  activationDate: Date | string | null;
  deactivationDate: Date | string | null;
  cancellationDate: Date | string | null;
  areaContractType: string | null;
  areaHolder: string | null;
  infraContractType: string | null;
  infraHolder: string | null;
  infraType: string | null;
  evType: string | null;
  evProvider: string | null;
  observation: string | null;
  justification: string | null;
  streetType: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  zipCode: string | null;
  regional: string | null;
  latitude: string | null;
  longitude: string | null;
  status: string | null;
  towerType: string | null;
  aevNominal: string | null;
  groundArea: string | null;
  structureHeight: string | null;
  stationId: string | null;
  complexOrder: string | null;
  thqObservation: string | null;
  situation: string | null;
  ots: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const serviceOrderStatusLabel: Record<ServiceOrderStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export const serviceOrderPriorityLabel: Record<ServiceOrderPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export function analyticsChecklistStatusLabel(status: string): string {
  return status;
}

export const statusLabel: Record<QueueStatus, string> = {
  waiting: 'Aguardando Análise',
  in_review: 'Em Análise',
  approved: 'Aprovado',
  rejected: 'Recusado',
};
