import { Injectable } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  check(key: string): boolean {
    const now = Date.now();
    const entry = this.buckets.get(key);

    if (!entry || now > entry.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    if (entry.count >= MAX_REQUESTS) {
      return false;
    }

    entry.count++;
    return true;
  }
}
