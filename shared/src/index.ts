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
  site_id: z
    .string()
    .trim()
    .min(1, 'SITE ID é obrigatório.')
    .max(100, 'Máximo de 100 caracteres.')
    .transform((v) => v.toUpperCase()),
  technician_name: z
    .string()
    .trim()
    .min(1, 'Nome do técnico é obrigatório.')
    .max(200, 'Máximo de 200 caracteres.')
    .transform((v) => v.toUpperCase()),
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

export const userRoleSchema = z.enum(['admin', 'user'], {
  message: 'Papel inválido.',
});
export const userStatusSchema = z.enum(['active', 'inactive'], {
  message: 'Status inválido.',
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Usuário é obrigatório.')
    .max(100, 'Máximo de 100 caracteres.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.').max(200),
  role: userRoleSchema.default('user'),
});

export const updateUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'Usuário é obrigatório.')
      .max(100, 'Máximo de 100 caracteres.'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.').max(200),
    mustChangePassword: z.boolean(),
    role: userRoleSchema,
    status: userStatusSchema,
  })
  .partial();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const serviceOrderStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);
export const serviceOrderPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const createServiceOrderSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(1, 'Nome do cliente é obrigatório.')
    .max(200, 'Máximo de 200 caracteres.'),
  clientContact: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  siteId: z.string().trim().max(100, 'Máximo de 100 caracteres.').optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Descrição é obrigatória.')
    .max(2000, 'Máximo de 2000 caracteres.'),
  priority: serviceOrderPrioritySchema.default('medium'),
  assignedTo: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  scheduledDate: z.string().optional(),
  notes: z.string().trim().max(2000, 'Máximo de 2000 caracteres.').optional(),
});

export const updateServiceOrderSchema = z
  .object({
    clientName: z
      .string()
      .trim()
      .min(1, 'Nome do cliente é obrigatório.')
      .max(200, 'Máximo de 200 caracteres.'),
    clientContact: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
    siteId: z.string().trim().max(100, 'Máximo de 100 caracteres.').optional(),
    description: z
      .string()
      .trim()
      .min(1, 'Descrição é obrigatória.')
      .max(2000, 'Máximo de 2000 caracteres.'),
    status: serviceOrderStatusSchema,
    priority: serviceOrderPrioritySchema,
    assignedTo: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
    scheduledDate: z.string().optional(),
    notes: z.string().trim().max(2000, 'Máximo de 2000 caracteres.').optional(),
  })
  .partial();

export type ServiceOrderStatus = z.infer<typeof serviceOrderStatusSchema>;
export type ServiceOrderPriority = z.infer<typeof serviceOrderPrioritySchema>;
export type CreateServiceOrderInput = z.infer<typeof createServiceOrderSchema>;
export type UpdateServiceOrderInput = z.infer<typeof updateServiceOrderSchema>;
export const createStationSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(200, 'Máximo de 200 caracteres.'),
  code: z
    .string()
    .trim()
    .min(1, 'Código é obrigatório.')
    .max(100, 'Máximo de 100 caracteres.')
    .transform((v) => v.toUpperCase()),
  address: z.string().trim().max(300, 'Máximo de 300 caracteres.').optional(),
  city: z.string().trim().max(150, 'Máximo de 150 caracteres.').optional(),
  state: z.string().trim().max(2, 'Máximo de 2 caracteres.').optional(),
  phone: z.string().trim().max(30, 'Máximo de 30 caracteres.').optional(),
  email: z
    .string()
    .trim()
    .email('E-mail inválido.')
    .max(200, 'Máximo de 200 caracteres.')
    .optional(),
  responsible: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  notes: z.string().trim().max(2000, 'Máximo de 2000 caracteres.').optional(),
});

export const updateStationSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório.').max(200, 'Máximo de 200 caracteres.'),
    code: z
      .string()
      .trim()
      .min(1, 'Código é obrigatório.')
      .max(100, 'Máximo de 100 caracteres.')
      .transform((v) => v.toUpperCase()),
    address: z.string().trim().max(300, 'Máximo de 300 caracteres.').optional(),
    city: z.string().trim().max(150, 'Máximo de 150 caracteres.').optional(),
    state: z.string().trim().max(2, 'Máximo de 2 caracteres.').optional(),
    phone: z.string().trim().max(30, 'Máximo de 30 caracteres.').optional(),
    email: z
      .string()
      .trim()
      .email('E-mail inválido.')
      .max(200, 'Máximo de 200 caracteres.')
      .optional(),
    responsible: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
    notes: z.string().trim().max(2000, 'Máximo de 2000 caracteres.').optional(),
  })
  .partial();

export const analyticsChecklistStatusSchema = z
  .string()
  .trim()
  .max(100, 'Máximo de 100 caracteres.');

export const createAnalyticsChecklistSchema = z.object({
  project: z.string().trim().min(1, 'Projeto é obrigatório.').max(300, 'Máximo de 300 caracteres.'),
  regional: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  estado: z.string().trim().max(2, 'Máximo de 2 caracteres.').optional(),
  siteId: z.string().trim().max(100, 'Máximo de 100 caracteres.').optional(),
  oc: z.string().trim().max(100, 'Máximo de 100 caracteres.').optional(),
  smpName: z.string().trim().max(300, 'Máximo de 300 caracteres.').optional(),
  scope: z.string().trim().max(300, 'Máximo de 300 caracteres.').optional(),
  smpId: z.string().trim().max(100, 'Máximo de 100 caracteres.').optional(),
  module: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  moduleId: z.string().trim().max(100, 'Máximo de 100 caracteres.').optional(),
  implementationVendor: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  moduleStartDate: z.string().optional(),
  section: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  checklistItem: z.string().trim().max(500, 'Máximo de 500 caracteres.').optional(),
  status: analyticsChecklistStatusSchema.default('Pendente'),
  rejectionComment: z.string().trim().max(2000, 'Máximo de 2000 caracteres.').optional(),
  rejectionDate: z.string().optional(),
  modifiedBy: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
});

export const updateAnalyticsChecklistSchema = createAnalyticsChecklistSchema.partial();

export type AnalyticsChecklistStatus = z.infer<typeof analyticsChecklistStatusSchema>;
export type CreateAnalyticsChecklistInput = z.infer<typeof createAnalyticsChecklistSchema>;
export type UpdateAnalyticsChecklistInput = z.infer<typeof updateAnalyticsChecklistSchema>;

export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateRequestTypeInput = z.infer<typeof createRequestTypeSchema>;
export type UpdateSlaInput = z.infer<typeof updateSlaSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
