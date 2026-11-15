import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { Checklist, createChecklist, createTour, Tour, TourProvider } from '../src';

afterEach(cleanup);

describe('Checklist', () => {
  it('starts linked tours, completes items and reports progress accessibly', async () => {
    const user = userEvent.setup();
    const intro = createTour({ id: 'intro', steps: [{ id: 'only', title: 'Intro step' }] });
    const checklist = createChecklist({
      id: 'getting-started',
      items: [
        { id: 'intro', tour: 'intro', meta: { title: 'Take the intro tour' } },
        { id: 'invite', signal: 'invited', meta: { title: 'Invite a teammate' } },
      ],
    });

    render(
      <TourProvider tours={[intro]}>
        <Checklist.Root checklist={checklist} data-testid="root">
          <Checklist.Progress />
          <Checklist.List>
            {checklist.getItems().map((item) => (
              <Checklist.Item key={item.id} value={item.id}>
                <Checklist.ItemIndicator>✓</Checklist.ItemIndicator>
                <Checklist.ItemTrigger>{item.meta?.title as string}</Checklist.ItemTrigger>
                <Checklist.ItemSkip>Skip</Checklist.ItemSkip>
              </Checklist.Item>
            ))}
          </Checklist.List>
          <Checklist.Dismiss />
        </Checklist.Root>
        <Tour.Root tourId="intro">
          <Tour.Portal>
            <Tour.Content>
              <Tour.Title />
              <Tour.Next>Done</Tour.Next>
            </Tour.Content>
          </Tour.Portal>
        </Tour.Root>
      </TourProvider>,
    );

    const progress = screen.getByRole('progressbar', { name: 'Checklist progress' });
    expect(progress).toHaveAttribute('aria-valuenow', '0');
    const trigger = screen.getByRole('button', { name: 'Take the intro tour' });
    expect(trigger).toHaveAccessibleDescription('Not completed');

    await user.click(trigger);
    await screen.findByRole('dialog', { name: 'Intro step' });
    await user.click(screen.getByText('Done'));
    await waitFor(() => expect(trigger).toHaveAccessibleDescription('Completed'));
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(trigger.closest('li')).toHaveAttribute('data-state', 'done');

    act(() => checklist.signal('invited'));
    expect(screen.getByTestId('root')).toHaveAttribute('data-state', 'complete');

    const results = await axe.run(screen.getByTestId('root'));
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await user.click(screen.getByLabelText('Dismiss checklist'));
    expect(screen.getByTestId('root')).toHaveAttribute('data-state', 'dismissed');
  });
});
