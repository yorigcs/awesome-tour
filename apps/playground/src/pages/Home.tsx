import { useStoreSelector, useTourState } from '@awesome-tour/react';
import { Arrangement, Sequencer } from '@loopwork';
import { Gauge } from 'lucide-react';
import { AnnouncementBanner } from '@/components/awesome-tour/announcement';
import { HotspotHint } from '@/components/awesome-tour/hotspot';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CssTour } from '../tour/CssTour';
import { eventLog, type OnboardingData, stemsBanner } from '../tours';
import { PageHeader } from '.';

function AnalyticsLog() {
  const events = useStoreSelector(eventLog, (s) => s.events);
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Analytics events</CardTitle>
        <CardDescription>
          What the analytics plugin would send to PostHog / Segment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-1.5 text-sm" data-testid="event-log">
          {events.length === 0 && (
            <li className="text-muted-foreground">Start a tour to see events.</li>
          )}
          {events.map((e) => (
            <li key={`${e.timestamp}-${e.type}-${e.stepId}`} className="flex items-center gap-2">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{e.type}</code>
              {e.stepId && <span className="text-muted-foreground">{e.stepId}</span>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function Home() {
  const plan = useTourState((s) => (s.data as OnboardingData).plan);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="night-drive"
        description="8 bars at 92 BPM. Sketch the beat, then arrange it."
      />
      <AnnouncementBanner
        announcement={stemsBanner}
        actionLabel="Open Mix"
        snooze={60 * 60 * 1000}
      />
      <Card id="arrangement-card" className="gap-0 overflow-hidden py-0">
        <Arrangement />
      </Card>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card id="sequencer-card" className="relative gap-0 py-0">
          <Sequencer />
          <HotspotHint target="#sequencer-card" title="New: swing per row">
            Give the hats their own shuffle while the kick stays straight.
          </HotspotHint>
        </Card>
        {plan === 'pro' && (
          <Card id="mastering-panel">
            <CardHeader>
              <CardTitle>Mastering</CardTitle>
              <CardDescription>Loudness targets for every platform.</CardDescription>
              <CardAction>
                <Badge variant="secondary">
                  <Gauge aria-hidden="true" />
                  Pro
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Only Pro plans see this panel — and the onboarding step that points at it.
            </CardContent>
          </Card>
        )}
        <CssTour />
        <AnalyticsLog />
      </section>
    </div>
  );
}
