import { z } from 'zod';
import { changePasswordSchema, slaMinutesSchema } from '@ticket-triage/shared';

export const changePasswordFormSchema = changePasswordSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

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
