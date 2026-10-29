# Task & Habit Tracker

A fully customizable, offline-first task and habit tracker in plain HTML, CSS and vanilla JavaScript. No build step, no account, no server — your data stays on your device.

## Features

- **Tasks + habits in one app** — Today, Calendar, Manage and Stats views.
- **Every item is fully customizable** — name, icon, colour, notes, frequency
  (daily, weekdays, weekends, or custom days), target per day, start/end date
  and reminder time for habits; priority, due date, category and repeat for tasks.
  Edit any field later with the edit button.
- **Many days, no gaps** — the calendar goes month by month with no missing days.
  Green = done, amber = partly done, red = missed, grey = not scheduled,
  dashed = upcoming.
- **No day is skipped** — a scheduled day you didn't do stays visible as
  **Missed** and counts in your stats. A not-scheduled day never breaks your
  streak. You can tap any past day in Calendar to fill it in later (backfill).
- **Streaks** — current streak, longest streak, total done and missed days,
  counted only over scheduled days in a row.
- **Offline PWA** — a cache-first service worker (`sw.js`) and a web manifest
  (`manifest.json`) let it work offline once loaded.
- **Export / import** — Export JSON, Export CSV (habit history) and Import a
  JSON backup from the Manage tab, so you never lose your data.

## Run it

Just open `index.html` in a browser, or serve the folder with any static server, for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/

## Files

- `index.html` — app layout and tabs
- `app.js` — UI, tabs, calendar, editing, export/import
- `logic.js` — pure date, schedule and streak logic (no DOM, unit-testable)
- `styles.css` — styling, light/dark themes
- `sw.js` — offline service worker
- `manifest.json` — PWA manifest

Note: the PWA icons (`icons/icon-192.png`, `icons/icon-512.png`) are referenced
by `manifest.json` but are not included in this repository upload, because the
upload route only accepts UTF-8 text files. The app works without them; add
your own 192px and 512px PNGs under `icons/` if you want installable-app icons.
