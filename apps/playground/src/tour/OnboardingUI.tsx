import { useTourState } from '@awesome-tour/react';
import { UserRound } from 'lucide-react';
import { TourMotionPopover } from '@/components/awesome-tour/tour-motion';
import type { OnboardingData } from '../tours';

/** The main onboarding UI: the registry's animated popover with a "Skip tour" link. */
export function OnboardingUI() {
  const plan = useTourState((s) => (s.data as OnboardingData).plan);
  return (
    <TourMotionPopover skip>
      <p className="flex items-center gap-1.5 text-xs">
        <UserRound className="size-3.5" />
        Viewing as <span className="font-medium text-foreground">{plan} plan</span>
      </p>
    </TourMotionPopover>
  );
}
