# Lunch To Go - GitHub Publication Guide (P7-03)

This guide documents the manual/publication workflow for Phase 7 task **P7-03**. It covers tagging the codebase, pushing to GitHub, and enabling collaboration features once the repository is made public.

## 1. Prerequisites

1. Finish the manual CI/CD pipeline (`pwsh -File scripts/run_cicd.ps1`) and confirm the working tree is clean.
2. Verify release assets exist:
   - `dist/Lunch To Go_0.1.0_x64-setup.exe`
   - `dist/Lunch To Go (Debug)_0.1.0_x64-setup.exe`
3. Ensure docs are current:
   - `docs/release-notes.md` (artifacts + changelog)
   - `README.md` (screenshots, install notes)

## 2. Create/push annotated release tag

The helper script derives the tag from `app/package.json` unless overridden.

```powershell
pwsh -File scripts\publish-github.ps1
```

Behavior:

- Creates an annotated tag such as `v0.1.0` (unless `-SkipTagCreation` is supplied).
- Displays push instructions by default; add `-Push` to run `git push origin <branch>` and `git push origin <tag>` automatically once you are ready.
- Supports overrides: `-Branch main`, `-Remote upstream`, `-TagName v0.1.1`, or `-AllowDirty` for exceptional cases.

## 3. Make the repository public (manual UI)

1. Navigate to the GitHub repository (example: `https://github.com/decairn/lunch_to_go`).
2. Open **Settings -> General -> Visibility** and choose **Change repository visibility -> Public**.
3. Confirm the warning dialog (type the repository name to proceed).

## 4. Enable collaboration features

After the repo is public:

1. Under **Settings -> General -> Features**, enable **Issues** and **Discussions** (optional but recommended per P7-03).
2. Under **Settings -> Moderation options**, configure code of conduct / security policy links if desired (`docs/security-review.md` provides the security baseline).

## 5. Publish the GitHub release

1. Go to **Releases -> Draft a new release**.
2. Choose the annotated tag (example `v0.1.0`) and target branch (usually `main`).
3. Copy highlights from `docs/release-notes.md`, including artifact summary and known issues.
4. Upload installers from `dist/` as binary assets.
5. Publish the release and share the URL with downstream consumers.

## 6. Post-publication checklist

- `git status` remains clean locally after running the script.
- `git tag` shows `v0.1.0` (or the chosen version), and `git ls-remote --tags origin` mirrors it after pushing.
- README badges/screenshots render on GitHub (image paths under `docs/images/`).
- Optional: update `specs/tasks.md` / `specs/plan.md` progress notes if additional Phase 7 tasks complete.
