import { useTourAnchor } from '@awesome-tour/react';
import { LoopworkMark } from '@loopwork';
import { Box, FolderOpen, LayoutPanelTop, SlidersVertical } from 'lucide-react';
import { ChecklistPanel } from '@/components/awesome-tour/checklist';
import { cn } from '@/lib/utils';
import { navigate, usePath } from '../router';
import { gettingStarted } from '../tours';

const LINKS = [
  { href: '/', label: 'Arrange', icon: LayoutPanelTop },
  { href: '/library', label: 'Library', icon: FolderOpen },
  { href: '/mix', label: 'Mix', icon: SlidersVertical },
  { href: '/studio', label: 'Studio', icon: Box },
] as const;

export function AppSidebar() {
  const navRef = useTourAnchor<HTMLElement>('nav');
  const path = usePath();
  return (
    <aside className="flex flex-col gap-4 border-b bg-sidebar p-3 text-sidebar-foreground md:sticky md:top-0 md:h-svh md:border-r md:border-b-0">
      <nav ref={navRef} className="sidebar flex flex-col gap-1" aria-label="Main">
        <span className="mb-3 flex items-center gap-2 px-2 pt-1 font-semibold">
          <LoopworkMark className="size-7" />
          Loopwork
        </span>
        {LINKS.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            aria-current={path === href ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(href);
            }}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors outline-none',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </a>
        ))}
      </nav>
      <div className="mt-auto">
        <ChecklistPanel
          checklist={gettingStarted}
          className="checklist shadow-none"
          description="Your first session"
        />
      </div>
    </aside>
  );
}
