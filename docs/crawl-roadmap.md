# Crawl & Send Roadmap (Phase 1 Focus)

_Last updated: 2025-09-23_

## Goals

- Ship a minimal, reliable crawl → sanitize → send loop before layering optimizations.
- Log real-world gaps to justify future features (workers, adaptive throttling, encryption, DevTools panel).

## Current Scope (Phase 1)

- **Extraction**: `Readability` primary parser, fallback to basic `<main>/<article>` scraping.
- **Sanitization**: Allowlist structural nodes, redact email/credit-card patterns only.
- **Consent**: Use existing options scaffold for install-time opt-in; block crawling until granted.
- **Triggers**: Fire once after `DOMContentLoaded` with 3 s debounce, plus manual “re-crawl” control in the popup.
- **Queue**: Keep at most 5 sanitized snapshots (~250 KB each) in `chrome.storage.local` until backend ingestion path is ready.
- **Telemetry**: `console.info` breadcrumbs (no structured logging yet).

## Acceptance Checks

1. Crawl succeeds on the three stakeholder URLs listed below.
2. Sanitizer removes PII patterns on provided fixtures.
3. Consent toggle prevents crawl until enabled.

### Stakeholder URLs (expandable list)

- `https://example.com/article`
- `https://news.example.org/story`
- `https://blog.example.net/post`

## Deferred Features & Activation Triggers

| Feature                          | Deferred Until | Activation Signal                                                    |
| -------------------------------- | -------------- | -------------------------------------------------------------------- |
| Markdown conversion (`turndown`) | Phase 2+       | Backend requests markdown payloads; >30% of pages require formatting |
| Multi-strategy parser chain      | Phase 2+       | >20% crawl failures logged                                           |
| IndexedDB priority queue         | Phase 2        | Offline queue exceeds 5 pending items                                |
| Worker offload                   | Phase 3        | Heap usage >30 MB during crawl profiling                             |
| Token-based summaries            | Phase 3        | LLM API enforces token limits                                        |
| Message-level encryption         | Phase 3        | Server contract demands non-TLS encryption                           |
| DevTools monitoring panel        | Phase 4        | Support needs structured telemetry                                   |

## Open Questions

- Final API contract: HTML-only vs HTML + metadata.
- Consent UX: handled in options page or dedicated first-run modal?
- Sanitizer accuracy: do we need locale-specific rules beyond Phase 1?

## Next Steps

1. Finalize server payload contract (HTML + metadata vs markdown) with backend.
2. Prototype queue flush flow once API endpoint is available.
3. Gather user feedback on popup “Re-crawl Page” control.
