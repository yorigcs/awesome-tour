/**
 * @awesome-tour/elements — awesome-tour without React.
 *
 * `mountTour(tour)` renders a tour (overlay, card, keyboard, focus, screen-reader announcements)
 * with plain DOM inside a shadow root, themed with CSS custom properties and `::part()`. Use it
 * from Vue, Svelte, Angular, or a page with no framework at all. `@awesome-tour/elements/define`
 * registers an `<awesome-tour>` element on top of it.
 */
import {
  getTargetsRect,
  inertOthers,
  isElement,
  localize,
  observeRect,
  prefersReducedMotion,
  type RectLike,
  type StepDefinition,
  type Tour,
} from '@awesome-tour/core';

export interface MountTourLabels {
  next: string;
  back: string;
  finish: string;
  close: string;
  stepOf: (current: number, total: number) => string;
}

export interface MountTourOptions {
  /** Where the layer is appended. Default: `document.body`. */
  container?: Element;
  /** Block the page while a step is shown (overlay, focus trap, `inert`). Default: `tour.modal`. */
  modal?: boolean;
  /** Escape closes the tour. Default: true. */
  closeOnEscape?: boolean;
  /** ← → move between steps (mirrored in RTL). Default: true. */
  keyboard?: boolean;
  /** Locale for step text given per locale (`{ en, pt }`). Default: `<html lang>`. */
  locale?: string;
  /** Button and announcement text. */
  labels?: Partial<MountTourLabels>;
  /** Space between the card and its target (px). Default: 12. */
  offset?: number;
  /** Padding of the overlay's cutout around the target (px). Default: 6. */
  padding?: number;
  /** Leave out the built-in look: style everything through `::part()` yourself. */
  unstyled?: boolean;
}

const DEFAULT_LABELS: MountTourLabels = {
  next: 'Next',
  back: 'Back',
  finish: 'Finish',
  close: 'Close tour',
  stepOf: (current, total) => `Step ${current} of ${total}`,
};

