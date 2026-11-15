import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Checklist,
  createChecklist,
  createTour,
  defaultKeyMap,
  getSpotlightPath,
  Hotspot,
  keyAction,
  Tour,
  TourProvider,
} from '../src';

describe('getSpotlightPath', () => {
  const rect = { x: 10, y: 20, width: 100, height: 40, top: 20, left: 10, right: 110, bottom: 60 };
  it('draws one hole per rect', () => {
    const one = getSpotlightPath(rect, 4);
    const two = getSpotlightPath([rect, { ...rect, x: 200, left: 200, right: 300 }], 4);
    expect(two.split('Z').length).toBe(one.split('Z').length + 1);
  });
  it('draws a circle around the rect', () => {
    const path = getSpotlightPath(rect, 0, 'circle');
    const r = Math.hypot(100, 40) / 2;
    expect(path).toContain(`A${r} ${r}`);
  });
  it('is just the outer area without targets', () => {
    expect(getSpotlightPath(null)).toBe('M-99999 -99999H99999V99999H-99999Z');
  });
});

describe('keyAction', () => {
  it('maps arrows, Home and End', () => {
    expect(keyAction(defaultKeyMap, 'ArrowRight')).toBe('next');
    expect(keyAction(defaultKeyMap, 'ArrowLeft')).toBe('prev');
    expect(keyAction(defaultKeyMap, 'Home')).toBe('first');
    expect(keyAction(defaultKeyMap, 'End')).toBe('last');
    expect(keyAction(defaultKeyMap, 'x')).toBeNull();
  });
  it('mirrors arrows in RTL', () => {
    expect(keyAction(defaultKeyMap, 'ArrowLeft', 'rtl')).toBe('next');
    expect(keyAction(defaultKeyMap, 'ArrowRight', 'rtl')).toBe('prev');
  });
  it('accepts custom keys', () => {
    expect(keyAction({ ...defaultKeyMap, next: ['j'] }, 'j')).toBe('next');
  });
});

describe('messages', () => {
  it('translates announcements and accessible names', async () => {
    const tour = createTour({ id: 'i18n', steps: [{ id: 'a', title: 'Olá' }, { id: 'b' }] });
    const checklist = createChecklist({ id: 'c', items: [{ id: 'x' }] });
    render(
      <TourProvider
        messages={{
          stepOf: (c, t) => `Passo ${c} de ${t}`,
          closeTour: 'Fechar tour',
          showHint: 'Mostrar dica',
          checklistProgress: 'Progresso',
          itemStatus: { pending: 'Pendente' },
        }}
      >
        <Tour.Root tour={tour}>
          <Tour.Portal>
            <Tour.Content>
              <Tour.Title />
              <Tour.Close />
            </Tour.Content>
          </Tour.Portal>
        </Tour.Root>
        <Hotspot.Root target={null as never}>
          <Hotspot.Beacon />
        </Hotspot.Root>
        <Checklist.Root checklist={checklist}>
          <Checklist.Progress />
          <Checklist.List>
            <Checklist.Item value="x">
              <Checklist.ItemIndicator />
            </Checklist.Item>
          </Checklist.List>
        </Checklist.Root>
      </TourProvider>,
    );
    await act(() => tour.start());
    expect(screen.getByRole('button', { name: 'Fechar tour' })).toBeTruthy();
    expect(document.querySelector('[data-tour-announcer]')?.textContent).toBe('Passo 1 de 2');
    expect(screen.getByRole('progressbar', { name: 'Progresso' })).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
  });

  it('lets a Tour.Root override the provider', async () => {
    const tour = createTour({ id: 'i18n-2', steps: [{ id: 'a' }] });
    render(
      <TourProvider messages={{ closeTour: 'Fechar' }}>
        <Tour.Root tour={tour} messages={{ closeTour: 'Cerrar' }}>
          <Tour.Portal>
            <Tour.Content>
              <Tour.Close />
            </Tour.Content>
          </Tour.Portal>
        </Tour.Root>
      </TourProvider>,
    );
    await act(() => tour.start());
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy();
  });
});
