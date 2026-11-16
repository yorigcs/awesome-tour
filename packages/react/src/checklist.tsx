import type {
  Checklist as ChecklistInstance,
  ChecklistItemDefinition,
  ChecklistItemStatus,
  ChecklistState,
} from '@awesome-tour/core';
import * as React from 'react';
import { useTourProvider } from './context';
import { useStoreSelector } from './hooks';
import { MessagesScope, type TourMessagesInput, useTourMessages } from './messages';
import { composeEventHandlers } from './utils/compose';
import { visuallyHidden } from './utils/hooks';
import { Primitive, type PrimitiveProps } from './utils/primitive';

interface ChecklistContextValue {
  checklist: ChecklistInstance;
  state: ChecklistState;
}

const ChecklistContext = React.createContext<ChecklistContextValue | null>(null);

function useChecklistContext(name: string) {
  const ctx = React.useContext(ChecklistContext);
  if (!ctx) throw new Error(`[awesome-tour] ${name} must be used within <Checklist.Root>`);
  return ctx;
}

/** State and actions of the nearest `Checklist.Root` (or of the given checklist). */
export function useChecklist(checklist?: ChecklistInstance) {
  const ctx = React.useContext(ChecklistContext);
  const instance = checklist ?? ctx?.checklist;
  if (!instance)
    throw new Error('[awesome-tour] `useChecklist` needs a checklist or <Checklist.Root>');
  const state = useStoreSelector(instance);
  return { checklist: instance, ...state };
}

function status(state: ChecklistState) {
  if (state.dismissed) return 'dismissed';
  return state.done ? 'complete' : 'in-progress';
}

/* -----------------------------------------------------------------------------------------------*/

export interface ChecklistRootProps extends PrimitiveProps<'div'> {
  checklist: ChecklistInstance;
  /** Re-check `when` predicates when the window regains focus. Default: true. */
  refreshOnFocus?: boolean;
  /** Translations for the checklist's accessible names and status text. */
  messages?: TourMessagesInput;
}

/**
 * Connects a checklist (from `createChecklist`) to the `TourProvider`'s tours and provides it to
 * the parts below. Renders a `div` with `data-state="in-progress|complete|dismissed"`.
 */
const ChecklistRoot = React.forwardRef<HTMLDivElement, ChecklistRootProps>(function ChecklistRoot(
  { checklist, refreshOnFocus = true, messages, ...props },
  ref,
) {
  const provider = useTourProvider();
  const state = useStoreSelector(checklist);

  React.useEffect(() => checklist.connect(provider?.manager), [checklist, provider]);
  React.useEffect(() => {
    checklist.refresh();
    if (!refreshOnFocus) return;
    const onFocus = () => checklist.refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checklist, refreshOnFocus]);

  return (
    <MessagesScope messages={messages}>
      <ChecklistContext.Provider value={{ checklist, state }}>
        <Primitive.div
          data-state={status(state)}
          data-completed={state.completed}
          data-total={state.total}
          {...props}
          ref={ref}
          style={{ '--checklist-progress': state.progress, ...props.style } as React.CSSProperties}
        />
      </ChecklistContext.Provider>
    </MessagesScope>
  );
});

/* -----------------------------------------------------------------------------------------------*/

export interface ChecklistProgressProps extends Omit<PrimitiveProps<'div'>, 'children'> {
  children?: React.ReactNode | ((state: ChecklistState) => React.ReactNode);
}

const ChecklistProgress = React.forwardRef<HTMLDivElement, ChecklistProgressProps>(
  function ChecklistProgress({ children, ...props }, ref) {
    const { state } = useChecklistContext('<Checklist.Progress>');
    const messages = useTourMessages();
    return (
      <Primitive.div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={state.total}
        aria-valuenow={state.completed}
        aria-valuetext={messages.checklistValue(state.completed, state.total)}
        aria-label={messages.checklistProgress}
        data-state={status(state)}
        {...props}
        ref={ref}
      >
        {typeof children === 'function'
          ? children(state)
          : (children ?? `${state.completed} / ${state.total}`)}
      </Primitive.div>
    );
  },
);

/* -----------------------------------------------------------------------------------------------*/

const ChecklistList = React.forwardRef<HTMLOListElement, PrimitiveProps<'ol'>>(
  function ChecklistList(props, ref) {
    useChecklistContext('<Checklist.List>');
    return <Primitive.ol {...props} ref={ref} />;
  },
);

interface ItemContextValue {
  item: ChecklistItemDefinition;
  status: ChecklistItemStatus;
  statusId: string;
}

const ItemContext = React.createContext<ItemContextValue | null>(null);

/** The item of the nearest `Checklist.Item`. */
export function useChecklistItem() {
  const ctx = React.useContext(ItemContext);
  const { checklist } = useChecklistContext('useChecklistItem');
  if (!ctx)
    throw new Error('[awesome-tour] `useChecklistItem` must be used within <Checklist.Item>');
  return {
    ...ctx,
    complete: () => checklist.complete(ctx.item.id),
    skip: () => checklist.skip(ctx.item.id),
    reset: () => checklist.reset(ctx.item.id),
    start: () => checklist.startItem(ctx.item.id),
  };
}

