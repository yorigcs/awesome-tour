import { SampleBrowser } from '@loopwork';
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
  { name: 'night-drive', bpm: 92, status: 'Sketch' },
  { name: 'tape-dreams', bpm: 84, status: 'Mixing' },
  { name: 'rooftop-demo', bpm: 100, status: 'Bounced' },
];

const BOUNCES = Array.from({ length: 30 }, (_, i) => `night-drive v${30 - i}.wav`);

/** Integrated loudness bars (illustrative), loaded after a delay like a real measurement. */
const LOUDNESS = [-18, -14, -11, -9.5, -10, -9, -12];

export function Projects() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Library" description="Your projects, bounces and 400 samples." />
      <section className="grid gap-4 lg:grid-cols-3">
        <Card id="project-list" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>3 projects</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PROJECTS.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono tabular-nums">{p.bpm} BPM</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.status === 'Bounced' ? 'secondary' : 'outline'}>
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
            <CardTitle>Loudness</CardTitle>
            <CardDescription>Measured after each bounce.</CardDescription>
          </CardHeader>
          <CardContent>
            {loaded ? (
              <div id="loudness-widget" className="flex h-24 items-end gap-1.5">
                {LOUDNESS.map((lufs, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: static bars
                    key={i}
                    title={`${lufs} LUFS`}
                    className="flex-1 rounded-t bg-[var(--chart-2)]"
                    style={{ height: `${100 - (Math.abs(lufs) - 8) * 7}%` }}
                  />
                ))}
              </div>
            ) : (
              <div
                role="status"
                aria-busy="true"
                aria-label="Measuring loudness"
                className="flex flex-col gap-2"
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bounces</CardTitle>
            <CardDescription>A nested scroll container.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 overflow-y-auto rounded-md border" data-testid="scroller">
              {BOUNCES.map((label, i) => (
                <p
                  key={label}
                  id={i === 26 ? 'deep-item' : undefined}
                  className="border-b px-3 py-2 font-mono text-sm last:border-b-0 data-[deep]:bg-accent data-[deep]:font-medium"
                  data-deep={i === 26 ? '' : undefined}
                >
                  {label}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <SampleBrowser height={200} />
        </Card>
      </section>
    </div>
  );
}
