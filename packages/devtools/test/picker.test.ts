import { afterEach, describe, expect, it } from 'vitest';
import { stepSnippet, suggestTarget } from '../src/picker';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('suggestTarget', () => {
  it('prefers tour anchors, then data-tour, role + name, test ids and ids', () => {
    document.body.innerHTML = `
      <div data-tour-anchor="nav"><a id="home">Home</a></div>
      <section data-tour="mixer"></section>
      <button data-testid="save">Save</button>
      <input id="search" />
      <input id=":r1:" aria-label="Email" />
      <div data-testid="panel"></div>
    `;
    expect(suggestTarget(document.querySelector('#home')!)).toEqual({
      target: "anchor('nav')",
      quality: 'anchor',
      code: true,
      locator: { anchor: 'nav' },
    });
    expect(suggestTarget(document.querySelector('section')!).target).toBe("byTour('mixer')");
    // What the user sees beats markup hooks: role + accessible name.
    expect(suggestTarget(document.querySelector('button')!).target).toBe(
      "byRole('button', { name: 'Save' })",
    );
    expect(suggestTarget(document.querySelector('[aria-label]')!).target).toBe(
      "byRole('textbox', { name: 'Email' })",
    );
    // No name: an id, or a test id.
    expect(suggestTarget(document.querySelector('#search')!).target).toBe('#search');
    expect(suggestTarget(document.querySelector('[data-testid=panel]')!).target).toBe(
      '[data-testid="panel"]',
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
    expect(stepSnippet({ target: "anchor('nav')", quality: 'anchor', code: true })).toContain(
      "target: anchor('nav')",
    );
  });
});
