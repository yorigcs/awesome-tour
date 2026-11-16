/**
 * Shepherd → awesome-tour. Rewrites step objects (`{ id, title, text, attachTo, buttons, … }`)
 * passed to `addStep()` / `steps: […]` and flags Shepherd usage.
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

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const changed = rewriteObjects(
    j,
    root,
    (obj) =>
      (!!getProp(obj, 'text') || !!getProp(obj, 'attachTo')) &&
      !getProp(obj, 'element') && // not the attachTo object itself
      !getProp(obj, 'on'),
    (obj, _path, index) => {
      const out: Prop[] = [];
      const todos: string[] = [];
      out.push(getProp(obj, 'id') ?? prop(j, 'id', j.stringLiteral(`step-${index + 1}`)));
      for (const p of props(obj)) {
        const name = keyName(p)!;
        if (name === 'id') continue;
        if (name === 'title') out.push(p);
        else if (name === 'text') {
          const isText =
            p.value.type === 'StringLiteral' ||
            p.value.type === 'Literal' ||
            p.value.type === 'TemplateLiteral';
          out.push(prop(j, isText ? 'description' : 'content', p.value));
          if (!isText) todos.push('`text` was not a string: render it as `content`');
        } else if (name === 'attachTo' && p.value.type === 'ObjectExpression') {
          const element = getProp(p.value, 'element');
          const on = getProp(p.value, 'on');
          if (element) out.push(prop(j, 'target', element.value));
          const onValue = on ? stringValue(on.value) : undefined;
          if (onValue) {
            const pl = placement(onValue);
            if (pl.side) out.push(prop(j, 'side', j.stringLiteral(pl.side)));
            if (pl.align) out.push(prop(j, 'align', j.stringLiteral(pl.align)));
          }
        } else if (name === 'advanceOn' && p.value.type === 'ObjectExpression') {
          const selector = getProp(p.value, 'selector');
          const event = getProp(p.value, 'event');
          const rule = [
            ...(event ? [prop(j, 'event', event.value)] : []),
            ...(selector ? [prop(j, 'target', selector.value)] : []),
          ];
          out.push(prop(j, 'advanceOn', j.objectExpression(rule as never)));
        } else if (name === 'showOn') out.push(prop(j, 'when', p.value));
        else if (name === 'beforeShowPromise') out.push(prop(j, 'beforeEnter', p.value));
        else if (name === 'canClickTarget') out.push(prop(j, 'interactive', p.value));
        else if (name === 'scrollTo') out.push(prop(j, 'scroll', p.value));
        else if (name === 'buttons')
          todos.push('`buttons` → render <Tour.Prev>/<Tour.Next>/<Tour.Close> in your tour UI');
        else if (name === 'when')
          todos.push('`when` (event hooks) → tour.on("stepChange"…) or beforeEnter/afterLeave');
        else todos.push(`\`${name}\` has no direct equivalent`);
      }
      return { properties: out, todos };
    },
  );
  const flag =
    'new Shepherd.Tour() + addStep() → createTour({ id, steps: [ …the step objects… ] }) + <Tour.Root tour={tour}> with your tour UI';
  flagImport(j, root, 'shepherd.js', flag);
  flagImport(j, root, 'react-shepherd', flag);
  return changed ? root.toSource({ quote: 'single' }) : null;
}

export const parser = 'tsx';
