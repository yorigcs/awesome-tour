import { FileDown, UserPlus } from 'lucide-react';
import { HotspotHint } from '@/components/awesome-tour/hotspot';
import { Button } from '@/components/ui/button';
import { AppSurface, DemoFrame } from './ui';

export function HotspotDemo() {
  return (
    <DemoFrame title="Hotspots" footer="Non-blocking: the page stays fully usable. Click a beacon.">
      <AppSurface className="grid gap-3 sm:grid-cols-2">
        <div id="hotspot-reports" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div>
            <p className="font-medium">Reports</p>
            <p className="text-muted-foreground">Weekly summaries for your team.</p>
          </div>
          <Button variant="outline" size="sm" className="self-start">
            <FileDown />
            Export
          </Button>
          <HotspotHint
            target="#hotspot-reports"
            title="New: PDF export"
            beaconLabel="What's new in reports"
            side="bottom"
          >
            Export any report as a PDF, ready to share.
          </HotspotHint>
        </div>
        <div id="hotspot-team" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div>
            <p className="font-medium">Team</p>
            <p className="text-muted-foreground">8 members · 2 pending invites</p>
          </div>
          <Button variant="outline" size="sm" className="self-start">
            <UserPlus />
            Invite people
          </Button>
          <HotspotHint
            target="#hotspot-team"
            title="Tip"
            label="Tip about invites"
            beaconLabel="Tip about invites"
            side="bottom"
          >
            Invites expire after 7 days.
          </HotspotHint>
        </div>
      </AppSurface>
    </DemoFrame>
  );
}
