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

describe('checklist dependencies, optional items and sections', () => {
  it('locks items until their dependencies are done, and points at what is next', async () => {
    const { createChecklist } = await import('../src');
    const tour = createTour({ id: 'grid-tour', steps: [{ id: 'a' }] });
    const list = createChecklist({
      id: 'first-loop',
      sections: [
        { id: 'make', title: 'Make a beat' },
        { id: 'share', title: 'Share it' },
      ],
      items: [
        { id: 'learn', tour, section: 'make' },
        { id: 'drums', after: 'learn', section: 'make' },
        { id: 'bounce', after: ['drums'], section: 'share' },
        { id: 'invite', optional: true, section: 'share' },
      ],
    });
    let s = list.getState();
    expect(s.locked).toEqual({ learn: false, drums: true, bounce: true, invite: false });
    expect(s.next).toBe('learn');
    expect(s.total).toBe(3); // optional items don't count
    await list.startItem('bounce'); // locked: no-op
    list.complete('learn');
    s = list.getState();
    expect(s.locked.drums).toBe(false);
    expect(s.next).toBe('drums');
    expect(s.sections.map((x) => [x.id, x.title, x.completed, x.total, x.done])).toEqual([
      ['make', 'Make a beat', 1, 2, false],
      ['share', 'Share it', 0, 1, false],
    ]);
    list.complete('drums');
    list.complete('bounce');
    expect(list.getState()).toMatchObject({ done: true, next: 'invite' });
  });
});

describe('localized content', () => {
  it('localize picks exact, language, regional, fallback, then first', async () => {
    const { localize, isLocalized } = await import('../src');
    const text = { en: 'Mixer', 'pt-BR': 'Mixer (BR)', ar: 'المِكسر' };
    expect(localize(text, 'pt-BR')).toBe('Mixer (BR)');
    expect(localize(text, 'pt')).toBe('Mixer (BR)'); // regional variant of the language
    expect(localize(text, 'ar-EG')).toBe('المِكسر'); // language of a regional tag
    expect(localize(text, 'fr')).toBe('Mixer'); // fallback en
    expect(localize({ de: 'Mischpult' }, 'fr')).toBe('Mischpult'); // first entry
    expect(localize('plain', 'fr')).toBe('plain');
    expect(isLocalized({ title: 'x' })).toBe(false); // not locale tags
  });

  it('JSON accepts text per locale and rejects anything else', async () => {
    const { validateTourJSON } = await import('../src/json');
    expect(
      validateTourJSON({ id: 'x', steps: [{ id: 'a', title: { en: 'Hi', pt: 'Oi' } }] }),
    ).toEqual([]);
    expect(validateTourJSON({ id: 'x', steps: [{ id: 'a', title: { en: 3 } }] })).toEqual([
      'steps[0].title must be a string or an object of locale tags to strings',
    ]);
  });
});

describe('tour preview', () => {
  it('loads a draft from the URL, runs it without saving or tracking, then restores the live tour', async () => {
    const { persist, previewFromUrl } = await import('../src');
    window.history.replaceState(null, '', '/?tour-preview=first-session&step=b');
    const storage = memoryStorage<any>();
    const impressions = memoryStorage<ImpressionRecord>();
    const events: TourAnalyticsEvent[] = [];
    const live = createTour({ id: 'first-session', steps: [{ id: 'old' }] });
    const manager = createTourManager({ tours: [live], impressions });
    const stop = previewFromUrl(manager, {
      load: async () => ({
        id: 'first-session',
        rules: { audience: () => false }, // ignored in preview
        plugins: [persist(storage), analytics((e) => events.push(e))],
        steps: [{ id: 'a' }, { id: 'b' }],
      }),
    });
    await tick();
    await tick();
    const draft = manager.get('first-session')!;
    expect(draft).not.toBe(live);
    expect(draft.preview).toBe(true);
    expect(draft.getState()).toMatchObject({ status: 'active', stepId: 'b' });
    expect((await manager.explain('first-session')).eligible).toBe(true);
    draft.complete();
    await tick();
    expect(await storage.get('first-session')).toBeNull();
    expect(await impressions.get('first-session')).toBeNull();
    expect(events).toEqual([]);
    stop();
    expect(manager.get('first-session')).toBe(live);
  });
});

