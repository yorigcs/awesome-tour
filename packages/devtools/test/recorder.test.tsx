import { createTour, TourProvider } from '@awesome-tour/react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { TourDevtools } from '../src';
import { type RecordedStep, recordingToCode, recordingToJSON } from '../src/recorder';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const step = (patch: Partial<RecordedStep>): RecordedStep => ({
  id: 'step-1',
  locator: null,
  code: null,
  quality: null,
  route: '/',
  title: '',
  description: '',
  side: '',
  ...patch,
});

describe('recording export', () => {
  const steps = [
    step({ title: 'Welcome' }),
    step({
      id: 'step-2',
      locator: { role: 'button', name: 'Export', exact: true },
      code: "byRole('button', { name: 'Export' })",
      quality: 'stable',
      title: 'Bounce it',
      side: 'start',
    }),
    step({
      id: 'step-3',
      route: '/mix',
      locator: { tour: 'mixer' },
      code: "byTour('mixer')",
      quality: 'stable',
      title: 'Mixer',
    }),
  ];

  it('writes routes only where the page changes, as JSON and as code', () => {
    expect(recordingToJSON(steps).steps).toEqual([
      { id: 'step-1', route: '/', title: 'Welcome' },
      {
        id: 'step-2',
        target: { role: 'button', name: 'Export', exact: true },
        side: 'start',
        title: 'Bounce it',
      },
      { id: 'step-3', route: '/mix', target: { tour: 'mixer' }, title: 'Mixer' },
    ]);
    const code = recordingToCode(steps);
    expect(code).toContain("import { byRole, byTour, createTour } from '@awesome-tour/react';");
    expect(code).toContain(
      "{ id: 'step-2', target: byRole('button', { name: 'Export' }), side: 'start', title: 'Bounce it' },",
    );
    expect(code).toContain(
      "{ id: 'step-3', route: '/mix', target: byTour('mixer'), title: 'Mixer' },",
    );
  });
});

describe('recorder panel', () => {
  it('records picked elements and plays the recording back', async () => {
    const user = userEvent.setup();
    const tour = createTour({ id: 'existing', steps: [{ id: 'a' }] });
    render(
      <TourProvider tours={[tour]}>
        <button type="button">Export</button>
        <TourDevtools isolate={false} defaultOpen />
      </TourProvider>,
    );
    await user.click(screen.getByRole('button', { name: /^Record/ }));
    const panel = screen.getByRole('region', { name: 'Tour recorder' });
    await user.click(within(panel).getByRole('button', { name: '+ Element' }));
    await user.click(screen.getByRole('button', { name: 'Export' }));
    const list = within(panel).getByRole('list', { name: 'Recorded steps' });
    expect(list).toHaveTextContent("byRole('button', { name: 'Export' })");
    await user.type(within(panel).getByRole('textbox', { name: 'Title of step-1' }), 'Bounce it');
    expect(
      JSON.parse(window.localStorage.getItem('awesome-tour-devtools:recording')!)[0],
    ).toMatchObject({
      title: 'Bounce it',
    });
    await user.click(within(panel).getByRole('button', { name: 'Play' }));
    expect(await screen.findByRole('dialog', { name: 'Bounce it' })).toBeTruthy();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Stop' }));
    });
    expect(screen.queryByRole('dialog', { name: 'Bounce it' })).toBeNull();
  });
});
