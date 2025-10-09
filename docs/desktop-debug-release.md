# Desktop Builds: Debug vs Release

The Lunch To Go desktop app ships two Windows builds that can live side by side.
Both variants wrap the same Next.js bundle and differ only in metadata and Rust
build optimizations.

## Product metadata

| Mode    | Product name          | Identifier                          | Default window title  |
| ------- | --------------------- | ----------------------------------- | --------------------- |
| Release | `Lunch To Go`         | `com.lunchtogoapp.lunchmoney`       | `Lunch To Go`         |
| Debug   | `Lunch To Go (Debug)` | `com.lunchtogoapp.lunchmoney.debug` | `Lunch To Go (Debug)` |

The active `src-tauri/tauri.conf.json` is generated during packaging by copying
either `tauri.release.conf.json` or `tauri.debug.conf.json`. The debug manifest
uses a unique identifier to avoid collisions so both installers can co-exist on
the same machine, which simplifies smoke testing and troubleshooting.

## Command summary

```powershell
# Release build (optimized, default)
pwsh -File .\scripts\package-desktop.ps1

# Debug build (adds debug symbols, unique branding)
pwsh -File .\scripts\package-desktop.ps1 -Debug
```

The packaging script runs the production Next.js export (`pnpm build` inside
`app/`), selects the correct Tauri manifest, and invokes `cargo tauri build`.
Debug builds use `cargo tauri build --debug`, while release builds use the
default optimized `cargo tauri build` pipeline.

## Artifact locations

| Mode    | Primary installer path                                                       | Copied distribution path                       | Notes                          |
| ------- | ---------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| Release | `src-tauri/target/release/bundle/nsis/Lunch To Go_0.1.0_x64-setup.exe`       | `dist/Lunch To Go_0.1.0_x64-setup.exe`         | Uses NSIS, per-machine install |
| Debug   | `src-tauri/target/debug/bundle/nsis/Lunch To Go (Debug)_0.1.0_x64-setup.exe` | `dist/Lunch To Go (Debug)_0.1.0_x64-setup.exe` | Keeps console + debug info     |

Only the NSIS target is enabled. MSI/MSIX packaging was removed to stay aligned
with the Windows NSIS requirement in `docs/Lunch_To_Go_Requirements.md`.

## Installation behaviour

- Each installer writes to `C:\Program Files\Lunch To Go` (or a debug-named
  sibling) when run with administrative privileges.
- Silent installs use the standard NSIS `/S` flag, which the
  `scripts/smoke-test-desktop.ps1` harness relies on.
- Start Menu shortcuts are scoped per installer and display the correct product
  name, making it easy to distinguish the builds during manual QA.

## When to use each build

- **Release**: Manual acceptance checks, packaging sign-off, and distribution to
  stakeholders.
- **Debug**: Local development, profiling with console output, and automated
  smoke test experimentation where richer logging simplifies diagnostics.

Both builds launch the same UI and share the secure storage bridge (Windows
Credential Locker). Switching between them requires no additional migration
steps because stored credentials are keyed separately for the debug identifier.
