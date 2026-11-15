import { createChecklist, createTour, memoryStorage, Tour } from '@awesome-tour/react';
import { RotateCcw, UserPlus, UserRoundCheck } from 'lucide-react';
import { ChecklistPanel } from '@/components/awesome-tour/checklist';
import { TourPopover } from '@/components/awesome-tour/tour';
import { Button } from '@/components/ui/button';
import { AppSurface, DemoFrame, worldButton } from './ui';

const miniTour = createTour({
  id: 'docs-checklist-tour',
  steps: [
    {
      id: 'a',
      target: '#checklist-invite',
      title: 'Invite',
      description: 'Invite your team here.',
    },
    { id: 'b', title: 'That was it', description: 'Completing the tour checks the item.' },
  ],
});

const checklist = createChecklist({
  id: 'docs-getting-started',
  persistence: memoryStorage(),
  items: [
    {
      id: 'tour',
      tour: miniTour,
      meta: { title: 'Take the tour', description: 'Linked to a tour — completes with it.' },
    },
    {
      id: 'invite',
      signal: 'invited',
      meta: { title: 'Invite a teammate', description: "Completes on signal('invited')." },
    },
    {
      id: 'profile',
      meta: { title: 'Complete your profile', description: 'Completed by hand.' },
    },
  ],
});

export function ChecklistDemo() {
  return (
    <DemoFrame
      title="Onboarding checklist"
      actions={
        <button type="button" className={worldButton.ghost} onClick={() => checklist.reset()}>
          <RotateCcw aria-hidden="true" />
          Reset
        </button>
      }
    >
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,20rem)_1fr]">
        <ChecklistPanel checklist={checklist} description="3 quick wins to get going" />
        <AppSurface className="flex flex-col items-start gap-2">
          <Button
            id="checklist-invite"
            variant="outline"
            onClick={() => checklist.signal('invited')}
          >
            <UserPlus />
            Invite teammate
            <code className="text-xs text-muted-foreground">signal('invited')</code>
          </Button>
          <Button variant="outline" onClick={() => checklist.complete('profile')}>
            <UserRoundCheck />
            Save profile
            <code className="text-xs text-muted-foreground">complete('profile')</code>
          </Button>
        </AppSurface>
      </div>
      <Tour.Root tour={miniTour}>
        <TourPopover />
      </Tour.Root>
    </DemoFrame>
  );
}
