import { TourProvider, useTourManager } from '@awesome-tour/react';
import { createSurvey, npsCategory, type SurveyAnswers } from '@awesome-tour/react/surfaces';
import { MessageSquareHeart } from 'lucide-react';
import { useState } from 'react';
import { SurveyCard } from '@/components/awesome-tour/survey';
import { AppSurface, DemoFrame, worldButton } from './ui';

let report: (answers: SurveyAnswers) => void = () => {};

const survey = createSurvey({
  id: 'docs-nps',
  questions: [
    { id: 'score', type: 'nps', prompt: 'How likely are you to recommend Acme to a colleague?' },
    {
      id: 'reason',
      type: 'text',
      prompt: 'What would make it a 10?',
      placeholder: 'Optional',
      optional: true,
      when: (answers) => Number(answers.score) < 9,
    },
  ],
  onSubmit: (answers) => report(answers),
});

function Ask() {
  const manager = useTourManager();
  return (
    <button
      type="button"
      className={worldButton.primary}
      onClick={() => void manager.start(survey.id, { force: true })}
    >
      <MessageSquareHeart aria-hidden="true" />
      Ask for feedback
    </button>
  );
}

export function SurveyDemo() {
  const [answers, setAnswers] = useState<SurveyAnswers | null>(null);
  report = setAnswers;
  const score = typeof answers?.score === 'number' ? answers.score : null;
  return (
    <TourProvider tours={[survey]}>
      <DemoFrame
        title="Surveys"
        actions={<Ask />}
        footer={
          <span aria-live="polite">
            {answers
              ? `onSubmit(${JSON.stringify(answers)})${score != null ? ` → ${npsCategory(score)}` : ''}`
              : 'Pick a score below 9 to get the follow-up question.'}
          </span>
        }
      >
        <AppSurface className="min-h-40 text-muted-foreground">
          The survey opens in the corner as a non-modal panel: the page stays usable.
        </AppSurface>
      </DemoFrame>
      <SurveyCard survey={survey} lowLabel="Not likely" highLabel="Very likely" />
    </TourProvider>
  );
}
