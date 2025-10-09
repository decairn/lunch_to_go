# Desktop Smoke Tests

`scripts/smoke-test-desktop.ps1` provides a reproducible checklist for the
Windows desktop build. It installs an NSIS package, exercises core behavior, and
optionally validates Lunch Money connectivity with a provided API key.

## Test flow

1. **Prerequisite discovery**
   - Searches `src-tauri/target/{debug,release}/bundle/nsis/` and `dist/` for
     the latest NSIS installer (`Lunch To Go*_setup.exe`).
   - Detects whether the release or debug variant is available and surfaces the
     selection in the console output.
2. **Installation**
   - Performs a silent NSIS install using `/S` (matching the packaging pipeline).
   - Uninstalls any existing build with the same product name unless
     `-SkipInstall` is passed.
3. **Launch verification**
   - Locates `app.exe` inside the install directory (release or debug).
   - Starts the application, waits for a stable window, and then terminates it
     gracefully (force-killing if needed).
4. **Credential storage check**
   - Uses `cmdkey` to mimic the Credential Locker contract.
   - Writes, retrieves, and deletes a smoke-test credential to confirm DPAPI is
     available for the Tauri bridge.
5. **API validation (optional)**
   - When `-TestApiKey` is provided, issues authenticated requests to
     `https://api.lunchmoney.app/v1/me`, `/v1/assets`, and `/v1/plaid_accounts`.
   - Verifies filtering that excludes closed accounts and logs basic counts to
     match the normalization logic used in the app.
6. **Cleanup**
   - Removes the installed application after the run (unless `-SkipInstall` was
     specified).

Each stage writes `[PASS]`, `[FAIL]`, or `[WARN]` entries with timestamps. Use
`-Verbose` to print additional diagnostic context such as resolved installer
paths and raw HTTP exceptions.

## Usage examples

```powershell
# Full run, prompts for API connectivity if the key succeeds
pwsh -File .\scripts\smoke-test-desktop.ps1 -TestApiKey "lm_xxx"

# Launch + credential checks only (skips HTTP calls)
pwsh -File .\scripts\smoke-test-desktop.ps1

# Reuse an already installed build
pwsh -File .\scripts\smoke-test-desktop.ps1 -SkipInstall -TestApiKey "lm_xxx"

# Enable detailed diagnostics
pwsh -File .\scripts\smoke-test-desktop.ps1 -Verbose
```

Exit code `0` indicates success. A non-zero exit code reflects at least one
failed stage and is safe to bubble into manual CI logs or release checklists.

## Coverage summary

- Validates packaging artifacts and silent NSIS install behaviour.
- Confirms application launch on Windows 10/11 with WebView2 available.
- Verifies Credential Locker integration through `cmdkey` parity checks.
- Exercises core Lunch Money endpoints with the same Authorization headers as
  the production client.
- Re-runs account normalization logic that mirrors the TypeScript mapper,
  confirming assets/liabilities grouping on real payloads.

These smoke tests complement Playwright web coverage and should be executed
before tagging a desktop release or distributing an updated installer.
