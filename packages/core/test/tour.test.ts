import { afterEach, describe, expect, it, vi } from 'vitest';
import { anchor, createAnchorRegistry, createTour, type RouterAdapter } from '../src';

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  document.body.innerHTML = '';
});

function el(id: string) {
  const node = document.createElement('div');
  node.id = id;
  document.body.appendChild(node);
  return node;
}

describe('navigation', () => {
  it('walks steps forward and backward, then completes', async () => {
    const tour = createTour({ id: 't', steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    const onComplete = vi.fn();
    tour.on('complete', onComplete);

    await tour.start();
    expect(tour.getState()).toMatchObject({ status: 'active', stepId: 'a', phase: 'ready' });
    expect(tour.getState().progress).toEqual({ current: 1, total: 3 });

    await tour.next();
    await tour.next();
    expect(tour.getState().stepId).toBe('c');
    await tour.prev();
    expect(tour.getState().stepId).toBe('b');
    expect(tour.getState().history).toEqual(['a', 'b']);

    await tour.next();
    await tour.next();
    expect(tour.getState().status).toBe('completed');
    expect(onComplete).toHaveBeenCalledWith({ stepId: 'c' });
  });

  it('skips steps whose `when` is false (sync and async)', async () => {
    const tour = createTour({
      id: 't',
      steps: [
        { id: 'a' },
        { id: 'b', when: () => false },
        { id: 'c', when: async () => false },
        { id: 'd' },
      ],
    });
    await tour.start();
    await tour.next();
    expect(tour.getState().stepId).toBe('d');
    // The async `when` settled to false while navigating: progress no longer counts it.
    expect(tour.getState().progress.total).toBe(2);
  });

  it('branches with `next` and walks back through history', async () => {
    const tour = createTour({
      id: 't',
      data: { role: 'admin' },
      steps: [
        { id: 'start', next: (ctx) => (ctx.data.role === 'admin' ? 'admin' : 'user') },
        { id: 'user', next: null },
        { id: 'admin' },
      ],
    });
    await tour.start();
    await tour.next();
    expect(tour.getState().stepId).toBe('admin');
    await tour.prev();
    expect(tour.getState().stepId).toBe('start');

    tour.setData({ role: 'user' });
    await tour.next();
    expect(tour.getState().stepId).toBe('user');
    await tour.next();
    expect(tour.getState().status).toBe('completed');
  });

  it('cancels a superseded transition', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const tour = createTour({
      id: 't',
      steps: [{ id: 'a' }, { id: 'slow', beforeEnter: () => gate }, { id: 'c' }],
    });
    await tour.start();
    const slow = tour.goTo('slow');
    await tour.goTo('c');
    release();
    await slow;
    expect(tour.getState().stepId).toBe('c');
  });

  it('plugins can cancel or redirect transitions and block start', async () => {
    const tour = createTour({
      id: 't',
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      plugins: [
        {
          name: 'redirect',
          beforeStep: (_t, { to }) => (to === 'b' ? 'c' : undefined),
        },
      ],
    });
    await tour.start();
    await tour.next();
    expect(tour.getState().stepId).toBe('c');

    const blocked = createTour({
      id: 'x',
      steps: [{ id: 'a' }],
      plugins: [{ name: 'block', beforeStart: () => false }],
    });
    await blocked.start();
    expect(blocked.getState().status).toBe('idle');
  });

  it('pause / resume / close / skip lifecycle', async () => {
    const tour = createTour({ id: 't', steps: [{ id: 'a' }, { id: 'b' }] });
    await tour.start();
    await tour.next();
    tour.pause();
    expect(tour.getState()).toMatchObject({ status: 'paused', stepId: 'b' });
    await tour.resume();
    expect(tour.getState()).toMatchObject({ status: 'active', stepId: 'b' });
    tour.close();
    expect(tour.getState().status).toBe('closed');
    await tour.resume();
    expect(tour.getState().status).toBe('active');
    tour.skip();
    expect(tour.getState().status).toBe('skipped');
    await tour.restart();
    expect(tour.getState()).toMatchObject({ status: 'active', stepId: 'a', history: ['a'] });
  });
});

describe('targets', () => {
  it('resolves selectors, elements, refs, anchors and multiple targets', async () => {
    const a = el('a');
    const b = el('b');
    const anchors = createAnchorRegistry();
    const unregister = anchors.register('anchored', b);
    const tour = createTour({
      id: 't',
      anchors,
      steps: [
        { id: 'selector', target: '#a' },
        { id: 'ref', target: { current: b } },
        { id: 'anchor', target: anchor('anchored') },
        { id: 'multi', target: ['#a', anchor('anchored')] },
      ],
    });
    await tour.start();
    expect(tour.getState().targets).toEqual([a]);
    await tour.next();
    expect(tour.getState().targets).toEqual([b]);
    await tour.next();
    expect(tour.getState().targets).toEqual([b]);
    await tour.next();
    expect(tour.getState().targets).toEqual([a, b]);
    unregister();
  });

  it('waits for a target that appears later', async () => {
    const tour = createTour({ id: 't', steps: [{ id: 'late', target: '#late' }] });
    const started = tour.start();
    await flush();
    expect(tour.getState()).toMatchObject({ status: 'starting', phase: 'resolving' });
    const late = el('late');
    await started;
    expect(tour.getState()).toMatchObject({
      status: 'active',
      targets: [late],
      targetMissing: false,
    });
  });

  it('applies missing-target policies', async () => {
    const center = createTour({
      id: 'center',
      targetTimeout: 10,
      steps: [{ id: 'a', target: '#nope' }],
    });
    await center.start();
    expect(center.getState()).toMatchObject({ stepId: 'a', targetMissing: true, targets: [] });

    const skip = createTour({
      id: 'skip',
      targetTimeout: 10,
      onTargetMissing: 'skip',
      steps: [{ id: 'a', target: '#nope' }, { id: 'b' }],
    });
    await skip.start();
    expect(skip.getState().stepId).toBe('b');

    const error = createTour({
      id: 'error',
      targetTimeout: 10,
      steps: [{ id: 'a', target: '#nope', onTargetMissing: 'error' }],
    });
    const onError = vi.fn();
    error.on('error', onError);
    await error.start();
    expect(onError).toHaveBeenCalled();
    expect(error.getState().status).toBe('idle');
  });
});

describe('interactive steps (advanceOn)', () => {
  it('advances on a DOM event on the target', async () => {
    const button = document.createElement('button');
    button.id = 'btn';
    document.body.appendChild(button);
    const tour = createTour({
      id: 't',
      steps: [{ id: 'click', target: '#btn', advanceOn: { event: 'click' } }, { id: 'done' }],
    });
    await tour.start();
    button.click();
    await flush();
    expect(tour.getState().stepId).toBe('done');
  });

  it('advances on a predicate and on a named signal', async () => {
    const tour = createTour({
      id: 't',
      data: { ready: false },
      steps: [
        { id: 'pred', advanceOn: { when: (ctx) => ctx.data.ready } },
        { id: 'sig', advanceOn: { signal: 'saved', to: 'end' } },
        { id: 'skipped' },
        { id: 'end' },
      ],
    });
    await tour.start();
    tour.setData({ ready: true });
    await flush();
    expect(tour.getState().stepId).toBe('sig');
    tour.signal('saved');
    await flush();
    expect(tour.getState().stepId).toBe('end');
  });
});

describe('router', () => {
  it('navigates to the step route before resolving its target', async () => {
    let path = '/';
    const listeners = new Set<() => void>();
    const router: RouterAdapter = {
      getPath: () => path,
      navigate: (p) => {
        path = p;
        if (p === '/settings') el('settings');
        for (const l of listeners) l();
      },
      subscribe: (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
    };
    const tour = createTour({
      id: 't',
      router,
      steps: [{ id: 'home' }, { id: 'settings', route: '/settings', target: '#settings' }],
    });
    await tour.start();
    await tour.next();
    expect(path).toBe('/settings');
    expect(tour.getState()).toMatchObject({ stepId: 'settings', targetMissing: false });

    path = '/elsewhere';
    for (const l of listeners) l();
    expect(tour.getState().phase).toBe('resolving');
  });
});

describe('inertOthers', () => {
  it('skips data-tour-keep subtrees and restores on cleanup', async () => {
    const { inertOthers } = await import('../src');
    const app = document.createElement('main');
    const target = document.createElement('button');
    const sibling = document.createElement('p');
    app.append(target, sibling);
    const kept = document.createElement('aside');
    kept.setAttribute('data-tour-keep', '');
    const other = document.createElement('footer');
    document.body.append(app, kept, other);

    const restore = inertOthers([target]);
    expect(sibling.hasAttribute('inert')).toBe(true);
    expect(other.hasAttribute('inert')).toBe(true);
    expect(kept.hasAttribute('inert')).toBe(false);
    expect(app.hasAttribute('inert')).toBe(false);
    restore();
    expect(sibling.hasAttribute('inert')).toBe(false);
    expect(other.hasAttribute('inert')).toBe(false);
  });
});
