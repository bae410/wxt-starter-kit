# Comprehensive Metadata Collection Enhancement Plan (Metascraper + Readability)

_Last updated: 2025-09-24_

## Research Inputs

- context7 MCP workspace: curated crawl notes, rule coverage audits, and schema comparison matrix.
- Brave web search transcripts (Metascraper + Schema.org) collected via MCP web-search tool for fresh implementation references.
- [Metascraper documentation](https://github.com/microlinkhq/metascraper) — extraction rules for Open Graph, Twitter Cards, Schema.org (`metascraper`, `metascraper-author`, `metascraper-url`, etc.).
- [@mozilla/readability guide](https://github.com/mozilla/readability) — article parsing and content extraction guidance.
- Prior crawl scope in `docs/crawl-roadmap.md` — establishes current Readability-first pipeline and storage shape.

## Phase 1: Dependency & Runtime Setup

- Add `metascraper` core + rule packages (`metascraper-image`, `metascraper-author`, `metascraper-ld-json`, `metascraper-logo`, `metascraper-publisher`, `metascraper-title`, `metascraper-url`).
- Introduce a `metascraper-node` helper that runs in the content script context with controlled resource usage (Metascraper relies on `cheerio`/`htmlparser2`).
- Annotate helper with research links (context7 MCP + Brave search result IDs) for audit traceability.
- Define a feature flag (`experimental.metadata.enhanced`) to gate rollout while profiling bundle size.
- Pin dependency versions and document update cadence in context7 MCP to keep extraction rules current.

## Phase 2: Schema Expansion

- Update `@lib/storage/schema` to introduce `metadataV3` structure:
  - **core**: `url`, `capturedAt`, `source`, `contentType`, `language`, `charset`.
  - **metaTags**: `description`, `keywords`, `author`, `viewport`, `robots`.
  - **openGraph**: `title`, `description`, `type`, `url`, `siteName`, `locale`, `images[]` (with width/height/mime).
  - **twitter**: `card`, `site`, `creator`, `title`, `description`, `image`.
  - **structuredData**: unify JSON-LD, microdata, RDFa into normalized array of nodes with `{ type, raw, parsed, source }` (source = `context7`, `metascraper`, manual DOM).
  - **media**: `images`, `videos`, `favicons`, `logo` (resolved via Metascraper logo rule), including byte size estimates when available.
  - **timings**: `{ parseMs, metadataMs, totalMs }` for observability.
- Create `schemaVersion: 3` payload with migration path from V2 (fill new sections with defaults) and record schema notes in context7 MCP.

## Phase 3: Extraction Pipeline

- Introduce `@lib/crawler/metadata-extractor.ts`:
  - Accepts DOM snapshot + raw HTML string.
  - Executes Readability first to obtain canonical content fields (`title`, `byline`, `lang`, `text`, `length`).
  - Runs Metascraper using composable rules recommended via context7 MCP; fall back to Readability values when Metascraper omits fields.
  - Collects structured data: parse `<script type="application/ld+json">`, microdata annotations via Metascraper LD JSON rule, and maintain raw snippets alongside normalized objects.
  - Aggregates document-level attributes (`<html lang>`, `<meta charset>`, canonical link) via DOM queries; record extraction provenance (Metascraper vs manual) for each field.
  - Derives heuristics (word count, estimated reading time) post-sanitization.
- Extend `capturePageSnapshot` to stitch content + metadata results into `CrawlSnapshot` V3 while preserving sanitizer output.
- Stream extraction metrics (duration, rule hit counts) into MCP context7 logs for iterative tuning.

## Phase 4: Storage & Backward Compatibility

- Update `@lib/storage/manager` read/write logic to handle V2 ↔ V3 seamlessly.
- Implement a migration job (`migrateSnapshotsToV3`) invoked on extension startup:
  - Iterate stored queue items; if schemaVersion < 3, wrap with new `metadataV3` defaults.
  - Store empty arrays/objects to maintain predictable shape for downstream consumers.
  - Record migration summary in context7 MCP (item counts, failures).
- Document API contract change for backend ingestion (include new metadata blocks, maintain `content` structure).

## Phase 5: Observability & Error Handling

- Wrap Metascraper execution with timing + structured console debug logs (disabled in production builds via feature flag).
- Surface extraction failures (e.g., malformed JSON-LD) as warnings but continue with partial metadata; log sanitized error payloads to context7 MCP for follow-up.
- Track extraction coverage metrics for future dashboards (`metadata.counts` stored alongside snapshot for analytics pipeline); attribute rule matches to source references (context7 MCP vs Brave search docs).

## Phase 6: Testing & Validation

- Unit tests in `tests/lib/crawler/metadata-extractor.test.ts` using fixtures representing:
  - Rich Open Graph page, Twitter Card-only page, JSON-LD-heavy news article, microdata product page, minimal metadata blog.
  - Edge cases: invalid JSON-LD, missing charset, duplicated canonical tags, multiple locale variants.
- Integration test that exercises full `capturePageSnapshot` with mocked DOM/HTML, asserting merged metadata + content.
- Performance benchmark comparing extraction timing before/after Metascraper integration (target <150 ms on desktop budgets) with results stored in context7 MCP.
- Manual validation checklist against stakeholder URLs defined in `docs/crawl-roadmap.md` plus two additional e-commerce/news URLs surfaced from Brave search.

## Phase 7: Rollout Strategy

- Behind feature flag for initial beta testers; collect telemetry on extraction duration and payload size.
- Provide fallback toggle in options page (`Enable enhanced metadata collection`).
- Once stable, enable by default and plan Phase 2+ roadmap updates (e.g., Markdown payload).
- Maintain changelog of rule updates, schema adjustments, and performance regressions inside context7 MCP for future audits.
