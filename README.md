# Haulmark Logistics website (PHP)

A responsive transport and logistics site with a shipment tracker and a quote form. Plain PHP 8.1 or newer, no framework and no database.

## Run it locally

```
php -S localhost:8000
```

Then open http://localhost:8000. Try the sample consignment numbers HM-48213 and HM-50177.

## Put it on a host

Upload the whole folder to any PHP host (shared hosting, a VPS with Apache or Nginx). The site works from the folder it is in, so it can sit at the root or in a subfolder.

## What to edit

| File | What it controls |
| --- | --- |
| `config.php` | Company name, dispatch email, sender address, phone, opening hours |
| `includes/data.php` | Services, fleet, process steps, freight types and the sample consignments |
| `track.php` | Looks up a consignment. Replace the sample lookup with your own dispatch system or database |
| `quote.php` | Checks the quote form, saves it to `storage/quotes.log` and emails it to the dispatch desk |
| `assets/css/style.css` | All colours and fonts, set as variables at the top. A dark theme follows the visitor's device setting |

## Quote form

Each request is saved to `storage/quotes.log` (one JSON record per line) and emailed to `dispatch_email`. PHP's `mail()` needs a working mail setup on the server. If your host has none, the log still keeps every request, so check that file or switch `quote.php` to an SMTP library such as PHPMailer.

The form has a hidden spam trap, a forgery token, a 20-second limit between sends and server-side checks on every field.

Make sure `storage/` is writable by the web server. It ships with an `.htaccess` that blocks direct access on Apache. On Nginx, add a rule that denies requests to `/storage/`.

## Before going live

The company name Haulmark, the email, the phone number and the sample consignments are placeholders.
