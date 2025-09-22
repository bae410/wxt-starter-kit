import { useState } from 'react';

import { BaseLayout } from '@/components/layouts/base-layout';

import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';

import { messageClient } from '@lib/messaging/client';

export const DevtoolsApp = () => {
  const [evaluation, setEvaluation] = useState<string>('');
  const [result, setResult] = useState<string>('');

  const evaluateInTab = async () => {
    const response = await messageClient.emit('devtools.evaluate', { code: evaluation });
    setResult(response.result);
  };

  return (
    <BaseLayout
      title="Developer Console"
      subtitle="Send arbitrary evaluations to the active tab for debugging"
      className="bg-white"
      actions={
        <Button
          variant="outline"
          onClick={() => setEvaluation('console.log("Hello from DevTools")')}
        >
          Example
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Evaluate Script</CardTitle>
          <CardDescription>
            Script runs in the context of the active tab via the background worker.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="h-32 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm"
            value={evaluation}
            onChange={(event) => setEvaluation(event.target.value)}
            placeholder="document.title"
          />
          <div className="flex items-center gap-2">
            <Button onClick={evaluateInTab}>Run</Button>
            <Button variant="outline" onClick={() => setResult('')}>
              Clear
            </Button>
          </div>
          {result && (
            <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">
              {result}
            </pre>
          )}
        </CardContent>
      </Card>
    </BaseLayout>
  );
};
