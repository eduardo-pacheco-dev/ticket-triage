import type { Request } from 'express';

export function clientIp(request: Request): string {
  return (
    (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
    request.ip ||
    'unknown'
  );
}
