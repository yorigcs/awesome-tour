import { createTour, Tour } from '@awesome-tour/react';
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, mockLayout, mockRect, waitForStep, waitForTourEnd } from '../src';
import { renderWithTour } from '../src/react';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('@awesome-tour/testing', () => {
  it('mocks layout', () => {
    const el = document.createElement('div');
    el.className = 'box';
    document.body.append(el);
    const restore = mockRect(el, { x: 10, y: 20, width: 30, height: 40 });
    expect(el.getBoundingClientRect().right).toBe(40);
    restore();
    expect(el.getBoundingClientRect().width).toBe(0);
    const restoreAll = mockLayout({ '.box': { width: 5 } });
    expect(el.getBoundingClientRect().width).toBe(5);
    restoreAll();
  });

  it('renders with a provider, drives a multi-page tour, waits for steps', async () => {
    const router = createMemoryRouter('/');
    const tour = createTour({
      id: 't',
      steps: [
        { id: 'home', title: 'Home' },
        { id: 'settings', route: '/settings', title: 'Settings' },
      ],
    });
    const { manager } = renderWithTour(
      <Tour.Root tourId="t">
        <Tour.Portal>
          <Tour.Content>
            <Tour.Title />
          </Tour.Content>
        </Tour.Portal>
      </Tour.Root>,
      { tours: [tour], router },
    );
    await act(() => manager.start('t'));
    await waitForStep(tour, 'home');
    expect(screen.getByRole('dialog').textContent).toContain('Home');
    await act(() => tour.next());
    await waitForStep(tour, 'settings');
    expect(router.history).toEqual(['/', '/settings']);
    await act(() => tour.next());
    expect(await waitForTourEnd(tour)).toBe('completed');
  });

  it('explains timeouts', async () => {
    const tour = createTour({ id: 'slow', steps: [{ id: 'a' }] });
    await expect(waitForStep(tour, 'a', { timeout: 20 })).rejects.toThrow(/didn't reach step "a"/);
  });
});
