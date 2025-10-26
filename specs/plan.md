# Lunch To Go - Implementation Plan

## 1. Planning Assumptions

- Scope, architecture, and data integrations defined in `specs/spec.md`.
- Toolchain: Node 20+, pnpm, Next.js 16 (beta), TypeScript, Tailwind, Shadcn UI, TanStack Query, Zustand, Vitest, Playwright, Tauri 2.x with Rust 1.81+.
- Target platforms: Web (Next.js) and Windows desktop (Tauri + WebView2) delivering the same feature set.
- Documentation set: `docs/` for requirements, `specs/` for spec/plan/tasks/coverage, scripts for manual CICD.

## 2. Phase Overview

| Phase        | Goal                  | Key Deliverables                                                       |
| ------------ | --------------------- | ---------------------------------------------------------------------- |
| 0            | Foundations           | Repo scaffolding, lint/test/build scripts, doc updates, icon assets    |
| 1            | Core Services         | Lunch Money API client, domain mappers, secure storage abstractions    |
| 2            | Settings Experience   | Connect/delete flows, user data display, theme toggle & accent palette |
| 3            | Accounts Experience   | Data fetch, grouping, sorting, currency toggle, net worth              |
| 4            | Desktop Packaging     | Tauri shell, secure credential bridge, installers                      |
| 5            | Quality & Hardening   | Automated tests, accessibility, telemetry, error taxonomy              |
| 6            | Release Ops           | Docs, coverage matrix, build artifacts, release notes                  |
| 7 (optional) | Public GitHub Release | Publish repository, tagging, release notes on GitHub                   |

Each phase may overlap, but dependencies listed per section must be satisfied before exit.

## 3. Detailed Phases

### Phase 0 - Foundations

- **Objectives**: Stand up the mono-repo structure, tooling, and documentation to enable iterative delivery.
- **Tasks**:
  - Run `pnpm dlx create-next-app` with TypeScript, Tailwind, App Router, ESLint.
  - Install and configure Shadcn UI; generate base components (Tabs, Card, Button, Input, Switch, Select, Tooltip, Toast).
  - Configure Tailwind theme tokens to align with light/dark requirements.
  - Add formatting and linting: Prettier (with Tailwind plugin), ESLint (custom rule set), Stylelint if needed.
  - Introduce Husky or task runner hooks (optional) so manual CICD pipeline uses PowerShell scripts only.
  - Create `/scripts` PowerShell wrappers: `lint.ps1`, `test.ps1`, `build-web.ps1`, `run_web.ps1`, `playwright.ps1`, `package-desktop.ps1`, `docs-refresh.ps1`.
  - Produce app icon set (favicon, app icon, Tauri `.ico`) and wire into Next.js and Tauri builds.
  - Initialize Tauri project (`pnpm dlx tauri@latest init --ci`) pointing to Next.js build output.
  - Update documentation: `specs/spec.md`, `specs/plan.md`, start `specs/tasks.md` and `specs/coverage-matrix.md` skeletons.
- **Exit Criteria**:
  - Repo builds and lints cleanly (`pnpm lint`, `pnpm build`).
  - Tauri dev mode launches placeholder Next.js page.
  - Docs reflect foundation status (plan + task list populated with Phase 0 items).

### Phase 1 - Core Services & State Infrastructure

