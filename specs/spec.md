# Lunch To Go – Detailed Specification

## 1. Product Overview

- **Purpose**: Provide an **Accounts Tab**:
  - Guard state: if not connected, show callout explaining need to connect with button linking to Settings.
  - **Demo Data Feature**: When not connected, display a "Show Demo Data" button that:
    - Loads sample account data from `app/src/data/demo_accounts_data.csv`
    - Displays accounts list using the same UI components as live data
    - Calculates and shows net worth summary from demo data
    - Shows "Demo Data" badge instead of "Live data" indicator
    - Allows users to preview the application functionality without API key
    - Demo data includes representative account types: CASH, INVESTMENT, REAL ESTATE, CREDIT, LOAN
    - Demo accounts use anonymized institution names (Big Canadian Bank, Online Canadian Bank, Big US Bank)
  - Accounts Overview Card:
    - Action row with `Refresh` button, Sort select (Alphabetical A-Z, Balance High-Low), Currency select (Primary, Account).
    - Data source indicator: "Live data" badge when connected, "Demo Data" badge when using demo data
    - List grouped sections: "Assets", "Liabilities", each subdivided by account type headings.
    - Rows render as single-line list items with subtle divider separators and hover/focus highlight (no card chrome per-row).
    - Rows include account icon, display name, days since update (e.g., "Updated 3 days ago"), monetary value aligned right.
    - Institution name is surfaced via tooltip on the account name when available to preserve single-line layout.
    - Days-since-update text shifts to an amber tone when the account has been stale for more than seven days.
  - Net Worth Card: shows total assets, total liabilities, and net worth with icons and color cues (green positive, red negative).
  - Loading states: skeleton rows until first data load; empty-state messaging if no accounts.
- **Deployment Targets**: Responsive web app served by Next.js 15 and a Windows NSIS desktop application packaged with Tauri (WebView2 host + Rust command layer).
- **Reference Documentation**: Lunch Money API documentation at <https://lunchmoney.dev/>.

## 2. Personas & Use Cases

- **Primary Persona**: Lunch Money subscriber seeking clearer account lists and quick balance insights without modifying Lunch Money itself.
- **Key Use Cases**:
  - Authenticate with a personal API key and confirm connectivity.
  - Review account balances grouped by assets/liabilities with optional sorting by balance.
  - Toggle between balances expressed in the user’s primary currency vs. the native account currency.
  - Refresh data on demand without re-entering credentials.
  - Persist preferences (sorting, currency view, theme) across sessions on both web and desktop builds.

## 3. In-Scope Features

- Two-tab navigation (Settings, Accounts) with consistent header branding (“Lunch To Go”).
- Settings workflows for API key connect/delete, user profile display, theme toggle, and accent color palette selection (black default plus blue, green, orange, red, rose, violet, yellow).
- Accounts workflows for guarded access, refresh, grouping, sorting, currency toggle, and net worth summary.
- Secure credential storage tailored to platform: WebCrypto (web) and Windows Credential Locker via Tauri Rust commands (desktop).
- Deterministic retry and error taxonomy for all Lunch Money API calls.
- Manual CICD support scripts (lint, typecheck, test, build, package) runnable from PowerShell.

## 4. Out-of-Scope

- Non-Windows desktop builds (e.g., macOS, Linux).
- Lunch Money data modification; solution is read-only.
- Multi-language support (English-only requirement).
- External currency conversion services (not required because Lunch Money payloads include balances in both currencies).

## 5. System Architecture

- **Frontend Stack**: Next.js 15 (App Router) with TypeScript, Tailwind CSS, Shadcn UI components.
- **State & Data**:
  - TanStack Query for API data fetching, caching, invalidation, and retry policies.
  - Zustand (or React Context) for persisted UI preferences and connection status.
  - Shared domain models in `/lib/domain` unify Lunch Money assets and Plaid account payloads.
- **Desktop Packaging**:
  - Tauri 2.x project wraps the Next.js build.
  - Rust-side commands expose secure credential storage via Windows Credential Locker integration.
  - WebView2 runtime embeds the built Next.js UI; static assets served locally by Tauri asset server.
  - Package format: Windows NSIS installer for per-machine distribution and installation.
  - Debug/Release configurations with separate product names and identifiers.
- **Storage**:
  - Web: API key encrypted with WebCrypto; cipher text and metadata stored in IndexedDB.
  - Desktop: API key stored securely via Windows Credential Locker (target: `LunchToGo_API_Key`) using DPAPI protection; preferences stored in Tauri `AppConfigDir` JSON.
  - Cross-platform storage abstraction unifies access patterns between web and desktop.
