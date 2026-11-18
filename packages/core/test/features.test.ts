import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analytics,
  byRole,
  byText,
  byTour,
  createExperiment,
  createTour,
  createTourManager,
  deepLink,
  defaultAnchors,
  firstOf,
  hashString,
  type ImpressionRecord,
  memoryStorage,
  resolveTarget,
  type TourAnalyticsEvent,
} from '../src';

const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('locators', () => {
  it('byTour, byRole (explicit and implicit, by name), byText', () => {
    document.body.innerHTML = `
      <section data-tour="mixer"><div role="slider" aria-label="Bass level"></div></section>
      <button>Export</button><button aria-label="Close export">×</button>
      <button role="tab">Mix</button>
      <p>Bounce your <b>first loop</b></p>`;
    const r = (t: ReturnType<typeof byTour>) => resolveTarget(t, defaultAnchors);
    expect(r(byTour('mixer'))).toHaveLength(1);
    expect(r(byRole('slider', { name: 'bass' }))).toHaveLength(1);
    expect(r(byRole('button'))).toHaveLength(2); // the role="tab" button is a tab
    expect((r(byRole('button', { name: 'Export', exact: true }))[0] as Element).textContent).toBe(
      'Export',
    );
    expect(r(byRole('tab', { name: /mix/i }))).toHaveLength(1);
    const text = r(byText('first loop'));
    expect(text).toHaveLength(1);
    expect((text[0] as Element).tagName).toBe('B');
  });

  it('firstOf takes the first candidate that exists', () => {
    document.body.innerHTML = '<button id="legacy">Export</button>';
    const target = firstOf(byTour('export'), byRole('button', { name: 'Export' }), '#legacy');
    const nodes = resolveTarget(target, defaultAnchors);
    expect(nodes).toHaveLength(1);
    document.body.insertAdjacentHTML('beforeend', '<span data-tour="export"></span>');
    expect((resolveTarget(target, defaultAnchors)[0] as Element).tagName).toBe('SPAN');
  });

  it('within scopes the search', () => {
    document.body.innerHTML =
      '<div id="a"><span data-tour="x"></span></div><div id="b"><span data-tour="x"></span></div>';
    expect(resolveTarget(byTour('x', { within: '#b' }), defaultAnchors)).toHaveLength(1);
  });
});

