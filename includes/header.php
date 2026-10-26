<?php
/** @var array $config */
$logo = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--brand)"/><path d="M7 21V11h10v10M17 14h5l3 3v4h-8" fill="none" stroke="var(--on-brand)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="11" cy="22" r="2" fill="var(--on-brand)"/><circle cx="21" cy="22" r="2" fill="var(--on-brand)"/></svg>';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($config['site_name']) ?> Logistics</title>
  <meta name="description" content="Full loads, part loads and temperature-controlled freight with customs paperwork done before the border and a live status on every consignment.">
  <meta name="color-scheme" content="light dark">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<header class="site-head">
  <div class="wrap">
    <a class="brand" href="#top" aria-label="<?= e($config['site_name']) ?> Logistics home"><?= $logo ?> <?= e($config['site_name']) ?></a>
    <nav class="site-nav" aria-label="Main">
      <a href="#services">Services</a>
      <a href="#fleet">Fleet</a>
      <a href="#how">How it works</a>
      <a class="btn btn-primary" href="#quote">Get a quote</a>
    </nav>
  </div>
</header>
