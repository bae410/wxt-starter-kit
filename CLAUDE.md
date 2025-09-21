# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development**:

- `pnpm dev` - Start development server (Chrome, with auto-reload)
- `pnpm dev:firefox` / `pnpm dev:edge` - Start for other browsers
- `pnpm build` - Build for production (Manifest V3)
- `pnpm build:chrome` / `pnpm build:firefox` - Browser-specific builds
- `pnpm zip` - Create Web Store submission package

**Quality Assurance**:

- `pnpm lint` - ESLint validation
- `pnpm typecheck` - TypeScript type checking
- `pnpm test` - Run Vitest test suite
- `pnpm test:watch` - Watch mode for tests
- `pnpm format` - Prettier code formatting

**Testing Structure**:

- `tests/unit/` - Pure logic tests (storage, utilities)
- `tests/integration/` - Message bus and cross-component tests
- `tests/e2e/` - End-to-end extension behavior tests

## Architecture

### Convention-Based Entrypoints

WXT uses the `entrypoints/` directory structure to automatically generate the manifest. Each subdirectory or file becomes an extension component:

- `background.ts` → Service Worker
- `popup/` → Browser action popup
- `options/` → Extension options page
- `content/` → Content script with Shadow DOM React UI
- `sidepanel/` → Chrome 114+ side panel
- `devtools/` → DevTools panel

### Type-Safe Message Bus

The messaging system in `lib/messaging/` provides RPC-style communication between extension components:

- **Schema Definition**: `lib/messaging/schema.ts` defines all message types with request/response patterns
- **Bus Implementation**: `lib/messaging/bus.ts` handles runtime message routing with Promise-based responses
- **Usage Pattern**: `messageBus.emit('topic', payload)` returns typed responses

Key pattern: Register handlers in background script, emit from UI components.

### Storage Management

The storage system uses Zod schemas for type safety and Immer for immutable updates:

- **Schema**: `lib/storage/schema.ts` defines all storage keys with validation
- **Manager**: `lib/storage/manager.ts` provides CRUD operations with automatic defaults
- **Patterns**:
  - `storageManager.get(key)` for reading
  - `storageManager.set(key, value)` for writing
  - `storageManager.update(key, draft => {})` for Immer-based mutations

The manager automatically seeds defaults from Zod schemas and handles migrations.

### Content Script Architecture

Content scripts use Shadow DOM isolation:

- `entrypoints/content/index.ts` - Injection logic and message listeners
- `entrypoints/content/ui.tsx` - React UI rendered in Shadow DOM
- Receives `context.selection` messages from background via context menu

### Component Structure

React components are organized by scope:

- `components/ui/` - Reusable UI primitives (Button, Card, Badge)
- `components/features/` - Screen-specific components (PopupFeatures, OptionsFeatures)
- `components/layouts/` - Layout wrappers and containers

All entry points render their respective feature components from `components/features/`.

## Configuration

### Path Aliases

TypeScript and Vite are configured with these aliases:

- `@/` → Project root
- `@components/` → `./components/`
- `@lib/` → `./lib/`
- `@assets/` → `./assets/`
- `@entry/` → `./entrypoints/`

### Manifest Configuration

`wxt.config.ts` defines:

- Permissions: `storage`, `tabs`, `activeTab`, `scripting`
- Host permissions: `https://*/*`, `http://localhost/*`
- Icons and action configuration
- Development runner settings (opens DevTools, starts on example.com)

## Development Workflow

### Cross-Component Communication Flow

1. UI components emit messages via `messageBus.emit()`
2. Background script registers handlers via `messageBus.register()`
3. Storage updates trigger re-renders through React hooks
4. Activity logging flows to side panel via broadcast messages

### Testing Approach

- Mock Chrome APIs using Vitest mocks in test files
- Storage manager tests verify Zod schema validation and defaults
- Integration tests cover message bus request/response cycles
- E2E tests use placeholder structure for Playwright integration

### Code Quality

- ESLint enforces import ordering with path group prioritization
- Prettier handles formatting with lint-staged pre-commit hooks
- TypeScript strict mode with Chrome extension types
- Import resolution via TypeScript path mapping

## Key Patterns

### Message Handler Registration

```typescript
messageBus.register('topic.name', async (payload) => {
  // Handler logic
  return { response: 'data' };
});
```

### Storage Updates with Immer

```typescript
await storageManager.update('activity.history', (draft) => {
  draft.unshift(newEntry);
  if (draft.length > 50) draft.pop();
});
```

### Shadow DOM Content Script

Content scripts create isolated React roots in Shadow DOM containers to avoid style conflicts with host pages.
