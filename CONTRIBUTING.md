# Contributing

Thanks for your interest in improving Hajimi Timeline.

This project is still evolving quickly, so the best contributions are the ones that keep the workflow simple, stable, and understandable.

## Before You Start

- Read `README.md` first to understand the product direction.
- Check `ROADMAP.md` to avoid working against current priorities.
- Open an issue before large changes if the direction is not obvious.
- Prefer improving existing flows over adding more surface area.

## What Is Most Helpful

- bug fixes with clear reproduction steps
- UI polish that reduces friction without adding complexity
- performance improvements for long Gemini conversations
- local-first reliability improvements
- documentation improvements and better demo assets

## What To Avoid

- large feature additions without prior discussion
- broad refactors that make the extension harder to maintain
- changes that weaken local-first behavior or privacy expectations
- visual redesigns that add noise instead of clarity

## Development Setup

Install dependencies if needed:

```bash
npm install
```

Run local checks:

```bash
npm run check
```

Build manually:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build.ps1
```

Dry-run the release flow:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 -DryRun
```

## Project Layout

- Root files: browser extension runtime entry files referenced by `manifest.json`
- `scripts/`: build and release automation
- `docs/`: guides, screenshots, and demo asset placeholders
- `vendor/`: bundled third-party browser-side libraries

## Pull Request Guidelines

- Keep pull requests focused and small when possible.
- Explain the user-facing problem first, then the code change.
- Include screenshots or GIFs for visible UI changes.
- Mention any performance impact for long conversations.
- Note any storage, backup, or migration implications.

## Code Style

- Preserve the current local-first product direction.
- Prefer simple code paths over clever abstractions.
- Match existing naming and file organization unless there is a clear reason to improve it.
- Avoid introducing new dependencies unless they solve a real maintenance problem.

## Testing Expectations

- At minimum, run `npm run check`.
- For build or release related changes, also run `powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 -DryRun`.
- For UI changes, verify the side panel manually on a real Gemini conversation.

## Reporting Bugs

Please include:

- browser and version
- extension version
- a short reproduction path
- screenshots if the issue is visual
- `window.__hajimiPerf.table()` output if the issue is performance-related
