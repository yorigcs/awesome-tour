import { Tour } from '@awesome-tour/react';
import { Palette } from 'lucide-react';
import {
  TourCard,
  TourCardFooter,
  TourCardNext,
  TourCardPrev,
  TourCardTitle,
  TourDots,
  TourSpotlight,
} from '@/components/awesome-tour/tour';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** A second, non-modal tour declared entirely in JSX and animated with CSS only. */
export function CssTour() {
  return (
    <Tour.Root id="css-tour" modal={false}>
      <Tour.Step id="stats" target="#stats" title="Your numbers" side="bottom">
        <p>Declared with &lt;Tour.Step&gt;, animated with plain CSS (tw-animate-css).</p>
      </Tour.Step>
      <Tour.Step id="reports" target="#reports-card" title="Reports" side="top">
        <p>Non-modal tours leave the page usable.</p>
      </Tour.Step>
      <Card>
        <CardHeader>
          <CardTitle>Declarative tour</CardTitle>
          <CardDescription>
            Steps as JSX children, a spotlight ring, no motion library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tour.Trigger asChild>
            <Button variant="outline">
              <Palette />
              CSS-only tour
            </Button>
          </Tour.Trigger>
        </CardContent>
      </Card>
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
