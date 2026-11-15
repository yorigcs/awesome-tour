import { createTour, Tour } from '@awesome-tour/react';
import { useState } from 'react';
import { CardBody, Frame, MockApp } from './ui';

const tour = createTour({
  id: 'docs-styling',
  steps: [
    {
      id: 'nav',
      target: '#styling-nav',
      side: 'right',
      title: 'Same tour',
      description: 'Only class names change between themes.',
    },
    {
      id: 'new',
      target: '#styling-new',
      title: 'Your design system',
      description: 'Style with data-state, data-side and CSS variables.',
    },
    {
      id: 'stats',
      target: '#styling-stat-2',
      title: 'No CSS shipped',
      description: 'Nothing to override, nothing to fight.',
    },
  ],
});

const themes = {
  default: { content: '', overlay: true },
  brutal: { content: 'at-card--brutal', overlay: true },
  glass: { content: 'at-card--glass', overlay: true },
  spotlight: { content: '', overlay: false },
} as const;

export function StylingDemo() {
  const [theme, setTheme] = useState<keyof typeof themes>('brutal');
  const t = themes[theme];
  return (
    <Tour.Root tour={tour}>
      <Frame
        title="Styling"
        actions={
          <>
            <select
              className="at-select"
              aria-label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as keyof typeof themes)}
            >
              {Object.keys(themes).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <Tour.Trigger className="at-button at-button--primary">Start tour</Tour.Trigger>
          </>
        }
      >
        <MockApp id="styling" />
      </Frame>
      <Tour.Portal>
        {t.overlay ? (
          <Tour.Overlay padding={6} radius={10} />
        ) : (
          <Tour.Spotlight className="at-spotlight" padding={6} />
        )}
        <Tour.Content className={`at-card ${t.content}`} sideOffset={12} collisionPadding={12}>
          <Tour.Arrow className="at-arrow" width={14} height={7} />
          <CardBody />
        </Tour.Content>
      </Tour.Portal>
    </Tour.Root>
  );
}
