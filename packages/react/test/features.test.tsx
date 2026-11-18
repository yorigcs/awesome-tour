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
