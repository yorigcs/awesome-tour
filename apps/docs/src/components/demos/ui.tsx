import { Tour, useTourState } from '@awesome-tour/react';
import type * as React from 'react';

/** A demo frame: title bar with actions, a body and an optional footer. */
export function Frame({
  title,
  actions,
  footer,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="not-content at-frame">
      <div className="at-frame__bar">
        <span className="at-frame__title">{title}</span>
        {actions}
      </div>
      <div className="at-frame__body">{children}</div>
      {footer && <div className="at-frame__footer">{footer}</div>}
    </div>
  );
}

/** A fake product UI used as the tour's playground. Ids are prefixed so demos can share a page. */
export function MockApp({ id, children }: { id: string; children?: React.ReactNode }) {
  return (
    <div className="at-app">
      <nav id={`${id}-nav`} className="at-app__nav" aria-label={`Demo navigation (${id})`}>
        <strong>Acme</strong>
        <span aria-current="page">Dashboard</span>
        <span>Projects</span>
        <span>Reports</span>
        <span>Settings</span>
      </nav>
      <div className="at-app__main">
        <div className="at-app__toolbar">
          <input
            id={`${id}-search`}
            className="at-input"
            placeholder="Search…"
            aria-label="Search"
          />
          <button id={`${id}-new`} type="button" className="at-button">
            New project
          </button>
        </div>
        <div className="at-grid">
          {['Revenue', 'Users', 'Churn'].map((label, i) => (
            <div key={label} id={`${id}-stat-${i + 1}`} className="at-tile">
              <small>{label}</small>
              <strong>{[48_210, 1_284, '2.1%'][i]}</strong>
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

function NextButton({ finish = 'Finish' }: { finish?: string }) {
  const isLast = useTourState((s) => s.progress.current >= s.progress.total);
  return <Tour.Next className="at-button at-button--primary">{isLast ? finish : 'Next'}</Tour.Next>;
}

/** The tour card used by most demos — composed from the unstyled primitives. */
export function TourCard({
  overlay = true,
  className = '',
  children,
}: {
  overlay?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Tour.Portal>
      {overlay && <Tour.Overlay padding={6} radius={10} />}
      <Tour.Content className={`at-card ${className}`} sideOffset={12} collisionPadding={12}>
        <Tour.Arrow className="at-arrow" width={14} height={7} />
        <CardBody>{children}</CardBody>
      </Tour.Content>
    </Tour.Portal>
  );
}

/** Header, title, description, step content and footer — reusable inside any Content. */
export function CardBody({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <header className="at-card__header">
        <Tour.Progress className="at-card__progress">
          {({ current, total }) => (
            <>
              <span>
                Step {current} of {total}
              </span>
              <span className="at-card__bar" aria-hidden="true" />
            </>
          )}
        </Tour.Progress>
        <Tour.Close className="at-icon-button" aria-label="Close tour">
          ✕
        </Tour.Close>
      </header>
      <Tour.Title className="at-card__title" />
      <Tour.Description className="at-card__description" />
      <Tour.StepContent />
      {children}
      <footer className="at-card__footer">
        <Tour.Prev className="at-button">Back</Tour.Prev>
        <div className="at-card__nav">
          <NextButton />
        </div>
      </footer>
    </>
  );
}
