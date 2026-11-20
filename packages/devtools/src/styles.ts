export const css = /* css */ `
:host, .atd-root { all: initial; }
.atd-root, .atd-root * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }
.atd-root {
  --atd-bg: #14131a; --atd-panel: #1c1b24; --atd-line: #2e2d3a; --atd-text: #e9e8f0; --atd-muted: #8e8d9c;
  --atd-accent: #8b7dff; --atd-ok: #3ccf8e; --atd-warn: #f5b84a; --atd-bad: #ff6b81;
  position: fixed; z-index: 2147483000; bottom: 12px; font-size: 12px; color: var(--atd-text);
}
.atd-left { left: 12px; } .atd-right { right: 12px; }
.atd-launcher {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 15px;
  border: 1px solid var(--atd-line); background: var(--atd-bg); color: var(--atd-text); font: inherit; font-weight: 600; cursor: pointer;
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.3);
}
.atd-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--atd-muted); }
.atd-dot[data-active] { background: var(--atd-ok); box-shadow: 0 0 0 3px rgb(60 207 142 / 0.2); }
.atd-panel {
  position: absolute; bottom: 40px; width: 400px; max-width: calc(100vw - 24px); height: 520px; max-height: calc(100vh - 70px);
  display: flex; flex-direction: column; background: var(--atd-bg); border: 1px solid var(--atd-line); border-radius: 12px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.45); overflow: hidden;
}
.atd-left .atd-panel { left: 0; } .atd-right .atd-panel { right: 0; }
.atd-header { display: flex; align-items: center; gap: 4px; padding: 8px; border-bottom: 1px solid var(--atd-line); }
.atd-title { font-weight: 700; margin-right: auto; padding-left: 4px; }
.atd-tab, .atd-btn {
  font: inherit; color: var(--atd-text); background: transparent; border: 1px solid transparent; border-radius: 6px; padding: 4px 8px; cursor: pointer;
}
.atd-tab[aria-pressed='true'] { background: var(--atd-panel); border-color: var(--atd-line); }
.atd-btn { border-color: var(--atd-line); background: var(--atd-panel); }
.atd-btn:hover, .atd-tab:hover { border-color: var(--atd-accent); }
.atd-btn:disabled { opacity: 0.4; cursor: default; border-color: var(--atd-line); }
.atd-tab:focus-visible, .atd-btn:focus-visible, .atd-launcher:focus-visible, .atd-step:focus-visible, .atd-select:focus-visible { outline: 2px solid var(--atd-accent); outline-offset: 1px; }
.atd-body { flex: 1; overflow: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
.atd-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.atd-select { font: inherit; color: var(--atd-text); background: var(--atd-panel); border: 1px solid var(--atd-line); border-radius: 6px; padding: 4px 6px; flex: 1; }
.atd-pill { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 999px; font-size: 11px; background: var(--atd-panel); border: 1px solid var(--atd-line); color: var(--atd-muted); }
.atd-pill[data-tone='ok'] { color: var(--atd-ok); border-color: rgb(60 207 142 / 0.4); }
.atd-pill[data-tone='warn'] { color: var(--atd-warn); border-color: rgb(245 184 74 / 0.4); }
.atd-pill[data-tone='bad'] { color: var(--atd-bad); border-color: rgb(255 107 129 / 0.4); }
.atd-pill[data-tone='accent'] { color: var(--atd-accent); border-color: rgb(139 125 255 / 0.4); }
.atd-section-block { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--atd-line); border-radius: 8px; }
.atd-section { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--atd-muted); margin: 4px 0 -4px; }
.atd-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.atd-step {
  width: 100%; display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 6px; text-align: left;
  font: inherit; color: var(--atd-text); background: transparent; border: 1px solid transparent; border-radius: 6px; padding: 5px 6px; cursor: pointer;
}
.atd-step:hover { background: var(--atd-panel); }
.atd-step[aria-current='step'] { background: rgb(139 125 255 / 0.14); border-color: rgb(139 125 255 / 0.5); }
.atd-step[data-hidden] { opacity: 0.5; }
.atd-index { color: var(--atd-muted); font-variant-numeric: tabular-nums; }
.atd-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
.atd-pre { margin: 0; padding: 8px; background: var(--atd-panel); border: 1px solid var(--atd-line); border-radius: 6px; max-height: 140px; overflow: auto; white-space: pre-wrap; word-break: break-word; }
.atd-events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.atd-events li { display: grid; grid-template-columns: 62px 80px 1fr; gap: 6px; padding: 4px 2px; border-bottom: 1px solid var(--atd-line); }
.atd-muted { color: var(--atd-muted); }
.atd-empty { color: var(--atd-muted); padding: 16px 4px; text-align: center; }
.atd-highlight { position: fixed; pointer-events: none; border: 2px dashed var(--atd-accent); border-radius: 4px; background: rgb(139 125 255 / 0.12); z-index: 2147482999; }
.atd-progress { height: 4px; border-radius: 4px; background: var(--atd-line); overflow: hidden; flex: 1; }
.atd-progress > span { display: block; height: 100%; background: var(--atd-accent); }
@media (prefers-reduced-motion: no-preference) { .atd-progress > span { transition: width 200ms ease; } }
.atd-funnels { display: flex; flex-direction: column; gap: 10px; }
.atd-funnel { list-style: none; margin: 6px 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.atd-funnel li { display: grid; grid-template-columns: minmax(0, 7rem) 1fr auto; align-items: center; gap: 8px; }
.atd-funnel li > .atd-mono:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.atd-bar { height: 6px; border-radius: 3px; background: var(--atd-panel); overflow: hidden; }
.atd-bar > span { display: block; height: 100%; background: var(--atd-accent); }
.atd-drop { color: var(--atd-bad); }
.atd-recording { list-style: none; margin: 8px 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.atd-recorded { display: flex; flex-direction: column; gap: 4px; padding: 8px; border: 1px solid var(--atd-line); border-radius: 8px; background: var(--atd-panel); }
.atd-recorded code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.atd-spacer { flex: 1; }
.atd-input { font: inherit; color: var(--atd-text); background: var(--atd-bg); border: 1px solid var(--atd-line); border-radius: 6px; padding: 4px 6px; resize: vertical; }
.atd-input:focus-visible { outline: 2px solid var(--atd-accent); outline-offset: 1px; }
.atd-play-overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); z-index: 2147482999; }
.atd-play-card { z-index: 2147483001; width: min(20rem, calc(100vw - 2rem)); display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 10px; background: var(--atd-bg); color: var(--atd-text); border: 1px solid var(--atd-accent); box-shadow: 0 12px 32px -8px rgb(0 0 0 / 0.5); font: 13px/1.4 system-ui, sans-serif; }
.atd-play-title { margin: 0; font-size: 14px; font-weight: 600; }
`;