- **Objectives**: Build reusable modules that power both Settings and Accounts experiences.
- **Tasks**:
  - Implement `/lib/api/client.ts` handling base URL, headers, and typed responses.
  - Add `/lib/api/endpoints.ts` functions for `/v1/me`, `/v1/assets`, `/v1/plaid_accounts` with Zod (or similar) runtime validation.
  - Create domain models in `/lib/domain/accounts.ts` merging asset and Plaid payloads and emitting normalized account objects.
  - Override Plaid depository account types and treat as cash for consistent categorization.
  - Provide error taxonomy types (`AuthenticationError`, `NetworkError`, `HttpError`, `ParseError`) and helper for mapping fetch errors.
  - Set up TanStack Query provider in `app/layout.tsx` with retry/backoff configuration.
  - Implement preference storage abstraction with platform adapters (browser: IndexedDB + WebCrypto, desktop: Tauri plugin stub).
  - Introduce Zustand store (or Context) to hold connection status, user profile, sort/currency/theme preferences with hydration.
  - Implement initial app routing logic: present Settings tab when API key is disconnected, present Accounts tab when API key is connected.
  - Stub secure storage commands on the Tauri side (`src-tauri/src/commands.rs`) returning dummy values until implemented in Phase 4.
  - Finalize shared API platform helpers (desktop + web) that point directly at `https://dev.lunchmoney.app/v1` while injecting the stored API key.
  - Harden fetch utilities for browser and desktop contexts, including retry helpers and relative URL handling.
- **Exit Criteria**:
  - Unit tests cover API client error mapping and domain normalization.
  - Preference store persists and hydrates values in browser (local tests with mock storage).
  - Dummy UI (temporary page) can toggle preferences and fetch sample data (mocked).
  - Direct API client responds to `/v1/me` mock responses during development and is ready for authenticated production access.

### Phase 2 - Settings Experience

- **Objectives**: Deliver end-to-end settings workflow for API key connection, deletion, and user data display.
- **Tasks**:
  - Build Settings page shell using Shadcn Tabs and Card components, accessible by keyboard.
  - Add helpful link to <https://my.lunchmoney.app/developers> for users to create new API keys, opening in new window.
  - Implement API key input form with TanStack Query mutation that calls the shared API client against `/v1/me`.
  - On success: store API key via secure storage abstraction, persist connection status, user name, primary currency.
- On failure: map error taxonomy to toasts and inline alerts, prevent storing invalid keys.
- Add delete flow clearing storage, resetting state, and invalidating cached queries.
- Render user data card with name (Title Case) and currency (uppercase ISO).
- Integrate theme toggle, ensuring immediate UI change and persisted preference.
- Add accent color selector with predefined palettes (black default plus blue/green/orange/red/rose/violet/yellow) persisting preference and updating Tailwind tokens.
- Create toast/notification service (Shadcn Toast) for success/error messaging.
- Update docs/spec tasks to reflect completion; add tests for settings flows (unit + component).
- **Exit Criteria**:
  - Manual test: connecting a valid key stores credentials in the selected adapter and flips UI to Connected.
  - Component tests cover success and error states.
  - End-to-end test scenario automates connect/delete flows (web).

### Phase 3 - Accounts Experience

- **Objectives**: Provide full accounts view with grouping, sorting, currency toggle, net worth summary, and demo data preview capability.
- **Tasks**:
  - Guard Accounts route to redirect or prompt Settings when connection missing.
  - **Demo Data Integration**: Add "Show Demo Data" button for disconnected state that loads sample accounts from `app/src/data/demo_accounts_data.csv`, displays using same UI components as live data, shows "Demo Data" badge instead of "Live data", calculates net worth from demo data, allowing users to preview application functionality without API key.
  - Fetch assets + Plaid accounts via TanStack Query; reuse Phase 1 domain mapper.
  - Filter out closed accounts during data normalization to exclude inactive accounts from display.
  - Implement grouping by type (Asset vs Liability) and Account Type headings; ensure alphabetical ordering by default.
  - Add sorting control for alphabetical A-Z vs balance high-low using primary currency values.
  - Add currency control toggling between primary currency balances and account currency balances with tooltip conversion details.
  - Display days since last update and iconography per account/Account Type (plan icon mapping file).
  - Build Net Worth card summarizing totals and net difference; color-coded results.
  - Integrate skeleton loaders, empty states, and refresh button that invalidates queries.
  - Add tests: unit (net worth calculations, closed account filtering, demo data loading), component (sorting toggles, demo data display), e2e (data display and toggles).
