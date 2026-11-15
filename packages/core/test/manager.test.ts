import { describe, expect, it } from 'vitest';
import { createTour, createTourManager, matchRoute } from '../src';

describe('tour manager', () => {
  it('queues tours by priority while another is on screen', async () => {
    const a = createTour({ id: 'a', steps: [{ id: 'a1' }] });
    const b = createTour({ id: 'b', steps: [{ id: 'b1' }] });
    const c = createTour({ id: 'c', steps: [{ id: 'c1' }] });
    const manager = createTourManager({ tours: [a, b, c] });

    await manager.start('a');
    await manager.start('b', { priority: 1 });
    await manager.start('c', { priority: 5 });
    expect(manager.getState()).toEqual({
      activeId: 'a',
      queue: ['c', 'b'],
      tourIds: ['a', 'b', 'c'],
    });

    a.complete();
    await new Promise((r) => setTimeout(r, 0));
    expect(manager.getState().activeId).toBe('c');
    expect(manager.getState().queue).toEqual(['b']);
  });

  it('interrupts the active tour when asked', async () => {
    const a = createTour({ id: 'a', steps: [{ id: 'a1' }] });
    const b = createTour({ id: 'b', steps: [{ id: 'b1' }] });
    const manager = createTourManager({ tours: [a, b] });
    await manager.start('a');
    await manager.start('b', { interrupt: true });
    expect(a.getState().status).toBe('closed');
    expect(manager.getState().activeId).toBe('b');
  });
});

describe('matchRoute', () => {
  it('matches params and wildcards', () => {
    expect(matchRoute('/projects/:id', '/projects/42')).toBe(true);
    expect(matchRoute('/projects/:id', '/projects')).toBe(false);
    expect(matchRoute('/docs/*', '/docs/a/b')).toBe(true);
    expect(matchRoute('/a', '/b')).toBe(false);
  });
});
