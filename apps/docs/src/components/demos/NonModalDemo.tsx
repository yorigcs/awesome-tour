import { Tour } from '@awesome-tour/react';
import {
  TourCard,
  TourCardFooter,
  TourCardNext,
  TourCardPrev,
  TourCardTitle,
  TourDots,
  TourSpotlight,
} from '@/components/awesome-tour/tour';
import { DemoFrame, MockApp, StartButton } from './ui';

/** Inline tour declared in JSX: no createTour, steps are children. */
export function NonModalDemo() {
  return (
    <Tour.Root id="docs-declarative" modal={false}>
      <Tour.Step id="search" target="#decl-search" title="Declared in JSX">
        <p>
          {'<Tour.Step>'} children become the step content. This tour is non-modal: the page stays
          usable.
        </p>
      </Tour.Step>
      <Tour.Step id="new" target="#decl-new" title="Spotlight">
        <p>Tour.Spotlight is a plain element — here a ring styled with Tailwind.</p>
      </Tour.Step>
      <Tour.Step id="stat" target="#decl-stat-2" title="Indicators">
        <p>Tour.Indicators renders one button per visible step.</p>
      </Tour.Step>
      <DemoFrame title="Declarative · non-modal" actions={<StartButton />}>
        <MockApp id="decl" />
      </DemoFrame>
      <Tour.Portal>
        <TourSpotlight />
        <TourCard size="sm">
          <TourCardTitle />
          <div className="text-muted-foreground">
            <Tour.StepContent />
          </div>
          <TourCardFooter>
            <TourDots />
            <div className="flex gap-1">
              <TourCardPrev />
              <TourCardNext />
            </div>
          </TourCardFooter>
        </TourCard>
      </Tour.Portal>
    </Tour.Root>
  );
}
