/**
 * driver.js → awesome-tour. Rewrites `{ element, popover: { title, description, side, align } }`
 * steps and flags `driver()` usage.
 */
import type { API, FileInfo } from 'jscodeshift';
import { flagImport, getProp, keyName, type Prop, prop, props, rewriteObjects } from '../utils';

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const changed = rewriteObjects(
    j,
    root,
    (obj) => !!getProp(obj, 'popover'),
    (obj, _path, index) => {
      const out: Prop[] = [prop(j, 'id', j.stringLiteral(`step-${index + 1}`))];
      const todos: string[] = [];
      for (const p of props(obj)) {
        const name = keyName(p)!;
        if (name === 'element') out.push(prop(j, 'target', p.value));
        else if (name === 'popover' && p.value.type === 'ObjectExpression') {
          for (const q of props(p.value)) {
            const inner = keyName(q)!;
            if (['title', 'description', 'side', 'align'].includes(inner)) out.push(q);
            else if (inner === 'onNextClick' || inner === 'onPrevClick')
              todos.push(`\`${inner}\` → beforeLeave / advanceOn`);
            else todos.push(`popover \`${inner}\` → style your Tour.Content`);
          }
        } else if (name === 'onHighlightStarted' || name === 'onHighlighted') {
          out.push(prop(j, 'beforeEnter', p.value));
        } else if (name === 'onDeselected') out.push(prop(j, 'afterLeave', p.value));
        else todos.push(`\`${name}\` has no direct equivalent`);
      }
      return { properties: out, todos };
    },
  );
  flagImport(
    j,
    root,
    'driver.js',
    'driver({ steps }) → createTour({ id, steps }) + <Tour.Root tour={tour}> with your tour UI; drive() → tour.start()',
  );
  return changed ? root.toSource({ quote: 'single' }) : null;
}

export const parser = 'tsx';
