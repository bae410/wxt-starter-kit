import { Activity, RefreshCw, Settings2, ShieldCheck } from 'lucide-react';
import type { FC } from 'react';

import { useAsyncTask } from '@/lib/hooks/use-async-task';
import { useToggle } from '@/lib/hooks/use-storage';

import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Switch } from '@components/ui/switch';

import { messageClient } from '@lib/messaging/client';

const PopupApp: FC = () => {
  const [enabled, toggleEnabled] = useToggle('extension.enabled', true);
  const syncStats = useAsyncTask(async () => {
    const response = await messageClient.emit('stats.refresh');
    return response;
  });
  const triggerCrawl = useAsyncTask(async () => {
    const response = await messageClient.emit('crawler.trigger', { reason: 'manual' });
    return response;
  });

  const handleToggle = async () => {
    toggleEnabled();
    await messageClient.emit('settings.toggle', { enabled: !enabled });
  };

  return (
    <div className="w-[360px] min-h-[480px] p-4 bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-slate-900" />
          <h1 className="text-lg font-semibold">WXT Starter</h1>
        </div>
        <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? 'Active' : 'Paused'}</Badge>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">Protection</CardTitle>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </CardHeader>
        <CardContent className="space-y-3">
          <CardDescription>
            Toggle to enable or disable enhanced browsing features for the current extension
            session.
          </CardDescription>
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              icon={Activity}
              label="Blocked"
              value={syncStats.data?.blocked ?? 0}
              tone="danger"
            />
            <StatTile
              icon={Settings2}
              label="Enhanced"
              value={syncStats.data?.enhanced ?? 0}
              tone="primary"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => syncStats.run()}
              disabled={syncStats.loading}
              className="flex-1"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh Stats
            </Button>
            <Button
              onClick={() => triggerCrawl.run()}
              disabled={triggerCrawl.loading || !enabled}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Re-crawl Page
            </Button>
            <Button onClick={() => messageClient.emit('options.open')} variant="secondary">
              Open Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface StatTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: 'primary' | 'danger';
}

const StatTile: React.FC<StatTileProps> = ({ icon: Icon, label, value, tone }) => (
  <div
    className={`rounded-xl border p-4 ${tone === 'primary' ? 'border-sky-100 bg-sky-50' : 'border-rose-100 bg-rose-50'}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <span className="text-2xl font-semibold">{value}</span>
      </div>
      <Icon className={`w-6 h-6 ${tone === 'primary' ? 'text-sky-500' : 'text-rose-500'}`} />
    </div>
  </div>
);

export default PopupApp;
