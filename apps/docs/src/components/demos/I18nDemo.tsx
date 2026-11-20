import { createTour, Tour, type TourMessages } from '@awesome-tour/react';
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

// One tour, its text in three languages: the Root's `locale` picks one (or `<html lang>`).
const tour = createTour({
  id: 'docs-i18n',
  steps: [
    {
      id: 'transport',
      target: $('transport'),
      title: { en: 'Transport', pt: 'Transporte', ar: 'أدوات التشغيل' },
      description: {
        en: 'Play, stop and record. The counter reads bar · beat · step.',
        pt: 'Toque, pare e grave. O contador mostra compasso · tempo · passo.',
        ar: 'شغّل وأوقف وسجّل. العدّاد يعرض المازورة · النبضة · الخطوة.',
      },
    },
    {
      id: 'beat',
      target: $('sequencer'),
      title: { en: 'The beat', pt: 'A batida', ar: 'الإيقاع' },
      description: {
        en: 'Click a cell to add a hit. Each row is one bar.',
        pt: 'Clique numa célula para adicionar um toque. Cada linha é um compasso.',
        ar: 'انقر على خانة لإضافة ضربة. كل صف مازورة واحدة.',
      },
    },
    {
      id: 'mixer',
      target: $('mixer'),
      // `start` is the left in LTR and the right in RTL.
      side: 'start',
      title: { en: 'Mixer', pt: 'Mixer', ar: 'المِكسر' },
      description: {
        en: 'Set each channel’s level with its knob, or with the arrow keys.',
        pt: 'Ajuste o volume de cada canal no knob ou com as setas.',
        ar: 'اضبط مستوى كل قناة بالمقبض أو بمفاتيح الأسهم.',
      },
    },
  ],
});

const LABELS: Record<Lang, string> = { en: 'EN', pt: 'PT', ar: 'عربي' };

export function I18nDemo() {
  const [lang, setLang] = useState<Lang>('pt');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <Tour.Root tour={tour} messages={messages[lang]} dir={dir} locale={lang}>
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
                  onClick={() => setLang(l)}
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
