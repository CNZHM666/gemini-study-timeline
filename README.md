# Hajimi Study Cards

[English](README.md) | [简体中文](README.zh-CN.md)

![Version](https://img.shields.io/badge/version-1.1.290-2f7d67?style=for-the-badge)
![Manifest V3](https://img.shields.io/badge/manifest-v3-0f766e?style=for-the-badge)
![Local First](https://img.shields.io/badge/storage-local--first-7c3aed?style=for-the-badge)
![License MIT](https://img.shields.io/badge/license-MIT-16a34a?style=for-the-badge)

> Turn Gemini conversations into focused study cards, follow-up threads, notes, bookmarks, and review tasks.

Hajimi Study Cards is a local-first browser extension for learners who use Gemini for serious study. Instead of managing a pile of scattered chat records, the extension helps you pick one question, understand it through follow-ups, turn it into a study card, and come back later for review.

![Hajimi Study Cards home](docs/images/home.png)

## What Changed In v1.1.290

This version shifts the product focus from a general study sidebar to a clearer study-card workflow.

- New study-card workspace centered on one question at a time
- Cleaner card area with structured fields for core knowledge, understanding, mistakes, review questions, source excerpts, and notes
- Follow-up area and card area use tab switching instead of crowded side-by-side panels
- Timeline right-click actions can create a follow-up topic and add related time points into the same follow-up group
- Follow-up groups on the Gemini timeline are circled and connected with matching colors
- Card source index now separates pending and completed sources
- Bottom workflow actions are fixed and the card editor now leaves enough scroll room for Save and Cancel
- Exported card images include the current card content
- MathJax is bundled locally for better formula rendering in extension pages

## Core Workflow

1. Open a Gemini conversation.
2. Open Hajimi Study Cards from the browser side panel.
3. Choose a conversation turn as the current learning question.
4. Use the follow-up tab to ask until the question is clear.
5. Use the card tab to generate or edit a structured study card.
6. Add the card to review, mark it mastered, export it as an image, or move to the next question.

The goal is simple: every learning session should produce a useful study card, not just another long chat.

## Highlights

- **Study card first:** the main workspace guides users toward generating a reusable learning card.
- **Structured editing:** cards are split into clear fields instead of one large free-form text box.
- **Timeline follow-up groups:** right-click a time point as the main follow-up topic, then add related points into the same colored group.
- **Less clutter:** follow-up and card content are switched by tabs, reducing the amount of UI shown at once.
- **Local-first storage:** notes, cards, bookmarks, review state, and settings stay in `chrome.storage.local`.
- **Review flow:** cards can be added to review or marked as mastered from the workspace.
- **Image export:** turn a finished card into a shareable or savable image.
- **Long-chat friendly:** optimized for long Gemini conversations and timeline navigation.

## Privacy

- Runs only on `https://gemini.google.com/*`
- Stores learning data locally with `chrome.storage.local`
- Does not send Gemini conversation content to any third-party server
- Supports local backup/export flows from the workspace settings
- Browser extension storage may be removed by the browser when the extension is uninstalled

## Install For Development

1. Build the extension or use the latest folder inside `dist/`.
2. Open `edge://extensions/` or `chrome://extensions/`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extension folder, for example `dist/gemini-study-timeline-v1.1.290`.
6. Open `https://gemini.google.com` and start using the side panel.

## Development

Build:

```powershell
npm run build
```

Check JavaScript syntax:

```powershell
npm run check
```

Release helper:

```powershell
npm run release
```

Dry run:

```powershell
npm run release:dry
```

## Project Structure

```text
.
├── docs/                 Guides, screenshots, and demo asset slots
├── scripts/              Build and release automation
├── vendor/               Bundled browser-side third-party libraries
├── background.js         Extension service worker
├── content.js            Gemini page integration and timeline UI
├── perf-bridge.js        Page-level performance bridge
├── sidepanel.html        Side panel entry
├── sidepanel.js          Side panel logic
├── style.css             Main extension styles
├── workbench-override.css Final workspace layout overrides
├── manifest.json         Browser extension manifest
├── package.json          Developer commands
└── CHANGELOG.md          Release notes
```

## Release Asset

The latest packaged build is generated as:

```text
dist/gemini-study-timeline-v1.1.290.zip
```

## Project Status

This project is in active development. The current priority is making the learning-card workflow clearer, lighter, and easier to use during real study sessions.

## License

MIT
