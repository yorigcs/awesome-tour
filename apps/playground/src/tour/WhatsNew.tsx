import { Tour, useTour } from '@awesome-tour/react';
import { BellRing } from 'lucide-react';
import {
  TourCard,
  TourCardDescription,
  TourCardFooter,
  TourCardTitle,
  TourSpotlight,
} from '@/components/awesome-tour/tour';
import { Button } from '@/components/ui/button';
import { whatsNew } from '../tours';

const DAY = 24 * 60 * 60 * 1000;

function Actions() {
  const { tour } = useTour();
  return (
    <TourCardFooter>
      <Button variant="ghost" size="sm" onClick={() => tour.snooze(DAY)}>
        Remind me tomorrow
      </Button>
      <Button size="sm" onClick={() => tour.complete()}>
        Got it
      </Button>
    </TourCardFooter>
  );
}

/** "What's new": started by its display rules, not by a button. */
export function WhatsNewUI() {
  return (
    <Tour.Root tour={whatsNew}>
      <Tour.Portal>
        <TourSpotlight />
        <TourCard size="sm">
          <span className="flex items-center gap-2 text-xs font-medium text-primary">
            <BellRing className="size-3.5" aria-hidden="true" />
            What's new
          </span>
          <TourCardTitle />
          <TourCardDescription />
          <Actions />
        </TourCard>
      </Tour.Portal>
    </Tour.Root>
  );
}
