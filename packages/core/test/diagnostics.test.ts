import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTour, createTourManager } from '../src';

const warnings = () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  return {
    codes: () => spy.mock.calls.map((c) => String(c[0]).match(/AT\d{3}/)?.[0]),
    restore: () => spy.mockRestore(),
  };
};

afterEach(() => vi.restoreAllMocks());

describe('dev diagnostics', () => {
  it('flags duplicate ids, unknown next/to and invalid selectors at creation', () => {
    const w = warnings();
    createTour({
      id: 't',
      steps: [
        // @ts-expect-error unknown step: a type error too
        { id: 'a', next: 'nope' },
        { id: 'a', target: 'div[', advanceOn: { signal: 'x', to: 'missing' } },
      ],
    });
    expect(w.codes()).toEqual(['AT001', 'AT002', 'AT003', 'AT004']);
  });

  it('warns about errors nobody listens to, and routes without a router', async () => {
    const w = warnings();
    const tour = createTour({
      id: 't',
      steps: [
        { id: 'a', route: '/x' },
        {
          id: 'b',
          beforeEnter: () => {
            throw new Error('boom');
          },
        },
      ],
    });
    await tour.start();
    await tour.next();
    expect(w.codes()).toEqual(['AT006', 'AT005']);
  });

  it('warns when two tours share an id in a manager', () => {
    const w = warnings();
    const manager = createTourManager();
    manager.register(createTour({ id: 'same', steps: [{ id: 'a' }] }));
    manager.register(createTour({ id: 'same', steps: [{ id: 'a' }] }));
    expect(w.codes()).toEqual(['AT007']);
  });
});
