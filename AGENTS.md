# AGENTS.md — CORLIVA Director of Nursing Portal

Read this before changing anything. This app is a finished, approved design. Do **not** redesign it, restyle it, swap the layout, add Tailwind, add a UI kit, or "modernise" it. Only make the change you are asked for, in the same style.

## What this is
CORLIVA is a home care platform. This repo is the **Director of Nursing** web portal. The signed-in person is **Patricia Reyes, RN**, Director of Nursing for the whole agency "Royality Home Care" (North and South Branch). It is a clickable React prototype with built-in demo data. It was made from the Care Supervisor portal (`sadaqat786921/Corliva-care-supervisor-portal`) and shares its design system with the Agency Admin and Care Coordinator portals.

From the client's Director of Nursing job description: a registered nurse who reports to the Administrator, ensures safe, quality care, **performs the functions of the Nursing (Care) Supervisor as needed**, monitors the clinical status of all clients, runs the Quality Improvement and Risk Management programme, evaluates and supervises staff, and coordinates in-service training with attendance records.
So the Director can do **everything a Care Supervisor can** (visit approvals, care plans, checks, exceptions, incidents) for every branch, **plus**: Care Supervisors overview, Clients' health (risk levels and health updates), Quality and risk, High severity incidents sent up to them (with Take over), Staff reviews and Training.
Not included (other roles): intake, referrals, scheduling and family requests (Care Coordinator), HR records, pay, invoices, payroll, users and agency settings (Agency Admin).

**Demo team:** Michael Brooks — Care Supervisor, North Branch. Laura Chen — Care Supervisor, South Branch. Care Coordinators Aisha Rahman, Sara Kim (North), Daniel Reed (South).

## Stack
- React 19 + Vite + TypeScript. Only extra packages: `react-router-dom` and `lucide-react`. Plain web app at the top level of the repo: `index.html` (with `<div id="root">`) and entry `src/main.tsx`. No backend, no API calls, no `.env`.
- `HashRouter` (keep it — the app must work from any static host and in Figma Make)
- Icons: `lucide-react` only
- Styling: plain CSS in `src/styles.css` using CSS variables. **No Tailwind, no CSS reset libraries, no styled-components.**
- Font: Inter, from the font files in `src/fonts` (`src/fonts/inter.css`, imported in `src/main.tsx`). No Google Fonts link.
- Images live in `public/images/` and are referenced with relative paths like `./images/corliva-logo-white.svg`

## Design system (mirrors the Figma file "Corliva", page "03 · Foundations & Components")
- Page background: brand blue `--bg-page #105CBC`. The sidebar sits directly on the blue.
- Sidebar: width 236px, white text and icons, uppercase section labels (11px semibold), nav items 44px tall. The **active item is a white pill** (radius 37px) with dark text `#292D32`.
- Main content: a rounded light panel `--bg-panel #F8F6F6`, radius 24px, with a white header bar (radius 8px, border `#E5EAF1`, height 59px).
- Cards: white, 1px border `#E5EAF1`, radius 12px.
- Primary action colour `--action-primary #0E66D4`. Status colours: success `#18794A`, warning `#9A5B00`, danger `#C0322B`, each with a soft background.
- Status is always a **word plus a colour** (chips), never colour alone.
- Every token is in `:root` at the top of `src/styles.css`. Use the variables; don't hard-code new colours.

## Writing style
The client is non-technical and over 50. Use short, plain English: "Approve visit", "Send back to fix", "Make exception". No jargon.

