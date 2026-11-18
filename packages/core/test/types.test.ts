import { describe, expectTypeOf, it } from 'vitest';
import { createTour, type StepIdOf } from '../src';

// Compile-time checks (run by `pnpm typecheck`); the runtime body is trivial.
describe('step id inference', () => {
  it('infers literal step ids without `as const`', () => {
    const tour = createTour({
      id: 't',
      data: { plan: 'free' as 'free' | 'pro' },
      steps: [
        { id: 'welcome' },
        { id: 'mixer', next: 'bounce', advanceOn: { signal: 'x', to: 'welcome' } },
        { id: 'bounce', when: (ctx) => ctx.data.plan === 'pro' },
      ],
    });
    type Id = StepIdOf<
      (typeof tour.getSteps extends () => readonly (infer S)[] ? S : never) & { id: string }
    >;
    expectTypeOf<Id>().toEqualTypeOf<'welcome' | 'mixer' | 'bounce'>();
    expectTypeOf(tour.goTo).parameter(0).toEqualTypeOf<'welcome' | 'mixer' | 'bounce'>();
    expectTypeOf(tour.getState().stepId).toEqualTypeOf<'welcome' | 'mixer' | 'bounce' | null>();

    if (Math.random() > 2) {
      // @ts-expect-error not a step of this tour
      void tour.goTo('nope');
      createTour({
        id: 'u',
        // @ts-expect-error `next` must name a step of the tour
        steps: [{ id: 'a', next: 'zzz' }, { id: 'b' }],
      });
    }
  });
});
