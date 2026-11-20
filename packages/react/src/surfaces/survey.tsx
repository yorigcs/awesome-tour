import { createTour, type Tour as TourInstance, type TourOptions } from '@awesome-tour/core';
import * as React from 'react';
import { type LocalizedNode, type ReactStepDefinition, useTourContext } from '../context';
import { useStoreSelector } from '../hooks';
import { useLocalize, useTourMessages } from '../messages';

/** Plain text of a node, for accessible names (undefined when it isn't text). */
const textOf = (node: React.ReactNode) => (typeof node === 'string' ? node : undefined);

import { Portal, Tour, type TourRootProps } from '../tour';
import { composeEventHandlers } from '../utils/compose';
import { Primitive, type PrimitiveProps } from '../utils/primitive';
import { SurfaceContent, type SurfaceVariant } from './surface';

export type SurveyAnswers = Record<string, number | string | undefined>;

interface QuestionBase {
  id: string;
  /** The question, shown by `Survey.Prompt`. */
  prompt: LocalizedNode;
  /** Ask only when this returns true (e.g. a follow-up for low scores). */
  when?: (answers: SurveyAnswers) => boolean;
  /** Allow moving on without an answer. Default: false. */
  optional?: boolean;
}

export type SurveyQuestion =
  /** Net Promoter Score: 0–10. */
  | (QuestionBase & { type: 'nps'; lowLabel?: string; highLabel?: string })
  /** Customer satisfaction: 1–5 by default. */
  | (QuestionBase & { type: 'csat'; max?: number; lowLabel?: string; highLabel?: string })
  /** Customer effort: 1–7. */
  | (QuestionBase & { type: 'ces'; lowLabel?: string; highLabel?: string })
  /** Free text. */
  | (QuestionBase & { type: 'text'; placeholder?: string });

export function scaleOf(q: SurveyQuestion): { min: number; max: number } | null {
  if (q.type === 'nps') return { min: 0, max: 10 };
  if (q.type === 'csat') return { min: 1, max: q.max ?? 5 };
  if (q.type === 'ces') return { min: 1, max: 7 };
  return null;
}

/** NPS category of a 0–10 score. */
export function npsCategory(score: number): 'detractor' | 'passive' | 'promoter' {
  return score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';
}

export interface SurveyData {
  answers: SurveyAnswers;
}

export interface SurveyOptions
  extends Omit<
    TourOptions<ReactStepDefinition<SurveyData>, SurveyData>,
    'steps' | 'layer' | 'data'
  > {
  questions: readonly SurveyQuestion[];
  /** Default: `slideout` (ambient). `modal` is blocking. */
  variant?: Extract<SurfaceVariant, 'slideout' | 'modal' | 'banner'>;
  /** Called with the answers when the last question is submitted. */
  onSubmit?: (answers: SurveyAnswers) => void | Promise<void>;
}

export type Survey = TourInstance<ReactStepDefinition<SurveyData>, SurveyData> & {
  readonly questions: readonly SurveyQuestion[];
  /** Record an answer for a question (the parts call it for you). */
  answer(questionId: string, value: number | string | undefined): void;
};

/**
 * A survey is a tour with one step per question, so it gets display rules, triggers, snooze,
 * impressions, persistence, progress and analytics. Answers live in `tour.data.answers`
 * (analytics' `includeData` sends them); `onSubmit` receives them when the last step completes.
 */
export function createSurvey(options: SurveyOptions): Survey {
  const { questions, variant = 'slideout', onSubmit, ...rest } = options;
  const answered = (q: SurveyQuestion) => (ctx: { data: SurveyData }) =>
    q.optional || (ctx.data.answers[q.id] !== undefined && ctx.data.answers[q.id] !== '');
  const tour = createTour<ReactStepDefinition<SurveyData>, SurveyData>({
    modal: variant === 'modal',
    ...rest,
    layer: variant === 'modal' ? 'blocking' : 'ambient',
    data: { answers: {} },
    steps: questions.map((q) => ({
      id: q.id,
      title: q.prompt,
      meta: { variant, question: q },
      canNext: answered(q),
      ...(q.when ? { when: (ctx) => q.when!(ctx.data.answers) } : {}),
    })),
  });
  tour.on('complete', () => {
    Promise.resolve()
      .then(() => onSubmit?.(tour.getState().data.answers))
      .catch((error) => console.error('[awesome-tour] survey onSubmit failed', error));
  });
  // A new run starts with blank answers.
  tour.on('start', () => tour.setData((d) => ({ ...d, answers: {} })));
  return Object.assign(tour, {
    questions,
    answer(questionId: string, value: number | string | undefined) {
      tour.setData((d) => ({ ...d, answers: { ...d.answers, [questionId]: value } }));
    },
  });
}

/* -----------------------------------------------------------------------------------------------*/

function useSurvey(name: string) {
  const ctx = useTourContext(name);
  const survey = ctx.tour as Survey;
  const question = ctx.step?.meta?.question as SurveyQuestion | undefined;
  const value = useStoreSelector(survey, (s) =>
    question ? (s.data as SurveyData).answers[question.id] : undefined,
  );
  return { ...ctx, survey, question, value };
}

