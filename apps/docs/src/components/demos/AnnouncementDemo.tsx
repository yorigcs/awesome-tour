import { TourProvider, useTourManager } from '@awesome-tour/react';
import { createAnnouncement } from '@awesome-tour/react/surfaces';
import { LoopworkApp, useCreateLoopwork, useLoopwork } from '@loopwork';
import { BellRing, PanelTop, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import {
  AnnouncementBanner,
  AnnouncementModal,
  AnnouncementToast,
} from '@/components/awesome-tour/announcement';
import { DemoFrame, worldButton } from './ui';

const banner = createAnnouncement({
  id: 'docs-banner',
  title: 'Stems export is here',
  description: 'Bounce one file per channel and finish the mix anywhere.',
});

const toast = createAnnouncement({
  id: 'docs-toast',
  variant: 'toast',
  title: 'Bounce finished',
  description: 'night-drive.wav is ready to download.',
  autoDismiss: 6000,
});

const modal = createAnnouncement({
  id: 'docs-modal',
  variant: 'modal',
  title: 'Loopwork 2.4: swing per row',
  description: 'Give the hats their own shuffle while the kick stays straight.',
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

/** Swing preview for the modal's media slot: hats drift late on the off-beats. */
function SwingArt() {
  return (
    <div className="grid grid-cols-16 gap-1 bg-muted p-4" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid
          key={i}
          className={`h-10 rounded-sm ${i % 2 ? 'translate-x-1 bg-[var(--chart-1)]' : 'bg-foreground/80'}`}
        />
      ))}
    </div>
  );
}

/** The app announces a finished bounce itself: the toast is wired to its event. */
function BounceToast() {
  const manager = useTourManager();
  const status = useLoopwork((s) => s.export.status);
  useEffect(() => {
    if (status === 'done') void manager.start('docs-toast', { force: true });
  }, [status, manager]);
  return null;
}

export function AnnouncementDemo() {
  const app = useCreateLoopwork({ route: 'mix' });
  return (
    <TourProvider tours={[banner, toast, modal]}>
      <DemoFrame
        title="Announcements"
        actions={<Controls />}
        footer="Banners render in place; toasts and modals are portalled. Bounce the loop: the app raises the toast itself."
      >
        <LoopworkApp scope="news" app={app} layout="routed">
          <div className="order-first">
            <AnnouncementBanner announcement={banner} actionLabel="Try it" snooze={60_000} />
          </div>
          <BounceToast />
        </LoopworkApp>
      </DemoFrame>
      <AnnouncementToast announcement={toast} />
      <AnnouncementModal announcement={modal} actionLabel="Open the grid" media={<SwingArt />} />
    </TourProvider>
  );
}
