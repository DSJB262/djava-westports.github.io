# Changelog — Djava-Westports Project Tracker

---

## 2026-05-15

### Ticket Table
- Removed **Due Date** column from ticket list table
- All columns set to `auto` width (browser sizes based on content)
- Stage badge truncates with ellipsis (`max-width: 160px`) + hover tooltip shows full name
- Action buttons (`View`, `Progress/Track`, `Jira`) stay on one row (`flex-wrap: nowrap`)
- Added `table-scroll-wrap` for horizontal scroll on small screens

### Favicon & Logo
- Added Djava logo (`favicon.png`) as browser tab favicon
- Logo replaces 📋 emoji in header bar and login card
- White background removed from logo (transparent PNG)

### Workflow Stages
Replaced old 15 stages with new 16-stage workflow:

| # | Stage |
|---|-------|
| 1 | Requested / Reported |
| 2 | Troubleshooting / Investigation |
| 3 | Requires Fix / Development |
| 4 | Pending URS |
| 5 | Pending Mandays Estimation |
| 6 | Pending Revised Mandays |
| 7 | Pending Mandays / CR Approval |
| 8 | Pending Development |
| 9 | Development In Progress |
| 10 | Pending Testing |
| 11 | Testing In Progress |
| 12 | Plan for Release |
| 13 | Pending CAB Approval |
| 14 | Implementation In Progress |
| 15 | Resolved |
| 16 | Rolled Back |

### CAB Dashboard
- CAB tab now shows tickets at stages: **Plan for Release**, **Pending CAB Approval**, **Implementation In Progress**
- Removed old stage filters: `Pending CR Approval`, `Change Ticket Created`, `CAB Approval`, `Implementation`

### Apps Script (`apps-script.gs` — redeploy manually)
- `cabStages` updated to new stage names
- Default stage on new ticket creation changed from `'Reported'` → `'Requested / Reported'`
- Default stage on email auto-create also updated

---

## 2026-05-14

### Dashboard Tab Improvements
- **Charts** — all 3 charts (`Workload by Developer`, `Tickets by Stage`, `Tickets by Status`) in one equal-width row (`repeat(3, 1fr)`), each 500px tall, `maintainAspectRatio: false`
- **Tickets by Stage chart** — `autoSkip: false` so all 17 labels always render
- **Developer Workload grid** — changed from 3 columns to 2 columns (fixes horizontal scroll)
- Dev ticket stage labels truncate with ellipsis on overflow
- Section headings use `.dash-section-heading` class (border-bottom separator, no inline styles)

---

## 2026-05-12

### Initial Session
- Project tracker deployed to GitHub Pages
- Jira integration: projects `WPSCSSSUP`, `WPSWDCSUP`, `CARGOMOVE`, `WPCRONJOBS`, `WPCBASSUP`, `WPEDICSUP`, `WPETPSUP`
- Backend: Google Apps Script web app → Google Sheets
- Login system with `admin` and `developer` roles
- Manual ticket creation, progress tracking for Jira tickets
- Email auto-create from RE-XXXXX / SR-ID patterns
- Document upload to Google Drive
- Status log history per ticket
- CAB dashboard with doc checklist (MOP, Test Result + Signoff, ORA)

---

## Deployment

| Remote | Repo | URL |
|--------|------|-----|
| `pages` | `DSJB262/djava-westports.github.io` | — |
| `pages-org` | `djava-westports/djava-westports.github.io` | https://djava-westports.github.io/ |

Push command:
```bash
git push pages main && git push pages-org main
```

> **Note:** `apps-script.gs` is in `.gitignore` — changes must be manually copied into Google Apps Script editor and redeployed as a new version.
