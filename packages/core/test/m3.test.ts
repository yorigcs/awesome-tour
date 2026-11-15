import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTour,
  createTourManager,
  httpAdapter,
  memoryStorage,
  migrateState,
  persist,
  type RouterAdapter,
  sessionStorageAdapter,
} from '../src';

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

afterEach(() => {
  vi.useRealTimers();
});

describe('step guards', () => {
  it('beforeLeave can keep the user on a step, including on finish', async () => {
    let allow = false;
    const tour = createTour({
      id: 't',
      steps: [
        { id: 'a', beforeLeave: () => allow },
        { id: 'b', beforeLeave: () => allow },
      ],
    });
    await tour.start();
    await tour.next();
    expect(tour.getState().stepId).toBe('a');
    allow = true;
    await tour.next();
    expect(tour.getState().stepId).toBe('b');
    allow = false;
    await tour.next();
    expect(tour.getState().status).toBe('active');
    allow = true;
    await tour.next();
    expect(tour.getState().status).toBe('completed');
  });

  it('canNext gates next() and is exposed on the state', async () => {
    let ready = false;
    const tour = createTour({ id: 't', steps: [{ id: 'a', canNext: () => ready }, { id: 'b' }] });
    await tour.start();
    await flush();
    expect(tour.getState().canNext).toBe(false);
    await tour.next();
    expect(tour.getState().stepId).toBe('a');
    ready = true;
    await new Promise((r) => setTimeout(r, 250));
    expect(tour.getState().canNext).toBe(true);
    await tour.next();
    expect(tour.getState().stepId).toBe('b');
    expect(tour.getState().canNext).toBe(true);
  });
});

describe('advanceOn.delay', () => {
  it('advances after the delay', async () => {
    const tour = createTour({
      id: 't',
      steps: [{ id: 'a', advanceOn: { delay: 50 } }, { id: 'b' }],
    });
    await tour.start();
    expect(tour.getState().stepId).toBe('a');
    await new Promise((r) => setTimeout(r, 120));
    expect(tour.getState().stepId).toBe('b');
  });
});

