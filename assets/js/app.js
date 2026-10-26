(function () {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmt(n) { return n.toLocaleString('en-US'); }

  /* ---------- Shipment tracker ---------- */
  var form = document.getElementById('trackForm');
  var input = document.getElementById('cid');
  var errorBox = document.getElementById('trackError');
  var result = document.getElementById('result');
  var TRUCK = '<svg viewBox="0 0 52 30" fill="currentColor" aria-hidden="true"><rect x="0" y="2" width="31" height="19" rx="3"/><path d="M34 8h9l7 8v5H34z"/><circle cx="11" cy="24" r="4.5" stroke="var(--surface)" stroke-width="2"/><circle cx="41" cy="24" r="4.5" stroke="var(--surface)" stroke-width="2"/></svg>';

  function render(d) {
    result.textContent = '';

    var top = el('div', 'result-top');
    var left = el('div');
    left.appendChild(el('div', 'cid', d.id));
    left.appendChild(el('div', 'lane', d.lane[0] + ' to ' + d.lane[1]));
    top.appendChild(left);
    top.appendChild(el('span', 'pill', d.pill));
    result.appendChild(top);

    var pct = Math.round((d.km[0] / d.km[1]) * 100);
    var route = el('div', 'route');
    var line = el('div', 'route-line');
    var fill = el('div', 'route-fill');
    var truck = el('div', 'route-truck');
    truck.innerHTML = TRUCK;
    line.appendChild(fill);
    line.appendChild(truck);
    route.appendChild(line);
    var ends = el('div', 'route-ends');
    var a = el('span'); a.appendChild(el('strong', null, d.lane[0]));
    var b = el('span', null, fmt(d.km[0]) + ' of ' + fmt(d.km[1]) + ' km');
    var c = el('span'); c.appendChild(el('strong', null, d.lane[1]));
    ends.appendChild(a); ends.appendChild(b); ends.appendChild(c);
    route.appendChild(ends);
    result.appendChild(route);

    var dl = el('dl', 'facts');
    d.facts.forEach(function (f) {
      var w = el('div');
      w.appendChild(el('dt', null, f[0]));
      w.appendChild(el('dd', null, f[1]));
      dl.appendChild(w);
    });
    result.appendChild(dl);

    var ol = el('ol', 'steps');
    d.steps.forEach(function (s) {
      var li = el('li', 'step ' + s[2]);
      li.appendChild(el('span', 'dot'));
      var body = el('div');
      body.appendChild(el('div', 'step-title', s[0]));
      body.appendChild(el('div', 'step-when', s[1]));
      li.appendChild(body);
      ol.appendChild(li);
    });
    result.appendChild(ol);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fill.style.width = pct + '%';
        truck.style.left = pct + '%';
      });
    });
  }

  function track(raw) {
    fetch('track.php?id=' + encodeURIComponent(raw), { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (res.ok) {
          errorBox.hidden = true;
          input.value = res.body.id;
          render(res.body);
        } else {
          result.textContent = '';
          errorBox.textContent = res.body.error;
          errorBox.hidden = false;
        }
      })
      .catch(function () {
        result.textContent = '';
        errorBox.textContent = 'Tracking is not available right now. Try again in a minute.';
        errorBox.hidden = false;
      });
  }

  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); track(input.value); });
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
      c.addEventListener('click', function () { input.value = c.getAttribute('data-id'); track(input.value); });
    });
    track(input.value);
  }

  /* ---------- Quote form: send without leaving the page ---------- */
  var q = document.getElementById('quoteForm');
  var summary = document.getElementById('summary');
  if (q && window.fetch) {
    q.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = q.querySelector('button[type="submit"]');
      btn.disabled = true;
      fetch(q.action, { method: 'POST', body: new FormData(q), headers: { 'X-Requested-With': 'fetch' } })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          summary.textContent = '';
          summary.className = 'summary' + (j.ok ? '' : ' error');
          summary.appendChild(el('h3', null, j.title));
          j.lines.forEach(function (l) { summary.appendChild(el('p', null, l)); });
          summary.hidden = false;
          summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          if (j.ok) {
            ['from', 'to', 'weight', 'pallets', 'date', 'email'].forEach(function (id) { document.getElementById(id).value = ''; });
          }
        })
        .catch(function () {
          summary.textContent = '';
          summary.className = 'summary error';
          summary.appendChild(el('h3', null, 'We could not send your request'));
          summary.appendChild(el('p', null, 'Check your connection and try again.'));
          summary.hidden = false;
        })
        .then(function () { btn.disabled = false; });
    });
  }
})();
