import { createTour, Tour, useTour } from '@awesome-tour/react';
import { Frame, TourCard } from './ui';

interface Data {
  role: 'developer' | 'designer' | null;
}

function RolePicker() {
  const { setData, next } = useTour<Data>();
  const pick = (role: Data['role']) => {
    setData({ role });
    void next();
  };
  return (
    <div className="at-card__choices">
      <button type="button" className="at-button" onClick={() => pick('developer')}>
        Developer
      </button>
      <button type="button" className="at-button" onClick={() => pick('designer')}>
        Designer
      </button>
    </div>
  );
}

const tour = createTour({
  id: 'docs-branching',
  data: { role: null } as Data,
  steps: [
    {
      id: 'role',
      title: 'What do you do?',
      description: 'The next step depends on your answer.',
      content: <RolePicker />,
      next: (ctx) => (ctx.data.role === 'designer' ? 'tokens' : 'api'),
    },
    {
      id: 'api',
      target: '#branch-api',
      title: 'API keys',
      description: 'Developers go here (next: ctx => …).',
      next: 'admin',
    },
    {
      id: 'tokens',
      target: '#branch-tokens',
      title: 'Design tokens',
      description: 'Designers go here instead.',
    },
    {
      id: 'admin',
      target: '#branch-admin',
      when: (ctx) => ctx.data.role === 'developer',
      title: 'Webhooks',
      description: 'Shown only when when(ctx) is true. Press Back: prev() walks the path you took.',
    },
    { id: 'end', title: 'The end', description: 'Branches and conditions are plain functions.' },
  ],
});

export function BranchingDemo() {
  return (
    <Tour.Root tour={tour}>
      <Frame
        title="Branching"
        actions={<Tour.Trigger className="at-button at-button--primary">Start tour</Tour.Trigger>}
      >
        <div className="at-grid">
          <div id="branch-api" className="at-tile">
            <small>developer</small>API keys
          </div>
          <div id="branch-tokens" className="at-tile">
            <small>designer</small>Design tokens
          </div>
          <div id="branch-admin" className="at-tile">
            <small>developer only</small>Webhooks
          </div>
        </div>
      </Frame>
      <TourCard />
    </Tour.Root>
  );
}
