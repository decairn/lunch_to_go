# Lunch To Go – Security Review

_Review Date: 2025-10-09_

## Scope

- Runtime Content Security Policy and referrer policy applied by `app/src/app/layout.tsx`
- HTTPS access to Lunch Money production endpoints (`https://api.lunchmoney.app/v1`)
- Credential handling across the web build (IndexedDB + WebCrypto) and Windows desktop build (Windows Credential Locker via Tauri)
- Outstanding risks and follow-up actions aligned with documented requirements

## Content Security Policy & Transport

- Layout injects a CSP meta tag that allows:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (Retained while Next.js 15 and Shadcn UI rely on inline hydration helpers)
  - `connect-src 'self' https://api.lunchmoney.app`
  - `img-src 'self' data:`
  - `style-src 'self' 'unsafe-inline'`
  - `font-src 'self' https://fonts.gstatic.com`
  - `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`
- Referrer policy is pinned to `strict-origin-when-cross-origin`.
- All API calls use HTTPS and originate from the shared API client whose default
  base URL is `https://api.lunchmoney.app/v1`. The desktop smoke tests confirm
  connectivity against the same base URL.

## Credential handling

- **Web**: `app/src/lib/storage/browser.ts` encrypts the API key with WebCrypto,
  stores the ciphertext in IndexedDB, and clears it when the key is deleted or a
  verification failure occurs.
- **Desktop**: `src-tauri/src/commands.rs` bridges to Windows Credential Locker.
  The smoke tests insert and delete sample credentials via `cmdkey` to confirm
  DPAPI availability.
- Clipboard paste remains enabled by requirements, but the UI never logs API
  keys and the telemetry logger intentionally redacts sensitive arguments.

## Residual risks & mitigations

| Risk                           | Notes                                                                                     | Mitigation                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Inline script/style allowances | Required while Tailwind runtime utilities and Next.js metadata APIs inject inline helpers | Track upgrade path to hashed CSP or nonce-based policy once Next.js removes inline dependencies                             |
| Manual dependency audits       | `pnpm audit --prod` is run manually as part of the CICD scripts                           | Add audit output to release sign-off checklist documented in `specs/tasks.md`                                               |
| Credential Locker availability | Desktop build assumes Credential Locker is enabled                                        | Smoke tests validate DPAPI calls; document remediation steps (run as the logged-in user, ensure no enterprise restrictions) |

## Verification summary

- `pnpm test` and `pnpm lint` succeed locally with CSP enforcement enabled.
- `scripts/smoke-test-desktop.ps1 -Verbose -TestApiKey <key>` confirms HTTPS
  requests, credential bridging, and guarded flows.
- Playwright accessibility and performance specs (`app/tests/e2e`) execute
  against the dev server to validate client-side routing and theme toggles.

No new critical issues were discovered in this review. The next scheduled audit
should revisit CSP tightening once inline script dependencies shrink and after
introducing optional telemetry sinks.
