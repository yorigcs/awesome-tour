import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePath } from '../router';
import { Home } from './Home';
import { Projects } from './Projects';

const Scene = lazy(() => import('./Scene').then((m) => ({ default: m.Scene })));

export function Page() {
  const path = usePath();
  if (path === '/projects') return <Projects />;
  if (path === '/3d')
    return (
      <section className="flex flex-col gap-4">
        <PageHeader
          title="3D scene"
          description="Tour targets inside a react-three-fiber canvas."
        />
        <div className="overflow-hidden rounded-xl border bg-card">
          <Suspense fallback={<Skeleton className="h-90 w-full rounded-none" />}>
            <Scene />
          </Suspense>
        </div>
      </section>
    );
  return <Home />;
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
