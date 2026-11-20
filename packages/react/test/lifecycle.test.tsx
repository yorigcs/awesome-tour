import { act, cleanup, render } from '@testing-library/react';
import * as React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Checklist,
  createChecklist,
  createTour,
  getObserverStats,
  Hotspot,
  memoryStorage,
  Tour,
  TourProvider,
} from '../src';
import { Announcement, createAnnouncement, createSurvey, Launcher, Survey } from '../src/surfaces';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

/** Every primitive, with a tour of each kind, mounted together. */
function makeApp() {
  const tour = createTour({
    id: 'app-tour',
    rules: { trigger: { event: { type: 'app:ready' } } },
    steps: [
      { id: 'a', target: '#target', title: 'A', canNext: () => true },
      { id: 'b', title: 'B' },
    ],
  });
  const banner = createAnnouncement({ id: 'banner', title: 'New', description: 'Stems' });
  const survey = createSurvey({
    id: 'survey',
    questions: [{ id: 'q', type: 'csat', prompt: 'How?' }],
  });
  const checklist = createChecklist({
    id: 'list',
    persistence: memoryStorage(),
    items: [{ id: 'tour', tour: 'app-tour', meta: { title: 'Take the tour' } }],
  });
  function App() {
    return (
      <TourProvider tours={[tour, banner, survey]}>
        <button type="button" id="target">
          Target
        </button>
        <Tour.Root tourId="app-tour">
          <Tour.Trigger>Start</Tour.Trigger>
          <Tour.Portal>
            <Tour.Overlay />
            <Tour.Content>
              <Tour.Arrow />
              <Tour.Title />
              <Tour.Next>Next</Tour.Next>
            </Tour.Content>
          </Tour.Portal>
        </Tour.Root>
        <Tour.Root id="inline" steps={[{ id: 'x', title: 'Inline' }]}>
          <Tour.Step id="y" title="Declared" />
        </Tour.Root>
        <Announcement.Root announcement={banner}>
          <Announcement.Content>
            <Announcement.Title />
          </Announcement.Content>
        </Announcement.Root>
        <Survey.Root survey={survey}>
          <Survey.Content>
            <Survey.Prompt />
            <Survey.Scale />
          </Survey.Content>
        </Survey.Root>
        <Launcher.Root>
          <Launcher.Trigger>
            Help <Launcher.Badge tours={['app-tour']} />
          </Launcher.Trigger>
          <Launcher.Content>
            <Launcher.Item tour="app-tour">Tour</Launcher.Item>
          </Launcher.Content>
        </Launcher.Root>
        <Hotspot.Root target="#target">
          <Hotspot.Beacon />
          <Hotspot.Portal>
            <Hotspot.Content>Hint</Hotspot.Content>
          </Hotspot.Portal>
        </Hotspot.Root>
        <Checklist.Root checklist={checklist}>
          <Checklist.Progress />
        </Checklist.Root>
      </TourProvider>
    );
  }
  return { App, tour };
}

describe('StrictMode', () => {
  it('mounting, running and unmounting every primitive leaves no observer behind', async () => {
    const before = getObserverStats();
    const { App, tour } = makeApp();
    const { unmount } = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    await act(async () => {
      document.dispatchEvent(new Event('app:ready'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(tour.getState().status).toBe('active');
    act(() => tour.close());
    unmount();
    await act(() => new Promise((r) => setTimeout(r, 10)));
    expect(getObserverStats()).toEqual(before);
  });
});

describe('SSR', () => {
  it('renders on the server and hydrates without mismatches', async () => {
    const { App } = makeApp();
    const html = renderToString(<App />);
    expect(html).toContain('Start');

    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const { App: ClientApp } = makeApp();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <ClientApp />);
    });
    const hydrationErrors = errors.mock.calls.filter((c) =>
      /hydrat|did not match|server rendered/i.test(String(c[0])),
    );
    expect(hydrationErrors).toEqual([]);
    act(() => root?.unmount());
    errors.mockRestore();
  });
});
