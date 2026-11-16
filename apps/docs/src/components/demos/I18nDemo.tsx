import { createTour, type ReactStepDefinition, Tour, type TourMessages } from '@awesome-tour/react';
import { useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, MockApp, StartButton, worldButton } from './ui';

const ptBR: Partial<TourMessages> = {
  stepOf: (current, total) => `Passo ${current} de ${total}`,
  closeTour: 'Fechar tour',
  tourSteps: 'Passos do tour',
  goToStep: (index) => `Ir para o passo ${index}`,
};

const steps: Record<'en' | 'pt', ReactStepDefinition[]> = {
  en: [
    {
      id: 'nav',
      target: '#i18n-nav',
      side: 'right',
      title: 'Navigation',
      description: 'Every area of the app lives here.',
    },
    {
      id: 'search',
      target: '#i18n-search',
      title: 'Search',
      description: 'Find anything in your workspace.',
    },
    {
      id: 'new',
      target: '#i18n-new',
      title: 'Create a project',
      description: 'Projects group your reports.',
    },
  ],
  pt: [
    {
      id: 'nav',
      target: '#i18n-nav',
      side: 'right',
      title: 'Navegação',
      description: 'Todas as áreas do app ficam aqui.',
    },
    {
      id: 'search',
      target: '#i18n-search',
      title: 'Busca',
      description: 'Encontre qualquer coisa no workspace.',
    },
    {
      id: 'new',
      target: '#i18n-new',
      title: 'Criar um projeto',
      description: 'Projetos agrupam seus relatórios.',
    },
  ],
};

const tour = createTour({ id: 'docs-i18n', steps: steps.en });

export function I18nDemo() {
  const [lang, setLang] = useState<'en' | 'pt'>('pt');
  const pt = lang === 'pt';
  return (
    <Tour.Root tour={tour} messages={pt ? ptBR : undefined}>
      <DemoFrame
        title="Internationalization"
        actions={
          <>
            <fieldset className="flex items-center rounded-sm border-2 border-ink">
              <legend className="sr-only">Language</legend>
              {(['en', 'pt'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => {
                    setLang(l);
                    tour.setSteps(steps[l]);
                  }}
                  className={`${worldButton.secondary} h-8 rounded-none border-0 uppercase`}
                >
                  {l}
                </button>
              ))}
            </fieldset>
            <StartButton onClick={() => tour.setSteps(steps[lang])}>
              {pt ? 'Iniciar tour' : 'Start tour'}
            </StartButton>
          </>
        }
      >
        <MockApp id="i18n" />
      </DemoFrame>
      <TourPopover dots>
        <span className="sr-only">{pt ? 'Use as setas para navegar.' : 'Use the arrow keys.'}</span>
      </TourPopover>
    </Tour.Root>
  );
}
