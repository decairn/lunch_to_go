# Lunch To Go App

> Refer to the workspace-level `../README.md` for end-to-end install, screenshots, and release guidance.

Lunch To Go is a Next.js 15 application that surfaces Lunch Money accounts in alphabetical order and ships alongside a companion Windows desktop build.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Rust 1.81+ (desktop tooling and smoke tests)
- PowerShell 5.1+ (all scripts follow the Windows tooling constraint)

## Common commands

```powershell
# Install dependencies (run inside app/)
corepack pnpm install

# Web development server
corepack pnpm dev -- --hostname 127.0.0.1 --port 3000

# Static checks
corepack pnpm lint
corepack pnpm test

# Playwright end-to-end tests (spawns dev server automatically)
corepack pnpm e2e

# Production build artifacts (Next.js)
corepack pnpm build

# Run the Tauri desktop shell after building the frontend
cargo tauri dev --manifest-path ..\src-tauri\Cargo.toml

# Package desktop NSIS installers
pwsh -File ..\scripts\package-desktop.ps1

# Desktop smoke tests (requires packaged installer)
pwsh -File ..\scripts\smoke-test-desktop.ps1 -Verbose
```

## Directory highlights

- `src/app/page.tsx` – Accounts + Settings tab experience with TanStack Query guards
- `src/lib/api` – HTTPS client, typed endpoint wrappers, and error taxonomy helpers
- `src/lib/domain` – Lunch Money normalization (grouping, currency, net worth)
- `src/lib/storage` – Browser WebCrypto adapter and Tauri Credential Locker bridge
- `tests/e2e` – Playwright specs for accessibility, demo workflow, and performance budgets

Refer to `docs/` and `specs/` for requirements, implementation plan, coverage tracking, and desktop packaging guides.
