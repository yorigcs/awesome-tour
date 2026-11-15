import { Tour } from '@awesome-tour/react';
import { Frame, MockApp } from './ui';

/** Inline tour declared in JSX: no createTour, steps are children. */
export function NonModalDemo() {
  return (
    <Tour.Root id="docs-declarative" modal={false}>
      <Tour.Step id="search" target="#decl-search" title="Declared in JSX">
        <p className="at-card__description">
          {'<Tour.Step>'} children become the step content. This tour is non-modal: the page stays
          usable.
        </p>
      </Tour.Step>
      <Tour.Step id="new" target="#decl-new" title="Spotlight">
        <p className="at-card__description">
          Tour.Spotlight is a plain element you style yourself.
        </p>
      </Tour.Step>
      <Tour.Step id="stat" target="#decl-stat-2" title="Indicators">
        <p className="at-card__description">Tour.Indicators renders one button per visible step.</p>
      </Tour.Step>
      <Frame
        title="Declarative · non-modal"
        actions={<Tour.Trigger className="at-button at-button--primary">Start tour</Tour.Trigger>}
      >
        <MockApp id="decl" />
      </Frame>
      <Tour.Portal>
        <Tour.Spotlight className="at-spotlight" padding={6} />
        <Tour.Content className="at-card" sideOffset={12}>
          <Tour.Arrow className="at-arrow" width={14} height={7} />
          <Tour.Title className="at-card__title" />
          <Tour.StepContent />
          <footer className="at-card__footer">
            <Tour.Indicators className="at-dots" />
            <div className="at-card__nav">
              <Tour.Prev className="at-button">Back</Tour.Prev>
              <Tour.Next className="at-button at-button--primary">Next</Tour.Next>
            </div>
          </footer>
        </Tour.Content>
      </Tour.Portal>
    </Tour.Root>
  );
}
