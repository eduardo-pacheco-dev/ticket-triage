import { Injectable } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const SWEEP_INTERVAL_MS = 60_000;

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweepAt = 0;

  check(key: string, maxRequests: number = MAX_REQUESTS): boolean {
    const now = Date.now();
    this.sweepExpired(now);

    const entry = this.buckets.get(key);

    if (!entry || now > entry.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  private sweepExpired(now: number): void {
    if (now - this.lastSweepAt < SWEEP_INTERVAL_MS) {
      return;
    }
    this.lastSweepAt = now;
    for (const [key, bucket] of this.buckets) {
      if (now > bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }
}
