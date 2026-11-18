import { LoopworkApp, part } from '@loopwork';
import { HotspotHint } from '@/components/awesome-tour/hotspot';
import { DemoFrame } from './ui';

export function HotspotDemo() {
  return (
    <DemoFrame
      title="Hotspots"
      footer="Non-blocking: keep playing, tweak a knob, then open a beacon."
    >
      <LoopworkApp scope="hints" layout="compact">
        <HotspotHint
          target={part('hints', 'fx-slot')}
          title="New: tape saturation"
          beaconLabel="What’s new in drum effects"
          side="left"
        >
          Warm up the drum bus. Open the effects and switch on Tape.
        </HotspotHint>
        <HotspotHint
          target={part('hints', 'bpm')}
          title="Tip"
          label="Tip about the tempo"
          beaconLabel="Tip about the tempo"
          side="bottom"
        >
          Click the BPM and use ↑ ↓ to nudge the tempo by one.
        </HotspotHint>
      </LoopworkApp>
    </DemoFrame>
  );
}
