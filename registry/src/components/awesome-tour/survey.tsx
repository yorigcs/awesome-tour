'use client';

import { useTourMessages } from '@awesome-tour/react';
import { Survey, type SurveyInstance } from '@awesome-tour/react/surfaces';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SurveyCardProps {
  survey: SurveyInstance;
  /** Label of the last question's button. Default: "Submit". */
  submitLabel?: string;
  /** Low / high ends shown under the scale (the question's own labels win). */
  lowLabel?: string;
  highLabel?: string;
  /** Go to the next question as soon as a score is picked. Default: false. */
  autoAdvance?: boolean;
  className?: string;
}

/**
 * A corner card for NPS / CSAT / CES surveys with optional follow-up text questions.
 * Ambient by default (`variant: 'slideout'`): it never blocks the page.
 */
function SurveyCard({
  survey,
  submitLabel = 'Submit',
  lowLabel,
  highLabel,
  autoAdvance = false,
  className,
}: SurveyCardProps) {
  const { dismiss } = useTourMessages();
  return (
    <Survey.Root survey={survey}>
      <Survey.Portal>
        <Survey.Content
          data-slot="survey-card"
          className={cn(
            'fixed right-4 bottom-4 z-50 flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-4 rounded-xl border bg-popover p-5 text-sm text-popover-foreground shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            className,
          )}
        >
          <div className="flex items-start gap-3">
            <Survey.Prompt className="flex-1 text-base leading-snug font-semibold" />
            <Survey.Dismiss asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={dismiss}
                className="-mt-1 -mr-2 text-muted-foreground"
              >
                <X />
              </Button>
            </Survey.Dismiss>
          </div>

          <Survey.When type={['nps', 'csat', 'ces']}>
            <div className="flex flex-col gap-2">
              <Survey.Scale
                autoAdvance={autoAdvance}
                className="flex gap-1 [&>button]:h-9 [&>button]:min-w-0 [&>button]:flex-1 [&>button]:cursor-pointer [&>button]:rounded-md [&>button]:border [&>button]:bg-background [&>button]:text-sm [&>button]:font-medium [&>button]:tabular-nums [&>button]:transition-colors [&>button:hover]:bg-accent [&>button:focus-visible]:ring-[3px] [&>button:focus-visible]:ring-ring/50 [&>button:focus-visible]:outline-none [&>button[data-state=checked]]:border-primary [&>button[data-state=checked]]:bg-primary [&>button[data-state=checked]]:text-primary-foreground"
              />
              {(lowLabel || highLabel) && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{lowLabel}</span>
                  <span>{highLabel}</span>
                </div>
              )}
            </div>
          </Survey.When>

          <Survey.When type="text">
            <Survey.Comment
              rows={3}
              className="min-h-20 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Survey.When>

          <div className="flex items-center justify-between gap-2">
            <Survey.Progress className="text-xs text-muted-foreground tabular-nums">
              {({ current, total }) => (total > 1 ? `${current} of ${total}` : null)}
            </Survey.Progress>
            <div className="flex gap-1">
              <Survey.Back asChild>
                <Button variant="ghost" size="sm" className="data-disabled:hidden">
                  <ArrowLeft />
                  Back
                </Button>
              </Survey.Back>
              <SurveyNext submitLabel={submitLabel} />
            </div>
          </div>
        </Survey.Content>
      </Survey.Portal>
    </Survey.Root>
  );
}

function SurveyNext({ submitLabel }: { submitLabel: string }) {
  return (
    <Survey.Next asChild>
      <Button size="sm" className="group/next">
        <span className="group-data-last/next:hidden">Next</span>
        <ArrowRight className="group-data-last/next:hidden" />
        <span className="hidden group-data-last/next:inline">{submitLabel}</span>
        <Check className="hidden group-data-last/next:block" />
      </Button>
    </Survey.Next>
  );
}

export { SurveyCard };