/** Built-in look, every value a custom property you can override on the host or the page. */
const STYLES = `
:host { all: initial; position: fixed; inset: 0; z-index: var(--tour-z, 2147483000); pointer-events: none;
  font: var(--tour-font, 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif); color: var(--tour-fg, #18181b); }
[hidden]:not([part~="back"]) { display: none !important; }
[part~="overlay"] { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: auto; }
[part~="overlay"] path { fill: var(--tour-overlay, rgb(0 0 0 / 0.5)); }
[part~="card"] { position: fixed; top: 0; left: 0; box-sizing: border-box; width: var(--tour-width, min(22rem, calc(100vw - 2rem)));
  display: flex; flex-direction: column; gap: 8px; padding: var(--tour-padding, 16px); pointer-events: auto;
  background: var(--tour-bg, #fff); border: 1px solid var(--tour-border, #e4e4e7); border-radius: var(--tour-radius, 12px);
  box-shadow: var(--tour-shadow, 0 16px 40px -12px rgb(0 0 0 / 0.35)); outline: none; }
[part~="card"][data-placement="center"] { top: 50%; left: 50%; transform: translate(-50%, -50%); }
[part~="card"]:not([data-reduced-motion]) { transition: transform 160ms ease-out, opacity 160ms ease-out; }
[part~="header"] { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
[part~="progress"] { font-size: 12px; color: var(--tour-muted, #63636b); }
[part~="title"] { margin: 0; font-size: 1.05em; font-weight: 600; }
[part~="description"] { margin: 0; color: var(--tour-muted, #63636b); }
[part~="footer"] { display: flex; justify-content: space-between; gap: 8px; margin-top: 4px; }
button { font: inherit; cursor: pointer; border-radius: var(--tour-button-radius, 8px); padding: 6px 12px;
  border: 1px solid var(--tour-border, #e4e4e7); background: transparent; color: inherit; }
button:focus-visible { outline: 2px solid var(--tour-accent, #18181b); outline-offset: 2px; }
[part~="next"] { background: var(--tour-accent, #18181b); border-color: var(--tour-accent, #18181b); color: var(--tour-accent-fg, #fff); }
[part~="close"] { border: none; padding: 2px 6px; font-size: 16px; line-height: 1; color: var(--tour-muted, #63636b); }
[part~="back"][hidden] { visibility: hidden; display: inline-block; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

type Side = 'top' | 'right' | 'bottom' | 'left';
const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/** Place a box of `size` next to `rect` on `side`, flipping when it doesn't fit, then clamp it. */
export function placeCard(
  rect: RectLike,
  size: { width: number; height: number },
  preferred: Side,
  viewport: { width: number; height: number },
  offset = 12,
  margin = 8,
): { x: number; y: number; side: Side } {
  const fits = (side: Side) =>
    side === 'bottom'
      ? rect.bottom + offset + size.height <= viewport.height - margin
      : side === 'top'
        ? rect.top - offset - size.height >= margin
        : side === 'right'
          ? rect.right + offset + size.width <= viewport.width - margin
          : rect.left - offset - size.width >= margin;
  const order: Side[] = [preferred, OPPOSITE[preferred], 'bottom', 'top', 'right', 'left'];
  const side = order.find(fits) ?? preferred;
  let x: number;
  let y: number;
  if (side === 'top' || side === 'bottom') {
    x = rect.left + rect.width / 2 - size.width / 2;
    y = side === 'bottom' ? rect.bottom + offset : rect.top - offset - size.height;
  } else {
    y = rect.top + rect.height / 2 - size.height / 2;
    x = side === 'right' ? rect.right + offset : rect.left - offset - size.width;
  }
  const clamp = (v: number, max: number) =>
    Math.min(Math.max(v, margin), Math.max(margin, max - margin));
  return {
    x: clamp(x, viewport.width - size.width),
    y: clamp(y, viewport.height - size.height),
    side,
  };
}

const isRtl = () => getComputedStyle(document.documentElement).direction === 'rtl';
const ownsKeys = (event: Event) =>
  event.composedPath().some((node) => {
    if (!(node instanceof HTMLElement)) return false;
    if (
      node.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT', 'VIDEO', 'AUDIO'].includes(node.tagName)
    ) {
      return true;
    }
    const role = node.getAttribute('role');
    return (
      !!role &&
      /^(slider|spinbutton|listbox|option|menu|menuitem|grid|gridcell|tree|tablist|tab|radiogroup|radio|combobox|toolbar)$/.test(
        role,
      )
    );
  });

const text = (value: unknown, locale: string | undefined) => {
  const resolved = localize(value as never, locale ?? (document.documentElement.lang || null));
  return typeof resolved === 'string' ? resolved : '';
};

/**
 * Render `tour` with plain DOM. Starting, moving and closing the tour stay the tour's job
 * (`tour.start()`, …); this draws whatever step is current. Returns an unmount function.
 */
export function mountTour(tour: Tour<any, any>, options: MountTourOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {};
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const offset = options.offset ?? 12;
  const padding = options.padding ?? 6;
  const modal = options.modal ?? tour.modal;

  const host = document.createElement('awesome-tour-layer');
  host.setAttribute('data-tour-id', tour.id);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `${options.unstyled ? '' : `<style>${STYLES}</style>`}
<svg part="overlay" aria-hidden="true" hidden><path fill-rule="evenodd"></path></svg>
<div part="card" role="dialog" tabindex="-1" hidden ${modal ? 'aria-modal="true"' : ''}
  aria-labelledby="t" aria-describedby="d">
  <div part="header"><span part="progress"></span><button part="close" type="button">×</button></div>
  <h2 part="title" id="t"></h2>
  <p part="description" id="d"></p>
  <div part="footer"><button part="back" type="button"></button><button part="next" type="button"></button></div>
