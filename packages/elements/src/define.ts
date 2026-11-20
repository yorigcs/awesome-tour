/**
 * Registers `<awesome-tour>`: a tour from a JSON URL (or a tour you hand it), rendered by
 * `mountTour`. Import once: `import '@awesome-tour/elements/define';`
 *
 * <awesome-tour src="/tours/first-session.json" autostart persist></awesome-tour>
 *
 * Attributes: `src`, `autostart`, `persist` (remember progress in localStorage), `locale`,
 * `modal="false"`. Properties: `tour`, `actions` (functions the JSON names). Methods: `start()`,
 * `close()`. Events (bubbling): `tour-start`, `tour-step` ({ stepId }), `tour-complete`,
 * `tour-close`, `tour-skip`, `tour-error` ({ error }).
 */
import {
  createTour,
  localStorageAdapter,
  persist,
  type Tour,
  type TourPlugin,
} from '@awesome-tour/core';
import { type FromJSONOptions, fromJSON, type TourJSON } from '@awesome-tour/core/json';
import { mountTour } from './index';

export class AwesomeTourElement extends HTMLElement {
  static observedAttributes = ['src', 'locale', 'modal'];

  /** Functions referenced by name from the JSON (`when`, `beforeEnter`, …). */
  actions: FromJSONOptions['actions'] = {};

  #tour: Tour<any, any> | null = null;
  #ownTour = false;
  #unmount: (() => void) | null = null;
  #offs: (() => void)[] = [];
  #loading: AbortController | null = null;

  /** The tour being rendered. Setting one replaces whatever `src` loaded. */
  get tour() {
    return this.#tour;
  }
  set tour(tour: Tour<any, any> | null) {
    this.#use(tour, false);
  }

  start() {
    return this.#tour?.start({ force: true });
  }

  close() {
    this.#tour?.close();
  }

  connectedCallback() {
    if (this.#tour) this.#mount();
    else void this.#load();
  }

  disconnectedCallback() {
    this.#loading?.abort();
    this.#teardown();
  }

  attributeChangedCallback(name: string, previous: string | null, value: string | null) {
    if (previous === value || !this.isConnected) return;
    if (name === 'src' && this.#ownTour) void this.#load();
    else if (this.#tour) this.#mount();
  }

  async #load() {
    const src = this.getAttribute('src');
    if (!src) return;
    this.#loading?.abort();
    const controller = new AbortController();
    this.#loading = controller;
    try {
      const res = await fetch(src, { signal: controller.signal });
      if (!res.ok) throw new Error(`[awesome-tour] ${src} answered ${res.status}`);
      const json = (await res.json()) as TourJSON;
      if (controller.signal.aborted) return;
      const plugins: TourPlugin[] = this.hasAttribute('persist')
        ? [persist(localStorageAdapter())]
        : [];
      this.#use(createTour({ ...fromJSON(json, { actions: this.actions ?? {} }), plugins }), true);
      if (this.hasAttribute('autostart')) void this.#tour?.start();
    } catch (error) {
      if (controller.signal.aborted) return;
      this.dispatchEvent(new CustomEvent('tour-error', { bubbles: true, detail: { error } }));
    }
  }

  #use(tour: Tour<any, any> | null, own: boolean) {
    this.#teardown();
    this.#tour = tour;
    this.#ownTour = own;
    if (!tour) return;
    const emit = (type: string, detail: unknown = {}) =>
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
    this.#offs = [
      tour.on('start', () => emit('tour-start')),
      tour.on('stepChange', ({ to }) => emit('tour-step', { stepId: to })),
      tour.on('complete', () => emit('tour-complete')),
      tour.on('close', () => emit('tour-close')),
      tour.on('skip', () => emit('tour-skip')),
      tour.on('error', ({ error }) => emit('tour-error', { error })),
    ];
    if (this.isConnected) this.#mount();
  }

  #mount() {
    this.#unmount?.();
    if (!this.#tour) return;
    const locale = this.getAttribute('locale');
    const modalAttr = this.getAttribute('modal');
    this.#unmount = mountTour(this.#tour, {
      ...(locale ? { locale } : {}),
      ...(modalAttr !== null ? { modal: modalAttr !== 'false' } : {}),
    });
  }

  #teardown() {
    this.#unmount?.();
    this.#unmount = null;
    for (const off of this.#offs) off();
    this.#offs = [];
    if (this.#ownTour) this.#tour?.destroy();
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('awesome-tour')) {
  customElements.define('awesome-tour', AwesomeTourElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'awesome-tour': AwesomeTourElement;
  }
}
