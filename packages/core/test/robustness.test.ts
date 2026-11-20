import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTour, type TourPlugin } from '../src';

const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('transition pipeline', () => {
  it("'skip' policy runs the previous step's leave hooks once", async () => {
    const beforeLeave = vi.fn();
    const afterLeave = vi.fn();
    const stepLeave = vi.fn();
    const tour = createTour({
      id: 't',
      steps: [
        { id: 'a', beforeLeave, afterLeave },
        { id: 'b', target: '#missing', onTargetMissing: 'skip', targetTimeout: 0 },
        { id: 'c' },
      ],
    });
    tour.on('stepLeave', stepLeave);
    await tour.start();
    await tour.next();
    await tick();
    expect(tour.getState().stepId).toBe('c');
    expect(beforeLeave).toHaveBeenCalledTimes(1);
    expect(afterLeave).toHaveBeenCalledTimes(1);
    expect(stepLeave).toHaveBeenCalledTimes(1);
  });

  it('a failing beforeEnter restores the previous step with its advanceOn listeners', async () => {
    const tour = createTour({
      id: 't',
      steps: [
        { id: 'a', advanceOn: { signal: 'go' } },
        {
          id: 'b',
          beforeEnter: () => {
            throw new Error('boom');
          },
        },
        { id: 'c' },
      ],
    });
    const errors: unknown[] = [];
    tour.on('error', ({ error }) => errors.push(error));
    await tour.start();
    await tour.next();
    expect(errors).toHaveLength(1);
    expect(tour.getState()).toMatchObject({ stepId: 'a', phase: 'ready', status: 'active' });
    // The step must still be interactive: the signal advances (and fails again, staying on a).
    tour.signal('go');
    await tick();
    expect(errors).toHaveLength(2);
  });

  it('resuming a paused tour does not emit stepLeave twice', async () => {
    const stepLeave = vi.fn();
    const tour = createTour({ id: 't', steps: [{ id: 'a' }, { id: 'b' }] });
    tour.on('stepLeave', stepLeave);
    await tour.start();
    tour.pause();
    await tour.resume();
    await tour.next();
    expect(stepLeave).toHaveBeenCalledTimes(2); // pause, then a → b
  });

  it('enterTimeout fails a beforeEnter that never settles', async () => {
    vi.useFakeTimers();
    try {
      const tour = createTour({
        id: 't',
        enterTimeout: 1000,
        steps: [{ id: 'a' }, { id: 'b', beforeEnter: () => new Promise<void>(() => {}) }],
      });
      const errors: unknown[] = [];
      tour.on('error', ({ error }) => errors.push(error));
      await tour.start();
      const pending = tour.next();
      await vi.advanceTimersByTimeAsync(1000);
      await pending;
      expect(errors).toHaveLength(1);
      expect(String(errors[0])).toMatch(/beforeEnter/);
      expect(tour.getState()).toMatchObject({ stepId: 'a', phase: 'ready' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('double next() runs beforeLeave once and advances one step', async () => {
    let release!: () => void;
    const beforeLeave = vi.fn(() => new Promise<boolean>((r) => (release = () => r(true))));
    const tour = createTour({
      id: 't',
      steps: [{ id: 'a', beforeLeave }, { id: 'b' }, { id: 'c' }],
    });
    await tour.start();
    const first = tour.next();
    const second = tour.next();
    await tick();
    release();
    await Promise.all([first, second]);
    expect(beforeLeave).toHaveBeenCalledTimes(1);
    expect(tour.getState().stepId).toBe('b');
  });

  it('plugins get an abort signal and a throwing beforeStep is reported', async () => {
    let seen: AbortSignal | undefined;
    const plugin: TourPlugin = {
      name: 'p',
      beforeStep(_tour, { to, signal }) {
        seen = signal;
        if (to === 'c') throw new Error('nope');
      },
    };
    const tour = createTour({
      id: 't',
      plugins: [plugin],
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    });
    const errors: unknown[] = [];
    tour.on('error', ({ error }) => errors.push(error));
    await tour.start();
    expect(seen).toBeInstanceOf(AbortSignal);
    await tour.next();
    await tour.next();
    expect(errors).toHaveLength(1);
    expect(tour.getState()).toMatchObject({ stepId: 'b', status: 'active', phase: 'ready' });
  });

  it('prev() skips history steps whose `when` no longer passes', async () => {
    const tour = createTour({
      id: 't',
      data: { showB: true },
      steps: [{ id: 'a' }, { id: 'b', when: (ctx) => ctx.data.showB }, { id: 'c' }],
    });
    await tour.start();
    await tour.next();
    await tour.next();
    expect(tour.getState().stepId).toBe('c');
    tour.setData({ showB: false });
    await tour.prev();
    expect(tour.getState().stepId).toBe('a');
  });

  it('async `when` is evaluated once per data change by getVisibleSteps()', async () => {
    const when = vi.fn(async () => true);
    const tour = createTour({ id: 't', steps: [{ id: 'a' }, { id: 'b', when }] });
    await tour.start();
    when.mockClear();
    for (let i = 0; i < 5; i++) tour.getVisibleSteps();
    expect(when).toHaveBeenCalledTimes(0); // already evaluated for this data
    tour.setData({ x: 1 });
    for (let i = 0; i < 5; i++) tour.getVisibleSteps();
    expect(when).toHaveBeenCalledTimes(1);
  });

  it('setSteps() removing the current step moves on to the next one', async () => {
    const tour = createTour({ id: 't', steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    await tour.start();
    await tour.next();
    tour.setSteps([{ id: 'a' }, { id: 'c' }]);
    await tick();
    expect(tour.getState()).toMatchObject({ stepId: 'c', status: 'active' });
  });

  it('setSteps() removing the last current step completes the tour', async () => {
    const tour = createTour({ id: 't', steps: [{ id: 'a' }, { id: 'b' }] });
    await tour.start();
    await tour.next();
    tour.setSteps([{ id: 'a' }]);
    await tick();
    expect(tour.getState().status).toBe('completed');
  });

  it('destroy() leaves the current step and aborts afterLeave signals', async () => {
    let leaveSignal: AbortSignal | undefined;
    const tour = createTour({
      id: 't',
      steps: [
        {
          id: 'a',
          afterLeave: (ctx) => {
            leaveSignal = ctx.signal;
          },
        },
      ],
    });
    const listener = vi.fn();
    tour.subscribe(listener);
    await tour.start();
    tour.destroy();
    await tick();
    expect(leaveSignal?.aborted).toBe(true);
    expect(tour.getState().status).toBe('closed');
    listener.mockClear();
    tour.setData({ x: 1 });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('target lifecycle', () => {
  const el = (id: string) => {
    const node = document.createElement('div');
    node.id = id;
    document.body.append(node);
    return node;
  };

  it('picks up a re-rendered target', async () => {
    const first = el('t1');
    const lost = vi.fn();
    const tour = createTour({ id: 't', steps: [{ id: 'a', target: '#t1' }] });
    tour.on('targetLost', lost);
    await tour.start();
    expect(tour.getState().targets).toEqual([first]);
    first.remove();
    const second = el('t1');
    await tick();
    expect(tour.getState().targets).toEqual([second]);
    expect(lost).toHaveBeenCalledWith({ stepId: 'a', recovered: true });
  });

  it('waits for a removed target, then centers the step', async () => {
    el('t2');
    const tour = createTour({ id: 't', targetTimeout: 30, steps: [{ id: 'a', target: '#t2' }] });
    await tour.start();
    document.getElementById('t2')!.remove();
    await tick();
    expect(tour.getState().phase).toBe('resolving');
    await new Promise((r) => setTimeout(r, 60));
    expect(tour.getState()).toMatchObject({ phase: 'ready', targetMissing: true, targets: [] });
  });

  it("onTargetLost: 'close' closes the tour", async () => {
    el('t3');
    const tour = createTour({
      id: 't',
      steps: [{ id: 'a', target: '#t3', onTargetLost: 'close' }],
    });
    await tour.start();
    document.getElementById('t3')!.remove();
    await tick();
    expect(tour.getState().status).toBe('closed');
  });

  it('shares one DOM observer across steps and releases it', async () => {
    const { getObserverStats } = await import('../src');
    el('t4');
    const baseline = getObserverStats();
    const tours = [1, 2, 3].map((n) =>
      createTour({
        id: `t${n}`,
        steps: [{ id: 'a', target: '#t4', canNext: () => true, advanceOn: { when: () => false } }],
      }),
    );
    for (const t of tours) await t.start();
    expect(getObserverStats().activity).toBeGreaterThanOrEqual(baseline.activity + 3);
    for (const t of tours) t.close();
    expect(getObserverStats()).toEqual(baseline);
  });

  it('finds targets in every open shadow root', async () => {
    const { deepQuerySelectorAll } = await import('../src');
    for (const n of [1, 2]) {
      const host = document.createElement('div');
      document.body.append(host);
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = `<button class="in-shadow">${n}</button>`;
    }
    expect(deepQuerySelectorAll('.in-shadow')).toHaveLength(2);
  });

  it('inertOthers keeps a target inside a shadow root reachable', async () => {
    const { inertOthers } = await import('../src');
    const host = document.createElement('div');
    const sibling = document.createElement('div');
    document.body.append(host, sibling);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<button id="inner">x</button><span id="other"></span>';
    const restore = inertOthers([root.getElementById('inner')!]);
    expect(host.hasAttribute('inert')).toBe(false);
    expect(sibling.hasAttribute('inert')).toBe(true);
    expect(root.getElementById('other')!.hasAttribute('inert')).toBe(true);
    restore();
    expect(sibling.hasAttribute('inert')).toBe(false);
  });

  it('advanceOn events fire inside an iframe target', async () => {
    const { frameTarget } = await import('../src');
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const doc = iframe.contentDocument!;
    doc.body.innerHTML = '<button id="save">Save</button>';
    const tour = createTour({
      id: 't',
      steps: [
        { id: 'a', target: frameTarget(iframe, '#save'), advanceOn: { event: 'click' } },
        { id: 'b' },
      ],
    });
    await tour.start();
    doc.getElementById('save')!.click();
    await tick();
    expect(tour.getState().stepId).toBe('b');
  });
});

describe('persistence and rules', () => {
  it('records how a run ended and honours once modes', async () => {
    const { createTourManager, memoryStorage } = await import('../src');
    const impressions = memoryStorage<import('../src').ImpressionRecord>();
    const mk = (once: true | 'completed' | 'seen') =>
      createTour({ id: `t-${once}`, rules: { frequency: { once } }, steps: [{ id: 'a' }] });
    const tours = [mk(true), mk('completed'), mk('seen')];
    const manager = createTourManager({ tours, impressions });
    for (const tour of tours) {
      await manager.start(tour.id);
      tour.close();
    }
    await tick();
    expect((await impressions.get('t-true'))?.outcome).toBe('dismissed');
    expect((await manager.explain('t-true')).eligible).toBe(false);
    expect((await manager.explain('t-completed')).eligible).toBe(true);
    expect((await manager.explain('t-seen')).eligible).toBe(false);
  });

  it('dismissCooldownMs delays a dismissed tour', async () => {
    const { createTourManager } = await import('../src');
    const tour = createTour({
      id: 'cool',
      rules: { frequency: { once: 'completed', dismissCooldownMs: 60_000 } },
      steps: [{ id: 'a' }],
    });
    const manager = createTourManager({ tours: [tour] });
    await manager.start('cool');
    tour.close();
    await tick();
    const report = await manager.explain('cool');
    expect(report.eligible).toBe(false);
    expect(report.checks.find((c) => !c.ok)?.detail).toMatch(/dismissed/);
  });

  it('matchRoute ignores query strings, hashes and trailing slashes', async () => {
    const { matchRoute } = await import('../src');
    expect(matchRoute('/projects/:id', '/projects/42?tab=files#top')).toBe(true);
    expect(matchRoute('/settings/', '/settings')).toBe(true);
    expect(matchRoute('/a b', '/a%20b')).toBe(true);
    expect(matchRoute('/projects', '/projects/42')).toBe(false);
  });

  it('persist ignores malformed and newer-version saves', async () => {
    const { memoryStorage, persist } = await import('../src');
    const storage = memoryStorage<any>();
    storage.set('p', { nope: true });
    const onError = vi.fn();
    const tour = createTour({
      id: 'p',
      plugins: [persist(storage, { onError })],
      steps: [{ id: 'a' }, { id: 'b' }],
    });
    await tour.start();
    expect(tour.getState().stepId).toBe('a');
    expect(onError).toHaveBeenCalled();
    tour.close();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.set('q', { status: 'completed', stepId: 'b', version: 9, updatedAt: 0 });
    const newer = createTour({ id: 'q', plugins: [persist(storage)], steps: [{ id: 'a' }] });
    await newer.start();
    expect(newer.getState().status).toBe('active');
    expect(await storage.get('q')).toMatchObject({ version: 9 }); // kept for the newer version
    warn.mockRestore();
  });

  it('persist does not auto-start when progress cannot be read', async () => {
    const { persist } = await import('../src');
    const failing = {
      get: () => Promise.reject(new Error('offline')),
      set: () => {},
      remove: () => {},
    };
    const onError = vi.fn();
    const tour = createTour({
      id: 'r',
      plugins: [persist(failing, { onError })],
      steps: [{ id: 'a' }],
    });
    await tour.start();
    expect(tour.getState().status).toBe('idle');
    await tour.start({ force: true });
    expect(tour.getState().status).toBe('active');
  });
});

describe('httpAdapter', () => {
  const response = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status });

  it('does not cache failed reads and can throw on them', async () => {
    const { httpAdapter } = await import('../src');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(200, { saved: 1 }));
    const adapter = httpAdapter({ url: '/api', fetch });
    expect(await adapter.get('k')).toBeNull();
    expect(await adapter.get('k')).toEqual({ saved: 1 });
    const throwing = httpAdapter({
      url: '/api',
      fetch: vi.fn().mockResolvedValue(response(401)),
      readErrors: 'throw',
    });
    await expect(throwing.get('k')).rejects.toThrow(/401/);
  });

  it('retries failed writes with backoff and reports the last failure', async () => {
    const { httpAdapter } = await import('../src');
    vi.useFakeTimers();
    try {
      const fetch = vi.fn().mockResolvedValue(response(503));
      const onError = vi.fn();
      const adapter = httpAdapter({
        url: '/api',
        fetch,
        debounce: 10,
        retries: 2,
        retryDelay: 100,
        onError,
      });
      adapter.set('k', { a: 1 } as never);
      await vi.advanceTimersByTimeAsync(10 + 100 + 200 + 10);
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0]![1]).toEqual({ key: 'k', method: 'PUT' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('flush() sends pending writes immediately', async () => {
    const { httpAdapter } = await import('../src');
    const fetch = vi.fn().mockResolvedValue(response(204));
    const adapter = httpAdapter({ url: '/api', fetch, debounce: 10_000 });
    adapter.set('k', { a: 1 } as never);
    await adapter.flush();
    expect(fetch).toHaveBeenCalledWith('/api/k', expect.objectContaining({ method: 'PUT' }));
  });

  it('polls subscribed keys for changes made elsewhere', async () => {
    const { httpAdapter } = await import('../src');
    vi.useFakeTimers();
    try {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(response(200, { v: 1 }))
        .mockResolvedValue(response(200, { v: 2 }));
      const adapter = httpAdapter({ url: '/api', fetch, pollInterval: 1000 });
      const listener = vi.fn();
      adapter.subscribe!('k', listener);
      await vi.advanceTimersByTimeAsync(2100);
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith({ v: 2 });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('navigation while scrolling', () => {
  it('next() works as soon as the step is committed, before its scroll settles', async () => {
    const el = document.createElement('div');
    el.id = 'far';
    document.body.append(el);
    // A slow scroll: jsdom rects are 0×0 (always "out of view"), and scrollIntoView exists, so the
    // step waits for its rect to settle over animation frames after committing.
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = () => {};
    const tour = createTour({
      id: 't',
      steps: [{ id: 'a' }, { id: 'b', target: '#far' }, { id: 'c' }],
    });
    await tour.start();
    const moving = tour.next();
    await new Promise((r) => setTimeout(r, 0));
    expect(tour.getState().stepId).toBe('b');
    await tour.next(); // while b may still be scrolling
    await moving;
    Element.prototype.scrollIntoView = original;
    expect(tour.getState().stepId).toBe('c');
  });
});