export interface SurveyRootProps
  extends Omit<TourRootProps, 'tour' | 'tourId' | 'id' | 'steps' | 'plugins' | 'data'> {
  survey: Survey;
}

function SurveyRoot({ survey, ...props }: SurveyRootProps) {
  return <Tour.Root tour={survey} {...props} />;
}

export interface SurveyScaleProps extends Omit<PrimitiveProps<'div'>, 'children'> {
  /** Go to the next question as soon as a value is picked. Default: false. */
  autoAdvance?: boolean;
  /** Render each option yourself (the radio semantics stay on the button). */
  children?: (option: { value: number; checked: boolean }) => React.ReactNode;
}

/**
 * The rating for the current question: a radio group of buttons (`role="radio"`), arrow keys move
 * and pick. Each option has `data-state="checked|unchecked"` and `data-value`.
 */
const SurveyScale = React.forwardRef<HTMLDivElement, SurveyScaleProps>(function SurveyScale(
  { autoAdvance = false, children, ...props },
  ref,
) {
  const localizeText = useLocalize();
  const { survey, question, value, dir } = useSurvey('<Survey.Scale>');
  const messages = useTourMessages();
  const scale = question ? scaleOf(question) : null;
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([]);
  if (!question || !scale) return null;
  const options = Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);
  const low = 'lowLabel' in question ? question.lowLabel : undefined;
  const high = 'highLabel' in question ? question.highLabel : undefined;
  const pick = (v: number) => {
    survey.answer(question.id, v);
    if (autoAdvance) queueMicrotask(() => void survey.next());
  };
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    const delta =
      event.key === forward || event.key === 'ArrowDown'
        ? 1
        : event.key === backward || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!delta) return;
    // Keep arrows inside the scale (the tour's own arrow keys don't fire here).
    event.preventDefault();
    event.stopPropagation();
    const next = (index + delta + options.length) % options.length;
    buttons.current[next]?.focus();
    survey.answer(question.id, options[next]);
  };
  const focusable = typeof value === 'number' ? value : options[0];
  return (
    <Primitive.div
      role="radiogroup"
      aria-label={textOf(localizeText(question.prompt))}
      data-type={question.type}
      {...props}
      ref={ref}
    >
      {options.map((v, i) => {
        const checked = value === v;
        const edge =
          i === 0
            ? (low ?? (question.type === 'nps' ? messages.scaleLow : undefined))
            : i === options.length - 1
              ? (high ?? (question.type === 'nps' ? messages.scaleHigh : undefined))
              : undefined;
        return (
          <button
            key={v}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={edge ? `${v}, ${edge}` : String(v)}
            tabIndex={v === focusable ? 0 : -1}
            data-state={checked ? 'checked' : 'unchecked'}
            data-value={v}
            onClick={() => pick(v)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {children ? children({ value: v, checked }) : v}
          </button>
        );
      })}
    </Primitive.div>
  );
});

/** The free-text answer for a `text` question (a `textarea`). */
const SurveyComment = React.forwardRef<HTMLTextAreaElement, PrimitiveProps<'textarea'>>(
  function SurveyComment({ onChange, ...props }, ref) {
    const { survey, question, value } = useSurvey('<Survey.Comment>');
    const localizeText = useLocalize();
    if (question?.type !== 'text') return null;
    return (
      <Primitive.textarea
        aria-label={textOf(localizeText(question.prompt))}
        placeholder={question.placeholder}
        value={typeof value === 'string' ? value : ''}
        {...props}
        ref={ref}
        onChange={composeEventHandlers(onChange, (e: React.ChangeEvent<HTMLTextAreaElement>) =>
          survey.answer(question.id, e.target.value),
        )}
      />
    );
  },
);

/** Dismisses the survey (counts as dismissed for `once`). */
const SurveyDismiss = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(
  function SurveyDismiss({ onClick, ...props }, ref) {
    const { tour } = useTourContext('<Survey.Dismiss>');
    const { dismiss } = useTourMessages();
    return (
      <Primitive.button
        type="button"
        aria-label={props.children ? undefined : dismiss}
        {...props}
        ref={ref}
        onClick={composeEventHandlers(onClick, () => tour.close())}
      />
    );
  },
);

/** Renders its children only for questions of the given types (e.g. a scale vs a comment). */
function SurveyWhen({
  type,
  children,
}: {
  type: SurveyQuestion['type'] | SurveyQuestion['type'][];
  children: React.ReactNode;
}) {
  const { question } = useSurvey('<Survey.When>');
  const types = Array.isArray(type) ? type : [type];
  return question && types.includes(question.type) ? children : null;
}

export const Survey = {
  Root: SurveyRoot,
  Portal,
  Content: SurfaceContent,
  /** The current question's prompt (a heading that labels the survey). */
  Prompt: Tour.Title,
  Description: Tour.Description,
  Scale: SurveyScale,
  Comment: SurveyComment,
  When: SurveyWhen,
  Progress: Tour.Progress,
  Back: Tour.Prev,
  /** Next question; on the last one, submits. Disabled until the question is answered. */
  Next: Tour.Next,
  Dismiss: SurveyDismiss,
};

export { SurveyComment, SurveyDismiss, SurveyRoot, SurveyScale, SurveyWhen };
