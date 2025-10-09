# Desktop Build Pipeline – P4-04

## Overview

The desktop build for Lunch To Go packages the shared Next.js frontend inside a
Tauri shell and produces Windows NSIS installers. The workflow keeps the web and
desktop bundles in lockstep and is driven entirely from PowerShell so that it
meets the tooling and manual-CICD requirements captured in
`docs/Lunch_To_Go_Requirements.md`.

- Frontend source: `app/` (Next.js 15, Tailwind CSS, Shadcn UI)
- Desktop shell: `src-tauri/` (Tauri 2.x, Rust 1.81+)
- Primary entry script: `scripts/package-desktop.ps1`
- Output installers: `src-tauri/target/{debug,release}/bundle/nsis/*.exe` and
  mirrored copies in `/dist`

## Key Configuration

### Tauri release/debug manifests

The repository keeps the active Tauri manifest small and copies in the release
or debug variant before every build. Both manifest variants share the same
frontend output path and target only the NSIS installer format to satisfy the
Windows packaging requirement.

```jsonc
{
  "build": {
    "frontendDist": "../app/out",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "pnpm --dir ../app dev",
  },
  "bundle": {
    "targets": ["nsis"],
    "windows": {
      "webviewInstallMode": { "type": "downloadBootstrapper" },
      "nsis": {
        "installerIcon": "icons/icon.ico",
        "installMode": "perMachine",
        "languages": ["English"],
      },
    },
  },
}
```

The debug manifest (`src-tauri/tauri.debug.conf.json`) updates product metadata
(`productName`, `identifier`, window title) so the debug build can coexist with
the release build. `scripts/package-desktop.ps1` copies the relevant manifest
into `tauri.conf.json` before running `cargo tauri build`.

## Build Workflow (`scripts/package-desktop.ps1`)

The packaging script is the single entry point for release and debug installers.
It intentionally keeps logic inside PowerShell to stay within the Windows tool
chain mandated by the requirements.

1. **Environment validation**
   - Confirms the script is running from the repo root (expects `src-tauri`).
   - Locates `pnpm`; falls back to `app/pnpm.cmd` if pnpm is not on `PATH`.
   - Ensures Rust tooling (`cargo`) is available, adding `%USERPROFILE%\.cargo\bin`
     to `PATH` for the current session when necessary.
2. **Workspace cleanup**
   - Removes `app/out` to guarantee a fresh Next.js export.
   - Removes the previous `src-tauri/target/release` output when building release
     bundles (debug builds use `cargo tauri build --debug` which keeps separate
     artifacts).
3. **Frontend build**
   - Switches into `app/` and optionally installs dependencies when
     `FORCE_PNPM_INSTALL=1` is set.
   - Runs `pnpm build`, producing the statically generated site inside `app/out`.
4. **Desktop packaging**
   - Copies `tauri.release.conf.json` (or `tauri.debug.conf.json` when the
     `-Debug` flag is passed) over `src-tauri/tauri.conf.json`.
   - Invokes `cargo tauri build` (or `cargo tauri build --debug`) which bundles
     the `app/out` assets and emits an NSIS installer.
5. **Artifact collation**
   - Lists any `.exe`, `.msi`, or `.msix` files discovered under
     `src-tauri/target/{release|debug}/bundle/` for operator confirmation.
   - Copies installer executables into the top-level `dist/` directory so they
     can be versioned or attached to manual release notes.
6. **Summary output**
   - Prints the build mode, artifact paths, and reminders for next steps (for
     example running the desktop smoke tests or `cargo tauri dev`).

### Usage examples

```powershell
# Release build (default)
pwsh -File .\scripts\package-desktop.ps1

# Debug build with alternate product metadata
pwsh -File .\scripts\package-desktop.ps1 -Debug

# Force a dependency reinstall before the release build
$env:FORCE_PNPM_INSTALL = "1"
pwsh -File .\scripts\package-desktop.ps1
```

## Artifact Locations

| Mode    | Primary path                            | Contents                                  |
| ------- | --------------------------------------- | ----------------------------------------- |
| Debug   | `src-tauri/target/debug/bundle/nsis/`   | `Lunch To Go (Debug)_0.1.0_x64-setup.exe` |
| Release | `src-tauri/target/release/bundle/nsis/` | `Lunch To Go_0.1.0_x64-setup.exe`         |
| Both    | `dist/`                                 | Copy of whichever installers were built   |

The script prints each artifact with its full path and size so that the release
agent can attach it to documentation or transfer it through a signed channel.

## Troubleshooting

| Issue                 | Symptoms                                   | Resolution                                                                                                       |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `pnpm` not detected   | Script exits during environment validation | Install pnpm globally (`npm install -g pnpm`) or run the script from an environment where `app/pnpm.cmd` exists. |
| `cargo` missing       | Build aborts before packaging              | Install Rust via <https://rustup.rs/> or ensure `%USERPROFILE%\.cargo\bin` is on `PATH`.                         |
| Next.js build failure | `pnpm build` exits non-zero                | Run `pnpm lint` for diagnostics, then fix TypeScript or lint failures before re-running the script.              |
| No installer produced | `bundle/nsis` directory missing            | Confirm `cargo tauri build` succeeded and that `tauri.conf.json` was copied correctly.                           |
| Duplicate installers  | Old artifacts remain in `dist/`            | Remove stale files manually or clean `dist/` before re-running the script.                                       |

## Validation Checklist

- [ ] `scripts/package-desktop.ps1` completes without errors.
- [ ] `app/out` exists and contains the production Next.js build.
- [ ] `src-tauri/tauri.conf.json` matches the intended build mode metadata.
- [ ] NSIS installer produced in `src-tauri/target/{release|debug}/bundle/nsis/`.
- [ ] Installer copied into `dist/` for handoff.
- [ ] `scripts/smoke-test-desktop.ps1` executed (optionally with `-TestApiKey`)
      to validate installation, credential handling, and account rendering.
