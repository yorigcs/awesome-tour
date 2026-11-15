import { describe, expect, it } from 'vitest';
import { createChecklist, createTour, createTourManager, type RouterAdapter } from '../src';

const router = (): RouterAdapter & { path: string } => {
  const r = {
    path: '/',
    getPath: () => r.path,
    navigate(path: string) {
      r.path = path;
    },
  };
  return r;
};

describe('regressions', () => {
  it('close() dismisses a paused tour', async () => {
    const tour = createTour({ id: 't', steps: [{ id: 'a' }, { id: 'b' }] });
    await tour.start();
    tour.pause();
    tour.close();
    expect(tour.getState().status).toBe('closed');
  });

  it('setData() keeps progress in sync with `when`', async () => {
    const tour = createTour({
      id: 't',
      data: { admin: false },
      steps: [{ id: 'a' }, { id: 'admin', when: (ctx) => ctx.data.admin }, { id: 'c' }],
    });
    await tour.start();
    expect(tour.getState().progress).toEqual({ current: 1, total: 2 });
    tour.setData({ admin: true });
    expect(tour.getState().progress).toEqual({ current: 1, total: 3 });
  });

  it("a manager without a router keeps a tour's own router", async () => {
    const own = router();
    const tour = createTour({
      id: 't',
      router: own,
      steps: [{ id: 'a' }, { id: 'b', route: '/b' }],
    });
    const manager = createTourManager({ tours: [tour] });
    manager.setRouter(undefined); // what <TourProvider> does when no `router` prop is given
    await tour.start();
    await tour.next();
    expect(own.path).toBe('/b');
  });

  it('a manager router replaces the tour router and is removed with it', async () => {
    const own = router();
    const shared = router();
    const tour = createTour({ id: 't', router: own, steps: [{ id: 'a', route: '/a' }] });
    const manager = createTourManager({ tours: [tour], router: shared });
    await tour.start();
    expect(shared.path).toBe('/a');
    expect(own.path).toBe('/');
    manager.setRouter(undefined);
    tour.close();
    await tour.start({ force: true });
    expect(shared.path).toBe('/a'); // unchanged: the tour no longer uses the shared router
  });

  it('checklist.destroy() disconnects from managers', async () => {
    const tour = createTour({ id: 'tour', steps: [{ id: 'a' }] });
    const manager = createTourManager({ tours: [tour] });
    const checklist = createChecklist({ id: 'c', items: [{ id: 'x', tour: 'tour' }] });
    checklist.connect(manager);
    checklist.destroy();
    await tour.start();
    tour.complete();
    expect(checklist.getState().items.x).toBe('pending');
  });
});
