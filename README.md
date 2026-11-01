# Haulway Drivers' Union

A member website and back office for a Ghana-based independent drivers' union. The frontend is built with React and Vite. It supports a seeded local demo mode and a Firebase live mode with Authentication and Cloud Firestore.

> **Branding:** the union name, contact details, address, and leadership information are provisional placeholders. Confirm them before production use.

## Main areas

- Public pages for union information, loads, the member vehicle fleet, membership applications, news, events, and enquiries.
- A moderated **Post a load** form for shippers on `/loads`; every submission is reviewed before it reaches the public board.
- Member portal for profile updates, public vehicle photos, dues history, and job alerts.
- Staff workspace for members, load requests, loads, dues, events, news, enquiries, and union settings.

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

## Moderated load requests

Visitors and shippers can submit a load from the **Post a load** section on `/loads`. Submissions are written to the `loadRequests` collection with `status: "pending"` and are never written directly to the public `loads` collection.

- Public create is allowed on `loadRequests`; read, update, and delete are staff-only.
- Staff review the queue at `/admin/load-requests`, where they can approve, reject with a reason, or delete spam.
- Approving a request creates a normal `loads` document and links the request to it with `loadId` and `loadReference`.
- The public form validates the shipper, contact, route, vehicle type, weight, rate, and pickup date. It also uses a hidden honeypot field and a browser-side rate limit of three submissions per ten minutes.
- `firestore.rules` repeats the field and length validation, requires `status: "pending"` and `source: "public"`, and rejects requests outside the supported vehicle types.
- Staff can still create and delete loads directly from `/admin/loads`; members can only claim an open load.

## Delivery tracking

A load moves through `open` → `filled` (shown as **Claimed**) → `delivered` → `closed`, or to `disputed` if the shipper reports a problem. The driver who claimed the load marks it delivered; the shipper confirms it with the load reference.

- Shipper contact details are stored in the private `loadContacts/{loadId}` collection, never in the publicly readable `loads` document. `firestore.rules` rejects staff writes that add contact fields back to a load.
- The claiming active member records the delivery from `/loads` with a note, an optional proof-of-delivery photo, and an automatic timestamp. Only that member may write `deliveries/{loadId}`, only while the load is `filled`, and the load update must happen in the same transaction.
- Delivery evidence lives in `deliveries/{loadId}`. Staff and the member who made the delivery can read it; only staff can update or delete it.
- Shippers confirm at `/confirm-delivery` using the load reference and the email address the load was posted with. The rules compare the email against `loadContacts` and require the load to be `delivered` before accepting the confirmation. Confirmations are public creates in `deliveryConfirmations`; reading and reviewing them is staff-only.
- Staff review delivery evidence at `/admin/loads`, accept or dismiss a shipper confirmation, or confirm a delivery or record a problem directly. Accepting closes the load; a problem report marks it `disputed`. Reopening a load clears the claim and removes its delivery record.
- Existing `loads` documents created before this change must have their `contactName`, `contactPhone`, and `contactEmail` fields moved into `loadContacts` before the tightened rules are deployed.

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
    loadRequests.js      public load-request validation, rate limit, and mapping
    deliveries.js        delivery and shipper-confirmation validation and records
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
