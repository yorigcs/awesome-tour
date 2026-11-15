import { TourDevtools } from '@awesome-tour/devtools';
import { MotionContent, MotionOverlay } from '@awesome-tour/motion';
import {
  Checklist,
  Hotspot,
  Tour,
  TourProvider,
  useStoreSelector,
  useTour,
  useTourAnchor,
  useTourState,
} from '@awesome-tour/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { navigate, router, usePath } from './router';
import { eventLog, gettingStarted, type OnboardingData, onboarding } from './tours';

const Scene = lazy(() => import('./Scene').then((m) => ({ default: m.Scene })));

/* ------------------------------------------------------------------------------------------------
 * Tour UI — composed from unstyled primitives, styled in styles.css
 * ----------------------------------------------------------------------------------------------*/

function OnboardingUI() {
  const role = useTourState((s) => (s.data as OnboardingData).role);
  return (
    <Tour.Portal>
      <MotionOverlay padding={6} radius={10} />
      <MotionContent
        className="tour-card"
        preset="slide"
        sideOffset={14}
        collisionPadding={16}
        animateStepChange
      >
        <Tour.Arrow className="tour-arrow" width={16} height={8} />
        <header className="tour-card__header">
          <Tour.Progress className="tour-card__progress">
            {({ current, total }) => (
              <>
                <span>
                  Step {current} of {total}
                </span>
                <span className="tour-card__bar" aria-hidden="true" />
              </>
            )}
          </Tour.Progress>
          <Tour.Close className="tour-icon-button" aria-label="Close tour">
            ✕
          </Tour.Close>
        </header>
        <Tour.Title className="tour-card__title" />
        <Tour.Description className="tour-card__description" />
        <Tour.StepContent />
        <p className="tour-card__meta">Role: {role}</p>
        <footer className="tour-card__footer">
          <Tour.Skip className="tour-button tour-button--ghost">Skip tour</Tour.Skip>
          <div className="tour-card__nav">
            <Tour.Prev className="tour-button">Back</Tour.Prev>
            <NextButton />
          </div>
        </footer>
      </MotionContent>
    </Tour.Portal>
  );
}

function NextButton() {
  const isLast = useTourState((s) => s.progress.current >= s.progress.total);
  return (
    <Tour.Next className="tour-button tour-button--primary">{isLast ? 'Finish' : 'Next'}</Tour.Next>
  );
}

/** A second, CSS-only tour declared entirely in JSX. */
function CssTour() {
  return (
    <Tour.Root id="css-tour" modal={false}>
      <Tour.Trigger className="button">CSS-only tour</Tour.Trigger>
      <Tour.Step id="stats" target="#stats" title="Your numbers" side="bottom">
        <p className="tour-card__description">
          Declared with &lt;Tour.Step&gt;, animated with plain CSS keyframes.
        </p>
      </Tour.Step>
      <Tour.Step id="reports" target="#reports-card" title="Reports" side="top">
        <p className="tour-card__description">Non-modal tours leave the page usable.</p>
      </Tour.Step>
      <Tour.Portal>
        <Tour.Spotlight className="css-spotlight" padding={6} />
        <Tour.Content className="tour-card css-card" sideOffset={12}>
          <Tour.Arrow className="tour-arrow" width={16} height={8} />
          <Tour.Title className="tour-card__title" />
          <Tour.StepContent />
          <footer className="tour-card__footer">
            <Tour.Indicators className="tour-dots" />
            <div className="tour-card__nav">
              <Tour.Prev className="tour-button">Back</Tour.Prev>
              <Tour.Next className="tour-button tour-button--primary">Next</Tour.Next>
            </div>
          </footer>
        </Tour.Content>
      </Tour.Portal>
    </Tour.Root>
  );
}

/* ------------------------------------------------------------------------------------------------
 * App
 * ----------------------------------------------------------------------------------------------*/

function Sidebar() {
  const navRef = useTourAnchor<HTMLElement>('nav');
  const path = usePath();
  const links = [
    ['/', 'Home'],
    ['/projects', 'Projects'],
    ['/3d', '3D scene'],
  ] as const;
  return (
    <div className="sidebar-col">
      <nav ref={navRef} className="sidebar" aria-label="Main">
        <strong className="logo">Acme</strong>
        {links.map(([href, label]) => (
          <a
            key={href}
            href={href}
            aria-current={path === href ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(href);
            }}
          >
            {label}
          </a>
        ))}
      </nav>
      <ChecklistPanel />
    </div>
  );
}

function ChecklistPanel() {
  const { dismissed } = useStoreSelector(gettingStarted);
  if (dismissed) {
    return (
      <button
        type="button"
        className="button checklist-reopen"
        onClick={() => gettingStarted.restore()}
      >
        Show checklist
      </button>
    );
  }
  return (
    <Checklist.Root
      checklist={gettingStarted}
      className="checklist"
      aria-labelledby="checklist-title"
    >
      <header className="checklist__header">
        <h2 id="checklist-title">Getting started</h2>
        <Checklist.Dismiss className="tour-icon-button" aria-label="Dismiss checklist">
          ✕
        </Checklist.Dismiss>
      </header>
      <Checklist.Progress className="checklist__progress">
        {({ completed, total }) => (
          <>
            <span>
              {completed} of {total} done
            </span>
            <span className="checklist__bar" aria-hidden="true" />
          </>
        )}
      </Checklist.Progress>
      <Checklist.List className="checklist__list">
        {gettingStarted.getItems().map((item) => (
          <Checklist.Item key={item.id} value={item.id} className="checklist__item">
            <Checklist.ItemIndicator className="checklist__check" forceMount>
              ✓
            </Checklist.ItemIndicator>
            <Checklist.ItemTrigger className="checklist__trigger">
              {item.meta?.title as string}
            </Checklist.ItemTrigger>
          </Checklist.Item>
        ))}
      </Checklist.List>
      <button
        type="button"
        className="tour-button tour-button--ghost"
        onClick={() => gettingStarted.reset()}
      >
        Reset
      </button>
    </Checklist.Root>
  );
}

