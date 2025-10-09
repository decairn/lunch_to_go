# Desktop Installation Guide – P4-06

This guide documents how to install, verify, and remove the Windows desktop
build of Lunch To Go. It reflects the current NSIS packaging flow captured in
`docs/Lunch_To_Go_Requirements.md` and the `scripts/package-desktop.ps1`
automation.

## System requirements

- **OS**: Windows 10 (1903+) or Windows 11, 64-bit
- **CPU/RAM**: Dual-core processor with 4 GB RAM (8 GB recommended)
- **Disk**: ~100 MB free for the app plus WebView2 runtime (downloads on demand)
- **Network**: HTTPS access to `https://api.lunchmoney.app`
- **WebView2**: Installed automatically if missing (Tauri bootstrapper handles
  download)

## Obtaining the installer

1. Run `pwsh -File .\scripts\package-desktop.ps1` (release) or add `-Debug` for
   the debug build.
2. Locate the generated NSIS installer:
   - `src-tauri/target/release/bundle/nsis/Lunch To Go_0.1.0_x64-setup.exe`
   - `src-tauri/target/debug/bundle/nsis/Lunch To Go (Debug)_0.1.0_x64-setup.exe`
3. The packaging script also copies installers into the top-level `dist/`
   directory for handoff.

## Installation steps

1. Right-click the installer and choose **Run as administrator**. Silent installs
   via `installer.exe /S` follow the same path.
2. Accept the NSIS prompts. The default target folder is
   `C:\Program Files\Lunch To Go` (or `Lunch To Go (Debug)` for debug).
3. When prompted, allow the bootstrapper to download the Microsoft Edge WebView2
   Runtime if it is not already present.
4. Launch the application from the final wizard page or via the Start Menu.

## First-run checklist

1. The app opens with the Settings tab selected (guarded flow when no API key is
   present).
2. Use the embedded link to open <https://lunchmoney.dev> and create an API key.
3. Paste the key into the API Key input and select **Connect**.
4. Upon success, the UI confirms the connection status, shows the normalized
   user profile (name + primary currency), and enables the Accounts tab.
5. Navigate to Accounts to view live data, or trigger the demo data preview when
   disconnected.

Preferences (theme, accent color, sorting, currency mode) and the API key are
persisted automatically. On Windows, credentials are stored via the Tauri Rust
bridge inside the Windows Credential Locker using DPAPI encryption.

## Uninstalling

1. Open **Settings → Apps → Installed apps** (Windows 11) or **Programs and
   Features** (Windows 10).
2. Locate the installed variant (`Lunch To Go` or `Lunch To Go (Debug)`).
3. Select **Uninstall**. The process removes the executable and clears cached
   WebView assets, but intentionally leaves behind user data stored in Lunch
   Money.

Silent uninstall is also supported (`"C:\Program Files\Lunch To Go\Uninstall.exe" /S`). The smoke test script executes the silent uninstall between test runs.

## Troubleshooting

| Symptom                             | Recommendation                                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Installer blocked by SmartScreen    | Select **More info → Run anyway**. For production distribution, code signing should be added to the NSIS pipeline.                       |
| WebView2 download fails             | Manually install the Evergreen WebView2 runtime from Microsoft, then rerun the installer.                                                |
| API key not retained                | Ensure the Windows Credential Manager is accessible; rerun the Settings workflow to persist a new key.                                   |
| No accounts appear after connection | Verify that the Lunch Money account has active assets and Plaid connections. Use Settings → Refresh to re-hydrate TanStack Query caches. |

## Related automation

- `scripts/package-desktop.ps1`: Builds and stages installers.
- `scripts/smoke-test-desktop.ps1`: Installs, validates, and optionally removes
  the desktop build automatically.
- `docs/desktop-smoke-tests.md`: Detailed walkthrough of the smoke test routine.

Keep installers alongside release notes when generating distribution packages so
the Release & Documentation agent can attach hashes and provenance details.
