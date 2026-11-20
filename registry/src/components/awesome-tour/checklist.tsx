'use client';

import {
  Checklist,
  type ChecklistInstance,
  type ChecklistItemDefinition,
  type ChecklistRootProps,
  useStoreSelector,
  useTourMessages,
} from '@awesome-tour/react';
import { Check, ChevronRight, Lock, Minus, X } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ChecklistCard({ className, ...props }: ChecklistRootProps) {
  return (
    <Checklist.Root
      data-slot="checklist"
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-card p-4 text-sm text-card-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function ChecklistHeader({
  className,
  title,
  description,
  dismissible = true,
  titleId,
}: {
  className?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  dismissible?: boolean;
  /** Id for the heading, to label the root with `aria-labelledby`. */
  titleId?: string;
}) {
  const { dismissChecklist } = useTourMessages();
  return (
    <div data-slot="checklist-header" className={cn('flex items-start gap-2', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id={titleId} className="text-sm leading-none font-semibold">
          {title}
        </h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {dismissible && (
        <Checklist.Dismiss asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={dismissChecklist}
            className="-mt-1 -mr-1 text-muted-foreground"
          >
            <X />
          </Button>
        </Checklist.Dismiss>
      )}
    </div>
  );
}

/** Progress label + bar driven by `--checklist-progress`. */
function ChecklistProgressBar({ className }: { className?: string }) {
  const { checklistValue } = useTourMessages();
  return (
    <Checklist.Progress
      data-slot="checklist-progress"
      className={cn('flex flex-col gap-1.5', className)}
    >
      {({ completed, total }) => (
        <>
          <span className="text-xs text-muted-foreground tabular-nums">
            {checklistValue(completed, total)}
          </span>
          <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span className="block h-full w-[calc(var(--checklist-progress)*100%)] rounded-full bg-primary transition-[width] duration-500 ease-out" />
          </span>
        </>
      )}
    </Checklist.Progress>
  );
}

function ChecklistItems({ className, ...props }: React.ComponentProps<typeof Checklist.List>) {
  return (
    <Checklist.List
      data-slot="checklist-items"
      className={cn('-mx-2 flex flex-col gap-0.5', className)}
      {...props}
    />
  );
}

function ChecklistRow({
  value,
  title,
  description,
  className,
}: {
  value: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <Checklist.Item
      value={value}
      data-slot="checklist-row"
      className={cn(
        'group/item relative flex items-center gap-3 rounded-lg',
        // What to do next stands out; locked items recede until their turn.
        'data-[next]:bg-accent/60 data-[locked]:opacity-60',
        className,
      )}
    >
      <Checklist.ItemIndicator
        forceMount
        className={cn(
          'pointer-events-none absolute left-2 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors',
          'group-data-[state=done]/item:border-primary group-data-[state=done]/item:bg-primary group-data-[state=done]/item:text-primary-foreground',
          'group-data-[state=skipped]/item:border-muted-foreground/40 group-data-[state=skipped]/item:bg-muted',
          '[&_svg]:size-3 [&_svg]:stroke-3',
        )}
      >
        <Check className="hidden group-data-[state=done]/item:block" />
        <Minus className="hidden group-data-[state=skipped]/item:block" />
      </Checklist.ItemIndicator>
      <Checklist.ItemTrigger
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-lg py-2 pr-2 pl-10 text-left outline-none transition-colors',
          'hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'data-[locked]:cursor-not-allowed data-[locked]:hover:bg-transparent',
          'group-data-[state=done]/item:text-muted-foreground group-data-[state=done]/item:line-through group-data-[state=skipped]/item:text-muted-foreground',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">
            {title}
            <span className="ml-1.5 hidden text-[11px] font-normal text-muted-foreground group-data-[optional]/item:inline">
              Optional
            </span>
          </span>
          {description && (
            <span className="text-xs font-normal text-muted-foreground no-underline">
              {description}
            </span>
          )}
        </span>
        <Lock
          aria-hidden="true"
          className="hidden size-3.5 shrink-0 text-muted-foreground group-data-[locked]/item:block"
        />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 group-data-[state=done]/item:hidden group-data-[locked]/item:hidden" />
      </Checklist.ItemTrigger>
    </Checklist.Item>
  );
}

export interface ChecklistPanelProps extends Omit<ChecklistRootProps, 'children' | 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Item title / description, read from `meta` by default. */
  renderItem?: (item: ChecklistItemDefinition) => {
    title: React.ReactNode;
    description?: React.ReactNode;
  };
  /** Shown instead of the panel once dismissed. */
  reopenLabel?: React.ReactNode;
  children?: React.ReactNode;
}

const defaultRenderItem = (item: ChecklistItemDefinition) => ({
  title: (item.meta?.title as React.ReactNode) ?? item.id,
  description: item.meta?.description as React.ReactNode,
});

/** Items, grouped under their `section` titles when the checklist declares sections. */
function ChecklistSections({
  checklist,
  renderItem,
}: {
  checklist: ChecklistInstance;
  renderItem: NonNullable<ChecklistPanelProps['renderItem']>;
}) {
  const sections = useStoreSelector(checklist, (s) => s.sections);
  const items = checklist.getItems();
  if (sections.length === 0) {
    return (
      <ChecklistItems>
        {items.map((item) => (
          <ChecklistRow key={item.id} value={item.id} {...renderItem(item)} />
        ))}
      </ChecklistItems>
    );
  }
  const loose = items.filter((item) => !item.section);
  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => (
        <section
          key={section.id}
          aria-label={section.title ?? section.id}
          className="flex flex-col gap-1"
        >
          <p className="flex items-baseline justify-between text-xs font-medium text-muted-foreground">
            <span>{section.title ?? section.id}</span>
            <span className="tabular-nums">
              {section.completed}/{section.total}
            </span>
          </p>
          <ChecklistItems>
            {items
              .filter((item) => item.section === section.id)
              .map((item) => (
                <ChecklistRow key={item.id} value={item.id} {...renderItem(item)} />
              ))}
          </ChecklistItems>
        </section>
      ))}
      {loose.length > 0 && (
        <ChecklistItems>
          {loose.map((item) => (
            <ChecklistRow key={item.id} value={item.id} {...renderItem(item)} />
          ))}
        </ChecklistItems>
      )}
    </div>
  );
}

/** A complete onboarding checklist card, with a "Show checklist" button once dismissed. */
function ChecklistPanel({
  checklist,
  title = 'Getting started',
  description,
  renderItem = defaultRenderItem,
  reopenLabel = 'Show checklist',
  className,
  children,
  ...props
}: ChecklistPanelProps) {
  const dismissed = useStoreSelector(checklist as ChecklistInstance, (s) => s.dismissed);
  const titleId = `checklist-${checklist.id}-title`;
  if (dismissed) {
    return (
      <Button variant="outline" size="sm" onClick={() => checklist.restore()}>
        {reopenLabel}
      </Button>
    );
  }
  return (
    <ChecklistCard checklist={checklist} aria-labelledby={titleId} className={className} {...props}>
      <ChecklistHeader title={title} description={description} titleId={titleId} />
      <ChecklistProgressBar />
      <ChecklistSections checklist={checklist} renderItem={renderItem} />
      {children}
    </ChecklistCard>
  );
}

export {
  ChecklistCard,
  ChecklistHeader,
  ChecklistItems,
  ChecklistPanel,
  ChecklistProgressBar,
  ChecklistRow,
};