## Rules that must keep working
- **Branch filter** (sidebar box and header chip): All branches / North / South. It filters every page (`s.inBranch`) and is saved.
- **Clients' health**: every client has a risk level (High / Medium / Low, with a reason — changing it needs a reason). **High-risk clients need a health update at least every 7 days** (`src/data/nursing.ts → checkInDue`); otherwise they show "Update due" in Clients' health and My work. Health update types: Change in health, Hospital stay, Call with family, Nurse home visit, Other. Coordinators and Care Supervisors see the updates. Nothing is removed.
- **Incidents**: Care Supervisors own most incidents (a new one goes to the Supervisor of the client's branch). **High severity incidents are sent up to the Director** (tab "High severity — sent to you", My work, banner on the incident). The Director can **Take over** any incident (reason) and then do everything the owner does. Owners can be a Care Supervisor, the Director of Nursing or the Agency Admin.
- **Care Supervisors page**: what each Supervisor has waiting. "Falling behind" = visits waiting more than 5 days, incidents past their target date, or care plan reviews overdue. "Open" switches the branch filter to their branch and opens the list so the Director can step in.
- **Staff reviews**: every caregiver and Care Supervisor once a year. Outcome (Above standards / Meets standards / Needs to improve) + note + next review date. Overdue and due-in-30-days are shown. Earlier reviews are kept.
- **Training**: add a session (name, date, time, place, trainer, who must come). After the date, **record who came** on the session screen (`/training/:id`); people who didn't come are listed. Sessions with no attendance recorded show "Record who came".
- **Quality and risk** (last 30 / 90 days): incidents reported, falls, medication concerns, missed visits, incidents by type, branches side by side, visits started on time, high severity incidents, open incident actions (late first).
- **Visit approvals** (`src/data/review.ts → serviceFlags`): a finished visit is compared with the plan. Things to look at: no check-out (stops approval until the times are corrected), started late, shorter than planned, much longer than planned, checked in away from the home, care plan tasks not done.
  - Approving a visit **with** something to look at needs a written reason. Visits with nothing to look at can be approved together. Care Supervisors usually do these; the Director can step in (tick + "Approve selected").
  - "Send back to fix" needs a reason → tab "Sent back to fix". Correcting a sent-back visit puts it back in "To review".
  - "Correct times" always keeps the original times (shown as "Before correction") and needs a reason.
  - Approved visits are ready for billing and timesheets. Before Finance invoices them they can still be corrected (reason). **After invoicing** the record isn't changed — "Ask Finance for an adjustment" (new times + reason) is sent instead.
- **Care plans**: Coordinator writes and sends → Supervisor **Approves** (with "in use from" date, optional note) or **Asks for changes** (comment required). The old approved version stays in use until the new one is approved, then shows as "Replaced". Every version is kept; changes from the plan in use are highlighted. **Record review** on the plan in use: "Still right" (next review date + note) or "Needs changes" (note → waits for a new version from the coordinator).
- **Checks**: uploading doesn't mean checked. Client documents: Checked / Rejected (reason) / Not needed (reason); a checked document past its expiry shows Expired. Caregiver checks the Supervisor owns (skills checks, spot checks): Checked (with "check again by" date) / Rejected (reason) / Not needed (reason). HR checks everything else; caregiver readiness comes from HR.
- **Exceptions (overrides)**: when a caregiver is blocked (not ready, not trained), the Supervisor can "Assign anyway" or "Keep … anyway" with a written reason. **Nobody can be on two visits at once** — that block can't be overridden. The exception shows on the visit.
- **Incidents**: the Supervisor owns them. Reported → Start review → Under review → (add actions) Actions agreed → Action required → all actions ticked → Mark resolved (how it was resolved) → Close (closing note). Resolved can be reopened (reason). Change severity, private/visible, owner or target date — each needs a reason. Closed incidents can't be changed. Private incidents are visible to the Supervisor (approved role).
- Nothing is ever deleted. Every change is recorded in the record's history / "Changes" list.

## Structure
```
src/
  styles.css               design tokens + all component styles
  data/seed.ts             demo data (dates relative to today; today's check-ins follow the real clock)
  data/store.tsx           app state (saved in sessionStorage), branch filter, toasts, history, Reset demo data
  data/review.ts           finished-visit checks (serviceFlags), planned vs recorded minutes
  data/schedule.ts         caregiver checks (blocking vs warning), live visit state, visits needing a decision
  data/clients.ts          care plan helpers (plan in use / being worked on, plan that applied on a visit's day, review due)
  data/nursing.ts          staff list, review status, training attendance, health update due, branch supervisor
  components/ui.tsx        Button, Field, Input, Select, Chip, Modal, Tabs, Toggle, StatTile, AlertBanner, EmptyState, ReasonDialog, ...
  components/Shell.tsx     sidebar (branch filter) + header (search, branch, date, alerts, profile menu)
  components/CheckActions.tsx  DocCheckModal, CgCheckModal (shared by Checks, Client and Caregiver screens)
  pages/                   one file per menu item + VisitDetail, CarePlanDetail, ClientDetail, CaregiverDetail, IncidentDetail, Auth
```

## Demo data
All data is sample data in `src/data/seed.ts`. Every change is saved in **sessionStorage**, so it survives a refresh in the same tab. **Reset demo data** is in the profile menu (top right) and at the bottom of Settings.

## Demo sign-in
Any email and any password → **Sign in** → security code **246810** → **Verify and sign in**. Opens **My work** (signed in as Patricia Reyes, Director of Nursing).

## Detail screens (never side panels)
Every record opens on its **own full screen** with a back link to where you came from (`?from=`). Only small decisions (a reason, a confirmation, correct times, approve) use a pop-up.
- **Visit** `/visits/:id` (`VisitDetail.tsx`) — finished visits show **What the caregiver app recorded**: things to look at, planned vs recorded vs difference (and "Before correction"), checked in from, tasks done / not done, caregiver's note. Actions: Approve visit, Correct times, Send back to fix, Correct approved visit, Ask Finance for an adjustment. Upcoming visits show the caregiver, **Find a caregiver / Change caregiver** on the same screen (best matches first, blocked people with red reasons and "Assign anyway"), Keep … anyway, progress, care plan tasks, client details, visit details, changes.
- **Care plan** `/care-plans/:id` (`CarePlanDetail.tsx`) — status, what changed from the plan in use, the plan (changes highlighted), comments, about this version, client and assessment, all versions. Actions: Approve, Ask for changes, Record review.
- **Client** `/clients/:id` — risk chip in the header; tabs **Overview** (details, home assessment, upcoming visits, contacts, history — view only), **Health** (add health update, risk level with Change, all incidents for the client), **Care plan** (plan in use + all versions, click to open), **Documents** (check each one), **Visits** (upcoming/past with your check status). Buttons: See on schedule, Review care plan.
- **Caregiver** `/caregivers/:id` — numbers, tabs **Profile**, **Skills checks** (record checks), **Reviews and training** (yearly reviews + Record review, sessions they were invited to and whether they came), **Visits**, **Clients**. Button: See on schedule.
- **Training session** `/training/:id` — who is invited, tick who came + note, who didn't come, session details.
- **Incident** `/incidents/:id` — Take over (if someone else owns it), "sent up to you" banner for High severity, progress tracker, what happened, what you found (edit), actions (add, tick off), outcome, notes, who handles it (change), severity and who can see it, details, visits that day.

## Menu
- **My work** (`/`) — greeting, 4 numbers (high-risk clients, open incidents, Care Supervisors, staff reviews and training), **Needs you now** (high severity incidents, health updates due, incidents past target, visits needing a decision, training attendance to record, staff reviews overdue, Supervisors falling behind), high-risk clients, Care Supervisors, training this week, open incidents by severity.
- **Care Supervisors** (`/supervisors`), **Clients' health** (`/health`), **Quality and risk** (`/quality`), **Incidents** (`/incidents` — Open / High severity — sent to you / Resolved / Closed).
- **Visit approvals**, **Care plans** (Waiting for approval / Reviews due / With the coordinator / Approved), **Checks** — same as the Care Supervisor portal.
- **Clients**, **Schedule**, **Today's visits**, **Caregivers**, **Reviews and training** (`/staff` — Staff reviews / Training), **Settings**.

## Waiting for the client
- Do they employ nurses (RN/LPN) as caregivers? If yes, add "Nurse" to the caregiver types.
- Who approves care plans: Care Supervisor, Director of Nursing, or Supervisor then Director for high-risk clients? (Now: either can approve.)
- When the Director covers for the Administrator, should they see Admin screens? (Now: not included.)

## Other roles
- **HR Officer** — own portal: `sadaqat786921/Corliva-hr-officer-portal` (employment, requirements and checks, time off, ready to work; changes flag the caregiver's upcoming visits for the coordinator).
- **Caregiver** — own portal: `sadaqat786921/corliva-caregiver-portal` (phone-friendly: their visits, check in and out, tasks, notes, sending the visit record, reporting a problem, sending documents to HR).

## Run
```
npm install
npm run dev     # preview
npm run build   # must finish with no errors
```
