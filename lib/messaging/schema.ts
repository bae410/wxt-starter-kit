import type { CrawlSnapshot, StorageValue } from '@lib/storage/schema';

export interface MessagePayloads {
  'settings:get': {
    response: { preferences: StorageValue<'user.preferences'> | undefined };
  };
  'settings:update': {
    request: { preferences: StorageValue<'user.preferences'> };
    response: { success: boolean };
  };
  'settings.toggle': {
    request: { enabled: boolean };
    response: { enabled: boolean };
  };
  'settings.sync': {
    response: { success: boolean };
  };
  'stats.refresh': {
    response: { blocked: number; enhanced: number };
  };
  'options.open': Record<string, never>;
  'activity.recorded': {
    payload: { timestamp: number; action: string };
  };
  'activity.clear': Record<string, never>;
  'devtools.evaluate': {
    request: { code: string };
    response: { result: string };
  };
  'context.selection': {
    payload: { text: string };
  };
  'page.event': {
    payload: Record<string, unknown>;
    response: { success: boolean; payload: Record<string, unknown> };
  };
  'crawler.capture': {
    payload: { reason?: 'manual' | 'retry' };
  };
  'crawler.snapshot': {
    request: { snapshot: CrawlSnapshot };
    response: { queued: boolean; reason?: 'too_large' | 'queue_full' | 'storage_error' };
  };
  'crawler.trigger': {
    request: { reason?: 'manual' | 'retry' };
    response: { dispatched: boolean };
  };
}

export type MessageTopics = keyof MessagePayloads;
