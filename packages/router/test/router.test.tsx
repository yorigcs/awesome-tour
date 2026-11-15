import { createTour, type RouterAdapter, Tour, TourProvider } from '@awesome-tour/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReactRouterAdapter } from '../src/react-router';
import { useTanStackRouterAdapter } from '../src/tanstack-router';

afterEach(cleanup);

const makeTour = () =>
  createTour({
    id: `multi-${Math.random()}`,
    steps: [
      { id: 'home', target: '#home', title: 'Home' },
      { id: 'settings', route: '/settings', target: '#settings', title: 'Settings' },
      { id: 'project', route: '/projects/:id', target: '#project', title: 'Project' },
    ],
  });

function TourUI() {
  return (
    <Tour.Portal>
      <Tour.Content>
        <Tour.Title />
        <Tour.Next>Next</Tour.Next>
      </Tour.Content>
    </Tour.Portal>
  );
}

function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

describe('React Router adapter', () => {
  function Shell({ tour }: { tour: ReturnType<typeof makeTour> }) {
    const router = useReactRouterAdapter();
    return (
      <TourProvider tours={[tour]} router={router}>
        <Tour.Root tourId={tour.id}>
          <Path />
          <Routes>
            <Route path="/" element={<div id="home">home</div>} />
            <Route path="/settings" element={<div id="settings">settings</div>} />
            <Route path="/projects/:id" element={<div id="project">project</div>} />
          </Routes>
          <TourUI />
        </Tour.Root>
      </TourProvider>
    );
  }

  it('navigates between routes and matches params', async () => {
    const tour = makeTour();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Shell tour={tour} />
      </MemoryRouter>,
    );
    await act(() => tour.start());
    await screen.findByRole('dialog', { name: 'Home' });

    await userEvent.click(screen.getByText('Next'));
    await screen.findByRole('dialog', { name: 'Settings' });
    expect(screen.getByTestId('path')).toHaveTextContent('/settings');
    expect(tour.getState().targets[0]).toBe(document.getElementById('settings'));
  });

  it('treats a param route as matching when already there', async () => {
    const tour = makeTour();
    render(
      <MemoryRouter initialEntries={['/projects/42']}>
        <Shell tour={tour} />
      </MemoryRouter>,
    );
    await act(() => tour.start({ stepId: 'project' }));
    await screen.findByRole('dialog', { name: 'Project' });
    expect(screen.getByTestId('path')).toHaveTextContent('/projects/42');
  });
});

describe('TanStack Router adapter', () => {
  it('navigates with the TanStack router', async () => {
    const tour = makeTour();
    function Layout() {
      const router = useTanStackRouterAdapter();
      return (
        <TourProvider tours={[tour]} router={router}>
          <Tour.Root tourId={tour.id}>
            <Outlet />
            <TourUI />
          </Tour.Root>
        </TourProvider>
      );
    }
    const root = createRootRoute({ component: Layout });
    const routeTree = root.addChildren([
      createRoute({
        getParentRoute: () => root,
        path: '/',
        component: () => <div id="home">home</div>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/settings',
        component: () => <div id="settings">settings</div>,
      }),
    ]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
    await screen.findByText('home');

    await act(() => tour.start());
    await screen.findByRole('dialog', { name: 'Home' });
    await userEvent.click(screen.getByText('Next'));
    await screen.findByRole('dialog', { name: 'Settings' });
    expect(router.state.location.pathname).toBe('/settings');
  });
});

describe('Next.js adapter', () => {
  it('uses usePathname / router.push', async () => {
    const listeners = new Set<() => void>();
    let pathname = '/';
    const push = vi.fn((path: string) => {
      pathname = path;
      for (const l of listeners) l();
    });
    vi.doMock('next/navigation', () => ({
      usePathname: () =>
        React.useSyncExternalStore(
          (l) => {
            listeners.add(l);
            return () => listeners.delete(l);
          },
          () => pathname,
        ),
      useRouter: () => ({ push }),
    }));
    const { useNextRouterAdapter } = await import('../src/next');

    let adapter!: RouterAdapter;
    function Probe() {
      adapter = useNextRouterAdapter({ scroll: false });
      return null;
    }
    render(<Probe />);
    expect(adapter.getPath()).toBe('/');
    await act(() => adapter.navigate('/settings'));
    expect(push).toHaveBeenCalledWith('/settings', { scroll: false });
    expect(adapter.getPath()).toBe('/settings');
    expect(adapter.match?.('/projects/:id', '/projects/7')).toBe(true);
  });
});
