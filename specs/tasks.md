# Lunch To Go - Task Breakdown

## Status Legend

- `TODO`: Not started yet
- `WIP`: In progress
- `DONE`: Completed

## Phase 0 - Foundations

| ID    | Task                                                                                                                                            | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P0-01 | Scaffold Next.js 14 project with TypeScript, Tailwind, App Router, ESLint via `pnpm dlx create-next-app`                                        | DONE   |
| P0-02 | Install/configure Shadcn UI; generate base components (Tabs, Card, Button, Input, Switch, Select, Tooltip, Sonner)                              | DONE   |
| P0-03 | Define Tailwind design tokens and theme configuration for light/dark support                                                                    | DONE   |
| P0-04 | Configure Prettier (with Tailwind plugin), ESLint rules, and optional Stylelint integration                                                     | DONE   |
| P0-05 | Add optional Husky/task-runner hooks to drive PowerShell-based CICD scripts                                                                     | DONE   |
| P0-06 | Create PowerShell scripts (`lint.ps1`, `test.ps1`, `build-web.ps1`, `run_web.ps1`, `playwright.ps1`, `package-desktop.ps1`, `docs-refresh.ps1`) | DONE   |
| P0-07 | Produce shared icon set (favicon, web app icon, Tauri `.ico`) and integrate into web + desktop builds                                           | DONE   |
| P0-08 | Initialize Tauri project targeting Next.js output (`@tauri-apps/cli init --ci`)                                                                 | DONE   |
| P0-09 | Update docs (`specs/spec.md`, `specs/plan.md`, `specs/tasks.md`, `specs/coverage-matrix.md`) to capture foundation milestone                    | DONE   |

## Phase 1 - Core Services & State Infrastructure

| ID    | Task                                                                                                    | Status |
| ----- | ------------------------------------------------------------------------------------------------------- | ------ |
| P1-01 | Implement base API client (`/lib/api/client.ts`) with authentication headers and fetch helpers          | DONE   |
| P1-02 | Build typed endpoint wrappers for `/v1/me`, `/v1/assets`, `/v1/plaid_accounts` using runtime validation | DONE   |
| P1-03 | Create domain mappers (`/lib/domain/accounts.ts`) that unify Lunch Money assets and Plaid accounts      | DONE   |
| P1-04 | Define error taxonomy helpers (Authentication, Network, HTTP, Parse)                                    | DONE   |
| P1-05 | Configure TanStack Query provider with retry/backoff defaults                                           | DONE   |
| P1-06 | Implement preference storage abstraction with browser (IndexedDB + WebCrypto) adapter                   | DONE   |
| P1-07 | Stub Tauri secure storage adapter and commands pending desktop integration                              | DONE   |
| P1-08 | Introduce Zustand/Context store for verification state, user profile, and UI preferences                | DONE   |
| P1-09 | Implement initial app routing logic to present Settings tab when unverified, Accounts tab when verified | DONE   |
| P1-10 | Add unit tests covering API client error handling and domain normalization                              | DONE   |
| P1-11 | Finalize shared API configuration helpers (direct HTTPS base URL + platform adapter guards)             | DONE   |

## Phase 2 - Settings Experience

| ID    | Task                                                                                            | Status |
| ----- | ----------------------------------------------------------------------------------------------- | ------ |
| P2-01 | Build Settings UI shell with Shadcn Tabs/Cards including helpful API key creation link          | DONE   |
| P2-02 | Implement API key verification form and mutation to `/v1/me`                                    | DONE   |
| P2-03 | Persist verified API key, user profile, and status via storage abstraction                      | DONE   |
| P2-04 | Handle verification errors with taxonomy-driven messaging and toasts                            | DONE   |
| P2-05 | Implement delete/reset flow clearing stored credentials and cache                               | DONE   |
| P2-06 | Render user data card (Title Case name, uppercase currency) with reactive updates               | DONE   |
| P2-07 | Wire theme toggle with immediate UI update and persisted preference                             | DONE   |
| P2-08 | Add component/unit tests for settings flows                                                     | DONE   |
| P2-09 | Document completion in specs/tasks/docs                                                         | DONE   |
| P2-10 | Add accent color palette selector with predefined options, persistence, and immediate UI update | DONE   |

## Phase 3 - Accounts Experience

