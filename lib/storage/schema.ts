import { z } from 'zod';

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
};

export type StorageKey = keyof typeof StorageSchema;
export type StorageValue<K extends StorageKey> = z.infer<(typeof StorageSchema)[K]>;