describe('goals', () => {
  it('reports a goal reached after the tour ended, once, with analytics', async () => {
    const events: TourAnalyticsEvent[] = [];
    const tour = createTour({
      id: 'g',
      goal: { name: 'first-bounce', signal: 'bounced' },
      plugins: [analytics((e) => events.push(e))],
      steps: [{ id: 'a' }],
    });
    const goal = vi.fn();
    tour.on('goal', goal);
    await tour.start();
    tour.complete();
    tour.signal('bounced');
    tour.signal('bounced');
    expect(goal).toHaveBeenCalledTimes(1);
    expect(goal.mock.calls[0]![0]).toMatchObject({ name: 'first-bounce', status: 'completed' });
    const reached = events.find((e) => e.type === 'tour_goal_reached');
    expect(reached).toMatchObject({ goal: 'first-bounce', outcome: 'completed' });
  });

  it('goal.event and goal.within', async () => {
    vi.useFakeTimers();
    try {
      document.body.innerHTML = '<button id="bounce">Bounce</button>';
      const tour = createTour({
        id: 'g2',
        goal: { event: { type: 'click', target: '#bounce' }, within: 1000 },
        steps: [{ id: 'a' }],
      });
      const goal = vi.fn();
      tour.on('goal', goal);
      await tour.start();
      await vi.advanceTimersByTimeAsync(1500);
      document.getElementById('bounce')!.click();
      expect(goal).not.toHaveBeenCalled();
      await tour.restart();
      document.getElementById('bounce')!.click();
      expect(goal).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('experiments', () => {
  it('assigns users stably and tags analytics events with the variant', async () => {
    const a = createTour({ id: 'exp-a', steps: [{ id: 'x' }] });
    const b = createTour({ id: 'exp-b', steps: [{ id: 'x' }] });
    const assignments = new Map<string, number>();
    for (let i = 0; i < 400; i++) {
      const exp = createExperiment({
        id: 'onboarding-copy',
        variants: { a, b },
        userId: `user-${i}`,
      });
      const v = exp.variant();
      expect(exp.variant()).toBe(v);
      assignments.set(v, (assignments.get(v) ?? 0) + 1);
    }
    // Roughly balanced.
    expect(assignments.get('a')!).toBeGreaterThan(140);
    expect(assignments.get('b')!).toBeGreaterThan(140);
    expect(hashString('x')).toBe(hashString('x'));

    const events: TourAnalyticsEvent[] = [];
    a.use(analytics((e) => events.push(e)));
    const exp = createExperiment({ id: 'copy', variants: { a, control: null }, assign: () => 'a' });
    await exp.start();
    expect(events[0]).toMatchObject({ type: 'tour_started', experimentId: 'copy', variant: 'a' });
  });

  it('the control group is exposed but sees nothing; anonymous users are remembered', async () => {
    const tour = createTour({ id: 'exp-c', steps: [{ id: 'x' }] });
    const onExposure = vi.fn();
    const exp = createExperiment({
      id: 'ctl',
      variants: { tour, control: null },
      weights: { tour: 0, control: 1 },
      onExposure,
    });
    await exp.start();
    expect(exp.variant()).toBe('control');
    expect(tour.getState().status).toBe('idle');
    expect(onExposure).toHaveBeenCalledWith({ experimentId: 'ctl', variant: 'control' });
    expect(localStorage.getItem('awesome-tour-experiment:ctl')).toBe('control');
  });
});

describe('manager: cap, perVersion, deep links', () => {
  it('caps automatic shows per session; explicit starts are never capped', async () => {
    const t1 = createTour({ id: 'c1', rules: { trigger: { signal: 'go' } }, steps: [{ id: 'a' }] });
    const t2 = createTour({
      id: 'c2',
      rules: { trigger: { signal: 'go2' } },
      steps: [{ id: 'a' }],
    });
    const manager = createTourManager({ tours: [t1, t2], cap: { perSession: 1 } });
    expect(await manager.startIfEligible('c1')).toBe(true);
    t1.close();
    await tick();
    const report = await manager.explain('c2');
    expect(report.eligible).toBe(false);
    expect(report.checks.find((c) => c.rule === 'cap')?.detail).toMatch(/1 of 1/);
    await manager.start('c2');
    expect(t2.getState().status).toBe('active');
  });

  it('perVersion: a new version is eligible again for people who finished an old one', async () => {
    const impressions = memoryStorage<ImpressionRecord>();
    const v1 = createTour({
      id: 'news',
      version: 1,
      rules: { frequency: { perVersion: true } },
      steps: [{ id: 'a' }],
    });
    const m1 = createTourManager({ tours: [v1], impressions });
    await m1.start('news');
    v1.complete();
    await tick();
    expect((await m1.explain('news')).eligible).toBe(false);
    m1.destroy();
    const v2 = createTour({
      id: 'news',
      version: 2,
      rules: { frequency: { perVersion: true } },
      steps: [{ id: 'a' }],
    });
    const m2 = createTourManager({ tours: [v2], impressions });
    expect((await m2.explain('news')).eligible).toBe(true);
  });

  it('deepLink starts the tour named in the URL and cleans it', async () => {
    window.history.replaceState(null, '', '/?tour=dl&step=b&keep=1');
    const tour = createTour({ id: 'dl', steps: [{ id: 'a' }, { id: 'b' }] });
    const manager = createTourManager();
    const off = deepLink(manager);
    manager.register(tour); // registered later (lazy route)
    await tick();
    await tick();
    expect(tour.getState()).toMatchObject({ status: 'active', stepId: 'b' });
    expect(window.location.search).toBe('?keep=1');
    off();
  });
});

describe('JSON: locators, goal, new options', () => {
  it('turns locator objects into targets and validates enums', async () => {
    const { fromJSON, validateTourJSON } = await import('../src/json');
    document.body.innerHTML =
      '<section data-tour="mixer"></section><button>Export</button><p>Bounce it</p>';
    const options = fromJSON(
      {
        id: 'j',
        onTargetLost: 'close',
        goal: { signal: 'bounced', within: 1000 },
        steps: [
          { id: 'a', target: { tour: 'mixer' }, side: 'start', enterTimeout: 500 },
          { id: 'b', target: { role: 'button', name: 'Export', exact: true } },
          { id: 'c', target: { firstOf: [{ tour: 'nope' }, { text: 'Bounce it' }] } },
        ],
      },
      {},
    );
    const nodes = options.steps.map((s) => resolveTarget(s.target, defaultAnchors)[0] as Element);
    expect(nodes.map((n) => n.tagName)).toEqual(['SECTION', 'BUTTON', 'P']);
    expect(options).toMatchObject({ onTargetLost: 'close', goal: { signal: 'bounced' } });
    expect(
      validateTourJSON({
        id: 'x',
        steps: [{ id: 'a', side: 'up', onTargetLost: 'nope', target: { css: 'x' } }],
      }),
    ).toEqual([
      'steps[0].side must be one of "top", "right", "bottom", "left", "start", "end"',
      'steps[0].onTargetLost must be one of "reresolve", "center", "close"',
      'steps[0].target must have one of: anchor, tour, role, text, firstOf',
    ]);
  });
});

describe('goals across reloads', () => {
  it('persist() keeps watching a goal from an earlier visit, and counts it once', async () => {
    const { persist } = await import('../src');
    const storage = memoryStorage<any>();
    const make = () =>
      createTour({
        id: 'reload-goal',
        goal: { signal: 'bounced', within: 60_000 },
        plugins: [persist(storage)],
        steps: [{ id: 'a' }],
      });
    const first = make();
    await first.start();
    first.complete();
    await tick();
    first.destroy();

    // Next visit: the tour won't start again (completed), but the goal is still open.
    const second = make();
    const goal = vi.fn();
    second.on('goal', goal);
    await tick();
    second.signal('bounced');
    expect(goal).toHaveBeenCalledTimes(1);
    expect(goal.mock.calls[0]![0].afterMs).toBeGreaterThanOrEqual(0);
    await tick();
    expect((await storage.get('reload-goal'))?.goal?.reachedAt).toEqual(expect.any(Number));
    second.destroy();

    // And after that, it isn't counted again.
    const third = make();
    const again = vi.fn();
    third.on('goal', again);
    await tick();
    third.signal('bounced');
    expect(again).not.toHaveBeenCalled();
  });
});