| ID    | Task                                                                                                                                                                                                                                  | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P3-01 | Guard Accounts route when API key unverified, including Settings CTA                                                                                                                                                                  | DONE   |
| P3-02 | Fetch real assets + Plaid data                                                                                                                                                                                                        | DONE   |
| P3-03 | Implement grouping by asset/liability and Account Type with alphabetical ordering                                                                                                                                                     | DONE   |
| P3-04 | Add sorting control (Alphabetical A-Z, Balance High-Low)                                                                                                                                                                              | DONE   |
| P3-05 | Add currency toggle between primary and account currency with tooltip conversions                                                                                                                                                     | DONE   |
| P3-06 | Display days-since-update and iconography per account/Account Type                                                                                                                                                                    | DONE   |
| P3-07 | Build Net Worth card with totals and color-coded net worth                                                                                                                                                                            | DONE   |
| P3-08 | Implement locale-aware currency formatting where primary currency is "home currency" (CAD primary sees $ for CAD, US$ for USD)                                                                                                        | DONE   |
| P3-09 | Filter out closed accounts from display to exclude inactive accounts from the accounts list                                                                                                                                           | DONE   |
| P3-10 | Change 'subtype' field to 'accountType' throughout codebase to match updated requirements terminology                                                                                                                                 | DONE   |
| P3-11 | Override Plaid depository account types and treat as cash for consistent categorization                                                                                                                                               | DONE   |
| P3-12 | **Demo Data Feature**: Add "Show Demo Data" button for disconnected state that loads sample accounts from `app/src/data/demo_accounts_data.csv`, displays using same UI components, shows "Demo Data" badge, and calculates net worth | DONE   |
| P3-13 | Introduce loading skeletons, empty states, and refresh invalidation                                                                                                                                                                   | TODO   |
| P3-14 | Add tests (unit/component/e2e) validating sorting and currency toggle (completed), net worth tests (completed)                                                                                                                        | DONE   |
| P3-15 | Make days-since-update label open Lunch Money Accounts externally when value > 0                                                                                                                                                      | DONE   |

## Phase 4 - Desktop Packaging & Secure Storage

| ID    | Task                                                                                                | Status |
| ----- | --------------------------------------------------------------------------------------------------- | ------ |
| P4-01 | Implement Tauri Rust commands for storing/retrieving/deleting API key via Windows Credential Locker | DONE   |
| P4-02 | Connect Tauri commands to frontend storage abstraction                                              | DONE   |
| P4-03 | Configure Tauri window/menu/icon settings for production                                            | DONE   |
| P4-04 | Ensure build pipeline runs `pnpm build` prior to `cargo tauri build`                                | DONE   |
| P4-05 | Create desktop smoke tests verifying verify/delete and accounts view                                | DONE   |
| P4-06 | Document desktop NSIS install/uninstall steps and security considerations                           | DONE   |

## Phase 5 - Quality, Telemetry, and Hardening

| ID    | Task                                                                                       | Status |
| ----- | ------------------------------------------------------------------------------------------ | ------ |
| P5-01 | Expand unit tests for edge cases (empty accounts, liabilities only, currency variance)     | DONE   |
| P5-02 | Configure Playwright e2e matrix for web (Chromium/WebView2) and desktop builds             | DONE   |
| P5-03 | Add structured logging hooks for error taxonomy events                                     | DONE   |
| P5-04 | Run accessibility audits (axe) and keyboard navigation QA                                  | DONE   |
| P5-05 | Profile performance (Lighthouse/WebView2) to ensure <2s initial fetch                      | DONE   |
| P5-06 | Conduct security review for CSP, HTTPS-only requests, and secret handling                  | DONE   |
| P5-07 | Update `specs/coverage-matrix.md` with full test mapping                                   | DONE   |
| P5-08 | Integrate OWASP-style security scanning and dependency CVE auditing into manual CI scripts | DONE   |

## Phase 6 - Release Operations

| ID    | Task                                                                       | Status |
| ----- | -------------------------------------------------------------------------- | ------ |
| P6-01 | Produce production web build and document deployment instructions          | N/A    |
| P6-02 | Build Windows NSIS installer via Tauri and validate install/upgrade/remove | DONE   |
| P6-03 | Compile release notes including features, issues, install steps            | DONE   |
| P6-04 | Update `docs/Lunch_To_Go_Requirements.md` with final status and repo link  | N/A    |
| P6-05 | Ensure PowerShell manual CICD run book is complete and logged              | DONE   |
| P6-06 | Archive spec/plan/tasks/coverage docs and capture stakeholder sign-off     | N/A    |

## Phase 7 - Public GitHub Release (Optional)

| ID    | Task                                                                                    | Status |
| ----- | --------------------------------------------------------------------------------------- | ------ |
| P7-01 | Select and document project license (MIT)                                               | DONE   |
| P7-02 | Polish README with install steps, screenshots, and Lunch Money references               | DONE   |
| P7-03 | Push code to public GitHub repo, tag releases, and enable Issues/Discussions as desired | DONE   |
| P7-04 | Publish GitHub release notes linking web build and desktop NSIS installer               | TODO   |
| P7-05 | Note completion or deferral of optional phase in project docs                           | TODO   |

## Cross-Cutting

| ID    | Task                                                                                                       | Status |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------ |
| CC-01 | Maintain `specs/tasks.md` with status updates as work progresses                                           | WIP    |
| CC-02 | Update `specs/coverage-matrix.md` in tandem with new/updated tests                                         | WIP    |
| CC-03 | Record CLI usage logs for manual CICD runs                                                                 | N/A    |
| CC-04 | Track design assets (icons, typography) and ensure consistency                                             | N/A    |
| CC-05 | Capture architectural decisions/changes in accompanying documentation                                      | N/A    |
| CC-06 | Fix currency conversion tooltip format from "Converted from" to "Converted to" per requirements compliance | DONE   |
| CC-07 | Optimize tooltip display logic - hide tooltips for zero balances and same-currency accounts                | DONE   |
