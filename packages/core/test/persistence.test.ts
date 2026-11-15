import { describe, expect, it } from 'vitest';
import { createTour, localStorageAdapter, memoryStorage, persist } from '../src';

describe('persist', () => {
  it('resumes from the last step and respects `once`', async () => {
    const storage = memoryStorage();
    const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as const;
    const first = createTour({ id: 'p', steps, plugins: [persist(storage)] });
    await first.start();
    await first.next();
    first.close();
    expect(await storage.get('p')).toMatchObject({ status: 'closed', stepId: 'b' });

    const second = createTour({ id: 'p', steps, plugins: [persist(storage)] });
    await second.start();
    expect(second.getState().stepId).toBe('b');
    await second.next();
    await second.next();
    expect(second.getState().status).toBe('completed');

    const third = createTour({ id: 'p', steps, plugins: [persist(storage)] });
    await third.start();
    expect(third.getState().status).toBe('idle');
    await third.start({ force: true });
    expect(third.getState().stepId).toBe('a');
  });

  it('discards progress saved by an older version', async () => {
    const storage = memoryStorage();
    await storage.set('v', { status: 'completed', stepId: 'a', version: 1, updatedAt: 0 });
    const tour = createTour({
      id: 'v',
      version: 2,
      steps: [{ id: 'a' }],
      plugins: [persist(storage)],
    });
    await tour.start();
    expect(tour.getState().status).toBe('active');
  });

  it('localStorage adapter round-trips', async () => {
    const adapter = localStorageAdapter({ prefix: 'x:' });
    await adapter.set('k', { status: 'paused', stepId: 's', version: 1, updatedAt: 1 });
    expect(window.localStorage.getItem('x:k')).toContain('"paused"');
    expect(await adapter.get('k')).toMatchObject({ stepId: 's' });
  });
});
