import { describe, expect, it } from 'vitest';
import { createTour } from '../src';

interface Data {
  role: 'developer' | 'designer' | null;
}

describe('createTour (React)', () => {
  it('accepts React step fields alongside typed data and callbacks', async () => {
    // Type-level regression: with typed `data` and context-sensitive callbacks, inference falls
    // back to the step constraint — React fields must still be known (checked by `pnpm typecheck`).
    const tour = createTour({
      id: 'typed',
      data: { role: null } as Data,
      steps: [
        {
          id: 'role',
          title: 'What do you do?',
          content: <p>pick</p>,
          next: (ctx) => (ctx.data.role === 'designer' ? 'tokens' : 'api'),
        },
        { id: 'api', title: 'API', side: 'left', when: (ctx) => ctx.data.role === 'developer' },
        { id: 'tokens', title: 'Tokens', align: 'start', interactive: true },
      ],
    });
    tour.setData({ role: 'designer' });
    await tour.start();
    await tour.next();
    expect(tour.getState().stepId).toBe('tokens');
    tour.destroy();
  });

  it('keeps literal step ids when inference succeeds', () => {
    const tour = createTour({ id: 'ids', steps: [{ id: 'a', title: 'A' }, { id: 'b' }] });
    void tour.goTo('b');
    // @ts-expect-error — unknown step id
    void tour.goTo('nope');
    tour.destroy();
  });
});
