import { TourDevtools } from '@awesome-tour/devtools';
import { Tour, TourProvider } from '@awesome-tour/react';
import { AppSidebar } from './layout/AppSidebar';
import { Topbar } from './layout/Topbar';
import { Page } from './pages';
import { router } from './router';
import { OnboardingUI } from './tour/OnboardingUI';
import { WhatsNewUI } from './tour/WhatsNew';
import { gettingStarted, impressions, onboarding, whatsNew } from './tours';

const TOURS = [onboarding, whatsNew];

export function App() {
  return (
    <TourProvider tours={TOURS} router={router} impressions={impressions}>
      <Tour.Root tourId="onboarding">
        <div className="grid min-h-svh md:grid-cols-[16rem_1fr]">
          <AppSidebar />
          <main className="flex min-w-0 flex-col">
            <Topbar />
            <div className="flex-1 p-4 md:p-6">
              <Page />
            </div>
          </main>
        </div>
        <OnboardingUI />
      </Tour.Root>
      <WhatsNewUI />
      {/* In an app: {import.meta.env.DEV && <TourDevtools />} — always on in the playground. */}
      <TourDevtools checklists={[gettingStarted]} position="bottom-right" />
    </TourProvider>
  );
}
