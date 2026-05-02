---
name: Bug report
about: Report a reproducible problem
title: "[Bug] "
labels: bug
assignees: ""
---

## What happened?

Describe the issue clearly.

## Steps to reproduce

1. Open Gemini page:
2. Open Hajimi Timeline:
3. Click or drag:
4. Observe:

## Expected behavior

What should have happened?

## Environment

- Browser:
- Extension version:
- OS:
- Gemini conversation length, if relevant:

## Performance trace

Open the Gemini page console and run:

```js
await window.__hajimiPerf.clear()
window.__hajimiPerf.table()
```

Paste the output or attach a screenshot if the issue is related to lag, loading, or rendering.

## Screenshots

Attach screenshots or short GIFs if useful.
