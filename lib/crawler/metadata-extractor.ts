import type { CrawlMetadata } from '@lib/storage/schema';

export interface MetascraperRunner extends CallableFunction {
  (input: { html: string; url: string }): Promise<Record<string, unknown>>;
}

export interface ExtractMetadataOptions {
  document: Document;
  html: string;
  url: string;
  baseMetadata: CrawlMetadata;
  metascraperRunner?: MetascraperRunner;
}

export interface ExtractMetadataResult {
  metadata: CrawlMetadata;
  durationMs: number | null;
}

export function getDefaultMetascraperRunner(): MetascraperRunner {
  return async (input) => {
    const runner = await loadMetascraperRunner();
    if (!runner) return {};
    return runner(input);
  };
}
export async function extractMetadata({
  document,
  html,
  url,
  baseMetadata,
  metascraperRunner = getDefaultMetascraperRunner(),
}: ExtractMetadataOptions): Promise<ExtractMetadataResult> {
  const hasPerformanceTimer = typeof performance?.now === 'function';
  const start = hasPerformanceTimer ? performance.now() : null;
  const metascraperResults = await runMetascraper(metascraperRunner, { html, url });
  const { metadata, runnerDuration } = mergeMetadata({
    document,
    html,
    baseMetadata,
    metascraperResults,
  });

  if (start !== null && hasPerformanceTimer) {
    const elapsed = Math.round(performance.now() - start);
    if (metadata.timings.metadataMs == null && Number.isFinite(elapsed)) {
      metadata.timings.metadataMs = elapsed;
    }
  }

  return {
    metadata,
    durationMs: runnerDuration,
  };
}

let metascraperRunnerPromise: Promise<MetascraperRunner | null> | null = null;

const METASCRAPER_MODULE_IDS = [
  'metascraper',
  'metascraper-author',
  'metascraper-date',
  'metascraper-image',
  'metascraper-lang',
  'metascraper-logo',
  'metascraper-publisher',
  'metascraper-title',
  'metascraper-url',
] as const;

type DynamicImportFn = (specifier: string) => Promise<unknown>;

let dynamicImportFn: DynamicImportFn | null = null;

function getDynamicImport(): DynamicImportFn {
  if (!dynamicImportFn) {
    dynamicImportFn = (specifier) => import(/* @vite-ignore */ specifier);
  }
  return dynamicImportFn;
}

function resolveDefault<T>(module: unknown): T {
  if (module && typeof (module as { default?: unknown }).default !== 'undefined') {
    return (module as { default: T }).default;
  }
  return module as T;
}

async function loadMetascraperRunner(): Promise<MetascraperRunner | null> {
  if (!isNodeEnvironment()) return null;
  if (!metascraperRunnerPromise) {
    metascraperRunnerPromise = importMetascraperRunner();
  }

  try {
    return await metascraperRunnerPromise;
  } catch (error) {
    console.warn('[metadata] metascraper unavailable in this environment', error);
    metascraperRunnerPromise = null;
    return null;
  }
}

async function importMetascraperRunner(): Promise<MetascraperRunner | null> {
  const dynamicImport = getDynamicImport();
  const [
    metascraperModule,
    authorModule,
    dateModule,
    imageModule,
    langModule,
    logoModule,
    publisherModule,
    titleModule,
    urlModule,
  ] = await Promise.all(METASCRAPER_MODULE_IDS.map((specifier) => dynamicImport(specifier)));

  const metascraperFactory =
    resolveDefault<(plugins: unknown[]) => MetascraperRunner>(metascraperModule);

  return metascraperFactory([
    resolveDefault<() => unknown>(authorModule)(),
    resolveDefault<() => unknown>(dateModule)(),
    resolveDefault<() => unknown>(imageModule)(),
    resolveDefault<() => unknown>(langModule)(),
    resolveDefault<() => unknown>(logoModule)(),
    resolveDefault<() => unknown>(publisherModule)(),
    resolveDefault<() => unknown>(titleModule)(),
    resolveDefault<() => unknown>(urlModule)(),
  ]) as MetascraperRunner;
}

function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && typeof process.versions?.node === 'string';
}

async function runMetascraper(
  runner: MetascraperRunner,
  input: { html: string; url: string },
): Promise<Record<string, unknown>> {
  try {
    return await runner(input);
  } catch (error) {
    console.warn('[metadata] metascraper execution failed', error);
    return {};
  }
}

interface MergeMetadataParams {
  document: Document;
  baseMetadata: CrawlMetadata;
  metascraperResults: Record<string, unknown>;
}

interface MergeMetadataResult {
  metadata: CrawlMetadata;
  runnerDuration: number | null;
}

