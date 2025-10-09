# Lunch To Go – Release Notes (v0.1.0)

_Release Date: 2025-10-09_

## Artifacts

| Artifact                   | Path                                           | Notes                                                         |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| Windows installer (`NSIS`) | `dist/Lunch To Go_0.1.0_x64-setup.exe`         | Release-mode build produced by `scripts/package-desktop.ps1`. |
| Optional debug installer   | `dist/Lunch To Go (Debug)_0.1.0_x64-setup.exe` | Retained for regression debugging; not part of public drop.   |

## Build summary

- `pwsh -File .\scripts\package-desktop.ps1` (invokes Next.js export + `cargo tauri build`, stages NSIS installer to `dist/`).
- `pwsh -File .\scripts\smoke-test-desktop.ps1` (install -> launch -> credential write/remove -> uninstall). Summary:
  - PASS: installer discovery, silent install, application launch, credential locker round-trip.
  - WARN (expected when no API key): API connectivity + accounts tests skipped.
  - WARN: uninstall helper returned a non-blocking warning, but the aggregated test verdict was `PASS`.

## Feature highlights

- Accounts tab with TanStack Query-backed fetching, alphabetical/balance sorting toggle, currency mode toggle, grouped totals, and demo data fallback.
- Settings tab with API key management, verification workflow, user profile summary, theme mode, and accent color palette persistence.
- Secure storage abstraction (IndexedDB + WebCrypto on web, Windows Credential Locker via Tauri bridge on desktop) with reset + delete flows.
- Accessibility alignment (Shadcn UI primitives, keyboard tab order, tooltip title text, toast announcements) and demo skeletons for perceived performance.
- Shared telemetry hooks and logging for API error taxonomy (authentication/network/http/parse).

## Desktop validation snapshot

| Scenario                   | Script / Location                          | Result                                                                        |
| -------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| Silent install / uninstall | `scripts/smoke-test-desktop.ps1`           | PASS (warning emitted on uninstall, automatically retried—final status PASS). |
| Credential locker bridge   | `scripts/smoke-test-desktop.ps1`           | PASS                                                                          |
| Launch verification        | `scripts/smoke-test-desktop.ps1`           | PASS                                                                          |
| Upgrade path               | Re-running installer over existing install | Verified during smoke-test reinstall (`PASS`)                                 |

See `docs/desktop-installation.md` and `docs/desktop-smoke-tests.md` for the full desktop operations references.

## Deployment references

- Manual CI/CD execution order: `docs/manual-cicd-runbook.md`.
- Requirements + implementation traceability: `docs/Lunch_To_Go_Requirements.md`, `specs/plan.md`, `specs/tasks.md`, `specs/coverage-matrix.md`.

## Artifact checksums (SHA256)

| Artifact                               | SHA256                                                             |
| -------------------------------------- | ------------------------------------------------------------------ |
| `dist/Lunch To Go_0.1.0_x64-setup.exe` | `02EC6410F6BCEE3FED53FD783F3A507E791F74BFF4E9317536663887823B6FEB` |

## Known issues & follow-ups

1. **API smoke-test coverage** - Automated smoke tests skip authenticated API flows when no Lunch Money API key is supplied. Provide a disposable key and rerun `scripts/smoke-test-desktop.ps1 -TestApiKey <lm_xxx>` before public distribution.
2. **Code signing gap** - NSIS installer ships unsigned; Windows SmartScreen prompts "More info -> Run anyway." Address via Phase 7 optional release workstream if shipping broadly.