- **Exit Criteria**:
  - UI matches requirements for grouping, tooltips, net worth, and demo data functionality.
  - Demo data loads correctly and displays with proper "Demo Data" badge.
  - Automated tests verifying sorting/currency toggles and demo data functionality pass.
  - Accessibility scan (axe) shows no violations for Accounts view.

### Phase 4 - Desktop Packaging & Secure Storage Integration

- **Objectives**: Finalize Tauri app with secure credential handling and parity with web UI.
- **Tasks**:
  - Implement Rust commands for storing/retrieving/deleting API key using Windows Credential Locker (or dpapi-protected file).
  - Wire Tauri commands to frontend storage abstraction; ensure encryption path differences hidden behind interface.
  - Configure Tauri app menu, window sizing, tray (if needed), and icons.
  - Update build pipeline to run Next.js production build before packaging (`pnpm build && cargo tauri build`).
  - Implement desktop-specific tests (integration via Tauri harness or smoke test script) connecting/deleting and accounts viewing.
  - Document desktop install/uninstall instructions and credential storage behavior.
- **Exit Criteria**:
  - `cargo tauri build` produces NSIS installer that launches and preserves API key securely via Windows Credential Locker.
  - Desktop smoke test suite passes comprehensive functionality validation.
  - Security review of command logging (no secrets in stdout).

### Phase 5 - Quality, Telemetry, and Hardening

- **Objectives**: Ensure robustness, observability, and polish prior to release.
- **Tasks**:
  - Expand unit tests to cover edge cases (empty accounts, liabilities only, currency differences).
  - Configure Playwright e2e matrix targeting Chromium and Edge WebView2 channels against the dev server; rely on PowerShell desktop smoke tests for packaged builds.
  - Add structured logging hooks (console + optional file) for error taxonomy events.
  - Run accessibility audits (axe CI) and manual keyboard navigation checks.
  - Perform performance profiling (Lighthouse, WebView2 dev tools) to confirm under 2s initial fetch.
  - Conduct security review ensuring CSP headers, HTTPS-only requests, no secret leaks.
  - Integrate security scanning tools (OWASP-style checks, dependency CVE auditing) into manual CI scripts.
  - Update `specs/coverage-matrix.md` mapping all tests to requirements; highlight gaps.
- **Exit Criteria**:
  - Test suite passes in CI-like environment; coverage thresholds met.
  - Accessibility and performance reports documented.
  - All open issues tracked with resolution or deferred rationale in docs.

### Phase 6 - Release Operations

- **Objectives**: Prepare artifacts, documentation, and distribution assets for launch.
- **Tasks**:
  - Generate production web build and capture deployment instructions for the chosen static hosting target.
  - Produce Windows NSIS installer build; verify installation, upgrade, removal.
  - Compile release notes summarizing features, known issues, install steps.
  - Update `docs/Lunch_To_Go_Requirements.md` to reference final status and link to repo.
  - Ensure Git tags and package versions align; record script outputs in CLI log.
  - Archive final spec/plan/tasks/coverage docs.
- **Exit Criteria**:
  - Release bundle (web + desktop) and documentation ready for publication.
  - Manual CICD run book complete.
  - Stakeholder sign-off recorded in docs.

### Phase 7 - Public GitHub Release (Optional)

- **Objectives**: Publish the project as a public repository and document the release for broader sharing.
- **Tasks**:
  - Finalize licensing (MIT) and ensure headers/NOTICE files are present. Completed via root `LICENSE`.
  - Update README with installation instructions, screenshots, and link to Lunch Money docs. Completed via root `README.md` and Playwright-captured assets in `docs/images/`.
  - Push latest main branch to public GitHub repo, create tags matching release artifacts, and enable Discussions/Issues if desired. Documented via `docs/github-release.md` plus `scripts/publish-github.ps1`.
  - Draft GitHub release notes referencing web build, desktop installer, and known issues.
- **Exit Criteria**:
  - Public GitHub repository accessible with source, docs, and release assets attached.
  - Optional phase marked complete in `specs/tasks.md` if executed; otherwise noted as deferred.

## 4. Cross-Cutting Workstreams