describe('display rules', () => {
  it('explains audience, schedule and frequency', async () => {
    const tour = createTour({
      id: 'promo',
      data: { plan: 'free' },
      steps: [{ id: 'a' }],
      rules: {
        audience: ({ data }) => data.plan === 'pro',
        schedule: { endsAt: '2000-01-01' },
        frequency: { maxShows: 2 },
      },
    });
    const manager = createTourManager({ tours: [tour] });
    const report = await manager.explain('promo');
    expect(report.eligible).toBe(false);
    expect(report.checks.map((c) => [c.rule, c.ok])).toEqual([
      ['audience', false],
      ['schedule', false],
      ['once', true],
      ['maxShows', true],
    ]);
  });

  it('records shows, outcome and snooze; once blocks auto-start after finishing', async () => {
    const tour = createTour({
      id: 'onb',
      steps: [{ id: 'a' }],
      rules: { frequency: { maxShows: 5 } },
    });
    const manager = createTourManager({ tours: [tour] });
    expect(await manager.startIfEligible('onb')).toBe(true);
    await flush();
    tour.snooze(60_000);
    await flush();
    let report = await manager.explain('onb');
    expect(report.checks.find((c) => c.rule === 'snooze')?.ok).toBe(false);
    expect(report.checks.find((c) => c.rule === 'once')?.ok).toBe(true);
    expect(await manager.startIfEligible('onb')).toBe(false);

    await manager.resetImpressions('onb');
    await manager.start('onb');
    tour.complete();
    await flush();
    report = await manager.explain('onb');
    expect(report.checks.find((c) => c.rule === 'once')?.ok).toBe(false);
  });

  it('explicit start() is never blocked by rules', async () => {
    const tour = createTour({ id: 'x', steps: [{ id: 'a' }], rules: { audience: () => false } });
    const manager = createTourManager({ tours: [tour] });
    await manager.start('x');
    expect(tour.getState().status).toBe('active');
  });

  it('auto-starts on signal, route and delay triggers', async () => {
    const bySignal = createTour({
      id: 's',
      steps: [{ id: 'a' }],
      rules: { trigger: { signal: 'help' } },
    });
    const manager = createTourManager({ tours: [bySignal] });
    manager.signal('nope');
    await flush();
    expect(bySignal.getState().status).toBe('idle');
    manager.signal('help');
    await flush();
    expect(bySignal.getState().status).toBe('active');

    const listeners = new Set<() => void>();
    const router: RouterAdapter & { path: string } = {
      path: '/',
      getPath: () => router.path,
      navigate: (p) => {
        router.path = p;
        for (const l of listeners) l();
      },
      subscribe: (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
    };
    const byRoute = createTour({
      id: 'r',
      steps: [{ id: 'a' }],
      rules: { trigger: { route: '/billing/*' } },
    });
    const m2 = createTourManager({ tours: [byRoute], router });
    await flush();
    expect(byRoute.getState().status).toBe('idle');
    await router.navigate('/billing/plans');
    await flush();
    expect(byRoute.getState().status).toBe('active');

    const byDelay = createTour({
      id: 'd',
      steps: [{ id: 'a' }],
      rules: { trigger: { delay: 30 } },
    });
    createTourManager({ tours: [byDelay] });
    await new Promise((r) => setTimeout(r, 80));
    await flush();
    expect(byDelay.getState().status).toBe('active');
    m2.destroy();
  });
});

describe('persistence', () => {
  it('migrates progress from older versions', async () => {
    const adapter = memoryStorage();
    await adapter.set('m', { status: 'paused', stepId: 'old-b', version: 1, updatedAt: 0 });
    const tour = createTour({
      id: 'm',
      version: 3,
      steps: [{ id: 'a' }, { id: 'b' }],
      plugins: [
        persist(adapter, {
          migrate: {
            1: (s) => ({ ...s, stepId: s.stepId === 'old-b' ? 'b' : s.stepId }),
            2: (s) => s,
          },
        }),
      ],
    });
    await tour.start();
    expect(tour.getState().stepId).toBe('b');
    expect((await adapter.get('m'))?.version).toBe(3);
  });

  it('drops progress when a migration is missing', () => {
    const saved = { status: 'paused' as const, stepId: 'a', version: 1, updatedAt: 0 };
    expect(migrateState(saved, 3, { 1: (s) => s })).toBeNull();
    expect(migrateState(saved, 2, { 1: (s) => s })?.version).toBe(2);
  });

  it('sessionStorageAdapter round-trips', () => {
    const adapter = sessionStorageAdapter({ prefix: 'x:' });
    adapter.set('k', { status: 'active', stepId: 'a', version: 1, updatedAt: 1 });
    expect(sessionStorage.getItem('x:k')).toContain('"stepId":"a"');
    expect(adapter.get('k')).toMatchObject({ stepId: 'a' });
  });

  it('httpAdapter reads once, writes optimistically and debounced', async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const fakeFetch = (async (input: string, init?: RequestInit) => {
      calls.push([input, init]);
      if (!init?.method) return new Response(JSON.stringify({ stepId: 'srv' }), { status: 200 });
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    const adapter = httpAdapter<{ stepId: string }>({
      url: 'https://api.test/tours/',
      fetch: fakeFetch,
      headers: { authorization: 'Bearer x' },
      debounce: 20,
    });
    expect(await adapter.get('a b')).toEqual({ stepId: 'srv' });
    expect(await adapter.get('a b')).toEqual({ stepId: 'srv' });
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toBe('https://api.test/tours/a%20b');
    adapter.set('a b', { stepId: 'x' });
    adapter.set('a b', { stepId: 'y' });
    expect(await adapter.get('a b')).toEqual({ stepId: 'y' });
    await new Promise((r) => setTimeout(r, 50));
    const puts = calls.filter(([, init]) => init?.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(puts[0]![1]!.body).toBe('{"stepId":"y"}');
    expect((puts[0]![1]!.headers as Record<string, string>).authorization).toBe('Bearer x');
  });
});
