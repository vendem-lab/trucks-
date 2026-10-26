<?php
// Content and sample data. Replace the consignments with a query to your own
// dispatch system or database when you are ready.

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$services = [
    ['Full truckload', 'One trailer, one customer, door to door with no transfers. Best when you ship 10 pallets or more on the same lane.', '33 pallets or 24 t'],
    ['Part load', 'Share a trailer and pay only for the pallet spaces you use. Scheduled departures on our main lanes, six days a week.', '1 to 12 pallets'],
    ['Temperature-controlled', 'Chilled and frozen freight in monitored trailers. A temperature log comes with every proof of delivery.', '−25 to +25 °C'],
    ['Customs and cross-border', 'Declarations, T1 transit documents and CMR consignment notes prepared before the truck reaches the border.', 'Any load'],
    ['Warehousing and cross-docking', 'Short and long-term storage, pick and pack, and same-day transfer from one trailer to another.', 'Pallets or cartons'],
    ['Last-mile delivery', 'Vans with booked time slots, a call ahead and a signature on delivery.', 'Up to 1.2 t'],
];

// Name, what it carries, payload in tonnes. Bars are drawn to one scale.
$fleet = [
    ['City van', '8 m³', 1.2],
    ['Rigid truck', '18 pallets', 8],
    ['Refrigerated trailer', '26 pallets, chilled or frozen', 22],
    ['Curtain-sider', '33 pallets, side loading', 24],
    ['Flatbed', 'Machinery and steel', 28],
];
$fleetMax = 28;

$process = [
    ['Request a quote', 'Send the lane, the load and the date. A fixed price comes back within two hours on business days.'],
    ['Confirm and collect', 'Accept the price and we book the trailer, send you the driver details and collect at your time slot.'],
    ['Follow the load', 'Use your consignment number to see location, border crossings and the delivery window.'],
    ['Receive proof of delivery', 'The signed document, and the temperature log for chilled loads, arrives the same day.'],
];

$cargoTypes = ['Palletised goods', 'Chilled or frozen', 'Oversize or flatbed', 'Parcels and last-mile'];

// Sample consignments, keyed by number. step state: done, now or todo.
$consignments = [
    'HM-48213' => [
        'lane' => ['Rotterdam', 'Warsaw'], 'km' => [718, 1118],
        'status' => 'In transit', 'pill' => 'On schedule',
        'facts' => [['Trailer', 'Curtain-sider'], ['Load', '33 pallets, 24.0 t'], ['Delivery window', 'Tue 27 Oct, 10:00 to 12:00']],
        'steps' => [
            ['Booked', 'Fri 23 Oct, 09:12', 'done'],
            ['Collected in Rotterdam', 'Sat 24 Oct, 16:40', 'done'],
            ['Crossed the Germany to Poland border, customs cleared', 'Mon 26 Oct, 05:20', 'done'],
            ['On the road, 400 km to go', 'Updated today, 13:55', 'now'],
            ['Delivery in Warsaw', 'Expected Tue 27 Oct, 10:00 to 12:00', 'todo'],
            ['Signed proof of delivery', 'Sent after unloading', 'todo'],
        ],
    ],
    'HM-50177' => [
        'lane' => ['Hamburg', 'Milan'], 'km' => [1148, 1148],
        'status' => 'Delivered', 'pill' => 'Delivered on time',
        'facts' => [['Trailer', 'Refrigerated'], ['Load', '26 pallets, 18.5 t'], ['Temperature held', '2 to 4 °C']],
        'steps' => [
            ['Booked', 'Wed 21 Oct, 11:30', 'done'],
            ['Collected in Hamburg', 'Thu 22 Oct, 07:15', 'done'],
            ['Crossed the Austria to Italy border', 'Fri 23 Oct, 03:50', 'done'],
            ['Delivered in Milan', 'Fri 23 Oct, 13:20', 'done'],
            ['Proof of delivery and temperature log sent', 'Fri 23 Oct, 13:48', 'done'],
        ],
    ],
];

// "48213", "hm 48213" and "hm-48213" all become "HM-48213".
function normalise_consignment(string $raw): string
{
    $s = strtoupper(preg_replace('/\s+/', '', $raw));
    if (preg_match('/^(?:HM-?)?(\d{5})$/', $s, $m)) {
        return 'HM-' . $m[1];
    }
    return $s;
}
