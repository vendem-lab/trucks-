# Haulway Drivers' Union

A member website and back office for a Ghana-based independent drivers' union. The frontend is built with React and Vite. It supports a seeded local demo mode and a Firebase live mode with Authentication, Cloud Firestore, and callable Cloud Functions.

> **Branding:** the union name, contact details, address, and leadership information are provisional placeholders. Confirm them before production use.

## Main areas

- Public pages for union information, loads, membership applications, news, events, and enquiries.
- Member portal for profile updates, dues history, and job alerts.
- Staff workspace for members, loads, dues, events, news, enquiries, and union settings.

The app does not include a payment gateway. Payment records are managed manually.

## Run locally

```bash
npm install
npm run dev
npm run build
npm run preview
npm test
```

Use `.env.example` as a template for local environment configuration. Set `VITE_USE_DEMO_DATA=true` to use the seeded browser-only demo. With `VITE_USE_DEMO_DATA=false`, the app connects to the Firebase project configured in `src/lib/firebase.js`.

## Firebase live mode

Live mode uses Firebase Authentication (Email/Password and Google), Cloud Firestore, and callable Cloud Functions in `us-central1`. Enable Email/Password and Google providers in Firebase Authentication, add each deployed domain under Authorized domains, deploy the Firestore rules and functions, and set the function secrets `MAIL_API_KEY` and `NOTIFICATION_FROM` if office email notifications are required. Cloud Functions deployment may require a billing-enabled Firebase project.

Create the first staff account in Firebase Authentication, then create its `users/{uid}` document through the Firebase Console or Admin SDK with `role: "staff"`, `name`, `email`, and `staffRole`. Public registration cannot grant staff access. New member applications remain pending until staff approve them.

Google sign-in authenticates with Firebase and then requires an existing union profile. A first-time Google user gets a pending profile and must submit the regular membership application; staff approval is still required before portal access. Callable functions perform protected member profile updates, load claims, event registration, job-alert management, and member approval/status changes. Deleting member accounts and direct staff creation of member accounts are disabled. Public event registration requires sign-in. Payment integration is not configured.

Before entering real member information, review and verify `firestore.rules` and the Cloud Functions against the Firebase Emulator Suite. Deploy from the project root with:

```bash
npm --prefix functions install
firebase deploy --only firestore:rules,functions
```

## Project layout

```
src/
  config.js              branding, tiers, statuses, regions, and FAQs
  lib/
    seed.js              local demo data
    store.js             demo store and Firestore-backed data actions
    union.js             dues summaries, event dates, and alert matching
    auth.js              Firebase and demo authentication flows
    firebase.js          Firebase client initialization
    callables.js         callable Cloud Functions client wrappers
    format.js            currency, dates, and validation helpers
  components/            layouts, cards, badges, icons, and form fields
  pages/                 public pages, member portal, and staff workspace
  styles/                base, layout, page, admin, and union styles
functions/
  index.js               callable functions and email notification triggers
firestore.rules          Firestore client access rules
```
