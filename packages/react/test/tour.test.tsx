import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  anchor,
  createTour,
  Hotspot,
  memoryStorage,
  persist,
  type ReactStepDefinition,
  Tour,
  TourProvider,
  useTour,
  useTourAnchor,
} from '../src';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

function TourUI() {
  return (
    <Tour.Portal>
      <Tour.Overlay data-testid="overlay" />
      <Tour.Content data-testid="content">
        <Tour.Title />
        <Tour.Description />
        <Tour.StepContent />
        <Tour.Progress data-testid="progress" />
        <Tour.Indicators />
        <Tour.Prev>Back</Tour.Prev>
        <Tour.Next>Next</Tour.Next>
        <Tour.Skip>Skip</Tour.Skip>
        <Tour.Close />
      </Tour.Content>
    </Tour.Portal>
  );
}

const steps: ReactStepDefinition[] = [
  { id: 'welcome', title: 'Welcome', description: 'Let us show you around.' },
  { id: 'sidebar', target: '#sidebar', title: 'Sidebar', description: 'Navigation lives here.' },
  { id: 'done', title: 'Done', description: 'You are all set.' },
];

function App({
  tour,
  onOpenChange,
}: {
  tour: ReturnType<typeof createTour>;
  onOpenChange?: (o: boolean) => void;
}) {
  return (
    <>
      <button type="button">Outside</button>
      <nav id="sidebar">Sidebar</nav>
      <Tour.Root tour={tour} onOpenChange={onOpenChange}>
        <Tour.Trigger>Start tour</Tour.Trigger>
        <TourUI />
      </Tour.Root>
    </>
  );
}