describe('behavior triggers', () => {
  const setup = (
    trigger: NonNullable<NonNullable<Parameters<typeof createTour>[0]['rules']>['trigger']>,
  ) => {
    const tour = createTour({
      id: `bt-${Math.random()}`,
      rules: { trigger },
      steps: [{ id: 'a' }],
    });
    const manager = createTourManager({ tours: [tour] });
    return { tour, manager };
  };
  const active = (tour: { getState(): { status: string } }) => tour.getState().status === 'active';

  it('dwell: lingering on the target for long enough', async () => {
    vi.useFakeTimers();
    try {
      document.body.innerHTML =
        '<section id="mixer"><button>Bass</button></section><p id="away"></p>';
      const { tour } = setup({ dwell: { target: '#mixer', ms: 1000 } });
      const over = (el: Element) =>
        el.dispatchEvent(new Event('pointerover', { bubbles: true, composed: true }));
      over(document.querySelector('button')!);
      await vi.advanceTimersByTimeAsync(500);
      over(document.getElementById('away')!); // left before the time was up
      await vi.advanceTimersByTimeAsync(1000);
      expect(active(tour)).toBe(false);
      over(document.querySelector('button')!);
      await vi.advanceTimersByTimeAsync(1100);
      expect(active(tour)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('idle: no activity for the given time', async () => {
    vi.useFakeTimers();
    try {
      const { tour } = setup({ idle: 1000 });
      await vi.advanceTimersByTimeAsync(800);
      document.dispatchEvent(new Event('keydown'));
      await vi.advanceTimersByTimeAsync(800);
      expect(active(tour)).toBe(false);
      await vi.advanceTimersByTimeAsync(300);
      expect(active(tour)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rageClick: several fast clicks on the same element', async () => {
    document.body.innerHTML = '<button id="export">Export</button><button id="other">x</button>';
    const { tour } = setup({ rageClick: { target: '#export', clicks: 3, within: 1000 } });
    const exportBtn = document.getElementById('export')!;
    exportBtn.click();
    document.getElementById('other')!.click();
    exportBtn.click();
    await tick();
    expect(active(tour)).toBe(false);
    exportBtn.click();
    exportBtn.click();
    await tick();
    await tick();
    expect(active(tour)).toBe(true);
  });

  it('repeat: the same signal several times', async () => {
    const { tour, manager } = setup({ repeat: { signal: 'export-failed', times: 2 } });
    manager.signal('export-failed');
    await tick();
    expect(active(tour)).toBe(false);
    manager.signal('export-failed');
    await tick();
    await tick();
    expect(active(tour)).toBe(true);
  });
});

describe('tour audit', () => {
  it('checks each step on its page and reports missing targets', async () => {
    const { auditTours, formatAudit } = await import('../src');
    const pages: Record<string, string> = {
      '/': '<nav id="nav"></nav>',
      '/mix': '<section id="mixer"></section>',
    };
    const router = {
      path: '/',
      getPath: () => router.path,
      navigate(p: string) {
        router.path = p;
        document.body.innerHTML = pages[p] ?? '';
      },
    };
    router.navigate('/');
    const tour = createTour({
      id: 'onboarding',
      data: { pro: false },
      steps: [
        { id: 'welcome' },
        { id: 'nav', target: '#nav' },
        { id: 'pro', target: '#pro', when: (ctx) => ctx.data.pro },
        { id: 'mixer', route: '/mix', target: '#mixer' },
        { id: 'bounce', target: '#bounce' }, // on /mix too, but gone
        { id: 'project', route: '/projects/:id', target: '#p' },
      ],
    });
    const [audit] = await auditTours([tour], { router, timeout: 20 });
    expect(audit!.ok).toBe(false);
    expect(audit!.steps.map((s) => [s.stepId, s.status])).toEqual([
      ['welcome', 'no-target'],
      ['nav', 'found'],
      ['pro', 'hidden'],
      ['mixer', 'found'],
      ['bounce', 'missing'],
      ['project', 'unchecked'],
    ]);
    expect(router.path).toBe('/'); // left where it was
    expect(formatAudit([audit!])).toContain('✗ bounce (/mix)');
  });
});
