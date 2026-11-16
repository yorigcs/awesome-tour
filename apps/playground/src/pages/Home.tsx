import { useStoreSelector, useTourState } from '@awesome-tour/react';
import { Activity, CreditCard, ShieldCheck, TrendingUp, Users } from 'lucide-react';
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
import { eventLog, type OnboardingData, reportsBanner } from '../tours';
import { PageHeader } from '.';

const STATS = [
  { label: 'Revenue', value: '$48,210', delta: '+12.4% from last month', icon: CreditCard },
  { label: 'Active users', value: '1,284', delta: '+3.1% from last month', icon: Users },
  { label: 'Conversion', value: '4.7%', delta: '+0.6% from last month', icon: Activity },
];

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
  const role = useTourState((s) => (s.data as OnboardingData).role);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Welcome back — here's what happened this week." />
      <AnnouncementBanner
        announcement={reportsBanner}
        actionLabel="Set up"
        snooze={60 * 60 * 1000}
      />
      <section id="stats" className="grid gap-4 sm:grid-cols-3">
        {STATS.map(({ label, value, delta, icon: Icon }, i) => (
          <Card key={label} id={`stat-${i + 1}`} className="gap-2">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardAction>
                <Icon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />
                {delta}
              </span>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card id="reports-card" className="relative">
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Weekly summaries for your team.</CardDescription>
            <CardAction>
              <Badge variant="secondary">New</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sales, retention and usage reports are generated every Monday.
          </CardContent>
          <HotspotHint target="#reports-card" title="New: reports">
            Export any report as a PDF, ready to share.
          </HotspotHint>
        </Card>
        {role === 'admin' && (
          <Card id="admin-panel">
            <CardHeader>
              <CardTitle>Admin</CardTitle>
              <CardDescription>Members, billing and audit log.</CardDescription>
              <CardAction>
                <ShieldCheck className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Only admins see this card — and the onboarding step that points at it.
            </CardContent>
          </Card>
        )}
        <CssTour />
        <AnalyticsLog />
      </section>
    </div>
  );
}
