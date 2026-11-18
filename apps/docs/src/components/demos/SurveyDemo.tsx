import { TourProvider, useTourManager } from '@awesome-tour/react';
import { createSurvey, type SurveyAnswers } from '@awesome-tour/react/surfaces';
import { LoopworkApp, useCreateLoopwork, useLoopwork } from '@loopwork';
import { useEffect, useState } from 'react';
import { SurveyCard } from '@/components/awesome-tour/survey';
import { DemoFrame } from './ui';

let report: (answers: SurveyAnswers) => void = () => {};

const survey = createSurvey({
  id: 'docs-csat',
  questions: [
    { id: 'sound', type: 'csat', prompt: 'How did the bounce sound?' },
    {
      id: 'off',
      type: 'text',
      prompt: 'What sounded off?',
      placeholder: 'Too quiet, clipping, muddy low end…',
      optional: true,
      when: (answers) => Number(answers.sound) <= 3,
    },
  ],
  onSubmit: (answers) => report(answers),
});

/** Asks right after the moment it's about: the first finished bounce. */
function AskAfterBounce() {
  const manager = useTourManager();
  const status = useLoopwork((s) => s.export.status);
  useEffect(() => {
    if (status === 'done') void manager.start(survey.id, { force: true });
  }, [status, manager]);
  return null;
}

export function SurveyDemo() {
  const [answers, setAnswers] = useState<SurveyAnswers | null>(null);
  report = setAnswers;
  const app = useCreateLoopwork({ route: 'mix' });
  return (
    <TourProvider tours={[survey]}>
      <DemoFrame
        title="Surveys"
        footer={
          <span aria-live="polite">
            {answers
              ? `onSubmit(${JSON.stringify(answers)})`
              : 'Hit Bounce. Rate it 3 or lower to get the follow-up question.'}
          </span>
        }
      >
        <LoopworkApp scope="feedback" app={app} layout="routed">
          <AskAfterBounce />
        </LoopworkApp>
      </DemoFrame>
      <SurveyCard survey={survey} lowLabel="Rough" highLabel="Release-ready" />
    </TourProvider>
  );
}
