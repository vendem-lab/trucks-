# Haulway Drivers' Union

A member website and back office for a Ghana-based independent drivers' union. The frontend is built with React and Vite. It supports a seeded local demo mode and a Firebase live mode with Authentication and Cloud Firestore.

> **Branding:** the union name, contact details, address, and leadership information are provisional placeholders. Confirm them before production use.

## Main areas

- Public pages for union information, loads, the member vehicle fleet, membership applications, news, events, and enquiries.
- Member portal for profile updates, public vehicle photos, dues history, and job alerts.
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

Live mode uses Firebase Authentication (Email/Password and Google) and Cloud Firestore. Enable Email/Password and Google providers in Firebase Authentication, add each deployed domain under Authorized domains, and deploy the Firestore rules. Member and staff actions are written directly from the client and validated by `firestore.rules`, so live mode works on the Firebase Spark plan without Cloud Functions.

Create the first staff account in Firebase Authentication, then create its `users/{uid}` document through the Firebase Console or Admin SDK with `role: "staff"`, `name`, `email`, and `staffRole`. Public registration cannot grant staff access. New member applications remain pending until staff approve them.

Google sign-in authenticates with Firebase and then requires an existing union profile. A first-time Google user gets a pending profile and must submit the regular membership application; staff approval is still required before portal access. Firestore rules protect member profile updates, public vehicle photos, load claims, event registration, job-alert management, dues payments, and member approval/status changes. Deleting member accounts and direct staff creation of member accounts are disabled. Public event registration requires sign-in. Payment integration is not configured.

Active members can publish one compressed JPEG vehicle photo from their profile. The photo is stored in the public `fleet/{uid}` collection with only the member's display name, vehicle type, city, region, tier, join date, and photo. Registration numbers, phone numbers, licence details, and emergency contacts are never copied into the public document. Staff can remove a published photo from the member detail view.

Before entering real member information, review and verify `firestore.rules` against the Firebase Emulator Suite. Deploy the rules from the project root with:

```bash
firebase deploy --only firestore:rules
```

The optional `functions/` folder contains Cloud Functions, including email notification triggers for new applications and enquiries. It can be deployed later on a billing-enabled Blaze project; the client does not depend on it.

## Project layout

```
src/
  config.js              branding, tiers, statuses, regions, and FAQs
  lib/
    seed.js              local demo data
    store.js             demo store and Firestore-backed data actions
    fleet.js             public fleet records and demo vehicle illustrations
    image.js             client-side vehicle photo compression
    union.js             dues summaries, event dates, and alert matching
    auth.js              Firebase and demo authentication flows
    firebase.js          Firebase client initialization
    format.js            currency, dates, and validation helpers
  components/            layouts, cards, badges, icons, and form fields
  pages/                 public pages, member portal, and staff workspace
  styles/                base, layout, page, admin, and union styles
functions/
  index.js               optional Cloud Functions and email triggers (Blaze only)
firestore.rules          Firestore client access rules
```
