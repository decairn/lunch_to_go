# Manual CI/CD Run Book - P6-05

This run book standardizes the PowerShell-driven workflow for linting, testing,
building, packaging, and documenting Lunch To Go. It fulfills Release Operations
task **P6-05** and complements the automation captured in `scripts/run_cicd.ps1`.

## 1. Environment preparation

1. Install the required toolchain once per workstation:
   - Node.js 20+ with `corepack enable`.
   - pnpm 9+ (auto-managed by corepack; verify with `corepack pnpm --version`).
   - Rust 1.81+ with the `@tauri-apps/cli` dependency pulled through cargo.
   - PowerShell 5.1+ (Windows), optionally PowerShell 7 for faster execution.
2. Restore repository dependencies:
   ```powershell
   corepack pnpm --dir .\app install
   ```
3. Optional desktop smoke test prerequisites:
   - Install Microsoft WebView2 Evergreen runtime.
   - Provide a Lunch Money API key (environment secret or `-TestApiKey` flag) for authenticated validation.

## 2. One-command pipeline

```powershell
pwsh -File .\scripts\run_cicd.ps1
```

Pipeline steps executed (in order):

| Stage             | Script                        | Description                                                 |
| ----------------- | ----------------------------- | ----------------------------------------------------------- |
| Lint & audit      | `scripts/lint.ps1`            | Runs ESLint (Next.js rules) and dependency health checks.   |
| Tests             | `scripts/test.ps1`            | Executes Vitest suites (unit + component).                  |
| Playwright        | `scripts/playwright.ps1`      | Launches Playwright E2E + accessibility scans.              |
| Web build         | `scripts/build-web.ps1`       | Produces static export in `app/out`.                        |
| Desktop packaging | `scripts/package-desktop.ps1` | Builds Tauri bundles and stages NSIS installers in `dist/`. |
| Docs refresh      | `scripts/docs-refresh.ps1`    | Formats Markdown assets across `docs/` & `specs/`.          |

### Optional hardening

```powershell
pwsh -File .\scripts\run_cicd.ps1 -IncludeDesktopHardening [-SmokeTestApiKey "<lm_xxx>"]
```

Adds `scripts/smoke-test-desktop.ps1` after packaging to validate install /
uninstall, Credential Locker storage, and (optionally) authenticated API calls.

## 3. Logging and evidence capture

- Capture console logs with `Start-Transcript -Path .\dist\cicd-YYYYMMDD-HHMM.log`.
- Archive generated artifacts:
  - `dist/Lunch To Go_0.1.0_x64-setup.exe`
  - Optional `dist/Lunch To Go (Debug)_0.1.0_x64-setup.exe`
- After the run, append the log reference to `docs/release-notes.md` or the team
  channel message for cross-agent traceability.

## 4. Failure recovery checklist

| Stage                        | Recovery                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint/Test failures           | Re-run individual pnpm scripts inside `app/` (`pnpm lint`, `pnpm test`). Fix highlighted TypeScript, ESLint, or Vitest regressions.                            |
| Playwright flakes            | Re-run `pnpm e2e`; use `PWDEBUG=1` for headful debugging. Document accepted flakes in release notes if unresolved.                                             |
| Next.js build/export issues  | Clear `.next/` and rerun `pnpm build`. Verify `next.config.ts` retains `output: "export"` for static hosting.                                                  |
| Tauri packaging errors       | Clean with `cargo clean --release` (automated in `package-desktop.ps1`), ensure Rust toolchain is up to date, re-run packaging.                                |
| Smoke-test uninstall warning | Run `scripts/smoke-test-desktop.ps1 -Verbose`. If uninstall still fails, manually remove via “Add or remove programs” and re-run the command for a clean PASS. |

## 5. Completion checklist

- `scripts/run_cicd.ps1` exits with `0` (or `smoke-test-desktop.ps1` when invoked separately).
- Documentation formatting refreshed via `scripts/docs-refresh.ps1`.
- Release artifacts in `dist/` match the versions recorded in `docs/release-notes.md`.
- `specs/tasks.md` reflects the latest task statuses.
- Stakeholder sign-off table (in `docs/release-notes.md`) circulated for completion.
