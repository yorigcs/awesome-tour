/**
 * react-joyride → awesome-tour. Rewrites step objects (`{ target, content, placement, … }`) into
 * awesome-tour steps and flags `<Joyride>` usage. Run: `npx @awesome-tour/codemod joyride src/`.
 */
import type { API, FileInfo } from 'jscodeshift';
import {
  flagImport,
  getProp,
  keyName,
  type Prop,
  placement,
  prop,
  props,
  rewriteObjects,
  stringValue,
} from '../utils';

const DROPPED = new Set([
  'disableBeacon',
  'disableOverlay',
  'disableOverlayClose',
  'floaterProps',
  'hideBackButton',
  'hideCloseButton',
  'hideFooter',
  'isFixed',
  'locale',
  'offset',
  'showProgress',
  'showSkipButton',
  'spotlightPadding',
  'styles',
  'tooltipComponent',
]);

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const changed = rewriteObjects(
    j,
    root,
    (obj) => !!getProp(obj, 'target') && !!getProp(obj, 'content'),
    (obj, _path, index) => {
      const out: Prop[] = [];
      const todos: string[] = [];
      const id = getProp(obj, 'id');
      out.push(id ?? prop(j, 'id', j.stringLiteral(`step-${index + 1}`)));
      let centered = false;
      const pl = getProp(obj, 'placement');
      const plValue = pl ? stringValue(pl.value) : undefined;
      if (plValue) {
        const p = placement(plValue);
        centered = !!p.center;
        if (p.side) out.push(prop(j, 'side', j.stringLiteral(p.side)));
        if (p.align) out.push(prop(j, 'align', j.stringLiteral(p.align)));
      } else if (pl) todos.push('`placement` is dynamic: set `side`/`align`');
      for (const p of props(obj)) {
        const name = keyName(p)!;
        if (name === 'id' || name === 'placement') continue;
        if (name === 'target') {
          if (centered || stringValue(p.value) === 'body') continue; // centered step
          out.push(p);
        } else if (name === 'content') {
          const isText =
            p.value.type === 'StringLiteral' ||
            p.value.type === 'Literal' ||
            p.value.type === 'TemplateLiteral';
          out.push(prop(j, isText ? 'description' : 'content', p.value));
        } else if (name === 'title') out.push(p);
        else if (name === 'spotlightClicks') out.push(prop(j, 'interactive', p.value));
        else if (name === 'data') out.push(prop(j, 'meta', p.value));
        else if (name === 'disableScrolling') {
          // `disableScrolling: true` → `scroll: false` (any other expression is negated).
          const literal = p.value.type === 'BooleanLiteral' || p.value.type === 'Literal';
          const value = literal
            ? j.booleanLiteral(!(p.value as { value: boolean }).value)
            : j.unaryExpression('!', p.value as never);
          out.push(prop(j, 'scroll', value));
        } else if (name === 'spotlightPadding')
          todos.push('`spotlightPadding` → the `padding` prop of Tour.Overlay / Tour.Spotlight');
        else if (DROPPED.has(name))
          todos.push(`\`${name}\` has no step option: style or configure Tour.* parts`);
        else todos.push(`unknown Joyride option \`${name}\``);
      }
      return { properties: out, todos };
    },
  );
  flagImport(
    j,
    root,
    'react-joyride',
    'replace <Joyride steps run callback> with createTour({ id, steps }) + <Tour.Root tour={tour}> and your tour UI (e.g. <TourPopover />); `callback` → tour.on(...) or the analytics() plugin',
  );
  return changed || root.find(j.ImportDeclaration, { source: { value: 'react-joyride' } }).size()
    ? root.toSource({ quote: 'single' })
    : null;
}

export const parser = 'tsx';
