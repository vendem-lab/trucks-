# Haulway Drivers' Union

A member website and back office for a Ghana-based independent drivers' union. The frontend is built with React and Vite. It supports a seeded local demo mode and a Firebase live mode with Authentication and Cloud Firestore.

> **Branding:** the union name, contact details, address, and leadership information are provisional placeholders. Confirm them before production use.

## Main areas

- Public pages for union information, loads, the member vehicle fleet, membership applications, news, events, and enquiries.
- A moderated **Post a load** form for shippers on `/loads`; every submission is reviewed before it reaches the public board.
- Member portal for profile updates, public vehicle photos, account settings, dues history, and job alerts.
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

In Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
npm.cmd test
```

Use `.env.example` as a template for local environment configuration. Set `VITE_USE_DEMO_DATA=true` to use the seeded browser-only demo. With `VITE_USE_DEMO_DATA=false`, the app connects to the Firebase project configured in `src/lib/firebase.js`.

## Firebase live mode

Live mode uses Firebase Authentication (Email/Password and Google) and Cloud Firestore. Enable Email/Password and Google providers in Firebase Authentication, add each deployed domain under Authorized domains, and deploy the Firestore rules. Member and staff actions are written directly from the client and validated by `firestore.rules`, so live mode works on the Firebase Spark plan without Cloud Functions.

Create the first staff account in Firebase Authentication, then create its `users/{uid}` document through the Firebase Console or Admin SDK with `role: "staff"`, `name`, `email`, and `staffRole`. Public registration cannot grant staff access. New member applications remain pending until staff approve them.

Google sign-in authenticates with Firebase and then requires an existing union profile. A first-time Google user gets a pending profile and must submit the regular membership application; staff approval is still required before portal access. Firestore rules protect member profile updates, public vehicle photos, load claims, event registration, job-alert management, dues payments, and member approval/status changes. Deleting member accounts and direct staff creation of member accounts are disabled. Public event registration requires sign-in. Payment integration is not configured.

Active members can publish one compressed JPEG vehicle photo from their profile. The photo is stored in the public `fleet/{uid}` collection with only the member's display name, vehicle type, city, region, tier, join date, and photo. Registration numbers, phone numbers, licence details, and emergency contacts are never copied into the public document. Staff can remove a published photo from the member detail view.

Members can edit their own contact, vehicle, licence, emergency-contact, and password details from `/portal/profile`. Email changes stay with the union office. The `members` rules allow only those profile fields, plus the `publicProfile` and `fleetPhoto` settings fields, to be written by the member.

The **Settings** page at `/portal/settings` controls whether the member appears in the public fleet directory. Turning the listing off removes the `fleet/{uid}` document so the vehicle is no longer publicly readable. An uploaded photo is copied to the private `members/{uid}.fleetPhoto` field first and restored if the listing is turned back on. Removing a photo reverts the public listing to the vehicle-type illustration instead of unpublishing the member.

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

Before entering real member information, review and verify `firestore.rules` against the Firebase Emulator Suite:

```bash
npm.cmd run test:rules
```

The emulator suite runs locally with no Firebase billing usage. Deploy the rules from the project root with:

```bash
firebase deploy --only firestore:rules
```

The optional `functions/` folder contains Cloud Functions, including email notification triggers for new applications and enquiries. It can be deployed later on a billing-enabled Blaze project; the client does not depend on it.

## SMS notifications (Arkesel)

Staff can text members from `/admin/sms` and from contextual actions across the back office:

- **Bulk announcements** to all active members, a region, a membership tier, or a hand-picked list.
- **Dues reminders** for everyone with an outstanding balance, or a single invoice from `/admin/dues`.
- **Membership status updates** when staff approve, suspend, or reactivate a member. The **Membership status SMS** switch on the Settings page turns this off.
- **Job alerts** for a specific open load from `/admin/loads`; only members whose active job alert matches the load are included.

Every send is recorded in `smsMessages` with the audience, recipient count, sender ID, delivery status, and a short preview. The Arkesel API key stays server-side and is never included in the browser bundle.

### Serverless endpoint

The browser calls `POST /api/sms` (status checks use `GET`). The handler lives in `server/sms.js`, with thin adapters for both hosts:

- `api/sms.js` for Vercel.
- `netlify/functions/sms.js` plus the `/api/sms` redirect in `netlify.toml` for Netlify.

Requests must include a Firebase ID token in `Authorization: Bearer <token>`. The function verifies the token against Google's secure-token certificates, then reads `users/{uid}` with the caller's token to require `role: "staff"`. No service account is needed.

### Environment variables

Set these in the Vercel or Netlify project settings (and in a local `.env` when using `vercel dev` or `netlify dev`):

| Variable | Purpose |
| --- | --- |
| `ARKESEL_API_KEY` | Arkesel API key. Required for real sends. |
| `ARKESEL_SENDER_ID` | Registered alphanumeric sender ID, for example `HAULWAY`. |
| `ARKESEL_API_URL` | Optional override; defaults to `https://sms.arkesel.com/api/v2/sms/send`. |
| `SMS_DRY_RUN` | `true` simulates delivery without calling Arkesel. |
| `SMS_MAX_RECIPIENTS` | Per-request cap. Defaults to 100; the handler hard-caps at 200. |
| `FIREBASE_PROJECT_ID` | Project used to verify tokens. Falls back to `VITE_FIREBASE_PROJECT_ID`, then `hualway`. |

Never prefix the Arkesel key with `VITE_`; that would ship it to the browser. Register and approve the sender ID in the Arkesel dashboard before going live, otherwise Arkesel may reject the send or rewrite the sender.

### Demo mode

With `VITE_USE_DEMO_DATA=true` the app never calls `/api/sms`. Sends are simulated, marked **Simulated** in the history, and saved to the browser's local demo store. The admin composer reports the provider as Arkesel and shows a demo banner.

The `smsMessages` rules ship with `firestore.rules`; deploy them with:

```bash
firebase deploy --only firestore:rules
```

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
    sms.js               client SMS helpers and audience resolution
    smsTemplates.js      shared templates, phone normalisation, and segment counts
    auth.js              Firebase and demo authentication flows
    firebase.js          Firebase client initialization
    format.js            currency, dates, and validation helpers
  components/            layouts, cards, badges, icons, and form fields
  pages/                 public pages, member portal, and staff workspace
  styles/                base, layout, page, admin, and union styles
server/
  sms.js                 shared Arkesel SMS handler for Vercel and Netlify
api/
  sms.js                 Vercel serverless adapter
netlify/
  functions/sms.js       Netlify serverless adapter
netlify.toml             Netlify build, functions, and /api/sms redirect
vercel.json              Vercel SPA rewrite
functions/
  index.js               optional Cloud Functions and email triggers (Blaze only)
firestore.rules          Firestore client access rules
```