function AnalyticsLog() {
  const events = useStoreSelector(eventLog, (s) => s.events);
  return (
    <div className="card">
      <h2>Analytics events</h2>
      <ol className="event-log" data-testid="event-log">
        {events.length === 0 && <li className="event-log__empty">Start a tour to see events.</li>}
        {events.map((e) => (
          <li key={`${e.timestamp}-${e.type}-${e.stepId}`}>
            <code>{e.type}</code> {e.stepId && <span>· {e.stepId}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Header() {
  const { start, setData } = useTour<OnboardingData>('onboarding');
  const role = useTourState((s) => (s.data as OnboardingData).role);
  const createRef = useTourAnchor<HTMLButtonElement>('create');
  const [count, setCount] = useState(0);
  return (
    <header className="topbar">
      <input
        id="search"
        className="search"
        placeholder="Search…"
        aria-label="Search"
        onChange={(e) => {
          if (e.target.value.length >= 3) gettingStarted.signal('searched');
        }}
      />
      <label className="role">
        Role
        <select
          value={role}
          onChange={(e) => setData({ role: e.target.value as OnboardingData['role'] })}
        >
          <option value="admin">admin</option>
          <option value="member">member</option>
        </select>
      </label>
      <button
        ref={createRef}
        type="button"
        className="button"
        onClick={() => {
          setCount((c) => c + 1);
          gettingStarted.signal('project-created');
        }}
      >
        New project{count ? ` (${count})` : ''}
      </button>
      <button type="button" className="button button--primary" onClick={() => start()}>
        Start onboarding
      </button>
      <button type="button" className="button" onClick={() => start({ force: true })}>
        Restart
      </button>
    </header>
  );
}

function Home() {
  const role = useTourState((s) => (s.data as OnboardingData).role);
  return (
    <>
      <section id="stats" className="stats">
        {[1, 2, 3].map((n) => (
          <div key={n} id={`stat-${n}`} className="card stat">
            <span className="stat__label">Metric {n}</span>
            <strong>{n * 1234}</strong>
          </div>
        ))}
      </section>
      <section className="grid">
        <div id="reports-card" className="card">
          <h2>Reports</h2>
          <p>Weekly summaries for your team.</p>
          <Hotspot.Root target="#reports-card">
            <Hotspot.Beacon className="beacon" />
            <Hotspot.Portal>
              <Hotspot.Content className="tour-card hotspot-card" aria-label="New: reports">
                <strong>New!</strong> Export reports as PDF.
                <Hotspot.Close className="tour-icon-button" aria-label="Close hint">
                  ✕
                </Hotspot.Close>
              </Hotspot.Content>
            </Hotspot.Portal>
          </Hotspot.Root>
        </div>
        {role === 'admin' && (
          <div id="admin-panel" className="card">
            <h2>Admin</h2>
            <p>Members, billing and audit log.</p>
          </div>
        )}
        <div className="card">
          <CssTour />
        </div>
        <AnalyticsLog />
      </section>
    </>
  );
}

function Projects() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="grid">
      <div id="project-list" className="card">
        <h2>Projects</h2>
        <ul>
          <li>Website redesign</li>
          <li>Mobile app</li>
          <li>Q3 analytics</li>
        </ul>
      </div>
      <div className="card">
        {loaded ? (
          <div id="analytics-widget">
            <h2>Analytics</h2>
            <p>Loaded asynchronously.</p>
          </div>
        ) : (
          <p aria-busy="true">Loading analytics…</p>
        )}
      </div>
      <div className="card scroller" data-testid="scroller">
        {Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`).map((label, i) => (
          <p
            key={label}
            id={i === 26 ? 'deep-item' : undefined}
            className={i === 26 ? 'deep-item' : undefined}
          >
            {label}
          </p>
        ))}
      </div>
    </section>
  );
}

function Page() {
  const path = usePath();
  if (path === '/projects') return <Projects />;
  if (path === '/3d')
    return (
      <div className="card">
        <Suspense fallback={<p>Loading scene…</p>}>
          <Scene />
        </Suspense>
      </div>
    );
  return <Home />;
}

export function App() {
  return (
    <TourProvider tours={[onboarding]} router={router}>
      <Tour.Root tourId="onboarding">
        <div className="layout">
          <Sidebar />
          <main className="main">
            <Header />
            <Page />
          </main>
        </div>
        <OnboardingUI />
      </Tour.Root>
      {/* In an app: {import.meta.env.DEV && <TourDevtools />} — always on in the playground. */}
      <TourDevtools checklists={[gettingStarted]} position="bottom-right" />
    </TourProvider>
  );
}
