import { createTour, Tour } from '@awesome-tour/react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MotionContent, MotionOverlay, MotionSpotlight, tourPresets } from '../src';

afterEach(cleanup);

describe('motion adapter', () => {
  it('animates content in and out with the tour', async () => {
    const tour = createTour({
      id: 'm',
      steps: [
        { id: 'a', target: '#a' },
        { id: 'b', target: '#b' },
      ],
    });
    render(
      <>
        <div id="a">A</div>
        <div id="b">B</div>
        <Tour.Root tour={tour}>
          <Tour.Portal>
            <MotionOverlay data-testid="overlay" />
            <MotionSpotlight data-testid="spotlight" />
            <MotionContent preset="slide" animateStepChange>
              <Tour.Title>Hello</Tour.Title>
              <Tour.Next>Next</Tour.Next>
            </MotionContent>
          </Tour.Portal>
        </Tour.Root>
      </>,
    );
    await act(() => tour.start());
    const dialog = await screen.findByRole('dialog', { name: 'Hello' });
    expect(dialog).toHaveAttribute('data-step', 'a');
    expect(screen.getByTestId('overlay')).toBeInTheDocument();
    expect(screen.getByTestId('spotlight')).toBeInTheDocument();

    // Children are direct children of the content element (no animation wrapper), so the card's
    // own flex/grid layout applies to them.
    expect(screen.getByText('Next').parentElement).toBe(dialog);

    const next = screen.getByText('Next');
    await userEvent.click(next);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('data-step', 'b'));
    expect(screen.getAllByText('Next')).toHaveLength(1);
    expect(screen.getByText('Next')).toBe(next); // animated in place, not remounted

    act(() => tour.close());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.queryByTestId('overlay')).toBeNull());
  });

  it('slide preset offsets toward the target side', () => {
    expect(tourPresets.slide('top').initial).toMatchObject({ y: 8 });
    expect(tourPresets.slide('left').initial).toMatchObject({ x: 8 });
  });
});
