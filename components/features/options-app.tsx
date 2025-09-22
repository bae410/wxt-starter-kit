import { BaseLayout } from '@/components/layouts/base-layout';
import { useAsyncTask } from '@/lib/hooks/use-async-task';
import { useStorage } from '@/lib/hooks/use-storage';

import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Switch } from '@components/ui/switch';

import { messageClient } from '@lib/messaging/client';

export const OptionsApp = () => {
  const {
    value: preferences,
    updateValue,
    loading,
  } = useStorage('user.preferences', {
    theme: 'system',
    language: 'en',
    notifications: true,
  });

  const syncTask = useAsyncTask(async () => {
    await messageClient.emit('settings.sync');
  });

  return (
    <BaseLayout
      title="Extension Settings"
      subtitle="Configure global behaviours, privacy controls, and advanced features"
      actions={
        <Button variant="outline" onClick={() => syncTask.run()} disabled={syncTask.loading}>
          Sync Now
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Control how the extension renders UI elements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700">Dark mode</span>
              <Switch
                checked={preferences?.theme === 'dark'}
                onCheckedChange={(checked) =>
                  updateValue((draft) => {
                    draft.theme = checked ? 'dark' : 'light';
                  })
                }
                disabled={loading}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose how and when you want to be notified.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700">Enable toast notifications</span>
              <Switch
                checked={Boolean(preferences?.notifications)}
                onCheckedChange={(checked) =>
                  updateValue((draft) => {
                    draft.notifications = checked;
                  })
                }
                disabled={loading}
              />
            </label>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  );
};
