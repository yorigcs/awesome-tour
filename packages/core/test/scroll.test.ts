import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollTargetsIntoView } from '../src';

function target(top: number) {
  const el = document.createElement('div');
  document.body.append(el);
  el.getBoundingClientRect = () =>
    ({
      x: 20,
      y: top,
      top,
      left: 20,
      width: 100,
      height: 40,
      right: 120,
      bottom: top + 40,
    }) as DOMRect;
  el.scrollIntoView = vi.fn();
  return el;
}

describe('scrollTargetsIntoView', () => {
  afterEach(() => {
    document.documentElement.style.scrollPaddingTop = '';
    document.body.replaceChildren();
  });

  it('leaves a fully visible target alone', async () => {
    const el = target(40);
    await scrollTargetsIntoView([el], {}, 0);
    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls a target hidden under the page scroll-padding (e.g. a sticky header)', async () => {
    document.documentElement.style.scrollPaddingTop = '80px';
    const el = target(40);
    await scrollTargetsIntoView([el], {}, 0);
    expect(el.scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
