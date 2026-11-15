import { describe, expect, it, vi } from 'vitest';
import {
  createBrowserRouter,
  createTour,
  memoryStorage,
  persist,
  type RouterAdapter,
  readTourProgress,
} from '../src';

const flush = () => new Promise((r) => setTimeout(r, 0));

/** A router whose navigation can be made to fail, e.g. blocked by an auth guard. */
interface FakeRouter extends RouterAdapter {
  path: string;
  lands: boolean;
  navigate: ReturnType<typeof vi.fn<(to: string) => void>>;
  go(to: string): void;
}

function fakeRouter(path = '/', { lands = true } = {}): FakeRouter {
  const listeners = new Set<() => void>();
  const r: FakeRouter = {
    path,
    lands,
    navigate: vi.fn((to: string) => {
      if (r.lands) r.go(to);
    }),
    go(to: string) {
      r.path = to;
      for (const l of [...listeners]) l();
    },
    getPath: () => r.path,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return r;
}

describe('routes', () => {
  it('hides the step until the route is reached when navigation does not land', async () => {
    const router = fakeRouter('/', { lands: false });
    const tour = createTour({
      id: 't',
      router,
      steps: [{ id: 'a' }, { id: 'b', route: '/projects' }],
    });
    await tour.start();
    const pending = tour.next();
    await flush();
    expect(router.navigate).toHaveBeenCalledWith('/projects');
    expect(tour.getState()).toMatchObject({ stepId: 'a', phase: 'resolving' });

    router.go('/projects'); // the user (or a redirect) eventually gets there
    await pending;
    expect(tour.getState()).toMatchObject({ stepId: 'b', phase: 'ready' });
  });

  it('waits for the user on pattern routes instead of navigating to the pattern', async () => {
    const router = fakeRouter('/');
    const tour = createTour({
      id: 't',
      router,
      steps: [{ id: 'a' }, { id: 'detail', route: '/projects/:id' }],
    });
    await tour.start();
    const pending = tour.next();
    await flush();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(tour.getState().phase).toBe('resolving');

    router.go('/projects/42');
    await pending;
    expect(tour.getState()).toMatchObject({ stepId: 'detail', phase: 'ready' });
  });

  it('matches :params and * by default, even for adapters without `match`', async () => {
    const router = fakeRouter('/projects/42');
    const tour = createTour({
      id: 't',
      router,
      steps: [
        { id: 'a', route: '/projects/:id' },
        { id: 'b', route: '/projects/*' },
      ],
    });
    await tour.start();
    await tour.next();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(tour.getState()).toMatchObject({ stepId: 'b', phase: 'ready' });
  });

  it('createBrowserRouter accepts a custom matcher', () => {
    const exact = createBrowserRouter({ match: (route, path) => route === path });
    expect(exact.match?.('/a/:id', '/a/1')).toBe(false);
    expect(createBrowserRouter().match).toBeUndefined(); // core default: matchRoute
  });

  it('a cancelled route wait does not leak', async () => {
    const router = fakeRouter('/', { lands: false });
    const tour = createTour({
      id: 't',
      router,
      steps: [{ id: 'a' }, { id: 'b', route: '/b' }],
    });
    await tour.start();
    const pending = tour.next();
    await flush();
    tour.close();
    await pending;
    router.go('/b');
    await flush();
    expect(tour.getState().status).toBe('closed');
  });
});

describe('readTourProgress', () => {
  it('honors the custom key given to persist()', async () => {
    const adapter = memoryStorage();
    const key = (id: string) => `user-7:${id}`;
    const tour = createTour({
      id: 'onb',
      plugins: [persist(adapter, { key })],
      steps: [{ id: 'a' }],
    });
    await tour.start();
    expect(await readTourProgress(adapter, 'onb')).toBeNull();
    expect(await readTourProgress(adapter, 'onb', { key })).toMatchObject({ stepId: 'a' });
  });
});
