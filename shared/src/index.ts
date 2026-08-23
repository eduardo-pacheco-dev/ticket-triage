import { z } from 'zod';

/**
 * Factory única para os limites de minutos de SLA (1 a 1440).
 * O backend consome valores numéricos da API; o frontend usa `coerce`
 * para validar inputs de formulário que chegam como string.
 */
export function slaMinutesSchema(coerce = false): z.ZodType<number> {
  const number = coerce
    ? z.coerce.number({ message: 'Informe um número.' })
    : z.number({ message: 'Informe um número.' });
  return number
    .int('Deve ser um número inteiro.')
    .min(1, 'Mínimo de 1 minuto.')
    .max(1440, 'Máximo de 1440 minutos (24h).');
}

export const createCheckInSchema = z.object({
  site_id: z.string().trim().min(1, 'SITE ID é obrigatório.').max(100, 'Máximo de 100 caracteres.'),
  technician_name: z
    .string()
    .trim()
    .min(1, 'Nome do técnico é obrigatório.')
    .max(200, 'Máximo de 200 caracteres.'),
  request_type: z
    .string()
    .trim()
    .min(1, 'Tipo de solicitação é obrigatório.')
    .max(120, 'Máximo de 120 caracteres.'),
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
  name: z
    .string()
    .trim()
    .min(1, 'Nome do tipo é obrigatório.')
    .max(120, 'Máximo de 120 caracteres.'),
});

export const updateSlaSchema = z
  .object({
    expectedWaitMin: slaMinutesSchema(),
    expectedServiceMin: slaMinutesSchema(),
  })
  .partial();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateRequestTypeInput = z.infer<typeof createRequestTypeSchema>;
export type UpdateSlaInput = z.infer<typeof updateSlaSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
