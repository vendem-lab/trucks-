<?php
declare(strict_types=1);

// Returns one consignment as JSON: track.php?id=HM-48213
// To use real data, replace the lookup below with a query to your dispatch system.
require __DIR__ . '/includes/data.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$raw = trim((string) ($_GET['id'] ?? ''));
if ($raw === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Enter your consignment number. It is on your booking confirmation and looks like HM-48213.']);
    exit;
}

$id = normalise_consignment($raw);
if (!isset($consignments[$id])) {
    http_response_code(404);
    echo json_encode(['error' => 'No consignment found for ' . mb_substr($raw, 0, 40) . '. Check the number on your booking confirmation, or try HM-48213.']);
    exit;
}

echo json_encode(['id' => $id] + $consignments[$id], JSON_UNESCAPED_UNICODE);