describe('Tour primitives', () => {
  it('renders an accessible dialog and navigates', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const tour = createTour({ id: 'a11y', steps });
    render(<App tour={tour} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText('Start tour'));
    const dialog = await screen.findByRole('dialog', { name: 'Welcome' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Let us show you around.');
    expect(dialog).toHaveAttribute('data-placement', 'center');
    expect(screen.getByTestId('progress')).toHaveTextContent('1 / 3');
    expect(screen.getByText('Back')).toBeDisabled();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.click(screen.getByText('Next'));
    const second = await screen.findByRole('dialog', { name: 'Sidebar' });
    expect(second).toHaveAttribute('data-placement', 'anchored');
    expect(second).toHaveAttribute('data-step', 'sidebar');
    const sidebar = document.getElementById('sidebar')!;
    expect(sidebar).toHaveAttribute('data-tour-target');
    expect(sidebar.getAttribute('aria-describedby')).toBe(second.id);

    // Outside content is inert while the modal tour is open; the target is not.
    expect(screen.getByText('Outside')).toHaveAttribute('inert');
    expect(sidebar).not.toHaveAttribute('inert');

    await user.click(screen.getByText('Back'));
    await screen.findByRole('dialog', { name: 'Welcome' });
    expect(sidebar).not.toHaveAttribute('data-tour-target');
  });

  it('supports keyboard navigation and Escape', async () => {
    const user = userEvent.setup();
    const tour = createTour({ id: 'kbd', steps });
    render(<App tour={tour} />);
    await act(() => tour.start());
    await screen.findByRole('dialog', { name: 'Welcome' });

    await user.keyboard('{ArrowRight}');
    await screen.findByRole('dialog', { name: 'Sidebar' });
    await user.keyboard('{ArrowLeft}');
    await screen.findByRole('dialog', { name: 'Welcome' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(tour.getState().status).toBe('closed');
    expect(screen.getByText('Outside')).not.toHaveAttribute('inert');
  });

  it('restores focus to the trigger on close', async () => {
    const user = userEvent.setup();
    const tour = createTour({ id: 'focus', steps });
    render(<App tour={tour} />);
    const trigger = screen.getByText('Start tour');
    await user.click(trigger);
    await screen.findByRole('dialog');
    await user.click(screen.getByLabelText('Close tour'));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('traps Tab inside the content', async () => {
    const user = userEvent.setup();
    const tour = createTour({ id: 'trap', steps });
    render(<App tour={tour} />);
    await act(() => tour.start({ stepId: 'sidebar' }));
    const dialog = await screen.findByRole('dialog');
    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('has no axe violations', async () => {
    const tour = createTour({ id: 'axe', steps });
    render(<App tour={tour} />);
    await act(() => tour.start({ stepId: 'sidebar' }));
    await screen.findByRole('dialog');
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

describe('declarative steps', () => {
  it('registers <Tour.Step> in order and renders their content', async () => {
    const user = userEvent.setup();
    function Declarative() {
      const ref = useTourAnchor<HTMLButtonElement>('cta');
      return (
        <>
          <button type="button" ref={ref}>
            CTA
          </button>
          <Tour.Root id="decl" defaultOpen>
            <Tour.Step id="one" title="One">
              <p>First content</p>
            </Tour.Step>
            <Tour.Step id="two" target={anchor('cta')} title="Two">
              <p>Second content</p>
            </Tour.Step>
            <TourUI />
          </Tour.Root>
        </>
      );
    }
    render(<Declarative />);
    await screen.findByText('First content');
    await user.click(screen.getByText('Next'));
    await screen.findByText('Second content');
    expect(screen.getByText('CTA')).toHaveAttribute('data-tour-target');
    await user.click(screen.getByText('Next'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('controlled', () => {
  it('syncs `open` and `step` props', async () => {
    function Controlled() {
      const [open, setOpen] = React.useState(false);
      const [step, setStep] = React.useState('welcome');
      return (
        <>
          <nav id="sidebar">Sidebar</nav>
          <button type="button" onClick={() => setOpen((o) => !o)}>
            toggle
          </button>
          <button type="button" onClick={() => setStep('done')}>
            jump
          </button>
          <span data-testid="step">{step}</span>
          <Tour.Root
            id="ctl"
            steps={steps}
            open={open}
            onOpenChange={setOpen}
            step={step}
            onStepChange={setStep}
          >
            <TourUI />
          </Tour.Root>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByText('toggle'));
    await screen.findByRole('dialog', { name: 'Welcome' });
    await user.click(screen.getByText('Next'));
    await screen.findByRole('dialog', { name: 'Sidebar' });
    expect(screen.getByTestId('step')).toHaveTextContent('sidebar');
  });
});

describe('provider', () => {
  it('starts tours by id with useTour and persists progress', async () => {
    const storage = memoryStorage();
    const tour = createTour({ id: 'onboarding', steps, plugins: [persist(storage)] });
    function Launcher() {
      const { start } = useTour('onboarding');
      return (
        <button type="button" onClick={() => start()}>
          launch
        </button>
      );
    }
    const user = userEvent.setup();
    render(
      <TourProvider tours={[tour]}>
        <nav id="sidebar">Sidebar</nav>
        <Launcher />
        <Tour.Root tourId="onboarding">
          <TourUI />
        </Tour.Root>
      </TourProvider>,
    );
    await user.click(screen.getByText('launch'));
    await screen.findByRole('dialog', { name: 'Welcome' });
    await user.click(screen.getByText('Skip'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await storage.get('onboarding')).toMatchObject({ status: 'skipped' });
  });
});

describe('Hotspot', () => {
  it('opens and closes a hint anchored to a target', async () => {
    const user = userEvent.setup();
    render(
      <>
        <div id="feature">Feature</div>
        <Hotspot.Root target="#feature">
          <Hotspot.Beacon />
          <Hotspot.Content aria-label="Tip">
            New feature!
            <Hotspot.Close />
          </Hotspot.Content>
        </Hotspot.Root>
      </>,
    );
    const beacon = await screen.findByLabelText('Show hint');
    expect(beacon).toHaveAttribute('aria-expanded', 'false');
    await user.click(beacon);
    expect(await screen.findByRole('dialog', { name: 'Tip' })).toHaveTextContent('New feature!');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(beacon).toHaveFocus();
  });
});
