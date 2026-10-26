<?php
declare(strict_types=1);

session_start();
$config = require __DIR__ . '/config.php';
require __DIR__ . '/includes/data.php';

// CSRF token for the quote form, and a one-time message for visitors without JavaScript.
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);

$minDate = (new DateTimeImmutable('tomorrow'))->format('Y-m-d');

require __DIR__ . '/includes/header.php';
?>
<main id="top">
  <section class="hero" id="track">
    <div class="wrap">
      <div class="hero-copy">
        <h1>Freight that shows up when we said it would.</h1>
        <p>Full loads, part loads and temperature-controlled freight across the continent, with customs paperwork done before the truck reaches the border and a live status on every consignment.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#quote">Get a quote</a>
          <a class="btn btn-quiet" href="#services">See our services</a>
        </div>
        <ul class="hero-facts">
          <li><b>24 t</b> per trailer</li>
          <li><b>33</b> pallets per load</li>
          <li><b>2 h</b> to a priced quote</li>
        </ul>
      </div>

      <div class="tracker" aria-labelledby="tr-title">
        <h2 id="tr-title">Track a shipment</h2>
        <form class="track-form" id="trackForm" action="track.php" method="get" novalidate>
          <label class="visually-hidden" for="cid">Consignment number</label>
          <input class="field-input" id="cid" name="id" type="text" value="HM-48213" placeholder="Consignment number, e.g. HM-48213" autocomplete="off" spellcheck="false">
          <button class="btn btn-primary" type="submit">Track</button>
        </form>
        <div class="try">
          <span>Sample numbers:</span>
          <?php foreach (array_keys($consignments) as $id): ?>
            <button class="chip" type="button" data-id="<?= e($id) ?>"><?= e($id) ?></button>
          <?php endforeach; ?>
        </div>
        <p class="track-error" id="trackError" role="alert" hidden></p>
        <div class="result" id="result" aria-live="polite"></div>
        <p class="sample-note">Sample data. Connect <code>track.php</code> to your dispatch system to show real consignments.</p>
      </div>
    </div>
  </section>

  <section class="section services" id="services">
    <div class="wrap">
      <div class="section-head">
        <h2>Every kind of load, one point of contact</h2>
        <p>Tell us what you ship and where. We choose the trailer, file the paperwork and keep you posted until the signed proof of delivery reaches your inbox.</p>
      </div>
      <div role="table" aria-label="Services">
        <div class="svc-head" role="row"><span role="columnheader">Service</span><span role="columnheader">What you get</span><span role="columnheader">Typical load</span></div>
        <?php foreach ($services as [$name, $text, $load]): ?>
          <div class="svc-row" role="row">
            <h3 role="cell"><?= e($name) ?></h3>
            <p role="cell"><?= e($text) ?></p>
            <span class="svc-load" role="cell"><span class="svc-label">Typical load: </span><?= e($load) ?></span>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <section class="section" id="fleet">
    <div class="wrap">
      <div class="section-head">
        <h2>The right trailer for the load</h2>
        <p>Payload is drawn to scale, from a city van to a heavy flatbed.</p>
      </div>
      <ul class="fleet-list">
        <?php foreach ($fleet as [$name, $detail, $tonnes]): ?>
          <li class="fleet-item">
            <div class="fleet-name"><?= e($name) ?><small><?= e($detail) ?></small></div>
            <div class="bar" role="img" aria-label="<?= e($name) ?> payload <?= e((string) $tonnes) ?> tonnes"><i style="width: <?= round($tonnes / $fleetMax * 100, 1) ?>%"></i></div>
            <div class="fleet-val"><?= e((string) $tonnes) ?> <small>t</small></div>
          </li>
        <?php endforeach; ?>
      </ul>
      <div class="axis" aria-hidden="true"><span></span><div><span>0 t</span><span>7 t</span><span>14 t</span><span>21 t</span><span>28 t</span></div><span></span></div>
    </div>
  </section>

  <section class="section process" id="how">
    <div class="wrap">
      <div class="section-head">
        <h2>From request to signed delivery</h2>
        <p>Four steps, and you can see where a shipment stands at every one of them.</p>
      </div>
      <ol class="process-list">
        <?php foreach ($process as [$title, $text]): ?>
          <li><h3><?= e($title) ?></h3><p><?= e($text) ?></p></li>
        <?php endforeach; ?>
      </ol>
    </div>
  </section>

  <section class="section quote" id="quote">
    <div class="wrap">
      <div>
        <div class="section-head">
          <h2>Get a price for your next load</h2>
          <p>Fill in the basics. Exact pallet sizes and handling notes can follow once you accept.</p>
        </div>
        <ul class="promise">
          <li>Fixed price, no fuel surcharge added later</li>
          <li>Reply within 2 hours, Monday to Friday</li>
          <li>One contact for the whole shipment</li>
        </ul>
      </div>

      <form class="form" id="quoteForm" action="quote.php" method="post">
        <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
        <div class="hp" aria-hidden="true"><label for="website">Leave this empty</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>

        <div class="field"><label for="from">Collect from</label><input class="field-input" id="from" name="from" required maxlength="100" placeholder="City or postcode"></div>
        <div class="field"><label for="to">Deliver to</label><input class="field-input" id="to" name="to" required maxlength="100" placeholder="City or postcode"></div>
        <div class="field"><label for="cargo">Type of freight</label>
          <select class="field-input" id="cargo" name="cargo">
            <?php foreach ($cargoTypes as $c): ?><option><?= e($c) ?></option><?php endforeach; ?>
          </select></div>
        <div class="field"><label for="date">Collection date</label><input class="field-input" id="date" name="date" type="date" required min="<?= e($minDate) ?>"></div>
        <div class="field"><label for="weight">Weight (tonnes)</label><input class="field-input" id="weight" name="weight" type="number" min="0.1" max="28" step="0.1" required placeholder="e.g. 12.5"></div>
        <div class="field"><label for="pallets">Pallets</label><input class="field-input" id="pallets" name="pallets" type="number" min="1" max="33" step="1" placeholder="e.g. 22"></div>
        <div class="field full"><label for="email">Your email</label><input class="field-input" id="email" name="email" type="email" required maxlength="120" placeholder="name@company.com"></div>
        <button class="btn btn-primary" type="submit">Request quote</button>

        <div class="summary<?= $flash && !$flash['ok'] ? ' error' : '' ?>" id="summary" role="status" <?= $flash ? '' : 'hidden' ?>>
          <?php if ($flash): ?>
            <h3><?= e($flash['title']) ?></h3>
            <?php foreach ($flash['lines'] as $line): ?><p><?= e($line) ?></p><?php endforeach; ?>
          <?php endif; ?>
        </div>
      </form>
    </div>
  </section>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
