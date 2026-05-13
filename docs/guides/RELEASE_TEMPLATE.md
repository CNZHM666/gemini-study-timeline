# Release Template

Use this as the starting point for the GitHub release page.

## Suggested Release Title

`v1.1.290 - Study Card Workspace`

## Suggested Short Tagline

Turn Gemini conversations into focused study cards, follow-up groups, and review tasks.

## Release Notes Template

```md
## Hajimi Study Cards v1.1.290

This release changes the extension from a broad study-management sidebar into a clearer study-card workflow.

### What It Does

Hajimi Study Cards helps learners turn Gemini conversations into reusable review material:

- choose one Gemini time point as the current learning question
- ask follow-ups until the question is clear
- generate or edit a structured study card
- save source excerpts, annotations, and review prompts
- add the card to review, mark it mastered, or export it as an image

### Highlights

- new study-card-first workspace
- tab switching between Follow-up and Card areas
- structured card fields instead of one large free-form editor
- timeline follow-up groups with colored circles and connecting lines
- main/sub labels on grouped timeline points
- cleaner card source index with pending and completed states
- fixed bottom workflow actions with better editor scrolling
- card image export that includes current card content
- locally bundled MathJax for formula rendering

### Privacy

- runs only on `https://gemini.google.com/*`
- stores data in `chrome.storage.local`
- does not send conversation content to third-party servers

### Release Asset

Attach:

- `dist/gemini-study-timeline-v1.1.290.zip`

### Notes

This version is still actively evolving. The current focus is making the learning-card workflow clearer, lighter, and more useful for real study sessions.
```

## Release Asset Suggestions

- Extension zip from `dist/gemini-study-timeline-v1.1.290.zip`
- One screenshot of the card workspace
- One screenshot or GIF of timeline follow-up grouping
- One screenshot of structured card editing
