import { RateLimitService } from './rate-limit.service';

type Buckets = Map<string, { count: number; resetAt: number }>;

function bucketsOf(service: RateLimitService): Buckets {
  return (service as unknown as { buckets: Buckets }).buckets;
}

describe('RateLimitService', () => {
  let dateNowSpy: ReturnType<typeof jest.spyOn>;
  let current: number;

  beforeEach(() => {
    current = 1_700_000_000_000;
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => current);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it('permite até o limite da janela e bloqueia excedentes', () => {
    const service = new RateLimitService();
    for (let i = 0; i < 30; i++) {
      expect(service.check('ip-1')).toBe(true);
    }
    expect(service.check('ip-1')).toBe(false);
    expect(service.check('ip-1')).toBe(false);
  });

  it('contabiliza janelas independentes por chave', () => {
    const service = new RateLimitService();
    for (let i = 0; i < 30; i++) {
      expect(service.check('ip-1')).toBe(true);
    }
    expect(service.check('ip-1')).toBe(false);
    expect(service.check('ip-2')).toBe(true);
  });

  it('reabre a janela após expiração', () => {
    const service = new RateLimitService();
    for (let i = 0; i < 30; i++) {
      service.check('ip-1');
    }
    expect(service.check('ip-1')).toBe(false);

    current += 61_000;

    expect(service.check('ip-1')).toBe(true);
  });

  it('respeita limite customizado por chave sem afetar as demais', () => {
    const service = new RateLimitService();
    for (let i = 0; i < 3; i++) {
      expect(service.check('login:10.0.0.1', 3)).toBe(true);
    }
    expect(service.check('login:10.0.0.1', 3)).toBe(false);
    expect(service.check('createCheckIn:10.0.0.1')).toBe(true);
  });

  it('remove buckets expirados na varredura periódica (não vaza memória)', () => {
    const service = new RateLimitService();
    for (let i = 0; i < 50; i++) {
      service.check(`10.0.0.${i}`);
    }
    expect(bucketsOf(service).size).toBe(50);

    current += 120_000;

    expect(service.check('10.0.0.novo')).toBe(true);
    expect(bucketsOf(service).size).toBe(1);
    expect(bucketsOf(service).has('10.0.0.novo')).toBe(true);
  });
});