function mergeMetadata({
  document,
  baseMetadata,
  metascraperResults,
}: MergeMetadataParams): MergeMetadataResult {
  const metadata: CrawlMetadata = {
    ...structuredClone(baseMetadata),
    metaTags: mergeMetaTags(baseMetadata.metaTags, document, metascraperResults),
    openGraph: mergeOpenGraph(baseMetadata.openGraph, document, metascraperResults),
    twitter: mergeTwitter(baseMetadata.twitter, document, metascraperResults),
    structuredData: extractStructuredData(document, baseMetadata.structuredData),
    media: mergeMedia(baseMetadata.media, metascraperResults, document),
    timings: baseMetadata.timings,
  };

  const runnerDurationRaw = metascraperResults.__duration;
  const runnerDuration =
    typeof runnerDurationRaw === 'number' && Number.isFinite(runnerDurationRaw)
      ? runnerDurationRaw
      : null;

  metadata.timings.metadataMs = runnerDuration ?? metadata.timings.metadataMs ?? null;

  if (!metadata.core.language) {
    metadata.core.language =
      normalizeString(metascraperResults.lang) ?? detectDocumentLanguage(document);
  }

  metadata.core.contentType = metadata.core.contentType ?? guessContentType(metascraperResults);
  metadata.core.charset = metadata.core.charset ?? extractCharset(document);

  return { metadata, runnerDuration };
}
function mergeMetaTags(
  existing: CrawlMetadata['metaTags'],
  document: Document,
  metascraperResults: Record<string, unknown>,
): CrawlMetadata['metaTags'] {
  const metaDescription =
    normalizeString(metascraperResults.description) ?? queryMetaContent(document, 'description');
  const metaKeywords = extractKeywords(document);
  const author =
    normalizeString(metascraperResults.author) ??
    queryMetaContent(document, 'author') ??
    existing.author;
  const viewport = queryMetaContent(document, 'viewport') ?? existing.viewport;
  const robots = queryMetaContent(document, 'robots') ?? existing.robots;

  return {
    description: metaDescription ?? existing.description,
    keywords: metaKeywords.length ? metaKeywords : existing.keywords,
    author,
    viewport,
    robots,
  };
}

function mergeOpenGraph(
  existing: CrawlMetadata['openGraph'],
  document: Document,
  metascraperResults: Record<string, unknown>,
): CrawlMetadata['openGraph'] {
  const image = extractPrimaryImage(document, metascraperResults, existing.images[0]);

  return {
    title:
      normalizeString(metascraperResults['og:title']) ??
      queryMetaProperty(document, 'og:title') ??
      normalizeString(metascraperResults.title) ??
      existing.title,
    description:
      normalizeString(metascraperResults['og:description']) ??
      queryMetaProperty(document, 'og:description') ??
      normalizeString(metascraperResults.description) ??
      existing.description,
    type:
      normalizeString(metascraperResults['og:type']) ??
      queryMetaProperty(document, 'og:type') ??
      normalizeString(metascraperResults.type) ??
      existing.type,
    url:
      normalizeString(metascraperResults['og:url']) ??
      queryMetaProperty(document, 'og:url') ??
      normalizeString(metascraperResults.url) ??
      existing.url,
    siteName:
      normalizeString(metascraperResults['og:site_name']) ??
      queryMetaProperty(document, 'og:site_name') ??
      normalizeString(metascraperResults.publisher) ??
      existing.siteName,
    locale:
      normalizeString(metascraperResults['og:locale']) ??
      queryMetaProperty(document, 'og:locale') ??
      existing.locale,
    images: image ? [image] : existing.images,
  };
}

