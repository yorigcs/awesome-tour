import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFeed, createTour, memoryStorage, Tour, TourProvider, useFeed } from '../src';

afterEach(cleanup);

describe('sheet layout', () => {
  it('docks the content to the bottom, without an arrow', async () => {
    const tour = createTour({ id: 'sheet', steps: [{ id: 'a', title: 'A' }] });
    render(
      <Tour.Root tour={tour}>
        <Tour.Portal>
          <Tour.Content layout="sheet">
            <Tour.Arrow data-testid="arrow" />
            <Tour.Title />
          </Tour.Content>
        </Tour.Portal>
      </Tour.Root>,
    );
    await act(() => tour.start());
    const dialog = await screen.findByRole('dialog', { name: 'A' });
    expect(dialog).toHaveAttribute('data-layout', 'sheet');
    expect(dialog).toHaveAttribute('data-placement', 'sheet');
    expect(dialog.parentElement!.style.bottom).toBe('0px');
    expect(screen.queryByTestId('arrow')).toBeNull();
  });
});

describe('feed', () => {
  it('tracks unread items and remembers what was read', async () => {
    const storage = memoryStorage<any>();
    const items = [
      { id: 'swing', title: 'Swing per row', date: '2026-11-10' },
      { id: 'stems', title: 'Stems export', date: '2026-11-15' },
    ];
    const feed = createFeed({ id: 'news', items, persistence: storage });
    await feed.ready();
    const { result } = renderHook(() => useFeed(feed));
    expect(result.current.unread).toBe(2);
    expect(result.current.items[0]!.id).toBe('stems'); // newest first
    act(() => feed.markRead('stems'));
    expect(result.current.unread).toBe(1);
    act(() => feed.markAllRead());
    expect(result.current.unread).toBe(0);
    const again = createFeed({
      id: 'news',
      items: [...items, { id: 'later', title: 'Later', date: '2099-01-01' }],
      persistence: storage,
    });
    await again.ready();
    expect(again.getState().unread).toBe(1);
  });
});

describe('TourProvider deepLink', () => {
  it('starts the tour named in the URL', async () => {
    window.history.replaceState(null, '', '/?tour=linked');
    const tour = createTour({ id: 'linked', steps: [{ id: 'a', title: 'From a link' }] });
    render(
      <TourProvider tours={[tour]} deepLink>
        <Tour.Root tourId="linked">
          <Tour.Portal>
            <Tour.Content>
              <Tour.Title />
            </Tour.Content>
          </Tour.Portal>
        </Tour.Root>
      </TourProvider>,
    );
    expect(await screen.findByRole('dialog', { name: 'From a link' })).toBeTruthy();
    expect(window.location.search).toBe('');
  });
});

describe('launcher status across sessions', () => {
  it('a tour completed in an earlier session is "done", not "new"', async () => {
    const { useLauncherStatus } = await import('../src/surfaces');
    const impressions = memoryStorage<any>();
    impressions.set('old-tour', {
      shows: 1,
      lastShownAt: 1,
      finished: true,
      outcome: 'completed',
      snoozedUntil: null,
    });
    const tour = createTour({ id: 'old-tour', steps: [{ id: 'a' }] });
    const fresh = createTour({ id: 'fresh-tour', steps: [{ id: 'a' }] });
    function Status({ id }: { id: string }) {
      return <span data-testid={id}>{useLauncherStatus(id)}</span>;
    }
    render(
      <TourProvider tours={[tour, fresh]} impressions={impressions}>
        <Status id="old-tour" />
        <Status id="fresh-tour" />
      </TourProvider>,
    );
    expect(await screen.findByText('done')).toHaveAttribute('data-testid', 'old-tour');
    expect(screen.getByTestId('fresh-tour').textContent).toBe('new');
  });
});

describe('checklist UI: locked items', () => {
  it('marks locked items and keeps their trigger inert', async () => {
    const { Checklist, createChecklist } = await import('../src');
    const list = createChecklist({
      id: 'ui',
      items: [
        { id: 'one', meta: { title: 'One' } },
        { id: 'two', after: 'one', optional: true, meta: { title: 'Two' } },
      ],
    });
    render(
      <Checklist.Root checklist={list}>
        <Checklist.List>
          {list.getItems().map((item) => (
            <Checklist.Item key={item.id} value={item.id} data-testid={item.id}>
              <Checklist.ItemIndicator />
              <Checklist.ItemTrigger>{item.meta?.title as string}</Checklist.ItemTrigger>
            </Checklist.Item>
          ))}
        </Checklist.List>
      </Checklist.Root>,
    );
    expect(screen.getByTestId('two')).toHaveAttribute('data-locked', '');
    expect(screen.getByTestId('one')).toHaveAttribute('data-next', '');
    const two = screen.getByRole('button', { name: 'Two' });
    expect(two).toHaveAttribute('aria-disabled', 'true');
    expect(two).toHaveAccessibleDescription('Locked: finish the previous steps first (optional)');
    act(() => list.complete('one'));
    expect(screen.getByTestId('two')).not.toHaveAttribute('data-locked');
  });
});

describe('localized step content', () => {
  it('renders the text for the locale in effect', async () => {
    const tour = createTour({
      id: 'loc',
      steps: [
        {
          id: 'a',
          title: { en: 'Mixer', pt: 'Mesa de som' },
          description: { en: 'Set the levels.', pt: 'Ajuste os volumes.' },
        },
      ],
    });
    const ui = (locale: string) => (
      <TourProvider tours={[tour]} locale={locale}>
        <Tour.Root tourId="loc">
          <Tour.Portal>
            <Tour.Content>
              <Tour.Title />
              <Tour.Description />
            </Tour.Content>
          </Tour.Portal>
        </Tour.Root>
      </TourProvider>
    );
    const { rerender } = render(ui('pt-BR'));
    await act(() => tour.start());
    expect(await screen.findByRole('dialog', { name: 'Mesa de som' })).toHaveAccessibleDescription(
      'Ajuste os volumes.',
    );
    rerender(ui('en'));
    expect(await screen.findByRole('dialog', { name: 'Mixer' })).toBeTruthy();
  });
});
