import { TourProvider, useTourManager } from '@awesome-tour/react';
import { createAnnouncement } from '@awesome-tour/react/surfaces';
import { BellRing, PanelTop, Sparkles } from 'lucide-react';
import {
  AnnouncementBanner,
  AnnouncementModal,
  AnnouncementToast,
} from '@/components/awesome-tour/announcement';
import { AppSurface, DemoFrame, worldButton } from './ui';

const banner = createAnnouncement({
  id: 'docs-banner',
  title: 'Weekly reports are here',
  description: 'A summary of your projects, every Monday.',
});

const toast = createAnnouncement({
  id: 'docs-toast',
  variant: 'toast',
  title: 'Export finished',
  description: 'q3-report.pdf is ready to download.',
  autoDismiss: 6000,
});

const modal = createAnnouncement({
  id: 'docs-modal',
  variant: 'modal',
  title: 'Meet dashboards 2.0',
  description: 'Drag widgets anywhere, share a live link, and pin the numbers that matter.',
});

function Controls() {
  const manager = useTourManager();
  const show = (id: string) => void manager.start(id, { force: true });
  return (
    <>
      <button type="button" className={worldButton.secondary} onClick={() => show('docs-banner')}>
        <PanelTop aria-hidden="true" />
        Banner
      </button>
      <button type="button" className={worldButton.secondary} onClick={() => show('docs-toast')}>
        <BellRing aria-hidden="true" />
        Toast
      </button>
      <button type="button" className={worldButton.primary} onClick={() => show('docs-modal')}>
        <Sparkles aria-hidden="true" />
        Modal
      </button>
    </>
  );
}

export function AnnouncementDemo() {
  return (
    <TourProvider tours={[banner, toast, modal]}>
      <DemoFrame title="Announcements" actions={<Controls />}>
        <AppSurface className="flex min-h-48 flex-col gap-3">
          <AnnouncementBanner announcement={banner} actionLabel="Set up" snooze={60_000} />
          <p className="text-muted-foreground">
            Banners render in place; toasts and modals are portalled. Banners and toasts are ambient
            (they show alongside a tour), modals queue behind one.
          </p>
        </AppSurface>
      </DemoFrame>
      <AnnouncementToast announcement={toast} />
      <AnnouncementModal
        announcement={modal}
        actionLabel="Take a look"
        media={
          <div className="flex h-32 items-end gap-2 bg-muted p-4" aria-hidden="true">
            {[40, 70, 55, 90, 65, 80].map((h) => (
              <span
                key={h}
                className="flex-1 rounded-t bg-primary/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        }
      />
    </TourProvider>
  );
}
