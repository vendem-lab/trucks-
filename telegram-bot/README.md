# Haulway Telegram assistant

A Telegram bot for the union, powered by Groq. It answers members using live
Firestore data and gives staff a few deterministic commands.

It is a separate Node service. The Vite app, Vercel and Netlify deployments are
untouched.

## Why Telegram

The Bot API is official and free, so there is no risk of the number being banned
and no linked-device session to keep alive. Long polling means the bot needs no
public URL: it runs on a laptop, a VPS, or any always-on Node host.

## What it does

- **Member self-service** — a member taps *Share my number* once; the bot matches
  that number to their member record and can then answer dues, status, tier and
  open-load questions. Identity comes from Telegram, nobody types a password.
- **Public FAQ** — until a chat is linked, the bot only explains joining, dues and
  office details. Member data is never added to the prompt.
- **Staff commands** — staff send `/` commands, including a capped broadcast to
  members who have linked Telegram.

## Requirements

- Node.js 20 or newer
- A bot token from [@BotFather](https://t.me/BotFather) (`/newbot`)
- A Firebase service account for project `hualway`
- A Groq API key (https://console.groq.com/keys)

## Setup

```powershell
cd telegram-bot
npm install
Copy-Item .env.example .env
```

Fill in `.env`:

| Variable | Meaning |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather. Required. |
| `GROQ_API_KEY` | Groq key. Required. |
| `GROQ_MODEL` | Default `openai/gpt-oss-120b`. |
| `FIREBASE_PROJECT_ID` | `hualway`. |
| `FIREBASE_SERVICE_ACCOUNT` | Service-account JSON on one line, or base64 of it. Leave blank to use `GOOGLE_APPLICATION_CREDENTIALS`. |
| `BOT_STAFF_IDS` | Telegram user ids allowed to run staff commands (comma separated). Send `/id` to the bot to find yours. |
| `BOT_STAFF_NUMBERS` | Optional staff phone numbers, for staff whose chat is linked. |
| `BOT_BROADCAST_MAX` | Hard cap on `/broadcast` recipients (default 20). |
| `BOT_BROADCAST_DELAY_MS` | Pause between broadcast messages (default 1500). |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MINUTES` | Per-user message limit. |

Create the service account in Firebase Console → Project settings → Service
accounts → Generate new private key. Save it as `service-account.json` next to
`.env`; the bot only needs Firestore access.

## Run

```powershell
npm start
```

The log prints `Connected to Telegram as @yourbot`. Message the bot, send
`/start`, then tap **Share my number**.

Health check: `GET http://localhost:8080/health`.

## Linking a member

1. Member opens the bot and sends `/start`.
2. They tap **Share my number**. Telegram only shares their own verified number.
3. The bot normalises it and looks for `members.phone`.
4. On a match it writes `telegramLinks/{chatId}` and confirms their member number.

`/unlink` removes the link. Re-linking is instant.

## Staff commands

| Command | Effect |
| --- | --- |
| `/help` | List commands. |
| `/who 0557704299` | Member summary with outstanding dues. |
| `/dues` | Union-wide outstanding total. |
| `/dues 0557704299` | Dues for one member. |
| `/loads` | Open loads. |
| `/broadcast <message>` | Preview a message to linked active members. |
| `/confirm` | Send the previewed broadcast (expires after 5 minutes). |
| `/cancel` | Discard the preview. |
| `/status` | Bot health and limits. |
| `/id` | Show your Telegram id (use it in `BOT_STAFF_IDS`). |

Broadcasts reach only members who have linked Telegram. SMS remains the channel
for everyone else.

## Data access

Reads `members`, `dues`, `loads`, `settings/union`, `users`. Writes only
`telegramLinks`. No other Firestore writes.

## Deploying

The bot is a long-running process, so it must go on a host that keeps a Node
process alive. It cannot run on Vercel or Netlify functions: long polling holds
an open request, which serverless runtimes time out, and two pollers on the same
token make Telegram return `409 Conflict`.

| Setting | Value |
| --- | --- |
| Service type | Web service / background process (never static, never serverless) |
| Root directory | `telegram-bot` — the repo root is the Vite site |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/health` |
| Instances | **1** — Telegram allows a single long-polling consumer |
| Node version | 20 or newer |
| Region | Frankfurt / Europe (closest to Telegram, Groq and Firestore) |

Environment variables are the same as `.env`, with one difference: hosts cannot
see your local file, so put the whole service-account JSON in
`FIREBASE_SERVICE_ACCOUNT` (one line, or base64 of it) and leave
`GOOGLE_APPLICATION_CREDENTIALS` unset. `PORT` is injected by the platform; the
bot reads it, so do not hardcode it.

### Render — the zero-cost route

`render.yaml` at the repo root is a blueprint for this service. In the Render
dashboard choose **New → Blueprint**, pick the repository, and enter the three
secrets it asks for (`TELEGRAM_BOT_TOKEN`, `GROQ_API_KEY`,
`FIREBASE_SERVICE_ACCOUNT`). The Hobby workspace needs no card, so the whole
deployment is $0.

Two limits come with free:

- **It sleeps after 15 minutes without inbound traffic.** The bot only makes
  outbound calls, so it would go quiet. Fix: a free monitor such as
  cron-job.org or UptimeRobot pinging `https://<service>.onrender.com/health`
  every 10 minutes. That ping is ordinary traffic and keeps the idle timer from
  firing. Render's own health check does not count.
- **750 free instance hours per workspace per month.** A 31-day month is 744
  hours, so one always-on service just fits. Do not run a second free web
  service in the same workspace, or the allowance runs out before month end and
  Render suspends both until the 1st.

### Railway — not free

**New Project → Deploy from GitHub repo**, then set the root directory to
`telegram-bot`, the start command to `npm start`, and add the variables on the
**Variables** tab. Railway does not sleep, but there is no permanent free plan:
the trial credit runs out and Hobby is billed monthly. Skip it if cost matters.

### Office PC — also zero cost

`start-bot.vbs` launches `start-bot.cmd` with no console window, and the batch
file restarts the bot if it ever exits (10s pause). Output goes to `bot.log`.

To start it at login, put a shortcut in your Startup folder — no admin rights
needed:

```powershell
$bot = "C:\path\to\trucks\telegram-bot"
$startup = [Environment]::GetFolderPath('Startup')
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path $startup 'Haulway Telegram bot.lnk'))
$lnk.TargetPath = 'wscript.exe'
$lnk.Arguments = '"' + (Join-Path $bot 'start-bot.vbs') + '"'
$lnk.WorkingDirectory = $bot
$lnk.WindowStyle = 7
$lnk.Save()
```

(`schtasks /SC ONLOGON` does the same job but needs an elevated prompt.)

The trade-off is uptime: the bot is only online while the PC is on and the user
is logged in. Good enough while testing, and the cost is a Windows login.

## Tests

```powershell
npm test
```

Covers phone normalisation, message splitting, rate limiting, command
parsing/broadcast confirmation, prompt building, and the handler (linking,
unlinking, member context, staff bypass, model fallback) with fake data.
