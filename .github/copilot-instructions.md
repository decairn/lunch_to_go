# Lunch To Go - AI Coding Instructions

## Project Overview
Alternative Lunch Money client with cross-platform deployment (Next.js web + Tauri desktop). Agent-based development approach with specialized AI roles documented in `AGENTS.md`. Progress tracked in `specs/tasks.md` with task IDs (e.g., P3-01).

## Architecture & Key Patterns

### Layered Service Architecture
- **API Layer** (`/lib/api/`): Client with error taxonomy (`ApiError` classes), Zod schemas for runtime validation
- **Domain Layer** (`/lib/domain/`): Unified account models normalizing Lunch Money assets + Plaid accounts
- **Storage Layer** (`/lib/storage/`): Platform-specific adapters (WebCrypto for web, Tauri commands for desktop)
- **State Layer** (`/lib/state/`): Zustand store with hydration pattern via `useAppHydration()` hook

### API Proxy Pattern (Critical)
All Lunch Money API calls flow through Next.js proxy (`/api/lunchmoney/[...path]/route.ts`):
- **Client-side**: Use relative URLs (`/api/lunchmoney/me`) with `createApiClient({ baseUrl: "/api/lunchmoney" })`
- **Proxy handles**: CORS, server-side auth, rate-limit header forwarding, Next.js 15 async params (`await context.params`)
- **Error normalization**: Returns consistent error taxonomy payloads

### Secure Storage Abstraction
Platform-specific credential storage accessed via unified interface:
```typescript
// Web: WebCrypto + IndexedDB encryption
const storage = getBrowserSecureStorage()
// Desktop: Windows Credential Locker via Tauri
const storage = getDesktopSecureStorage()
```

### Domain Modeling
`normalizeAccounts()` unifies disparate Lunch Money APIs into consistent interface:
- **Asset accounts**: Manual accounts from `/v1/assets`
- **Plaid accounts**: Bank-linked accounts from `/v1/plaid_accounts`
- **Liability detection**: Uses `LIABILITY_TYPE_TOKENS` array for negative balance classification
- **Currency handling**: Preserves both `primaryCurrencyBalance` and `accountCurrencyBalance`

## Development Workflows

### PowerShell Scripts (Required)
All CI/CD operations via Windows PowerShell in `/scripts/`:
```powershell
.\scripts\lint.ps1       # ESLint + Prettier
.\scripts\test.ps1       # Vitest unit tests
.\scripts\build-web.ps1  # Next.js production build
.\scripts\package-desktop.ps1  # Tauri desktop build
```

### Testing Strategy
- **Unit tests**: Vitest for API client, domain mappers, storage adapters
- **Component tests**: Playwright Component for UI components with mock data
- **Integration tests**: API proxy routes with mocked Lunch Money responses
- **Coverage tracking**: `specs/coverage-matrix.md` maps requirements to test types

### State Hydration Pattern
Components must call `useAppHydration()` before accessing store state:
```typescript
export default function Component() {
  useAppHydration() // Essential - loads persisted preferences
  const preferences = useAppStore(state => state.preferences)
  // ...
}
```

## Project-Specific Conventions

### Error Handling Taxonomy
Structured error classification with user-facing messages:
```typescript
// API client throws typed errors
try {
  await fetchMe(client)
} catch (error) {
  const apiError = error instanceof ApiError ? error : toApiError(error)
  const { title, description } = describeApiError(apiError)
  toast.error(title, { description })
}
```

### Task Management
Reference task IDs in commits and documentation:
- Format: `P{phase}-{number}` (e.g., P3-01 for Accounts guard)
- Update `specs/tasks.md` status when completing tasks
- Agent specialization per `AGENTS.md` ownership

### Theming & UI
- Shadcn UI components with `next-themes` provider
- Theme preference stored in Zustand store, applied via `setTheme()` effect
- All UI must support light/dark modes with system default

### Desktop Integration
Tauri commands in `src-tauri/src/commands.rs` bridge Rust secure storage:
```rust
#[tauri::command]
pub async fn store_api_key(api_key: String) -> Result<(), String>
```
Frontend calls via `invoke()` through storage abstraction layer.

## Key Files & Integration Points

### Critical Dependencies
- **Next.js 15**: App Router with async route params pattern
- **TanStack Query**: Data fetching with retry/invalidation
- **Zustand**: Persistent state with cross-platform storage
- **Tauri 2.x**: Desktop packaging with Rust command layer

### Configuration Files
- `app/components.json`: Shadcn UI component registry
- `src-tauri/tauri.conf.json`: Desktop packaging settings
- `specs/spec.md`: Authoritative technical specification
- `docs/Lunch_To_Go_Requirements.md`: Business requirements

### Testing Setup
- `app/vitest.config.ts`: Unit test configuration with setupFiles
- `app/src/**/__tests__/`: Co-located test files
- Mock API responses in test files, not separate fixtures

## Agent Collaboration
When contributing, identify your agent role from `AGENTS.md` and coordinate cross-agent changes through documentation updates in `specs/` folder. Always check `specs/tasks.md` for current implementation status before starting work.