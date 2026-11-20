import { ExportPanel, Mixer } from '@loopwork';
import { Card } from '@/components/ui/card';
import { PageHeader } from '.';

export function Mix() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mix" description="Balance the channels, then bounce the loop." />
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="gap-0 py-0">
          <Mixer />
        </Card>
        <Card className="gap-0 py-0">
          <ExportPanel />
        </Card>
      </section>
    </div>
  );
}
