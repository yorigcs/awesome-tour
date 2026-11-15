import { useTour, useTourAnchor, useTourState } from '@awesome-tour/react';
import { Moon, Plus, RotateCcw, Search, Sparkles, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { gettingStarted, type OnboardingData } from '../tours';

function useDarkMode() {
  const [dark, setDark] = useState(
    () => typeof window !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  return [dark, setDark] as const;
}

export function Topbar() {
  const { start, setData } = useTour<OnboardingData>('onboarding');
  const role = useTourState((s) => (s.data as OnboardingData).role);
  const createRef = useTourAnchor<HTMLButtonElement>('create');
  const [count, setCount] = useState(0);
  const [dark, setDark] = useDarkMode();
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="search"
          placeholder="Search…"
          aria-label="Search"
          className="pl-8"
          onChange={(e) => {
            if (e.target.value.length >= 3) gettingStarted.signal('searched');
          }}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Role
        <select
          value={role}
          onChange={(e) => setData({ role: e.target.value as OnboardingData['role'] })}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="admin">admin</option>
          <option value="member">member</option>
        </select>
      </label>
      <Button
        ref={createRef}
        variant="outline"
        onClick={() => {
          setCount((c) => c + 1);
          gettingStarted.signal('project-created');
        }}
      >
        <Plus />
        New project{count ? ` (${count})` : ''}
      </Button>
      <Button onClick={() => start()}>
        <Sparkles />
        Start onboarding
      </Button>
      <Button variant="outline" onClick={() => start({ force: true })}>
        <RotateCcw />
        Restart
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={() => setDark((d) => !d)}
      >
        {dark ? <Sun /> : <Moon />}
      </Button>
    </header>
  );
}
