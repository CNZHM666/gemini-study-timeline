# Hajimi Timeline

[English](README.md) | [简体中文](README.zh-CN.md)

![Version](https://img.shields.io/badge/version-1.1.236-4c6ef5?style=for-the-badge)
![Manifest V3](https://img.shields.io/badge/manifest-v3-0f766e?style=for-the-badge)
![Local First](https://img.shields.io/badge/storage-local--first-7c3aed?style=for-the-badge)
![License MIT](https://img.shields.io/badge/license-MIT-16a34a?style=for-the-badge)

> A local-first Gemini Study Timeline for focused learning, notes, and review flow.

Hajimi Timeline is a browser extension for people who use Gemini as a real learning tool, not just a quick-answer box. It is designed as a Gemini Study Timeline: a calmer workflow where you can study one question at a time, keep local notes, and return later without losing context.

**Quick Links:** [At A Glance](#at-a-glance) · [Highlights](#highlights) · [Preview Plan](#preview-plan) · [Typical Flow](#typical-flow) · [Install](#install-for-development) · [Development](#development) · [Project Structure](#project-structure)

## At A Glance

| Item | Details |
| --- | --- |
| Product Type | Browser side-panel extension for Gemini |
| Core Value | Turn long chats into a structured learning workflow |
| Storage Model | Local-first via `chrome.storage.local` |
| Target Users | Learners, exam prep users, long-session Gemini users |
| Current Focus | Workflow clarity, notes, review flow, performance |

## Highlights

- Study queue generated from Gemini conversation turns
- Focused sub-question workspace for follow-up learning
- Local notes, image notes, categories, and completion state
- Main learning map for categories and progress
- Review-oriented workflow after note taking
- Optimized rendering for long Gemini conversations
- Local JSON export/import for backup and migration

## Feature Pillars

| Pillar | What It Means |
| --- | --- |
| Focus | Work on one question at a time instead of re-reading huge chats |
| Capture | Keep local notes, image notes, and progress in the same workspace |
| Return | Come back later with categories, review flow, and saved learning context |

## Preview Plan

When you are ready to make the repository homepage more visual, add assets in this order:

1. `docs/images/hero-overview.png`
2. `docs/demo/demo-start-learning.gif`
3. `docs/images/study-workspace.png`
4. `docs/images/note-review-flow.png`

Suggested hero block:

```md
![Hajimi Timeline overview](docs/images/hero-overview.png)
```

Suggested demo block:

```md
![Start learning demo](docs/demo/demo-start-learning.gif)
```

## Why This Exists

Long Gemini conversations are powerful, but they get messy fast:

- useful questions are buried in long scrollbacks
- follow-up threads are hard to revisit
- notes and review state live outside the chat
- long sessions become slower and harder to manage

Hajimi Timeline turns that experience into a calmer workflow:

- extract a study queue from the conversation
- open one focused question at a time
- write notes and keep image-based annotations
- group questions by category
- return later with local review state still intact

## Typical Flow

1. Open a Gemini conversation.
2. Open Hajimi Timeline from the browser side panel.
3. Review the main learning map and study queue.
4. Select a question from the queue.
5. Click **Start learning** to enter the focused workspace.
6. Ask follow-ups, save notes, classify the question, then complete it.

Queue and category clicks only select an item. **Start learning** is the only action that opens the workspace, which keeps navigation predictable.

## Privacy

- Runs only on `https://gemini.google.com/*`
- Stores notes, categories, settings, and progress in `chrome.storage.local`
- Does not send Gemini conversation data to any third-party server
- Supports local export/import backup from **Workspace Settings > Data & Privacy**
- Uninstalling the extension may remove local extension storage depending on the browser

## Install For Development

1. Build the extension or use the latest folder inside `dist/`.
2. Open `edge://extensions/` or `chrome://extensions/`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extension folder, for example `dist/gemini-study-timeline-v1.1.236`.
6. Open `https://gemini.google.com` and start using the side panel.

## Development

Build only:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build.ps1
```

Release flow:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1
```

Dry run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 -DryRun
```

If you use npm:

```bash
npm run build
npm run release
npm run release:dry
npm run check
```

## Performance Debugging

Open the Gemini page DevTools console:

```js
await window.__hajimiPerf.clear()
window.__hajimiPerf.table()
```

Useful fields:

- `renderNativeChatTimeline`: Gemini page timeline render cost
- `scanConversation`: Gemini DOM scan cost
- `syncInlineAnnotations`: page-level annotation sync cost
- `renderTimeline`: side panel timeline render cost

For bug reports, attach a screenshot or pasted output of `window.__hajimiPerf.table()`.

## Troubleshooting

- Empty overview: open a real Gemini conversation first, then refresh the side panel
- Queue loads slowly: wait for Gemini hydration to finish, then click refresh
- Dragging feels slow: enable **Low footprint mode** in settings
- Notes missing after reinstall: import a previously exported backup
- Formula copy is broken: select the rendered formula itself and copy again

## Project Structure

The extension runtime files stay in the repository root because the browser manifest references them directly. Supporting materials are grouped into dedicated folders for a cleaner public repository layout.

```text
.
├─ .github/              GitHub issue templates and workflows
├─ docs/                 guides, screenshots, demo asset slots
├─ scripts/              build and release automation
├─ vendor/               bundled third-party browser-side libraries
├─ background.js         extension service worker
├─ content.js            Gemini page integration
├─ perf-bridge.js        page-level performance bridge
├─ sidepanel.html        side panel entry
├─ sidepanel.js          side panel logic
├─ style.css             side panel styles
├─ manifest.json         browser extension manifest
├─ package.json          developer commands
├─ CHANGELOG.md          release notes
├─ CONTRIBUTING.md       contribution guide
├─ ROADMAP.md            project direction
├─ LICENSE               open-source license
└─ README.md             project homepage
```

## Demo Assets

The repository is prepared for public demo assets under:

- `docs/images/` for static screenshots
- `docs/demo/` for animated GIF walkthroughs
- `docs/guides/` for contributor, launch, and release guides

Recommended capture set:

- overview of the learning map and queue
- entering the focused workspace
- note taking and review flow
- performance comparison on a long conversation

## Project Status

This project is in active development. The current priority is:

- a clear learning workflow
- reliable local persistence
- a cleaner side-panel experience
- stable performance on long Gemini conversations

## Related Docs

- `ROADMAP.md` for current direction and priorities
- `CONTRIBUTING.md` for contribution guidelines and local checks
- `docs/guides/GITHUB_LAUNCH_CHECKLIST.md` for public launch settings
- `docs/guides/RELEASE_TEMPLATE.md` for release copy

## License

MIT
