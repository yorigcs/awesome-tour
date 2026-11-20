import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createTour,
  getObserverStats,
  type ImpressionRecord,
  memoryStorage,
  Tour,
  type TourPlugin,
  TourProvider,
} from '../src';

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('dir');
});

function Card() {
  return (
    <Tour.Portal>
      <Tour.Content>
        <Tour.Title />
        <Tour.Next>Next</Tour.Next>
      </Tour.Content>
    </Tour.Portal>
  );
}

describe('StrictMode', () => {
  it('inline tour plugins are set up once (net) and torn down on unmount', async () => {
    let live = 0;
    const plugin: TourPlugin = {
      name: 'counter',
      setup() {
        live++;
        return () => {
          live--;
        };
      },
    };
    const { unmount } = render(
      <React.StrictMode>
        <Tour.Root id="inline" steps={[{ id: 'a', title: 'A' }]} plugins={[plugin]}>
          <Card />
        </Tour.Root>
      </React.StrictMode>,
    );
    expect(live).toBe(1);
    unmount();
    expect(live).toBe(0);
  });

  it('a provider-created manager counts a triggered show once', async () => {
    const impressions = memoryStorage<ImpressionRecord>();
    const tour = createTour({
      id: 'triggered',
      rules: { trigger: { event: { type: 'app:ready' } } },
      steps: [{ id: 'a', title: 'Hello' }],
    });
    render(
      <React.StrictMode>
        <TourProvider tours={[tour]} impressions={impressions}>
          <Tour.Root tourId="triggered">
            <Card />
          </Tour.Root>
        </TourProvider>
      </React.StrictMode>,
    );
    await act(async () => {
      document.dispatchEvent(new Event('app:ready'));
    });
    await waitFor(() => expect(tour.getState().status).toBe('active'));
    await waitFor(async () => expect((await impressions.get('triggered'))?.shows).toBe(1));
  });

  it('unmounting releases every shared observer', async () => {
    const before = getObserverStats();
    const target = document.createElement('button');
    target.id = 'target';
    document.body.append(target);
    const tour = createTour({
      id: 'obs',
      steps: [{ id: 'a', target: '#target', title: 'A', canNext: () => true }],
    });
    const { unmount } = render(
      <React.StrictMode>
        <Tour.Root tour={tour}>
          <Card />
        </Tour.Root>
      </React.StrictMode>,
    );
    await act(() => tour.start());
    expect(getObserverStats().activity).toBeGreaterThan(before.activity);
    tour.close();
    unmount();
    expect(getObserverStats()).toEqual(before);
    target.remove();
  });
});

describe('declarative steps', () => {
  it('pushes prop changes (title, target) to the tour', async () => {
    const tour = createTour({ id: 'decl', steps: [] as { id: string }[] });
    function App({ title }: { title: string }) {
      return (
        <Tour.Root tour={tour}>
          <Tour.Step id="a" title={title} side="left" />
          <Card />
        </Tour.Root>
      );
    }
    const { rerender } = render(<App title="First" />);
    await act(() => tour.start());
    expect(await screen.findByRole('heading', { name: 'First' })).toBeTruthy();
    rerender(<App title="Second" />);
    expect(await screen.findByRole('heading', { name: 'Second' })).toBeTruthy();
    expect(tour.getStep('a')).toMatchObject({ title: 'Second', side: 'left' });
  });
});

describe('keyboard', () => {
  it('arrow keys on a slider belong to the slider, not the tour', async () => {
    const tour = createTour({ id: 'keys', modal: false, steps: [{ id: 'a' }, { id: 'b' }] });
    render(
      <>
        <div role="slider" aria-valuenow={5} tabIndex={0} data-testid="knob" />
        <Tour.Root tour={tour}>
          <Card />
        </Tour.Root>
      </>,
    );
    await act(() => tour.start());
    fireEvent.keyDown(screen.getByTestId('knob'), { key: 'ArrowRight' });
    expect(tour.getState().stepId).toBe('a');
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    });
    await waitFor(() => expect(tour.getState().stepId).toBe('b'));
  });

  it('only the most recently opened tour handles keys', async () => {
    const first = createTour({ id: 'first', modal: false, steps: [{ id: 'a' }, { id: 'b' }] });
    const second = createTour({ id: 'second', modal: false, steps: [{ id: 'x' }, { id: 'y' }] });
    render(
      <>
        <Tour.Root tour={first}>
          <Card />
        </Tour.Root>
        <Tour.Root tour={second}>
          <Card />
        </Tour.Root>
      </>,
    );
    await act(() => first.start());
    await act(() => second.start());
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Escape' });
    });
    expect(second.getState().status).toBe('closed');
    expect(first.getState().status).toBe('active');
  });
});

describe('direction', () => {
  it('infers rtl from the document', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    const tour = createTour({ id: 'rtl', modal: false, steps: [{ id: 'a' }, { id: 'b' }] });
    render(
      <Tour.Root tour={tour}>
        <Card />
      </Tour.Root>,
    );
    await act(() => tour.start());
    // In RTL, ArrowLeft moves forward.
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    });
    await waitFor(() => expect(tour.getState().stepId).toBe('b'));
  });
});
