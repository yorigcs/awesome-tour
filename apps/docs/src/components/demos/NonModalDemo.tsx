import { Tour } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import {
  TourCard,
  TourCardFooter,
  TourCardNext,
  TourCardPrev,
  TourCardTitle,
  TourDots,
  TourSpotlight,
} from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton } from './ui';

const $ = parts('jam');

/** Inline tour declared in JSX, non-modal: coach marks you read while you keep playing. */
export function NonModalDemo() {
  return (
    <Tour.Root id="docs-declarative" modal={false}>
      <Tour.Step id="play" target={$('play')} title="Keep it playing">
        <p>These tips don’t block anything. Hit play and keep editing while you read.</p>
      </Tour.Step>
      <Tour.Step id="hats" target={$('row-hat')} title="Hats on the off-beats">
        <p>Add hats on steps 3, 7, 11 and 15 and listen to the groove open up.</p>
      </Tour.Step>
      <Tour.Step id="bass" target={$('knob-bass')} side="left" title="Bring the bass up">
        <p>Around 60% sits under the kick without fighting it.</p>
      </Tour.Step>
      <DemoFrame title="Declarative · non-modal" actions={<StartButton />}>
        <LoopworkApp scope="jam" layout="compact" />
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
