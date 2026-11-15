import * as React from 'react';
import { Slot } from './slot';

const NODES = ['div', 'button', 'span', 'h2', 'p', 'ol', 'li', 'svg', 'textarea'] as const;
type Node = (typeof NODES)[number];

export type PrimitivePropsWithRef<E extends React.ElementType> = React.ComponentPropsWithRef<E> & {
  /** Render the single child element instead, merging props and behavior onto it. */
  asChild?: boolean;
};

type Primitives = {
  [E in Node]: React.ForwardRefExoticComponent<PrimitivePropsWithRef<E>>;
};

export const Primitive = NODES.reduce((acc, node) => {
  // biome-ignore lint/correctness/noComponentHookFactories: static factory, runs once at module load
  const Comp = React.forwardRef((props: PrimitivePropsWithRef<typeof node>, ref) => {
    const { asChild, ...rest } = props as PrimitivePropsWithRef<typeof node>;
    const Tag: any = asChild ? Slot : node;
    return <Tag {...rest} ref={ref} />;
  });
  Comp.displayName = `Primitive.${node}`;
  (acc as Record<string, unknown>)[node] = Comp;
  return acc;
}, {} as Primitives);

export type PrimitiveProps<E extends Node> = React.ComponentPropsWithoutRef<(typeof Primitive)[E]>;
export type PrimitiveElement<E extends Node> = React.ComponentRef<(typeof Primitive)[E]>;
