import { afterEach, describe, expect, it } from 'vitest';
import { stepSnippet, suggestTarget } from '../src/picker';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('suggestTarget', () => {
  it('prefers tour anchors, then test ids, ids and accessible names', () => {
    document.body.innerHTML = `
      <div data-tour-anchor="nav"><a id="home">Home</a></div>
      <button data-testid="save">Save</button>
      <input id="search" />
      <input id=":r1:" aria-label="Email" />
    `;
    expect(suggestTarget(document.querySelector('#home')!)).toEqual({
      target: "anchor('nav')",
      quality: 'anchor',
    });
    expect(suggestTarget(document.querySelector('button')!).target).toBe('[data-testid="save"]');
    expect(suggestTarget(document.querySelector('#search')!).target).toBe('#search');
    // Auto-generated ids are skipped in favour of the accessible name.
    expect(suggestTarget(document.querySelector('[aria-label]')!).target).toBe(
      'input[aria-label="Email"]',
    );
  });

  it('falls back to a unique structural path from a stable ancestor', () => {
    document.body.innerHTML = `<ul id="list"><li>a</li><li><span>b</span></li></ul>`;
    const span = document.querySelector('span')!;
    const picked = suggestTarget(span);
    expect(picked.quality).toBe('structural');
    expect(document.querySelectorAll(picked.target)).toHaveLength(1);
    expect(document.querySelector(picked.target)).toBe(span);
  });

  it('prints a step snippet', () => {
    expect(stepSnippet({ target: '#search', quality: 'stable' })).toContain("target: '#search'");
    expect(stepSnippet({ target: "anchor('nav')", quality: 'anchor' })).toContain(
      "target: anchor('nav')",
    );
  });
});