- **Documentation**: Update `specs/tasks.md` after each task, maintain `specs/coverage-matrix.md`, capture architectural decisions (ADR-style callouts if needed).
- **Security & Privacy**: Validate secure storage implementation in both environments; keep secrets out of logs, commit history.
- **Design & UX**: Maintain icon library, ensure responsiveness, run design QA before each phase exit.
- **Observability**: Plan optional telemetry sink (e.g., console logs now, abstracted for future remote logging) ensuring privacy compliance.

## 5. Risk Management

| Risk                                                                       | Mitigation                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| WebCrypto or Credential Locker APIs behave differently across environments | Build adapter tests, provide fallbacks, document limitations                               |
| Lunch Money API rate limits or outages                                     | Cache responses, implement retry/backoff with user messaging                               |
| Tauri packaging complexities                                               | Start integration early (Phase 0/4), follow Tauri release notes, keep dependencies current |
| Accessibility regressions due to custom UI                                 | Use Shadcn primitives, run axe scans in CI, manual QA                                      |
| Manual CICD overhead                                                       | Automate via bundled PowerShell scripts, document run order in README                      |

## 6. Tracking & Reporting

- Maintain Kanban board (virtual or `specs/tasks.md`) keyed by phase and task.
- After each phase, record outcomes and remaining work in `specs/plan.md` under new Progress Notes section (to be appended during execution).
- Keep commit messages referencing phase/task identifiers to aid traceability.

## 7. Progress Notes

- 2025-10-01: Phase 0 foundations complete - Next.js/Tailwind scaffold, automation scripts, Tauri shell, and icon pipeline ready. Phase 1 can begin.

- 2025-10-02: Phase 1 core services delivered - API client, validation, storage adapters, and demo wiring in place.

- 2025-10-02: Phase 2 settings connection flow delivered - UI shell, connection mutation, secure storage, and preference sync ready for Accounts work.

- 2025-10-02: Phase 2 automated coverage added - shared API client, store, and settings components tested under Vitest.

- 2025-10-02: Shared API client hardened for Next.js 16 async data fetching and relative URL handling (Claude assistance).

- 2025-10-02: Phase 3 core accounts functionality delivered — P3-01 through P3-05 complete with sorting controls, currency toggle, conversion tooltips, grouping, and guarded access. Comprehensive test coverage added including sorting-integration.test.ts, currency-conversion.test.ts, currency-fields.test.ts, and currency-regression.test.ts. Currency normalization logic simplified from complex USD/CAD inference to direct API field usage per official Lunch Money specification.

- 2025-10-02: Liability/net-worth parity review opened to confirm requirements about treating liabilities as negative contributions without double inversion.
- 2025-10-04: Liability handling aligned with requirements—normalized accounts persist liabilities as negative values and the net-worth helper now sums all balances directly. Regression tests (`currency-regression.test.ts`, `net-worth.test.ts`) cover the resolved behavior.

- 2025-10-03: Phase 4 desktop packaging completed - All P4-01 through P4-06 tasks delivered successfully. Windows Credential Locker integration implemented with full Rust command layer, NSIS installer pipeline established with debug/release configurations, comprehensive smoke testing framework built, and complete desktop installation documentation created. Desktop application achieves feature parity with web version while providing secure credential storage via Windows DPAPI protection. Installer generates 2.29 MB NSIS executable with automatic WebView2 bootstrapping.

- 2025-10-08: Requirements updated to include accent color palette selection in Settings; P2-10 delivered with updated coverage row R-25.
- 2025-10-09: Phase 6 updates-Windows NSIS packaging (P6-02), release notes (P6-03), and CI/CD run book (P6-05) shipped alongside refreshed smoke tests. P6-01 (web deployment guide), P6-04 (requirements doc finalization), and P6-06 (doc archiving) were deemed unnecessary and removed from scope.
- 2025-10-10: Accounts UX refined so the days-since-update label opens Lunch Money Accounts in a new browser window when the value exceeds zero; coverage and requirements updated accordingly.
