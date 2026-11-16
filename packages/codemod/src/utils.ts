import type {
  ASTPath,
  Collection,
  JSCodeshift,
  ObjectExpression,
  ObjectProperty,
  Property,
} from 'jscodeshift';

export type Prop = Property | ObjectProperty;

export const TODO = 'TODO(awesome-tour)';

/** Canonical key order for rewritten steps (the rest keep their order after these). */
const ORDER = ['id', 'target', 'route', 'title', 'description', 'content', 'side', 'align'];

export function keyName(prop: unknown): string | undefined {
  const p = prop as Prop;
  if (p.type !== 'Property' && p.type !== 'ObjectProperty') return undefined;
  if (p.key.type === 'Identifier') return p.key.name;
  if (p.key.type === 'StringLiteral' || p.key.type === 'Literal')
    return String((p.key as { value: unknown }).value);
  return undefined;
}

export function props(obj: ObjectExpression): Prop[] {
  return obj.properties.filter((p): p is Prop => keyName(p) !== undefined);
}

export function getProp(obj: ObjectExpression, name: string): Prop | undefined {
  return props(obj).find((p) => keyName(p) === name);
}

export function hasProps(obj: ObjectExpression, ...names: string[]) {
  return names.every((n) => getProp(obj, n));
}

export function stringValue(node: unknown): string | undefined {
  const n = node as { type: string; value?: unknown };
  return (n.type === 'StringLiteral' || n.type === 'Literal') && typeof n.value === 'string'
    ? n.value
    : undefined;
}

/** Maps `top-start` / `left` / `center` / `auto` placements to `{ side, align }`. */
export function placement(value: string): { side?: string; align?: string; center?: boolean } {
  if (value === 'center') return { center: true };
  if (value.startsWith('auto')) return {};
  const [side, align] = value.split('-');
  return { side, ...(align ? { align } : {}) };
}

export function prop(j: JSCodeshift, name: string, value: Prop['value']) {
  return j.objectProperty(j.identifier(name), value as never);
}

/** Leading `// TODO(awesome-tour): …` comment on a node. */
export function addTodo(j: JSCodeshift, node: { comments?: unknown[] | null }, text: string) {
  const comment = j.commentLine(` ${TODO}: ${text}`, true, false);
  node.comments = [...(node.comments ?? []), comment];
}

/** Rewrites matching step objects in place. `rewrite` returns the new properties. */
export function rewriteObjects(
  j: JSCodeshift,
  root: Collection,
  match: (obj: ObjectExpression) => boolean,
  rewrite: (
    obj: ObjectExpression,
    path: ASTPath<ObjectExpression>,
    index: number,
  ) => {
    properties: Prop[];
    todos: string[];
  },
): number {
  let count = 0;
  root.find(j.ObjectExpression).forEach((path) => {
    if (!match(path.node)) return;
    const parent = path.parent?.node as { type?: string; elements?: unknown[] } | undefined;
    const index =
      parent?.type === 'ArrayExpression' ? (parent.elements ?? []).indexOf(path.node) : count;
    const { properties, todos } = rewrite(path.node, path, index);
    const rank = (p: Prop) => {
      const i = ORDER.indexOf(keyName(p) ?? '');
      return i < 0 ? ORDER.length : i;
    };
    const ordered = [...properties].sort((a, b) => rank(a) - rank(b));
    const next = j.objectExpression(ordered as never);
    if (todos.length) addTodo(j, next, todos.join('; '));
    path.replace(next);
    count++;
  });
  return count;
}

/** Adds a TODO to `import … from '<source>'` declarations. */
export function flagImport(j: JSCodeshift, root: Collection, source: string, text: string) {
  root
    .find(j.ImportDeclaration)
    .filter((p) => p.node.source.value === source)
    .forEach((p) => {
      addTodo(j, p.node, text);
    });
}
