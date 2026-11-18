import { TourDevtools } from '@awesome-tour/devtools';
import { Tour, TourProvider, useTourManager } from '@awesome-tour/react';
import { LoopworkProvider, Transport } from '@loopwork';
import { useEffect } from 'react';
import { SurveyCard } from '@/components/awesome-tour/survey';
import { AppSidebar } from './layout/AppSidebar';
import { Topbar } from './layout/Topbar';
import { Page } from './pages';
import { router } from './router';
import { studio } from './studio';
import { OnboardingUI } from './tour/OnboardingUI';
import { WhatsNewUI } from './tour/WhatsNew';
import {
  feedbackSurvey,
  gettingStarted,
  impressions,
  onboarding,
  stemsBanner,
  whatsNew,
} from './tours';

const TOURS = [onboarding, whatsNew, stemsBanner, feedbackSurvey];

/** Ask for feedback right after the product tour is completed. */
function SurveyAfterOnboarding() {
  const manager = useTourManager();
  useEffect(
    () => onboarding.on('complete', () => manager.signal('onboarding-complete')),
    [manager],
  );
  return <SurveyCard survey={feedbackSurvey} lowLabel="Not likely" highLabel="Very likely" />;
}

export function App() {
  return (
    <TourProvider tours={TOURS} router={router} impressions={impressions}>
      <LoopworkProvider app={studio} scope="root">
        <Tour.Root tourId="onboarding">
          <div data-app="" className="@container grid min-h-svh md:grid-cols-[16rem_1fr]">
            <AppSidebar />
            <main className="flex min-w-0 flex-col">
              <Topbar />
              <Transport />
              <div className="flex-1 p-4 md:p-6">
                <Page />
              </div>
            </main>
          </div>
          <OnboardingUI />
        </Tour.Root>
      </LoopworkProvider>
      <WhatsNewUI />
      <SurveyAfterOnboarding />
      {/* In an app: {import.meta.env.DEV && <TourDevtools />} — always on in the playground. */}
      <TourDevtools checklists={[gettingStarted]} position="bottom-right" />
    </TourProvider>
  );
}
