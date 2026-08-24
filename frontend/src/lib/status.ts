import type { QueueStatus } from './types';

export type StatusChipColor = 'default' | 'primary' | 'success' | 'error';

export const statusChipColor: Record<QueueStatus, StatusChipColor> = {
  waiting: 'default',
  in_review: 'primary',
  approved: 'success',
  rejected: 'error',
};
