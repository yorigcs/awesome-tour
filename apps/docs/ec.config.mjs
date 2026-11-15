import { defineEcConfig } from 'astro-expressive-code';

/** Scrollable code must be reachable by keyboard (WCAG 2.1.1): make every <pre> focusable. */
const focusablePre = {
  name: 'focusable-pre',
  hooks: {
    postprocessRenderedBlock: ({ renderData }) => {
      const visit = (node) => {
        if (node.type === 'element' && node.tagName === 'pre') {
          node.properties = { ...node.properties, tabIndex: 0 };
        }
        for (const child of node.children ?? []) visit(child);
      };
      visit(renderData.blockAst);
    },
  },
};

export default defineEcConfig({
  plugins: [focusablePre],
  themes: ['github-light', 'github-dark'],
  themeCssSelector: (theme) => (theme.type === 'dark' ? '.dark' : ':root:not(.dark)'),
  useDarkModeMediaQuery: false,
  styleOverrides: {
    borderRadius: '0',
    borderWidth: '2px',
    borderColor: 'var(--ink)',
    codeFontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
    codeFontSize: '0.8125rem',
    uiFontFamily: "'Archivo Variable', system-ui, sans-serif",
    frames: {
      shadowColor: 'transparent',
      editorActiveTabBackground: 'var(--paper)',
      editorActiveTabIndicatorTopColor: 'var(--marker)',
      editorActiveTabIndicatorHeight: '4px',
      editorTabBarBackground: 'var(--paper-2)',
      editorTabBarBorderBottomColor: 'var(--ink)',
      terminalTitlebarBackground: 'var(--paper-2)',
      terminalTitlebarBorderBottomColor: 'var(--ink)',
      frameBoxShadowCssValue: 'none',
    },
  },
});
