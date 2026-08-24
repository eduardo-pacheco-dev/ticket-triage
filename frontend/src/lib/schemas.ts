import { z } from 'zod';
import {
  changePasswordSchema,
  createUserSchema,
  slaMinutesSchema,
  userRoleSchema,
  userStatusSchema,
} from '@ticket-triage/shared';

export const changePasswordFormSchema = changePasswordSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

export const createUserFormSchema = createUserSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

export const updateUserFormSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'Usuário é obrigatório.')
      .max(100, 'Máximo de 100 caracteres.'),
    password: z.union([
      z.literal(''),
      z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
    ]),
    confirmPassword: z.string(),
    mustChangePassword: z.boolean(),
    role: userRoleSchema,
    status: userStatusSchema,
  })
  .superRefine((data, ctx) => {
    if (data.password && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'As senhas não conferem.',
      });
    }
  });

export type UpdateUserFormInput = z.infer<typeof updateUserFormSchema>;

export const slaConfigSchema = z.object({
  expectedWaitMin: slaMinutesSchema(true),
  expectedServiceMin: slaMinutesSchema(true),
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