- **Configuration Files**: `.env.local` (web secrets), `tauri.conf.json` (desktop packaging), project docs in `specs/`.

## 6. Data & API Integration

- **Endpoints Used**:
  - `GET /v1/me` – authenticate and retrieve user profile (name, primary currency).
  - `GET /v1/assets` – fetch manual assets.
  - `GET /v1/plaid_accounts` – fetch Plaid-linked accounts.
- **Authentication**: API key provided via `Authorization: Bearer <API_KEY>` header.
- **Data Mapping**:
  - Normalize accounts to `{ id, name, accountType, type, isAsset, primaryCurrencyBalance, accountCurrencyBalance, accountCurrencyCode, primaryCurrencyCode, lastUpdated, iconKey }`.
  - Filter out accounts with `status = "closed"` during normalization to exclude inactive accounts from display.
  - **Override Plaid depository account types and treat as cash** for consistent categorization.
  - Treat liabilities as negative contributions without double inversion: liability balances are stored as negative values, net worth = sum of all normalized balances (assets are positive, liabilities are negative).
  - Leverage Lunch Money-provided `balance` (string format), `to_base` (primary currency conversion), `currency` (account currency), `institution_name`, `subtype`, `status`, and `last_autosync` fields.
- **Currency Handling**:
  - Simplified logic: `accountCurrencyCode = currency ?? primaryCurrency` (no complex inference)
  - Primary currency balance uses `to_base` field when available, falls back to `balance`
  - Account currency balance uses `balance` field (parsed from string format per API spec)
  - Defaults to user primary currency; alternate view uses account currency balances
  - When showing account currency, display tooltip `Converted to {PrimaryCurrencyAmount} at {AccountCurrencySymbol}1.00 = {PrimaryCurrencySymbol}{conversionRate}`.
  - Tooltips only appear when: (1) account has non-zero balance, (2) account currency differs from primary currency.
  - Currency formatting uses primary currency as 'home currency' - primary currency displays with clean symbol ($ for CAD primary, $ for USD primary), foreign currencies display with country prefix (US$ for USD when CAD primary, CA$ for CAD when USD primary).
  - Locale selection: Use en-CA locale for CAD primary currency users, en-US locale for USD primary currency users.
  - No external FX rate source needed.
- **Proxy & Transport**:
- **Web Platform**: The shared API client issues HTTPS requests directly to `https://api.lunchmoney.app/v1`, attaching the stored user API key and retrying with TanStack Query policies.
- **Desktop Platform**: Uses the same API client, sourcing the API key from the Windows Credential Locker adapter exposed by the Tauri command layer.
- Next.js 15 App Router components run entirely on the client for authenticated data flows; server actions focus on preference hydration and leave Lunch Money traffic to the shared fetch client.
  - API client adapts to platform context using base URL detection and relative path tolerance.
  - Both platforms forward rate-limit headers and maintain consistent error taxonomy payloads.
- **Caching & Refresh**:
  - TanStack Query caches responses; `Refresh` button triggers `refetch` with `staleTime = 0`.
  - Cache invalidated if API key is deleted or connection status flips to disconnected.

## 7. UI & Interaction Guidelines

- **Global Layout**:
  - Header: App icon + title, theme toggle accessible from any tab.
  - Tab shell: Shadcn `Tabs` with keyboard navigation (arrow keys, Enter/Space).
  - Content cards use Shadcn card primitives with responsive grid (stacked on <768px widths).
- **Initial App Routing**:
  - When no API key is defined or API key is defined but not connected, present the Settings tab.
  - When API key is connected, present the Accounts tab directly.
- **Settings Tab**:
  - API Key Card: includes helpful link to <https://my.lunchmoney.app/developers> for creating new API keys, text input (no masking, supports paste), Connect and Delete buttons, status pill (Connected / Not Connected).
  - Connection success triggers toast; failure shows error taxonomy (Authentication / Network / Parse).
  - User Data Card: display name (Title Case), primary currency (uppercase ISO code).
  - Theme Toggle: Shadcn switch bound to stored preference; instant UI update via CSS variables.
  - Accent Palette Select: color dropdown providing black (default), blue, green, orange, red, rose, violet, and yellow theme accents; stored preference updates Tailwind/Shadcn tokens immediately.
