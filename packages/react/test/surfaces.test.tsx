import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTour,
  Hotspot,
  memoryStorage,
  Tour,
  type TourManager,
  TourProvider,
  useTourManager,
} from '../src';
import {
  Announcement,
  createAnnouncement,
  createSurvey,
  Launcher,
  npsCategory,
  Survey,
} from '../src/surfaces';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

const flush = async () => {
  for (let i = 0; i < 5; i++) await act(() => new Promise((r) => setTimeout(r, 0)));
};

describe('Announcement', () => {
  it('renders by variant and completes on action', async () => {
    const banner = createAnnouncement({
      id: 'b',
      title: 'New reports',
      description: 'Export as PDF',
    });
    const toast = createAnnouncement({ id: 't', variant: 'toast', title: 'Saved' });
    render(
      <>
        <Announcement.Root announcement={banner}>
          <Announcement.Content>
            <Announcement.Title />
            <Announcement.Description />
            <Announcement.Action>Try it</Announcement.Action>
            <Announcement.Dismiss />
          </Announcement.Content>
        </Announcement.Root>
        <Announcement.Root announcement={toast}>
          <Announcement.Content>
            <Announcement.Title />
          </Announcement.Content>
        </Announcement.Root>
      </>,
    );
    await act(() => banner.start());
    await act(() => toast.start());
    const region = screen.getByRole('region', { name: 'New reports' });
    expect(region.getAttribute('data-variant')).toBe('banner');
    expect(screen.getByRole('status').textContent).toBe('Saved');
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try it' }));
    expect(banner.getState().status).toBe('completed');
  });

  it('ambient announcements never hold the tour queue; modal ones do', async () => {
    const tour = createTour({ id: 'tour', steps: [{ id: 'a' }] });
    const banner = createAnnouncement({ id: 'banner', title: 'Hi' });
    const modal = createAnnouncement({ id: 'modal', variant: 'modal', title: 'Big news' });
    let manager!: TourManager;
    function Grab() {
      manager = useTourManager();
      return null;
    }
    render(
      <TourProvider tours={[tour, banner, modal]}>
        <Grab />
      </TourProvider>,
    );
    await act(() => manager.start('banner'));
    await act(() => manager.start('tour'));
    expect(tour.getState().status).toBe('active');
    await act(() => manager.start('modal'));
    expect(modal.getState().status).toBe('idle');
    expect(manager.getState().queue).toEqual(['modal']);
  });

  it('auto-dismisses toasts', async () => {
    const toast = createAnnouncement({ id: 'tt', variant: 'toast', title: 'Bye', autoDismiss: 30 });
    await toast.start();
    await new Promise((r) => setTimeout(r, 80));
    expect(toast.getState().status).toBe('completed');
  });
});

describe('Survey', () => {
  it('walks questions, gates Next on an answer, honours `when`, and submits', async () => {
    const onSubmit = vi.fn();
    const survey = createSurvey({
      id: 'nps',
      onSubmit,
      questions: [
        { id: 'score', type: 'nps', prompt: 'How likely are you to recommend us?' },
        {
          id: 'why',
          type: 'text',
          prompt: 'What could be better?',
          when: (a) => Number(a.score) < 7,
        },
        { id: 'thanks', type: 'text', prompt: 'Anything else?', optional: true },
      ],
    });
    render(
      <Survey.Root survey={survey}>
        <Survey.Content>
          <Survey.Prompt />
          <Survey.Scale />
          <Survey.Comment />
          <Survey.Next>Next</Survey.Next>
        </Survey.Content>
      </Survey.Root>,
    );
    await act(() => survey.start());
    expect(screen.getByRole('dialog').getAttribute('data-variant')).toBe('slideout');
    const next = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
    await flush();
    expect(next.disabled).toBe(true);
    expect(screen.getAllByRole('radio')).toHaveLength(11);
    expect(screen.getByRole('radio', { name: '0, Not at all likely' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: '9' }));
    await flush();
    expect(screen.getByRole('radio', { name: '9' }).getAttribute('aria-checked')).toBe('true');
    expect(next.disabled).toBe(false);
    await act(() => survey.next());
    // Score 9 → the follow-up for detractors is skipped.
    expect(within(screen.getByRole('dialog')).getByRole('heading').textContent).toBe(
      'Anything else?',
    );
    await act(() => survey.next());
    expect(onSubmit).toHaveBeenCalledWith({ score: 9 });
    expect(npsCategory(9)).toBe('promoter');
  });

  it('moves and picks with arrow keys', async () => {
    const survey = createSurvey({
      id: 'csat',
      questions: [{ id: 'q', type: 'csat', prompt: 'Happy?' }],
    });
    render(
      <Survey.Root survey={survey}>
        <Survey.Content>
          <Survey.Scale />
        </Survey.Content>
      </Survey.Root>,
    );
    await act(() => survey.start());
    const first = screen.getByRole('radio', { name: '1' });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(survey.getState().data.answers.q).toBe(2);
  });
});

describe('Launcher', () => {
  it('lists tours with their status and restarts them', async () => {
    const tour = createTour({ id: 'onb', steps: [{ id: 'a' }] });
    render(
      <TourProvider tours={[tour]}>
        <Tour.Root tourId="onb" />
        <Launcher.Root>
          <Launcher.Trigger>
            Help <Launcher.Badge tours={['onb']} />
          </Launcher.Trigger>
          <Launcher.Content>
            <Launcher.Item tour="onb">Product tour</Launcher.Item>
          </Launcher.Content>
        </Launcher.Root>
      </TourProvider>,
    );
    const trigger = screen.getByRole('button', { name: /Help/ });
    expect(trigger.textContent).toContain('1');
    fireEvent.click(trigger);
    const item = screen.getByRole('button', { name: 'Product tour' });
    expect(item.getAttribute('data-status')).toBe('new');
    fireEvent.click(item);
    await flush();
    expect(tour.getState().status).toBe('active');
    await act(() => tour.complete());
    expect(screen.getByRole('button', { name: /Help/ }).textContent).not.toContain('1');
  });
});

describe('Hotspot+', () => {
  it('remembers it was seen and hides with `once`', async () => {
    const storage = memoryStorage<{ seen: boolean; seenAt: number }>();
    const target = document.createElement('div');
    target.id = 'hs-target';
    document.body.append(target);
    const ui = (
      <Hotspot.Root id="new-export" target="#hs-target" persistence={storage} once>
        <Hotspot.Beacon />
        <Hotspot.Content aria-label="Hint">
          Hi <Hotspot.Close />
        </Hotspot.Content>
      </Hotspot.Root>
    );
    const { unmount } = render(ui);
    fireEvent.click(await screen.findByRole('button', { name: 'Show hint' }));
    expect(screen.getByRole('dialog', { name: 'Hint' })).toBeTruthy();
    expect((await storage.get('new-export'))?.seen).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close hint' }));
    await flush();
    expect(screen.queryByRole('button', { name: 'Show hint' })).toBeNull();
    unmount();
    render(ui);
    await flush();
    expect(screen.queryByRole('button', { name: 'Show hint' })).toBeNull();
    target.remove();
  });
});
