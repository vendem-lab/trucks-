# Haulway WhatsApp assistant

A WhatsApp bot that runs on a **personal number** (via Baileys) and answers members
using live Firestore data, with Groq for the language model.

It is a separate Node service. The Vite app, Vercel and Netlify deployments are
untouched — serverless platforms cannot host this, because it needs a long-lived
WhatsApp WebSocket.

## What it does

- **Member self-service** — a member messages the bot from the number on their
  member record and can ask about dues, membership status, tier, and open loads.
  Identity comes from the WhatsApp number; nobody types a password.
- **Public FAQ** — numbers that are not on the member register get joining, dues
  and office information only. Member data is never included in the prompt.
- **Staff commands** — numbers listed in `BOT_STAFF_NUMBERS` (or staff users with a
  phone in Firestore) can run `!` commands, including a capped broadcast.

## Requirements

- Node.js 20 or newer
- A Firebase service account for project `hualway`
- A Groq API key (https://console.groq.com/keys)
- A SIM you are willing to risk: this uses WhatsApp's unofficial protocol and
  **the number can be banned**. Do not use the union's main number.

## Setup

```powershell
cd whatsapp-bot
npm install
Copy-Item .env.example .env
```

Fill in `.env`:

| Variable | Meaning |
| --- | --- |
| `GROQ_API_KEY` | Groq key. Required. |
| `GROQ_MODEL` | Default `llama-3.3-70b-versatile`. |
| `FIREBASE_PROJECT_ID` | `hualway`. |
| `FIREBASE_SERVICE_ACCOUNT` | Service-account JSON on one line, or base64 of it. Leave blank to use `GOOGLE_APPLICATION_CREDENTIALS`. |
| `WHATSAPP_SESSION_ID` | Firestore doc id for the linked-device session. |
| `WHATSAPP_PAIRING_NUMBER` | Bot SIM in international digits, e.g. `233557704299`. |
| `BOT_STAFF_NUMBERS` | Comma-separated staff numbers allowed to run `!` commands. |
| `BOT_BROADCAST_MAX` | Hard cap on `!broadcast` recipients (default 20). |
| `BOT_BROADCAST_DELAY_MS` | Pause between broadcast messages (default 1500). |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MINUTES` | Per-number message limit. |

Create the service account in Firebase Console → Project settings → Service
accounts → Generate new private key. The bot only needs Firestore access.

## Run

```powershell
npm start
```

On first run the log prints a pairing code. On the bot phone open
**WhatsApp → Linked devices → Link with phone number** and enter it.

The session is stored in Firestore at `whatsappSessions/{WHATSAPP_SESSION_ID}`, so
restarts and redeploys reconnect without pairing again. To force a re-pair, delete
that document (and its `keys` subcollection).

Health check: `GET http://localhost:8080/health`.

## Staff commands

| Command | Effect |
| --- | --- |
| `!help` | List commands. |
| `!who 0557704299` | Member summary with outstanding dues. |
| `!dues` | Union-wide outstanding total. |
| `!dues 0557704299` | Dues for one member. |
| `!loads` | Open loads. |
| `!broadcast <message>` | Preview a message to active members. |
| `!confirm` | Send the previewed broadcast (expires after 5 minutes). |
| `!cancel` | Discard the preview. |
| `!status` | Bot health and limits. |

## Data access

Reads `members`, `dues`, `loads`, `settings/union`, `users`. Writes only the
`whatsappSessions` collection. No other Firestore writes.

## Deploying

Any always-on Node host works (VPS, Render, Railway, Fly.io). Set the same
environment variables there and run `npm start`. A persistent disk is not needed
because the session lives in Firestore.

## Tests

```powershell
npm test
```

Covers phone normalisation, rate limiting, command parsing/broadcast confirmation,
prompt building, and the message handler (with fake data and a fake model).
