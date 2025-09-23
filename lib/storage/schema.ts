import { z } from 'zod';

const CrawlRedactionSchema = z.object({
  type: z.enum(['email', 'credit-card']),
  count: z.number().nonnegative(),
});

export const CrawlSnapshotSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  capturedAt: z.number(),
  source: z.enum(['readability', 'fallback']),
  sanitizedHtml: z.string(),
  text: z.string(),
  byline: z.string().nullable().optional(),
  lang: z.string().nullable().optional(),
  redactions: z.array(CrawlRedactionSchema).default([]),
});

export const CrawlQueueItemSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  attempts: z.number().default(0),
  snapshot: CrawlSnapshotSchema,
});

export const UserPreferencesSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('en'),
    notifications: z.boolean().default(true),
  })
  .default({});

export const ActivityHistorySchema = z
  .array(
    z.object({
      timestamp: z.number(),
      action: z.string(),
    }),
  )
  .default([]);

export const ExtensionStateSchema = z
  .object({
    blocked: z.number().default(0),
    enhanced: z.number().default(0),
  })
  .default({});

export const StorageSchema = {
  'user.preferences': UserPreferencesSchema,
  'extension.state': ExtensionStateSchema,
  'extension.enabled': z.boolean().default(true),
  'activity.history': ActivityHistorySchema,
  'crawler.queue': z.array(CrawlQueueItemSchema).default([]),
};

export type StorageKey = keyof typeof StorageSchema;
export type StorageValue<K extends StorageKey> = z.infer<(typeof StorageSchema)[K]>;

export type CrawlSnapshot = z.infer<typeof CrawlSnapshotSchema>;
export type CrawlQueueItem = z.infer<typeof CrawlQueueItemSchema>;
