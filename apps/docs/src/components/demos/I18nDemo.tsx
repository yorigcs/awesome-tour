import { createTour, type ReactStepDefinition, Tour, type TourMessages } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton, worldButton } from './ui';

const $ = parts('worldwide');

type Lang = 'en' | 'pt' | 'ar';

const messages: Record<Lang, Partial<TourMessages> | undefined> = {
  en: undefined,
  pt: {
    stepOf: (current, total) => `Passo ${current} de ${total}`,
    closeTour: 'Fechar tour',
    tourSteps: 'Passos do tour',
    goToStep: (index) => `Ir para o passo ${index}`,
  },
  ar: {
    stepOf: (current, total) => `الخطوة ${current} من ${total}`,
    closeTour: 'إغلاق الجولة',
    tourSteps: 'خطوات الجولة',
    goToStep: (index) => `انتقل إلى الخطوة ${index}`,
  },
};

const copy: Record<Lang, [string, string][]> = {
  en: [
    ['Transport', 'Play, stop and record. The counter reads bar · beat · step.'],
    ['The beat', 'Click a cell to add a hit. Each row is one bar.'],
    ['Mixer', 'Set each channel’s level with its knob, or with the arrow keys.'],
  ],
  pt: [
    ['Transporte', 'Toque, pare e grave. O contador mostra compasso · tempo · passo.'],
    ['A batida', 'Clique numa célula para adicionar um toque. Cada linha é um compasso.'],
    ['Mixer', 'Ajuste o volume de cada canal no knob ou com as setas.'],
  ],
  ar: [
    ['أدوات التشغيل', 'شغّل وأوقف وسجّل. العدّاد يعرض المازورة · النبضة · الخطوة.'],
    ['الإيقاع', 'انقر على خانة لإضافة ضربة. كل صف مازورة واحدة.'],
    ['المِكسر', 'اضبط مستوى كل قناة بالمقبض أو بمفاتيح الأسهم.'],
  ],
};

const targets = [$('transport'), $('sequencer'), $('mixer')];
const stepsFor = (lang: Lang): ReactStepDefinition[] =>
  copy[lang].map(([title, description], i) => ({
    id: ['transport', 'beat', 'mixer'][i]!,
    target: targets[i],
    // `start`/`end` sides would mirror too; here the card sits below or beside.
    side: i === 2 ? 'left' : 'bottom',
    title,
    description,
  }));

const tour = createTour({ id: 'docs-i18n', steps: stepsFor('pt') });

const LABELS: Record<Lang, string> = { en: 'EN', pt: 'PT', ar: 'عربي' };

export function I18nDemo() {
  const [lang, setLang] = useState<Lang>('pt');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <Tour.Root tour={tour} messages={messages[lang]} dir={dir}>
      <DemoFrame
        title="Internationalization"
        actions={
          <>
            <fieldset className="flex items-center rounded-sm border-2 border-ink">
              <legend className="sr-only">Language</legend>
              {(['en', 'pt', 'ar'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  lang={l}
                  aria-pressed={lang === l}
                  onClick={() => {
                    setLang(l);
                    tour.setSteps(stepsFor(l));
                  }}
                  className={`${worldButton.secondary} h-8 rounded-none border-0`}
                >
                  {LABELS[l]}
                </button>
              ))}
            </fieldset>
            <StartButton>
              {{ en: 'Start tour', pt: 'Iniciar tour', ar: 'ابدأ الجولة' }[lang]}
            </StartButton>
          </>
        }
        footer={
          lang === 'ar'
            ? 'Right to left: the card mirrors, and → goes back while ← goes forward.'
            : undefined
        }
      >
        <LoopworkApp scope="worldwide" layout="compact" dir={dir} lang={lang} />
      </DemoFrame>
      <div lang={lang} dir={dir}>
        <TourPopover dots />
      </div>
    </Tour.Root>
  );
}
