# Changelog — Djava-Westports Project Tracker

---

## 2026-06-09

### Filters — Application & Assignee
- Fixed Assignee filter dropdown being empty on load: `refreshAssigneeDropdown()` now runs after tickets are loaded, not only after the separately-loaded assignees list resolves (race condition fix)
- Fixed Application field not being saved by the backend: `TICKET_HEADERS`, `createTicket`, and `updateTicket` in `apps-script.gs` now include `Application` as a persisted column (requires one-time manual step: add "Application" header in column 24 of the existing Tickets sheet, then redeploy the Apps Script)

---

## 2026-06-08

### Dashboard — Developer Workload Cards
- Fixed dev/test workload cards (and matching chart counts) to match a ticket to a developer based on **role + current stage**, not just role:
  - A ticket only counts as **Dev** work for someone if they're the assigned developer (`PIC Dev`) **and** the ticket is in `Pending Development` / `Development In Progress`
  - A ticket only counts as **Test** work for someone if they're the assigned tester (`PIC Test`) **and** the ticket is in `Pending Testing` / `Testing In Progress`
- Effect: once a developer's ticket moves to **Testing In Progress**, it no longer lingers under that developer's card (unless they're also the assigned tester); tickets in **Development In Progress** / **Pending Development** continue to show under the assigned developer

---

## 2026-05-29

### Sidebar & Filters
- Sidebar user name now truncates with ellipsis instead of overflowing the panel
- Role chip (`admin`/`developer`) is no longer squeezed — stays fully visible
- Filters bar: spacer added so Source → Assignee filters stay left-aligned, and Show Resolved / Clear / Download buttons sit at the far right

### Source Badge Fix
- Email auto-created tickets (Source = `Manual` from GAS) now correctly show **ME** (ManageEngine) badge
- Tickets with no Source whose title matches `RE-XXXX` / `SR-` patterns also remapped to ManageEngine on load

---

## 2026-05-24

### App Versions Tab
- Added **📦 App Versions** navigation tab
- Displays current deployed versions for all 10 Westports systems:
  - CBAS Web 2.75.2, CBAS VM 2.73.0
  - SCSS WDC 5.54.4, SCSS RGS 5.54.0, SCSS AGS 5.6.0, SCSS SWIM 5.54.0, SCSS CM 5.54.2, SCSS Web 5.54.2
  - CronJob 1.7.0, EDIC 2.89.1
- Responsive grid (5 columns → 4 → 3 → 2 on smaller screens)

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
