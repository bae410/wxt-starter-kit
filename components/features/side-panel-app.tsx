import { useEffect } from 'react';

import { BaseLayout } from '@/components/layouts/base-layout';
import { useStorage } from '@/lib/hooks/use-storage';

import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';

import { messageClient } from '@lib/messaging/client';

export const SidePanelApp = () => {
  const { value: history } = useStorage(
    'activity.history',
    [] as Array<{ timestamp: number; action: string }>,
  );

  useEffect(() => {
    const unsubscribe = messageClient.on('activity.recorded', ({ payload }) => {
      console.debug('[sidepanel] activity recorded', payload);
    });
    return unsubscribe;
  }, []);

  return (
    <BaseLayout
      title="Live Activity"
      subtitle="Monitor the actions the extension is taking in real time"
      className="bg-white"
      actions={
        <Button variant="outline" onClick={() => messageClient.emit('activity.clear')}>
          Clear
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history?.length ? (
            <ul className="space-y-2 text-sm">
              {history.map((entry, index) => (
                <li key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <div className="font-medium text-slate-900">{entry.action}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No activity recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </BaseLayout>
  );
};
