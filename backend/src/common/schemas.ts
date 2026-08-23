import { z } from 'zod';

export const createCheckInSchema = z.object({
  site_id: z.string().trim().min(1, 'SITE ID é obrigatório.').max(100),
  technician_name: z.string().trim().min(1, 'Nome do técnico é obrigatório.').max(200),
  request_type: z.string().trim().min(1, 'Tipo de solicitação é obrigatório.').max(120),
});

export const updateStatusSchema = z.object({
  status: z.enum(['waiting', 'in_review', 'approved', 'rejected']),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Usuário é obrigatório.').max(120),
  password: z.string().min(1, 'Senha é obrigatória.').max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória.'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.').max(200),
});

export const createRequestTypeSchema = z.object({
  name: z.string().trim().min(1, 'Nome do tipo é obrigatório.').max(120),
});

export const updateSlaSchema = z
  .object({
    expectedWaitMin: z.number().int().min(1).max(1440),
    expectedServiceMin: z.number().int().min(1).max(1440),
  })
  .partial();

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateRequestTypeInput = z.infer<typeof createRequestTypeSchema>;
export type UpdateSlaInput = z.infer<typeof updateSlaSchema>;
