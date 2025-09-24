import { z } from 'zod';

const CrawlRedactionSchema = z.object({
  type: z.enum(['email', 'credit-card']),
  count: z.number().nonnegative(),
});

const CrawlSnapshotLegacySchema = z.object({
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

const CrawlSnapshotSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  metadata: z.object({
    url: z.string().url(),
    capturedAt: z.number(),
    source: z.enum(['readability', 'fallback']),
  }),
  content: z.object({
    title: z.string(),
    text: z.string(),
    sanitizedHtml: z.string(),
    byline: z.string().nullable(),
  }),
  processing: z.object({
    lang: z.string().nullable(),
    redactions: z.array(CrawlRedactionSchema).default([]),
  }),
});

const CrawlMetadataCoreSchema = z.object({
  url: z.string().url(),
  capturedAt: z.number(),
  source: z.enum(['readability', 'fallback']),
  contentType: z.string().nullable().default(null),
  language: z.string().nullable().default(null),
  charset: z.string().nullable().default(null),
});

const CrawlMetadataMetaTagsSchema = z.object({
  description: z.string().nullable().default(null),
  keywords: z.array(z.string()).default([]),
  author: z.string().nullable().default(null),
  viewport: z.string().nullable().default(null),
  robots: z.string().nullable().default(null),
});

const CrawlMetadataOpenGraphImageSchema = z.object({
  url: z.string().nullable().default(null),
  secureUrl: z.string().nullable().default(null),
  type: z.string().nullable().default(null),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
});

const CrawlMetadataOpenGraphSchema = z.object({
  title: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  type: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  siteName: z.string().nullable().default(null),
  locale: z.string().nullable().default(null),
  images: z.array(CrawlMetadataOpenGraphImageSchema).default([]),
});

const CrawlMetadataTwitterSchema = z.object({
  card: z.string().nullable().default(null),
  site: z.string().nullable().default(null),
  creator: z.string().nullable().default(null),
  title: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  image: z.string().nullable().default(null),
});

const CrawlStructuredDataNodeSchema = z.object({
  type: z.array(z.string()).default([]),
  raw: z.string().nullable().default(null),
  parsed: z.unknown().nullable().default(null),
  source: z.string().nullable().default(null),
});

const CrawlMediaResourceSchema = z.object({
  url: z.string().nullable().default(null),
  type: z.string().nullable().default(null),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
  size: z.number().nullable().default(null),
});

const CrawlFaviconResourceSchema = CrawlMediaResourceSchema.extend({
  rel: z.string().nullable().default(null),
});

const CrawlMetadataMediaSchema = z.object({
  images: z.array(CrawlMediaResourceSchema).default([]),
  videos: z.array(CrawlMediaResourceSchema).default([]),
  favicons: z.array(CrawlFaviconResourceSchema).default([]),
  logo: CrawlMediaResourceSchema.nullable().default(null),
});

const CrawlMetadataTimingsSchema = z.object({
  parseMs: z.number().nullable().default(null),
  metadataMs: z.number().nullable().default(null),
  totalMs: z.number().nullable().default(null),
});

const CrawlMetadataSchemaV3 = z.object({
  core: CrawlMetadataCoreSchema,
  metaTags: CrawlMetadataMetaTagsSchema.default({
    description: null,
    keywords: [],
    author: null,
    viewport: null,
    robots: null,
  }),
  openGraph: CrawlMetadataOpenGraphSchema.default({
    title: null,
    description: null,
    type: null,
    url: null,
    siteName: null,
    locale: null,
    images: [],
  }),
  twitter: CrawlMetadataTwitterSchema.default({
    card: null,
    site: null,
    creator: null,
    title: null,
    description: null,
    image: null,
  }),
  structuredData: z.array(CrawlStructuredDataNodeSchema).default([]),
  media: CrawlMetadataMediaSchema.default({
    images: [],
    videos: [],
    favicons: [],
    logo: null,
  }),
  timings: CrawlMetadataTimingsSchema.default({
    parseMs: null,
    metadataMs: null,
    totalMs: null,
  }),
});

export const CrawlSnapshotSchemaV3 = z.object({
  schemaVersion: z.literal(3),
  metadata: CrawlMetadataSchemaV3,
  content: z.object({
    title: z.string(),
    text: z.string(),
    sanitizedHtml: z.string(),
    byline: z.string().nullable(),
  }),
  processing: z.object({
    lang: z.string().nullable(),
    redactions: z.array(CrawlRedactionSchema).default([]),
  }),
});

const metadataDefaults = () => ({
  metaTags: {
    description: null,
    keywords: [],
    author: null,
    viewport: null,
    robots: null,
  },
  openGraph: {
    title: null,
    description: null,
    type: null,
    url: null,
    siteName: null,
    locale: null,
    images: [],
  },
  twitter: {
    card: null,
    site: null,
    creator: null,
    title: null,
    description: null,
    image: null,
  },
  structuredData: [] as Array<z.infer<typeof CrawlStructuredDataNodeSchema>>,
  media: {
    images: [] as Array<z.infer<typeof CrawlMediaResourceSchema>>,
    videos: [] as Array<z.infer<typeof CrawlMediaResourceSchema>>,
    favicons: [] as Array<z.infer<typeof CrawlFaviconResourceSchema>>,
    logo: null as z.infer<typeof CrawlMediaResourceSchema> | null,
  },
  timings: {
    parseMs: null as number | null,
    metadataMs: null as number | null,
    totalMs: null as number | null,
  },
});