</div>
<div class="sr" aria-live="polite" aria-atomic="true"></div>`;
  (options.container ?? document.body).appendChild(host);

  const $ = <T extends Element>(sel: string) => root.querySelector(sel) as T;
  const overlay = $<SVGSVGElement>('[part~="overlay"]');
  const path = $<SVGPathElement>('path');
  const card = $<HTMLDivElement>('[part~="card"]');
  const progress = $<HTMLElement>('[part~="progress"]');
  const title = $<HTMLElement>('[part~="title"]');
  const description = $<HTMLElement>('[part~="description"]');
  const back = $<HTMLButtonElement>('[part~="back"]');
  const next = $<HTMLButtonElement>('[part~="next"]');
  const close = $<HTMLButtonElement>('[part~="close"]');
  const live = $<HTMLElement>('[aria-live]');
  close.setAttribute('aria-label', labels.close);
  if (prefersReducedMotion()) card.setAttribute('data-reduced-motion', '');

  back.addEventListener('click', () => void tour.prev());
  next.addEventListener('click', () => void tour.next());
  close.addEventListener('click', () => tour.close());
  overlay.addEventListener('click', (e) => e.stopPropagation());

  let stopObserving: (() => void) | null = null;
  let restoreInert: (() => void) | null = null;
  let returnFocus: HTMLElement | null = null;
  let shownStep: string | null = null;

  const position = (rect: RectLike | null) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!rect) {
      card.setAttribute('data-placement', 'center');
      card.style.transform = '';
      path.setAttribute('d', `M0 0H${vw}V${vh}H0Z`);
      return;
    }
    const step = tour.getCurrentStep() as (StepDefinition & { side?: string }) | undefined;
    const raw = step?.side ?? 'bottom';
    const side: Side =
      raw === 'start'
        ? isRtl()
          ? 'right'
          : 'left'
        : raw === 'end'
          ? isRtl()
            ? 'left'
            : 'right'
          : (raw as Side);
    const {
      x,
      y,
      side: placed,
    } = placeCard(
      rect,
      { width: card.offsetWidth, height: card.offsetHeight },
      side,
      { width: vw, height: vh },
      offset,
    );
    card.setAttribute('data-placement', 'anchored');
    card.setAttribute('data-side', placed);
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    const l = rect.left - padding;
    const t = rect.top - padding;
    const w = rect.width + padding * 2;
    const h = rect.height + padding * 2;
    path.setAttribute('d', `M0 0H${vw}V${vh}H0Z M${l} ${t}h${w}v${h}h${-w}Z`);
  };

  const hide = () => {
    stopObserving?.();
    stopObserving = null;
    restoreInert?.();
    restoreInert = null;
    card.hidden = true;
    overlay.toggleAttribute('hidden', true);
    live.textContent = '';
    if (shownStep !== null) {
      shownStep = null;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
  };

  const render = () => {
    const state = tour.getState();
    if (state.status !== 'active' || state.phase === 'resolving' || state.stepId == null) {
      hide();
      return;
    }
    const step = tour.getCurrentStep() as
      | (StepDefinition & { title?: unknown; description?: unknown })
      | undefined;
    if (!step) return hide();
    const first = shownStep === null;
    if (first) {
      const active = document.activeElement;
      returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;
    }
    card.hidden = false;
    overlay.toggleAttribute('hidden', !modal);
    card.setAttribute('data-step', step.id);
    card.setAttribute('data-phase', state.phase ?? '');
    const { current, total } = state.progress;
    progress.textContent = labels.stepOf(current, total);
    title.textContent = text(step.title, options.locale);
    description.textContent = text(step.description, options.locale);
    description.hidden = !description.textContent;
    back.textContent = labels.back;
    back.hidden = current <= 1;
    next.textContent = current >= total ? labels.finish : labels.next;
    next.disabled = !state.canNext;

    if (shownStep !== step.id) {
      shownStep = step.id;
      live.textContent = labels.stepOf(current, total);
      stopObserving?.();
      const targets = state.targets;
      if (targets.length > 0) {
        stopObserving = observeRect(targets, position);
      } else {
        stopObserving = null;
        position(null);
      }
      restoreInert?.();
      restoreInert = modal ? inertOthers([host, ...targets.filter(isElement)]) : null;
      queueMicrotask(() => card.focus({ preventScroll: true }));
    } else {
      position(state.targets.length ? getTargetsRect(state.targets) : null);
    }
  };

  const onKey = (event: KeyboardEvent) => {
    if (card.hidden || event.defaultPrevented) return;
    if (event.key === 'Escape' && options.closeOnEscape !== false) {
      event.preventDefault();
      tour.close();
      return;
    }
    if (event.key === 'Tab' && modal) {
      const focusables = [close, back, next].filter((b) => !b.hidden && !b.disabled);
      const active = root.activeElement;
      const i = focusables.indexOf(active as HTMLButtonElement);
      event.preventDefault();
      const to = event.shiftKey
        ? i <= 0
          ? focusables.length - 1
          : i - 1
        : (i + 1) % focusables.length;
      focusables[to]?.focus();
      return;
    }
    if (
      options.keyboard === false ||
      ownsKeys(event) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const forward = isRtl() ? 'ArrowLeft' : 'ArrowRight';
    const backward = isRtl() ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) {
      event.preventDefault();
      void tour.next();
    } else if (event.key === backward) {
      event.preventDefault();
      void tour.prev();
    }
  };
  const onResize = () => render();

  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  const unsubscribe = tour.subscribe(render);
  render();

  return () => {
    unsubscribe();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    hide();
    host.remove();
  };
}