export interface ChecklistItemProps extends PrimitiveProps<'li'> {
  /** Item id, as declared in `createChecklist({ items })`. */
  value: string;
}

const ChecklistItem = React.forwardRef<HTMLLIElement, ChecklistItemProps>(function ChecklistItem(
  { value, ...props },
  ref,
) {
  const { checklist, state } = useChecklistContext('<Checklist.Item>');
  const item = checklist.getItem(value);
  const statusId = `checklist-status${React.useId().replace(/:/g, '')}`;
  if (!item) throw new Error(`[awesome-tour] Unknown checklist item "${value}"`);
  const itemStatus = state.items[value] ?? 'pending';
  return (
    <ItemContext.Provider value={{ item, status: itemStatus, statusId }}>
      <Primitive.li data-state={itemStatus} data-item={value} {...props} ref={ref} />
    </ItemContext.Provider>
  );
});

export interface ChecklistItemTriggerProps extends PrimitiveProps<'button'> {}

/** Starts the item's tour (if any). Add your own `onClick` for custom actions. */
const ChecklistItemTrigger = React.forwardRef<HTMLButtonElement, ChecklistItemTriggerProps>(
  function ChecklistItemTrigger({ onClick, ...props }, ref) {
    const { checklist } = useChecklistContext('<Checklist.ItemTrigger>');
    const ctx = React.useContext(ItemContext);
    if (!ctx)
      throw new Error(
        '[awesome-tour] <Checklist.ItemTrigger> must be used within <Checklist.Item>',
      );
    return (
      <Primitive.button
        type="button"
        aria-describedby={ctx.statusId}
        data-state={ctx.status}
        {...props}
        ref={ref}
        onClick={composeEventHandlers(onClick, () => {
          if (ctx.item.tour) void checklist.startItem(ctx.item.id);
        })}
      />
    );
  },
);

export interface ChecklistItemIndicatorProps extends PrimitiveProps<'span'> {
  /** Screen-reader text per status. */
  labels?: Partial<Record<ChecklistItemStatus, string>>;
  /** Render children even when the item is pending. */
  forceMount?: boolean;
}

/** Visual check mark (children shown when done/skipped) plus screen-reader status text. */
const ChecklistItemIndicator = React.forwardRef<HTMLSpanElement, ChecklistItemIndicatorProps>(
  function ChecklistItemIndicator({ labels, forceMount, children, ...props }, ref) {
    const ctx = React.useContext(ItemContext);
    const { itemStatus } = useTourMessages();
    if (!ctx)
      throw new Error(
        '[awesome-tour] <Checklist.ItemIndicator> must be used within <Checklist.Item>',
      );
    const text = { ...itemStatus, ...labels }[ctx.status];
    return (
      <Primitive.span data-state={ctx.status} {...props} ref={ref}>
        {(forceMount || ctx.status !== 'pending') && <span aria-hidden="true">{children}</span>}
        <span id={ctx.statusId} style={visuallyHidden}>
          {text}
        </span>
      </Primitive.span>
    );
  },
);

const ChecklistItemSkip = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(
  function ChecklistItemSkip({ onClick, ...props }, ref) {
    const { checklist } = useChecklistContext('<Checklist.ItemSkip>');
    const ctx = React.useContext(ItemContext);
    if (!ctx)
      throw new Error('[awesome-tour] <Checklist.ItemSkip> must be used within <Checklist.Item>');
    return (
      <Primitive.button
        type="button"
        {...props}
        ref={ref}
        onClick={composeEventHandlers(onClick, () => checklist.skip(ctx.item.id))}
      />
    );
  },
);

const ChecklistDismiss = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(
  function ChecklistDismiss({ onClick, ...props }, ref) {
    const { checklist } = useChecklistContext('<Checklist.Dismiss>');
    const { dismissChecklist } = useTourMessages();
    return (
      <Primitive.button
        type="button"
        aria-label={props.children ? undefined : dismissChecklist}
        {...props}
        ref={ref}
        onClick={composeEventHandlers(onClick, () => checklist.dismiss())}
      />
    );
  },
);

export const Checklist = {
  Root: ChecklistRoot,
  Progress: ChecklistProgress,
  List: ChecklistList,
  Item: ChecklistItem,
  ItemTrigger: ChecklistItemTrigger,
  ItemIndicator: ChecklistItemIndicator,
  ItemSkip: ChecklistItemSkip,
  Dismiss: ChecklistDismiss,
};

export {
  ChecklistDismiss,
  ChecklistItem,
  ChecklistItemIndicator,
  ChecklistItemSkip,
  ChecklistItemTrigger,
  ChecklistList,
  ChecklistProgress,
  ChecklistRoot,
};
