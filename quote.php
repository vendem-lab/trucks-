<?php
declare(strict_types=1);

// Handles the quote form. Works with JavaScript (JSON reply) and without it (redirect back to the page).
session_start();
$config = require __DIR__ . '/config.php';
require __DIR__ . '/includes/data.php';

$wantsJson = ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';

function respond(bool $ok, string $title, array $lines, bool $wantsJson, int $status = 200): never
{
    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok, 'title' => $title, 'lines' => $lines], JSON_UNESCAPED_UNICODE);
    } else {
        $_SESSION['flash'] = ['ok' => $ok, 'title' => $title, 'lines' => $lines];
        header('Location: index.php#quote', true, 303);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php#quote', true, 303);
    exit;
}

// Spam and forgery checks. The honeypot field stays hidden from people.
if (!empty($_POST['website'])) {
    respond(true, 'Quote request received', ['Thank you.'], $wantsJson);
}
$token = (string) ($_POST['csrf'] ?? '');
if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $token)) {
    respond(false, 'This form has expired', ['Reload the page and send your request again.'], $wantsJson, 403);
}
if (isset($_SESSION['last_quote']) && time() - (int) $_SESSION['last_quote'] < 20) {
    respond(false, 'Please wait a moment', ['You just sent a request. Wait 20 seconds before sending another.'], $wantsJson, 429);
}

// Read and clean the fields. Line breaks are removed so nothing can inject mail headers.
$clean = fn(string $k, int $max): string => mb_substr(trim(preg_replace('/[\r\n]+/', ' ', (string) ($_POST[$k] ?? ''))), 0, $max);

$from    = $clean('from', 100);
$to      = $clean('to', 100);
$cargo   = $clean('cargo', 40);
$date    = $clean('date', 10);
$email   = $clean('email', 120);
$weight  = filter_var($_POST['weight'] ?? '', FILTER_VALIDATE_FLOAT);
$palletsRaw = trim((string) ($_POST['pallets'] ?? ''));
$pallets = $palletsRaw === '' ? null : filter_var($palletsRaw, FILTER_VALIDATE_INT);

$errors = [];
if ($from === '') $errors[] = 'Enter where the load is collected from.';
if ($to === '') $errors[] = 'Enter where the load is delivered to.';
if (!in_array($cargo, $cargoTypes, true)) $errors[] = 'Choose a type of freight from the list.';
$d = DateTimeImmutable::createFromFormat('Y-m-d', $date);
if (!$d || $d->format('Y-m-d') !== $date || $d < new DateTimeImmutable('tomorrow')) {
    $errors[] = 'Choose a collection date from tomorrow onwards.';
}
if ($weight === false || $weight < 0.1 || $weight > 28) $errors[] = 'Enter a weight between 0.1 and 28 tonnes.';
if ($pallets === false || ($pallets !== null && ($pallets < 1 || $pallets > 33))) $errors[] = 'Enter between 1 and 33 pallets, or leave the field empty.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Enter a valid email address so we can send your price.';

if ($errors) {
    respond(false, 'Check these details', $errors, $wantsJson, 422);
}

$summary = [
    'Route'      => "$from to $to",
    'Freight'    => $cargo,
    'Collection' => $date,
    'Weight'     => rtrim(rtrim(number_format((float) $weight, 1, '.', ''), '0'), '.') . ' t',
    'Pallets'    => $pallets === null ? 'not given' : (string) $pallets,
    'Reply to'   => $email,
];

// 1. Save the request so it is never lost, even if email is not set up on the server.
$saved = false;
$dir = __DIR__ . '/storage';
if (is_dir($dir) && is_writable($dir)) {
    $record = ['received' => date('c')] + $summary;
    $saved = file_put_contents($dir . '/quotes.log', json_encode($record, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX) !== false;
}

// 2. Email it to the dispatch desk.
$body = "New quote request\n\n";
foreach ($summary as $label => $value) {
    $body .= str_pad($label, 11) . $value . "\n";
}
$headers = [
    'From' => $config['mail_from'],
    'Reply-To' => $email,
    'Content-Type' => 'text/plain; charset=UTF-8',
];
$mailed = @mail($config['dispatch_email'], 'Quote request: ' . $from . ' to ' . $to, $body, $headers);

if (!$saved && !$mailed) {
    respond(false, 'We could not take your request', ['Something went wrong on our side. Email ' . $config['dispatch_email'] . ' or call ' . $config['phone'] . '.'], $wantsJson, 500);
}

$_SESSION['last_quote'] = time();
respond(true, 'Quote request received', [
    $summary['Route'] . ', ' . strtolower($summary['Freight']),
    $summary['Weight'] . ($pallets === null ? '' : ', ' . $pallets . ' pallets') . ', collection ' . $date,
    'We will reply to ' . $email . ' within 2 hours on business days.',
], $wantsJson);
