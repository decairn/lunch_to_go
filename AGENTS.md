# AGENTS

## UX / Frontend Agent

- Interpret designs and requirements from `docs/Lunch_To_Go_Requirements.md` and `specs/spec.md`.
- Implement React components within the Next.js app (`app/src`) using Shadcn UI primitives.
- Collaborate with State & Services Agent to integrate hooks and data fetching logic.
- Ensure components meet accessibility targets (WCAG 2.1 AA).
- Maintain style consistency by leveraging Tailwind design tokens defined in Phase 0.

## State & Services Agent

- Own the data layer under `/lib`: API clients, domain mappers, storage adapters.
- Manage TanStack Query configuration, Zustand/Context setup, and secure storage abstractions.
- Provide typed interfaces for frontend agents and document usage patterns.
- Coordinate with Desktop Agent for cross-platform credential persistence.

## Desktop Agent

- Maintain the Tauri project in `src-tauri/`, ensuring the desktop build tracks the web app feature set.
- Implement Rust commands for secure credential storage, preference persistence, and platform-specific utilities.
- Manage packaging (icons, window configuration, installer settings) and document desktop-specific behavior.

## Quality & Tooling Agent

- Maintain automation scripts in `/scripts` (lint, build, test, docs refresh, package).
- Configure and monitor ESLint, Prettier, Vitest, Playwright, and coverage tracking (`specs/coverage-matrix.md`).
- Drive CI-like workflows manually via PowerShell, logging results for traceability.
- Coordinate testing strategy with Frontend and State agents to ensure coverage of requirements.

## Release & Documentation Agent

- Keep project documentation current (`docs/`, `specs/`).
- Track implementation progress via `specs/tasks.md` and update status markers.
- Own release preparation, including web build deployment notes, desktop installer validation, and optional public GitHub publication.
- Ensure sensitive data handling policies are explicit and followed across the project.

## Collaboration Guidelines

- Agents communicate through markdown docs and commit messages referencing task IDs (e.g., P1-03).
- When touching shared files (e.g., icon assets, theme tokens), consult the owning agent’s notes before editing.
- Document any deviations or decisions in the appropriate spec/plan section to keep downstream agents informed.

- **NEVER commit of your own accord - ALWAYS wait for user to initiate commits and pushes.**
- Before any git operations, ask for explicit user permission and show what changes will be committed.
