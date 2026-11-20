import jscodeshift from 'jscodeshift';
import { describe, expect, it } from 'vitest';
import driver from '../src/transforms/driver';
import joyride from '../src/transforms/joyride';
import shepherd from '../src/transforms/shepherd';

const apply = (transform: typeof joyride, source: string) =>
  normalize(
    transform(
      { path: 'file.tsx', source },
      {
        jscodeshift: jscodeshift.withParser('tsx'),
        j: jscodeshift.withParser('tsx'),
        stats: () => {},
        report: () => {},
      },
    ),
  );

/** Recast prints new objects across lines: compare with whitespace collapsed. */
function normalize(out: string | null | undefined) {
  return out == null ? null : out.replace(/\s+/g, ' ').replace(/\{ /g, '{ ').replace(/ \}/g, ' }');
}

describe('joyride', () => {
  it('rewrites steps and flags the component', () => {
    const out = apply(
      joyride,
      `import Joyride from 'react-joyride';
const steps = [
  { target: 'body', content: 'Welcome!', placement: 'center', disableBeacon: true },
  { target: '.search', title: 'Search', content: 'Find anything', placement: 'bottom-start', spotlightClicks: true },
  { target: '#new', content: <Fancy />, styles: { options: {} } },
];`,
    )!;
    expect(out).toContain("{ id: 'step-1', description: 'Welcome!' }");
    expect(out).toContain(
      "id: 'step-2', target: '.search', title: 'Search', description: 'Find anything', side: 'bottom', align: 'start', interactive: true",
    );
    expect(out).toContain('content: <Fancy />');
    expect(out).toContain('TODO(awesome-tour): `disableBeacon` has no step option');
    expect(out).toContain('TODO(awesome-tour): `styles` has no step option');
    expect(out).toMatch(/TODO\(awesome-tour\): replace <Joyride.* import Joyride/);
  });

  it('maps disableScrolling to scroll and explains spotlightPadding', () => {
    const out = apply(
      joyride,
      `const steps = [
  { target: '#mixer', content: 'Mixer', disableScrolling: true, spotlightPadding: 8 },
  { target: '#bpm', content: 'Tempo', disableScrolling: compact },
];`,
    )!;
    expect(out).toContain("target: '#mixer', description: 'Mixer', scroll: false");
    expect(out).toContain('scroll: !compact');
    expect(out).toContain('`padding` prop of Tour.Overlay');
  });

  it('leaves unrelated files alone', () => {
    expect(apply(joyride, `const a = { target: 'x' };`)).toBeNull();
  });
});

describe('shepherd', () => {
  it('rewrites addStep objects', () => {
    const out = apply(
      shepherd,
      `import Shepherd from 'shepherd.js';
const tour = new Shepherd.Tour({ useModalOverlay: true });
tour.addStep({
  id: 'search',
  title: 'Search',
  text: 'Find anything',
  attachTo: { element: '#search', on: 'bottom-end' },
  advanceOn: { selector: '#search button', event: 'click' },
  buttons: [{ text: 'Next', action: tour.next }],
});`,
    )!;
    expect(out).toContain("id: 'search'");
    expect(out).toContain("description: 'Find anything'");
    expect(out).toContain("target: '#search'");
    expect(out).toContain("side: 'bottom'");
    expect(out).toContain("align: 'end'");
    expect(out).toContain("advanceOn: { event: 'click', target: '#search button' }");
    expect(out).toContain('`buttons` → render <Tour.Prev>');
    expect(out).toContain('new Shepherd.Tour() + addStep()');
  });
});

describe('driver.js', () => {
  it('rewrites popover steps', () => {
    const out = apply(
      driver,
      `import { driver } from 'driver.js';
const d = driver({ steps: [
  { element: '#nav', popover: { title: 'Navigation', description: 'Everything lives here', side: 'right', align: 'start' } },
  { popover: { title: 'Done', description: 'Bye', popoverClass: 'x' } },
] });`,
    )!;
    expect(out).toContain(
      "id: 'step-1', target: '#nav', title: 'Navigation', description: 'Everything lives here', side: 'right', align: 'start'",
    );
    expect(out).toContain("{ id: 'step-2', title: 'Done', description: 'Bye' }");
    expect(out).toContain('popover `popoverClass` → style your Tour.Content');
    expect(out).toContain('driver({ steps }) → createTour');
  });
});
