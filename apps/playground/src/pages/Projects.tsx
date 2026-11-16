import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '.';

const PROJECTS = [
  { name: 'Website redesign', owner: 'Ana', status: 'In progress' },
  { name: 'Mobile app', owner: 'Bruno', status: 'Planning' },
  { name: 'Q3 analytics', owner: 'Carla', status: 'Done' },
];

export function Projects() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Projects" description="Everything your team is working on." />
      <section className="grid gap-4 lg:grid-cols-3">
        <Card id="project-list" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>3 active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PROJECTS.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.owner}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.status === 'Done' ? 'secondary' : 'outline'}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Loaded asynchronously.</CardDescription>
          </CardHeader>
          <CardContent>
            {loaded ? (
              <div id="analytics-widget" className="flex items-end gap-1.5 h-24">
                {[40, 65, 50, 80, 72, 95, 60].map((h, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: static bars
                    key={i}
                    className="flex-1 rounded-t bg-primary/80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            ) : (
              <div
                role="status"
                aria-busy="true"
                aria-label="Loading analytics"
                className="flex flex-col gap-2"
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>A nested scroll container.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 overflow-y-auto rounded-md border" data-testid="scroller">
              {Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`).map((label, i) => (
                <p
                  key={label}
                  id={i === 26 ? 'deep-item' : undefined}
                  className="border-b px-3 py-2 text-sm last:border-b-0 data-[deep]:bg-accent data-[deep]:font-medium"
                  data-deep={i === 26 ? '' : undefined}
                >
                  {label}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