- **Accounts Tab**:
  - Guard state: if not connected, show callout explaining need to connect with button linking to Settings.
  - Accounts Overview Card:
    - Action row with `Refresh` button, Sort select (Alphabetical A-Z, Balance High-Low), Currency select (Primary, Account).
    - List grouped sections: "Assets", "Liabilities", each subdivided by account type headings.
    - Rows render as single-line list items with divider separators and hover/focus highlight (no per-row cards).
    - Rows include account icon, display name, days since update (e.g., "Updated 3 days ago"), monetary value aligned right.
    - Institution name appears via tooltip on the account name when available.
    - Days-since-update text shifts to an amber tone when the account has been stale for more than seven days.
  - Net Worth Card: shows total assets, total liabilities, and net worth with icons and color cues (green positive, red negative).
  - Loading states: skeleton rows until first data load; empty-state messaging if no accounts.

## 8. Error Handling & Telemetry

- **Error Taxonomy**:
  - AuthenticationError: invalid API key or 401/403 response.
  - NetworkError: connectivity failures, DNS, timeouts.
  - HttpError: non-success status codes not covered by auth (4xx/5xx).
  - ParseError: JSON decoding or schema validation issues.
- **Retry Policy**: Exponential backoff (e.g., 500ms, 1s, 2s) with max retries configurable per TanStack Query query.
- **User Feedback**: Toasts and inline messages differentiate error types; persistent banner prompts re-connection after auth failures.
- **Telemetry Hooks**: Structured log events (category, action, errorCode) for future instrumentation; avoid transmitting sensitive data.

## 9. Security & Privacy

- API key never logged or transmitted outside Lunch Money requests.
- WebCrypto-based encryption confirmed sufficient; key decrypted only in-memory when issuing requests.
- Windows credential storage uses OS-protected secrets; Rust commands sanitize logs.
- Clipboard paste is allowed, but deleting the key must wipe all stored credential data immediately.
- Cross-origin requests limited to Lunch Money API endpoint; Content Security Policy tightened in Next.js headers.
- Shared API utilities always call `https://api.lunchmoney.app/v1` with the stored API key; no server-side proxy is required at the moment.

## 10. Performance & Reliability Requirements

- Initial data fetch under 2 seconds on broadband; skeleton loaders mask network variability.
- UI remains responsive during refresh via asynchronous queries and suspense fallbacks.
- Memory footprint kept low by leveraging system WebView2 (no bundled Chromium).

## 11. Accessibility & UX Quality

- WCAG 2.1 AA targets: semantic HTML, ARIA labels for interactive elements, focus outlines preserved.
- Color contrast > 4.5:1 for text vs. background across light/dark themes.
- Keyboard navigation for tabs, buttons, selects, theme toggle, and tooltip focusable fallback.

## 12. Build, Packaging & Distribution

- **Scripts** (PowerShell wrappers in `/scripts` or root): `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm dev`, `pnpm playwright`, `cargo tauri build`, docs refresh.
- Web build: `next build` + `next start` (production) and `next dev` (development).
- Desktop build: `pnpm build` followed by `cargo tauri build`; distribution artifact as Windows NSIS installer using the Tauri bundler.
- Versioning & Releases: Git tags mapped to both web static export and desktop NSIS installer; release notes generated from `docs/`.

## 13. Testing Strategy

- **Unit Tests**: Vitest suites cover API client helpers, domain normalization, storage adapters, and telemetry utilities.
- **Component/Integration Tests**: React Testing Library (run with Vitest) validates guarded navigation, settings flows, demo data rendering, and skeleton states.
- **E2E Tests**: Playwright specs (`app/tests/e2e`) exercise demo mode, primary navigation, accessibility expectations, and performance budgets across Chromium and WebView2 channels.
- **Desktop Smoke Tests**: `scripts/smoke-test-desktop.ps1` installs the NSIS build, verifies Credential Locker access, and optionally exercises live Lunch Money endpoints.
- **Static Analysis**: ESLint (strict), TypeScript strict mode, and Tailwind-in-Prettier formatting ensure code quality; axe is executed through the Playwright accessibility spec.
- **Security & Dependency Scans**: Manual `pnpm audit --prod` and documented OWASP-style checklist run alongside release preparation.
- **Coverage Tracking**: `specs/coverage-matrix.md` links requirements to automated suites and manual validation steps.

## 14. Documentation & Operations

- Living documents: `specs/spec.md` (this file), `specs/plan.md`, `specs/tasks.md`, `specs/coverage-matrix.md` updated as work progresses.
- CLI usage logs captured when running scripts to aid manual CICD traceability.
- Secrets management guidance documented in `docs/` for contributors.

## 15. Open Questions & Decisions

- - All prior clarifications resolved; no open questions remain at this time.
