# Haulway Drivers' Union

A member website and back-office for a Ghana-based independent drivers' union. Built with React + Vite, running entirely in the browser (demo auth and `localStorage` persistence, no server).

> **Note on branding:** the name "Haulway Drivers' Union", the Accra address, phone numbers and leadership names are **provisional placeholders**. Replace them in `src/config.js` (and the seed data in `src/lib/seed.js`) once the client confirms the real union identity.

## What's inside

**Public site**

- `/` — union home: priorities, verified load board preview, membership tiers, news and events
- `/about` — who the union is, how decisions are made, leadership and regional coverage
- `/loads` — verified load board with filters, plus job-alert sign-up for members
- `/membership` — tiers, member benefits and the join application form
- `/news`, `/news/:id` — announcements, industry updates and member stories
- `/events` — training, regional meetings and the annual assembly, with registration
- `/contact` — office details, enquiry form and FAQs
- `/login` — demo sign-in for members and staff

**Member portal** (`/portal`)

- Overview of membership card, dues position, matched loads and upcoming events
- Profile editing (contact details, vehicle, emergency contact)
- Dues ledger with a demo "pay now" flow (mobile money / bank / cash)
- Job alerts: create, pause, edit and delete saved route alerts

**Staff admin** (`/admin`)

- Dashboard: membership, dues collection and load board activity
- Members: applications, approvals, suspensions, dues history
- Loads: publish, edit, close and reopen board postings
- Dues: generate invoices per period, mark paid, waive or delete
- News and events: full CRUD, including event registrations
- Enquiries inbox and union settings (including demo data reset)

## Demo accounts

| Role   | Email                      | Password   |
| ------ | -------------------------- | ---------- |
| Staff  | `admin@haulwayunion.org`   | `union123` |
| Member | `member@haulwayunion.org`  | `driver123`|

Every seeded member uses `driver123`. The login screen has one-click buttons to fill either demo account.

## Data and storage

- State lives in `localStorage` under `haulway_union_v1`.
- The session lives under `haulway_union_session`.
- Reset the demo data from **Admin → Settings → Reset demo data**.
- All mutations (claiming a load, marking dues paid, event registration, enquiries) write immediately to `localStorage`, so the demo behaves like a real app refresh-to-refresh.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
npm test
```

## Firebase live mode

The app uses Firebase Authentication and Cloud Firestore when `VITE_USE_DEMO_DATA` is not set to `true`.
Create a local `.env` file from `.env.example`, deploy `firestore.rules`, and enable Email/Password in Firebase Authentication.
The existing seeded preview can be used locally with `VITE_USE_DEMO_DATA=true`; preview data and demo passwords are never uploaded to Firestore.

Create the first staff account in Firebase Authentication, then create `users/{uid}` in Firestore with `role: "staff"`,
`name`, `email`, and `staffRole`. Do this from the Firebase Console or Admin SDK; public sign-up cannot grant staff access.

Firestore notifications are sent by the Cloud Functions in `functions/`. They use Resend; set the `MAIL_API_KEY` and
`NOTIFICATION_FROM` Firebase secrets before deploying functions. Function deployment requires a Firebase project with
Cloud Functions billing enabled. Email integration is notification-only; dues and payments remain demo/manual flows.

Callable Cloud Functions handle member profile edits, load claims, event registration, job alert management and staff member status changes.
Deleting member accounts and direct admin creation of member accounts remain disabled; public applications are the account entry path.
The Firestore client rules must be exercised against the Emulator Suite before any real member records are added.

Before real member data is entered, review the Firestore rules and test them with Firebase Emulator Suite. Deploy with
`firebase deploy --only firestore:rules,functions` after installing the Firebase CLI and dependencies in `functions/`.

## Project layout

```
src/
  config.js              brand, tiers, statuses, regions, benefits, FAQs
  lib/
    seed.js              demo members, loads, dues, news, events, enquiries
    store.js             localStorage store + CRUD actions
    union.js             dues periods/summaries, event dates, alert matching
    auth.js              demo staff/member sign-in
    format.js            currency, dates, validation helpers
  components/            layouts, cards, badges, icons, form fields
  pages/                 public pages
  pages/portal/          member portal
  pages/admin/           staff admin
  styles/                base, layout, pages, admin, union
```

## Replacing the placeholder identity

1. `src/config.js` — `BRAND`, `TIERS`, `LEADERSHIP`, `FAQS`, `REGIONS`, `DEMO_*`.
2. `src/lib/seed.js` — member names, load routes, news copy, events, office details.
3. `index.html` and `public/favicon.svg` — title, meta description, icon colours.
4. `src/styles/base.css` — `--brand`, `--gold` and the teal scale if the palette changes.
