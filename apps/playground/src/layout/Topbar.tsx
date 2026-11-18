import { useTour, useTourAnchor, useTourState } from '@awesome-tour/react';
import { useLoopworkApp } from '@loopwork';
import { Moon, Plus, RotateCcw, Search, Sparkles, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HelpLauncher } from '@/components/awesome-tour/launcher';
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
  const plan = useTourState((s) => (s.data as OnboardingData).plan);
  const app = useLoopworkApp().app;
  const createRef = useTourAnchor<HTMLButtonElement>('create');
  const [count, setCount] = useState(0);
  const [dark, setDark] = useDarkMode();
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="search"
          placeholder="Search sounds, projects…"
          aria-label="Search"
          className="pl-8"
          onChange={(e) => {
            if (e.target.value.length >= 3) gettingStarted.signal('searched');
          }}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Plan
        <select
          value={plan}
          onChange={(e) => {
            const next = e.target.value as OnboardingData['plan'];
            setData({ plan: next });
            app.setPlan(next);
          }}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="pro">pro</option>
          <option value="free">free</option>
        </select>
      </label>
      <Button
        ref={createRef}
        variant="outline"
        onClick={() => {
          setCount((c) => c + 1);
          gettingStarted.signal('pattern-created');
        }}
      >
        <Plus />
        New pattern{count ? ` (${count})` : ''}
      </Button>
      <Button onClick={() => start()}>
        <Sparkles />
        Start onboarding
      </Button>
      <Button variant="outline" onClick={() => start({ force: true })}>
        <RotateCcw />
        Restart
      </Button>
      <HelpLauncher
        side="bottom"
        className="relative right-auto bottom-auto size-9 shadow-none"
        tours={[
          { tour: 'onboarding', title: 'Studio tour', description: 'The essentials in a minute.' },
          {
            tour: 'css-tour',
            title: 'CSS-only tour',
            description: 'A declarative, non-modal tour.',
          },
        ]}
        links={[{ title: 'Documentation', href: 'https://yorigcs.github.io/awesome-tour/' }]}
      />
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
