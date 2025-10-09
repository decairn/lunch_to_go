# Lunch To Go - Coverage Matrix

## Legend

- **Unit**: Vitest suites for utilities, domain logic, storage, and API helpers.
- **Component**: React Testing Library + Vitest coverage for page flows and reusable UI.
- **E2E-Web**: Playwright specs targeting Chromium and Edge (WebView2 channel) against the Next.js dev server.
- **Desktop**: PowerShell smoke tests executed via `scripts/smoke-test-desktop.ps1`.
- **Manual**: Documented operator steps captured in docs or release checklists.

Status values: `Completed`, `In Progress`, `Planned`.

## Requirement-to-Test Mapping

| Req ID | Summary                                                               | Spec Reference                             | Test Types                        | Coverage Notes                                                                                                              | Status    |
| ------ | --------------------------------------------------------------------- | ------------------------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------- |
| R-01   | Settings tab for API key connect/delete with Lunch Money help link    | specs/spec.md §7                           | Unit, Component                   | `app/src/app/__tests__/settings.test.tsx` drives connect/delete flows; `lib/state` unit tests confirm status toggles.       | Completed |
| R-23   | Guarded navigation defaults to Settings when disconnected             | specs/spec.md §7                           | Unit, Component                   | Store hydration unit tests and page-level rendering tests assert tab routing state.                                         | Completed |
| R-02   | User profile display after verification                               | specs/spec.md §7                           | Unit, Component                   | Settings tests assert title-cased name and uppercase currency.                                                              | Completed |
| R-03   | Theme toggle persists across sessions                                 | specs/spec.md §7                           | Unit                              | Store persistence suite verifies hydrated theme + accent tokens.                                                            | Completed |
| R-19   | Shared Lunch Money API client handles HTTPS transport and retries     | specs/spec.md §6                           | Unit                              | `lib/api/__tests__` cover client configuration, endpoint parsing, retry + error taxonomy mapping.                           | Completed |
| R-04   | Accounts tab stays guarded until API key connected                    | specs/spec.md §7                           | Unit, Component                   | Domain store tests and Accounts page render tests confirm guard CTA + demo button visibility.                               | Completed |
| R-05   | Accounts list groups by assets/liabilities and account type           | specs/spec.md §7                           | Unit, Component                   | Domain grouping + sorting suites plus UI integration tests validate headings.                                               | Completed |
| R-22   | Plaid depository overrides map to cash                                | specs/spec.md §6                           | Unit                              | `accounts.test.ts` and `currency-regression.test.ts` assert overrides and downstream grouping.                              | Completed |
| R-06   | Sorting control (alphabetical vs balance)                             | specs/spec.md §7                           | Unit, Component                   | Sorting integration tests in `domain/__tests__` and component harness ensure persistence.                                   | Completed |
| R-07   | Currency toggle with locale-aware formatting and tooltips             | specs/spec.md §7                           | Unit, Component, E2E-Web          | Currency conversion + tooltip formatting validated through Vitest and Playwright demo scenarios.                            | Completed |
| R-08   | Net worth totals with correct color coding                            | specs/spec.md §7                           | Unit                              | Net worth Vitest suite covers positive/negative splits and currency normalization.                                          | Completed |
| R-09   | Manual refresh invalidates TanStack queries                           | specs/spec.md §6                           | Component, E2E-Web                | Accounts page tests click Refresh and assert spinner/state resets in both unit and Playwright paths.                        | Completed |
| R-10   | Loading skeletons and empty states                                    | specs/spec.md §7                           | Component                         | Dedicated component tests ensure skeleton + empty messaging coverage.                                                       | Completed |
| R-21   | Closed accounts filtered from listings                                | specs/spec.md §6                           | Unit, Component                   | Domain tests exclude `status === "closed"`; UI snapshot confirms absence.                                                   | Completed |
| R-24   | Demo data preview for disconnected users                              | specs/spec.md §7                           | Unit, Component, E2E-Web, Desktop | CSV parser tests, accounts demo integration tests, Playwright demo scenario, and desktop smoke test demo path executed.     | Completed |
| R-11   | Error taxonomy surfaced distinctly (auth/network/http/parse)          | specs/spec.md §8                           | Unit, Component, E2E-Web          | API error helpers tested with Vitest; Settings tests assert toast copy; Playwright accessibility spec forces error states.  | Completed |
| R-25   | Accent color selector persists and updates UI tokens                  | specs/spec.md §7                           | Unit, Component                   | Store + accent-sync component tests ensure `data-accent` toggles immediately and persists.                                  | Completed |
| R-12   | Secure credential storage abstraction (WebCrypto + Credential Locker) | specs/spec.md §9                           | Unit, Desktop, Manual             | Browser adapter unit tests plus desktop smoke credential checks validate encryption/DPAPI.                                  | Completed |
| R-13   | Desktop NSIS packaging with secure Rust bridge                        | specs/spec.md §5 & §12                     | Desktop, Manual                   | `package-desktop.ps1` logs reviewed; smoke test installs NSIS build, verifies Credential Locker API, and launches Accounts. | Completed |
| R-14   | Demo data load under 2 seconds                                        | specs/spec.md §10                          | E2E-Web                           | `tests/e2e/performance.spec.ts` asserts the `accounts-data-load` measure stays under 2000 ms.                               | Completed |
| R-15   | Accessibility (WCAG 2.1 AA targets)                                   | specs/spec.md §11                          | Component, E2E-Web                | Axe-powered Playwright spec plus keyboard navigation tests confirm semantics, focus, and contrast tokens.                   | Completed |
| R-20   | Security scanning & review steps documented                           | specs/spec.md §9 & docs/security-review.md | Manual                            | Latest security review (2025-10-09) captured; PowerShell checklist references `pnpm audit --prod`.                          | Completed |
| R-16   | PowerShell automation scripts for lint/test/build/package             | specs/plan.md Phase 0                      | Manual                            | Scripts exist in `/scripts` and are exercised before packaging; lint/test wrappers verified locally.                        | Completed |
| R-17   | Release documentation and run book                                    | specs/plan.md Phase 6                      | Manual                            | Release documentation maintained via `docs/release-notes.md` and `docs/manual-cicd-runbook.md`.                             | Completed |
| R-18   | Public GitHub release workflow                                        | specs/plan.md Phase 7                      | Manual                            | Optional effort not yet started; requires licensing + publish checklist.                                                    | Planned   |

## Coverage summary

- Vitest suites span API helpers (`app/src/lib/api/__tests__`), domain mappers, storage adapters, telemetry, and page stores.
- React Testing Library specs in `app/src/app/__tests__` validate routed UI, guarded flows, accent/theme persistence, and demo interactions.
- Playwright scenarios exercise accessibility, demo workflows, and performance budgets across Chromium and Edge (WebView2) browsers.
- Desktop smoke tests confirm NSIS packaging, silent install/uninstall, Credential Locker storage, and authenticated API access (optional) on Windows.
- Manual reviews (security, release readiness) are logged in `docs/` and tied back to `specs/tasks.md` for traceability.