function mergeTwitter(
  existing: CrawlMetadata['twitter'],
  document: Document,
  metascraperResults: Record<string, unknown>,
): CrawlMetadata['twitter'] {
  return {
    card:
      normalizeString(metascraperResults['twitter:card']) ??
      queryMetaProperty(document, 'twitter:card') ??
      existing.card,
    site:
      normalizeString(metascraperResults['twitter:site']) ??
      queryMetaProperty(document, 'twitter:site') ??
      existing.site,
    creator:
      normalizeString(metascraperResults['twitter:creator']) ??
      queryMetaProperty(document, 'twitter:creator') ??
      existing.creator,
    title:
      normalizeString(metascraperResults['twitter:title']) ??
      queryMetaProperty(document, 'twitter:title') ??
      normalizeString(metascraperResults.title) ??
      existing.title,
    description:
      normalizeString(metascraperResults['twitter:description']) ??
      queryMetaProperty(document, 'twitter:description') ??
      normalizeString(metascraperResults.description) ??
      existing.description,
    image:
      normalizeString(metascraperResults['twitter:image']) ??
      normalizeString(metascraperResults['twitter:image:src']) ??
      queryMetaProperty(document, 'twitter:image') ??
      queryMetaProperty(document, 'twitter:image:src') ??
      existing.image,
  };
}
function extractStructuredData(
  document: Document,
  existing: CrawlMetadata['structuredData'],
): CrawlMetadata['structuredData'] {
  const jsonLdNodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  const nodes = jsonLdNodes
    .map((node) => {
      const raw = node.textContent?.trim();
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        const type = Array.isArray(parsed['@type'])
          ? parsed['@type']
          : parsed['@type']
            ? [parsed['@type']]
            : [];
        return {
          type,
          raw,
          parsed,
          source: 'json-ld',
        };
      } catch (error) {
        console.warn('[metadata] failed to parse json-ld node', error);
        return {
          type: [],
          raw,
          parsed: null,
          source: 'json-ld',
        };
      }
    })
    .filter((value): value is Exclude<typeof value, null> => Boolean(value));

  return nodes.length ? nodes : existing;
}
function mergeMedia(
  existing: CrawlMetadata['media'],
  metascraperResults: Record<string, unknown>,
  document: Document,
): CrawlMetadata['media'] {
  const imageUrl = normalizeString(metascraperResults.image);
  const logoUrl = normalizeString(metascraperResults.logo);
  const favicons = extractFavicons(document);

  return {
    images: imageUrl
      ? [{ url: imageUrl, type: null, width: null, height: null, size: null }]
      : existing.images,
    videos: existing.videos,
    favicons: favicons.length ? favicons : existing.favicons,
    logo: logoUrl
      ? {
          url: logoUrl,
          type: null,
          width: null,
          height: null,
          size: null,
        }
      : existing.logo,
  };
}
function queryMetaContent(document: Document, name: string): string | null {
  const node = document.head?.querySelector(`meta[name="${name}"]`);
  return node?.getAttribute('content')?.trim() || null;
}

function queryMetaProperty(document: Document, property: string): string | null {
  const node =
    document.head?.querySelector(`meta[property="${property}"]`) ??
    document.head?.querySelector(`meta[name="${property}"]`);
  return node?.getAttribute('content')?.trim() || null;
}

function extractKeywords(document: Document): string[] {
  const content = queryMetaContent(document, 'keywords');
  if (!content) return [];
  return content
    .split(',')
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
}

function extractPrimaryImage(
  document: Document,
  results: Record<string, unknown>,
  fallback?: CrawlMetadata['openGraph']['images'][number],
): CrawlMetadata['openGraph']['images'][number] | null {
  const url =
    normalizeString(results.image) ??
    normalizeString(results['og:image']) ??
    queryMetaProperty(document, 'og:image');
  if (!url) return fallback ?? null;

  return {
    url,
    secureUrl:
      normalizeString(results['og:image:secure_url']) ??
      queryMetaProperty(document, 'og:image:secure_url') ??
      fallback?.secureUrl ??
      null,
    type:
      normalizeString(results['og:image:type']) ??
      queryMetaProperty(document, 'og:image:type') ??
      fallback?.type ??
      null,
    width:
      parseDimension(results['og:image:width']) ??
      parseDimension(queryMetaProperty(document, 'og:image:width')) ??
      fallback?.width ??
      null,
    height:
      parseDimension(results['og:image:height']) ??
      parseDimension(queryMetaProperty(document, 'og:image:height')) ??
      fallback?.height ??
      null,
  };
}

function extractFavicons(document: Document): CrawlMetadata['media']['favicons'] {
  const links = Array.from(document.querySelectorAll('link[rel~="icon"]'));
  return links
    .map((link) => {
      const href = link.getAttribute('href');
      if (!href) return null;
      return {
        url: href,
        type: link.getAttribute('type'),
        rel: link.getAttribute('rel'),
        width: null,
        height: null,
        size: null,
      };
    })
    .filter((value): value is Exclude<typeof value, null> => Boolean(value));
}

function parseDimension(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function extractCharset(document: Document): string | null {
  const metaCharset = document.characterSet || document.charset;
  if (metaCharset) return metaCharset;
  const meta = document.querySelector('meta[charset]');
  return meta?.getAttribute('charset') ?? null;
}

function detectDocumentLanguage(document: Document): string | null {
  return document.documentElement.lang || null;
}

function guessContentType(results: Record<string, unknown>): string | null {
  if (typeof results.type === 'string') return results.type;
  if (typeof results['og:type'] === 'string') return results['og:type'] as string;
  return null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
