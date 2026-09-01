# Scorpio Preconstruction — CM Project Startup Tracker

A static, no-build web app for tracking Scorpio's CM Project Startup Checklist
(Activate → Discovery → Development → Details → Done) across multiple projects
and locations.

## Features

- Create/edit/delete projects (name, location, delivery method, team lead, activate date)
- Full checklist from the CM Project Startup Checklist, grouped by phase
- Deadlines are computed automatically from each project's Activate date
  (48 hrs, end of week 1/2/3/4) and flagged as due soon / overdue / complete
- Overall and per-phase progress tracking
- Data is saved in the browser's local storage — no backend required

## Running locally

No build step needed. Serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Notes

- Data is stored per-browser (localStorage), not shared between users/devices.
- The checklist content lives in `checklist-data.js` — update it there if the
  process changes.
