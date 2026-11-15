import { Checklist, createChecklist, createTour, memoryStorage, Tour } from '@awesome-tour/react';
import { Frame, TourCard } from './ui';

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
    { id: 'tour', tour: miniTour, meta: { title: 'Take the tour' } },
    { id: 'invite', signal: 'invited', meta: { title: 'Invite a teammate' } },
    { id: 'profile', meta: { title: 'Complete your profile' } },
  ],
});

export function ChecklistDemo() {
  return (
    <Frame title="Onboarding checklist">
      <div className="at-row">
        <Checklist.Root checklist={checklist} className="at-checklist" aria-labelledby="cl-title">
          <header className="at-checklist__header">
            <p id="cl-title" className="at-checklist__title">
              Getting started
            </p>
            <button
              type="button"
              className="at-button at-button--ghost"
              onClick={() => checklist.reset()}
            >
              Reset
            </button>
          </header>
          <Checklist.Progress className="at-checklist__progress">
            {({ completed, total }) => (
              <>
                <span>
                  {completed} of {total} done
                </span>
                <span className="at-checklist__bar" aria-hidden="true" />
              </>
            )}
          </Checklist.Progress>
          <Checklist.List className="at-checklist__list">
            {checklist.getItems().map((item) => (
              <Checklist.Item key={item.id} value={item.id} className="at-checklist__item">
                <Checklist.ItemIndicator className="at-checklist__check" forceMount>
                  ✓
                </Checklist.ItemIndicator>
                <Checklist.ItemTrigger className="at-checklist__trigger">
                  {item.meta?.title as string}
                </Checklist.ItemTrigger>
              </Checklist.Item>
            ))}
          </Checklist.List>
        </Checklist.Root>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            id="checklist-invite"
            type="button"
            className="at-button"
            onClick={() => checklist.signal('invited')}
          >
            Invite teammate → signal('invited')
          </button>
          <button type="button" className="at-button" onClick={() => checklist.complete('profile')}>
            Save profile → complete('profile')
          </button>
        </div>
      </div>
      <Tour.Root tour={miniTour}>
        <TourCard />
      </Tour.Root>
    </Frame>
  );
}
