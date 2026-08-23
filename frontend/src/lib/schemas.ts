import { z } from 'zod';

export const checkInSchema = z.object({
  site_id: z.string().trim().min(1, 'Informe o SITE ID.').max(100, 'Máximo de 100 caracteres.'),
  technician_name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do técnico.')
    .max(200, 'Máximo de 200 caracteres.'),
  request_type: z.string().trim().min(1, 'Selecione o tipo de solicitação.'),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário.').max(120),
  password: z.string().min(1, 'Informe a senha.'),
});

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(6, 'A nova senha deve ter no mínimo 6 caracteres.')
      .max(200, 'Máximo de 200 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

export const requestTypeSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do tipo.').max(120, 'Máximo de 120 caracteres.'),
});

export const slaConfigSchema = z.object({
  expectedWaitMin: z.coerce
    .number({ message: 'Informe um número.' })
    .int('Deve ser um número inteiro.')
    .min(1, 'Mínimo de 1 minuto.')
    .max(1440, 'Máximo de 1440 minutos (24h).'),
  expectedServiceMin: z.coerce
    .number({ message: 'Informe um número.' })
    .int('Deve ser um número inteiro.')
    .min(1, 'Mínimo de 1 minuto.')
    .max(1440, 'Máximo de 1440 minutos (24h).'),
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !result[key]) {
      result[key] = issue.message;
    }
  }
  return result;
}
