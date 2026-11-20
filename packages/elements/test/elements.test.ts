import { createTour } from '@awesome-tour/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountTour, placeCard } from '../src';
import '../src/define';

const tick = () => new Promise((r) => setTimeout(r, 0));
const layer = () => document.querySelector('awesome-tour-layer')!.shadowRoot!;
const part = (name: string) => layer().querySelector(`[part~="${name}"]`) as HTMLElement;

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('dir');
});

describe('placeCard', () => {
  const viewport = { width: 1000, height: 800 };
  const size = { width: 300, height: 150 };
  const rect = (top: number, left: number) => ({
    x: left,
    y: top,
    top,
    left,
    width: 100,
    height: 40,
    right: left + 100,
    bottom: top + 40,
  });

  it('uses the preferred side when it fits, flips when it does not, and clamps', () => {
    expect(placeCard(rect(100, 400), size, 'bottom', viewport).side).toBe('bottom');
    expect(placeCard(rect(700, 400), size, 'bottom', viewport).side).toBe('top');
    const left = placeCard(rect(100, 0), size, 'bottom', viewport);
    expect(left.x).toBe(8);
  });
});

describe('mountTour', () => {
  it('renders the current step, navigates, and cleans up', async () => {
    document.body.innerHTML = '<button id="mixer">Mixer</button>';
    const tour = createTour({
      id: 'v',
      steps: [
        { id: 'a', title: { en: 'Welcome', pt: 'Boas-vindas' }, description: 'Hi' },
        { id: 'b', target: '#mixer', title: 'Mixer' },
      ],
    });
    const unmount = mountTour(tour, { locale: 'pt' });
    expect(part('card').hidden).toBe(true);
    await tour.start();
    await tick();
    const card = part('card');
    expect(card.hidden).toBe(false);
    expect(card.getAttribute('role')).toBe('dialog');
    expect(part('title').textContent).toBe('Boas-vindas');
    expect(part('progress').textContent).toBe('Step 1 of 2');
    expect(card.getAttribute('data-placement')).toBe('center');
    // Modal: the rest of the page is inert, the layer is not.
    expect(document.getElementById('mixer')!.hasAttribute('inert')).toBe(true);

    part('next').click();
    await tick();
    expect(tour.getState().stepId).toBe('b');
    expect(part('next').textContent).toBe('Finish');
    expect(card.getAttribute('data-placement')).toBe('anchored');
    expect(document.getElementById('mixer')!.hasAttribute('inert')).toBe(false); // the target

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await tick();
    expect(tour.getState().stepId).toBe('a');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(tour.getState().status).toBe('closed');
    expect(part('card').hidden).toBe(true);

    unmount();
    expect(document.querySelector('awesome-tour-layer')).toBeNull();
  });
});

describe('<awesome-tour>', () => {
  it('loads a JSON tour, starts it, and reports events', async () => {
    const json = { id: 'from-json', steps: [{ id: 'hello', title: 'Hello from JSON' }] };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(json), { status: 200 }));
    const events: string[] = [];
    const el = document.createElement('awesome-tour');
    el.setAttribute('src', '/tour.json');
    el.setAttribute('autostart', '');
    for (const type of ['tour-start', 'tour-step', 'tour-complete']) {
      el.addEventListener(type, () => events.push(type));
    }
    document.body.append(el);
    await vi.waitFor(() => expect(part('title').textContent).toBe('Hello from JSON'));
    expect(el.tour?.id).toBe('from-json');
    part('next').click();
    await tick();
    expect(events).toEqual(['tour-start', 'tour-step', 'tour-complete']);
    el.remove();
    expect(document.querySelector('awesome-tour-layer')).toBeNull();
    fetchMock.mockRestore();
  });
});
