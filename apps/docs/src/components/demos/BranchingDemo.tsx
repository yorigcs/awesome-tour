import { createTour, Tour, useTour } from '@awesome-tour/react';
import { Code2, Palette } from 'lucide-react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { Button } from '@/components/ui/button';
import { AppSurface, DemoFrame, StartButton, Tile } from './ui';

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
    <div className="mt-1 grid grid-cols-2 gap-2">
      <Button variant="outline" onClick={() => pick('developer')}>
        <Code2 />
        Developer
      </Button>
      <Button variant="outline" onClick={() => pick('designer')}>
        <Palette />
        Designer
      </Button>
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
      <DemoFrame title="Branching" actions={<StartButton />}>
        <AppSurface className="grid gap-3 sm:grid-cols-3">
          <Tile id="branch-api" label="developer">
            API keys
          </Tile>
          <Tile id="branch-tokens" label="designer">
            Design tokens
          </Tile>
          <Tile id="branch-admin" label="developer only">
            Webhooks
          </Tile>
        </AppSurface>
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
