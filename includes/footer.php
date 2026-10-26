<footer class="site-foot">
  <div class="wrap">
    <div>
      <div class="brand"><?= $logo ?> <?= e($config['site_name']) ?></div>
      <p><?= e($config['tagline']) ?></p>
    </div>
    <div>
      <h3>Services</h3>
      <ul>
        <?php foreach (array_slice($services, 0, 4) as $s): ?>
          <li><?= e($s[0]) ?></li>
        <?php endforeach; ?>
      </ul>
    </div>
    <div>
      <h3>Dispatch desk</h3>
      <ul>
        <li><?= e($config['dispatch_email']) ?></li>
        <li><?= e($config['phone']) ?></li>
        <li><?= e($config['hours']) ?></li>
      </ul>
    </div>
    <p class="legal">&copy; <?= date('Y') ?> <?= e($config['site_name']) ?>. All rights reserved.</p>
  </div>
</footer>
<script src="assets/js/app.js" defer></script>
</body>
</html>
