import { Hotspot } from '@awesome-tour/react';
import { Frame } from './ui';

export function HotspotDemo() {
  return (
    <Frame title="Hotspots" footer="Non-blocking: the page stays fully usable. Click a beacon.">
      <div className="at-grid">
        <div id="hotspot-reports" className="at-tile" style={{ position: 'relative' }}>
          <small>Reports</small>Export as PDF
          <Hotspot.Root target="#hotspot-reports">
            <Hotspot.Beacon className="at-beacon" aria-label="What's new in reports" />
            <Hotspot.Portal>
              <Hotspot.Content className="at-card at-hotspot" side="bottom" sideOffset={10}>
                <span>
                  <strong>New:</strong> export any report as PDF.
                </span>
                <Hotspot.Close className="at-icon-button" aria-label="Close hint">
                  ✕
                </Hotspot.Close>
              </Hotspot.Content>
            </Hotspot.Portal>
          </Hotspot.Root>
        </div>
        <div id="hotspot-team" className="at-tile" style={{ position: 'relative' }}>
          <small>Team</small>Invite people
          <Hotspot.Root target="#hotspot-team">
            <Hotspot.Beacon className="at-beacon" aria-label="Tip about invites" />
            <Hotspot.Portal>
              <Hotspot.Content className="at-card at-hotspot" side="bottom" sideOffset={10}>
                <span>Invites expire after 7 days.</span>
                <Hotspot.Close className="at-icon-button" aria-label="Close hint">
                  ✕
                </Hotspot.Close>
              </Hotspot.Content>
            </Hotspot.Portal>
          </Hotspot.Root>
        </div>
      </div>
    </Frame>
  );
}
