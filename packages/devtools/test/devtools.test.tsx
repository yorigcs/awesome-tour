import { createChecklist, createTour, Tour, TourProvider } from '@awesome-tour/react';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { TourDevtools } from '../src';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function setup() {
  const tour = createTour({
    id: 'onboarding',
    steps: [
      { id: 'welcome' },
      { id: 'here', target: '#here' },
      { id: 'gone', target: '#gone' },
      { id: 'secret', when: () => false },
    ],
  });
  const checklist = createChecklist({
    id: 'getting-started',
    items: [{ id: 'a' }, { id: 'b', signal: 'b' }],
  });
  render(
    <TourProvider tours={[tour]}>
      <button type="button" id="here">
        Here
      </button>
      <Tour.Root tourId="onboarding">
        <Tour.Portal>
          <Tour.Content>
            <Tour.Next>Next</Tour.Next>
          </Tour.Content>
        </Tour.Portal>
      </Tour.Root>
      <TourDevtools isolate={false} defaultOpen checklists={[checklist]} />
    </TourProvider>,
  );
  return { tour, checklist };
}

describe('TourDevtools', () => {
  it('lists provider tours with step target health and jumps to steps', async () => {
    const user = userEvent.setup();
    const { tour } = setup();
    const panel = await screen.findByRole('region', { name: 'awesome-tour devtools' });
    expect(within(panel).getByRole('combobox', { name: 'Tour' })).toHaveValue('onboarding');

    const row = (id: string) =>
      within(panel).getByRole('button', { name: new RegExp(`^\\d+ ${id}`) });
    expect(row('welcome')).toHaveTextContent('centered');
    expect(row('here')).toHaveTextContent('found');
    expect(row('gone')).toHaveTextContent('missing');
    expect(row('secret')).toHaveTextContent('(hidden)');

    await user.click(row('here'));
    await waitFor(() => expect(tour.getState().stepId).toBe('here'));
    expect(row('here')).toHaveAttribute('aria-current', 'step');
    expect(within(panel).getByText('active')).toBeInTheDocument();

    // Devtools stay interactive while a modal tour makes the page inert.
    const host = document.querySelector('[data-awesome-tour-devtools]')!;
    expect(host).toHaveAttribute('data-tour-keep');
    expect(host).not.toHaveAttribute('inert');
    expect(document.getElementById('here')).not.toHaveAttribute('inert');

    await user.click(within(panel).getByRole('button', { name: 'Complete' }));
    expect(tour.getState().status).toBe('completed');

    await user.click(within(panel).getByRole('button', { name: /^Events/ }));
    const events = within(panel).getByRole('list', { name: 'Tour events' });
    expect(
      within(events)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringContaining('complete'),
      expect.stringContaining('stepLeave'),
      expect.stringContaining('stepChange'),
      expect.stringContaining('start'),
    ]);
  });

  it('inspects and edits checklists', async () => {
    const user = userEvent.setup();
    const { checklist } = setup();
    const panel = await screen.findByRole('region', { name: 'awesome-tour devtools' });
    await user.click(within(panel).getByRole('button', { name: /^Checklists/ }));
    expect(within(panel).getByText('0/2')).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: /^○ a/ }));
    expect(checklist.getState().items.a).toBe('done');
    act(() => checklist.signal('b'));
    expect(within(panel).getByText('2/2')).toBeInTheDocument();
  });

  it('toggles with the launcher and the keyboard shortcut, remembering the choice', async () => {
    const user = userEvent.setup();
    setup();
    const launcher = screen.getByRole('button', { name: 'Close tour devtools' });
    await user.click(launcher);
    expect(screen.queryByRole('region', { name: 'awesome-tour devtools' })).toBeNull();
    expect(window.localStorage.getItem('awesome-tour-devtools:open')).toBe('0');
    await user.keyboard('{Alt>}{Shift>}T{/Shift}{/Alt}');
    expect(
      await screen.findByRole('region', { name: 'awesome-tour devtools' }),
    ).toBeInTheDocument();
  });
});

describe('funnel', () => {
  it('shows how many runs reached each step and how they ended', async () => {
    const tour = createTour({ id: 'f', steps: [{ id: 'one' }, { id: 'two' }, { id: 'three' }] });
    render(
      <TourProvider tours={[tour]}>
        <TourDevtools isolate={false} defaultOpen />
      </TourProvider>,
    );
    await act(() => tour.start());
    await act(() => tour.next());
    act(() => tour.close());
    await act(() => tour.start({ force: true }));
    act(() => tour.close());
    await userEvent.setup().click(screen.getByRole('button', { name: 'Funnel' }));
    const funnel = screen.getByRole('region', { name: 'Funnel for f' });
    expect(funnel).toHaveTextContent('2 runs');
    expect(
      within(funnel)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['one2 · 100%', 'two1 · 50% −1', 'three0 · 0% −1']);
    expect(funnel).toHaveTextContent('0 completed · 0 skipped · 2 closed');
  });
});
