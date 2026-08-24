import type { QueueStatus } from './types';

export type StatusTagType = 'gray' | 'blue' | 'green' | 'red';

export const statusTagType: Record<QueueStatus, StatusTagType> = {
  waiting: 'gray',
  in_review: 'blue',
  approved: 'green',
  rejected: 'red',
};