export type CrawlMetadata = z.infer<typeof CrawlMetadataSchemaV3>;

export function createBaseMetadata({
  url,
  capturedAt,
  source,
  language,
  contentType,
  charset,
}: {
  url: string;
  capturedAt: number;
  source: z.infer<typeof CrawlMetadataCoreSchema>['source'];
  language?: string | null;
  contentType?: string | null;
  charset?: string | null;
}): CrawlMetadata {
  const defaults = metadataDefaults();
  return {
    core: {
      url,
      capturedAt,
      source,
      contentType: contentType ?? null,
      language: language ?? null,
      charset: charset ?? null,
    },
    metaTags: defaults.metaTags,
    openGraph: defaults.openGraph,
    twitter: defaults.twitter,
    structuredData: defaults.structuredData,
    media: defaults.media,
    timings: defaults.timings,
  };
}

const migrateLegacySnapshotToV2 = (
  legacy: z.infer<typeof CrawlSnapshotLegacySchema>,
): z.infer<typeof CrawlSnapshotSchemaV2> => ({
  schemaVersion: 2 as const,
  metadata: {
    url: legacy.url,
    capturedAt: legacy.capturedAt,
    source: legacy.source,
  },
  content: {
    title: legacy.title,
    text: legacy.text,
    sanitizedHtml: legacy.sanitizedHtml,
    byline: legacy.byline ?? null,
  },
  processing: {
    lang: legacy.lang ?? null,
    redactions: legacy.redactions ?? [],
  },
});

const migrateSnapshotV2ToV3 = (
  snapshot: z.infer<typeof CrawlSnapshotSchemaV2>,
): z.infer<typeof CrawlSnapshotSchemaV3> => {
  const baseMetadata = createBaseMetadata({
    url: snapshot.metadata.url,
    capturedAt: snapshot.metadata.capturedAt,
    source: snapshot.metadata.source,
    language: snapshot.processing.lang ?? null,
    contentType: 'article',
  });

  return {
    schemaVersion: 3 as const,
    metadata: {
      ...baseMetadata,
      metaTags: {
        ...baseMetadata.metaTags,
        author: snapshot.content.byline ?? null,
      },
    },
    content: snapshot.content,
    processing: snapshot.processing,
  };
};

export const CrawlSnapshotSchema = CrawlSnapshotSchemaV3;

const CrawlQueueItemLegacySchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  attempts: z.number().default(0),
  snapshot: CrawlSnapshotLegacySchema,
});

const CrawlQueueItemSchemaV2 = z.object({
  id: z.string(),
  createdAt: z.number(),
  attempts: z.number().default(0),
  schemaVersion: z.literal(2).default(2),
  snapshot: CrawlSnapshotSchemaV2,
});

export const CrawlQueueItemSchemaV3 = z.object({
  id: z.string(),
  createdAt: z.number(),
  attempts: z.number().default(0),
  schemaVersion: z.literal(3).default(3),
  snapshot: CrawlSnapshotSchemaV3,
});

const migrateQueueItemV2ToV3 = (
  item: z.infer<typeof CrawlQueueItemSchemaV2>,
): z.infer<typeof CrawlQueueItemSchemaV3> => ({
  id: item.id,
  createdAt: item.createdAt,
  attempts: item.attempts ?? 0,
  schemaVersion: 3,
  snapshot: migrateSnapshotV2ToV3(item.snapshot),
});

const migrateLegacyQueueItem = (
  legacy: z.infer<typeof CrawlQueueItemLegacySchema>,
): z.infer<typeof CrawlQueueItemSchemaV3> =>
  migrateQueueItemV2ToV3({
    id: legacy.id,
    createdAt: legacy.createdAt,
    attempts: legacy.attempts ?? 0,
    schemaVersion: 2,
    snapshot: migrateLegacySnapshotToV2(legacy.snapshot),
  });

const CrawlQueueItemStorageSchema = z.union([
  CrawlQueueItemSchemaV3,
  CrawlQueueItemSchemaV2.transform(migrateQueueItemV2ToV3),
  CrawlQueueItemLegacySchema.transform(migrateLegacyQueueItem),
]);

export const CrawlQueueItemSchema = CrawlQueueItemSchemaV3;

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
  'crawler.queue': z
    .array(CrawlQueueItemStorageSchema)
    .default([])
    .transform((items) => items as z.infer<typeof CrawlQueueItemSchemaV3>[]),
};

export type StorageKey = keyof typeof StorageSchema;
export type StorageValue<K extends StorageKey> = z.infer<(typeof StorageSchema)[K]>;

export type CrawlSnapshot = z.infer<typeof CrawlSnapshotSchema>;
export type CrawlQueueItem = z.infer<typeof CrawlQueueItemSchema>;
