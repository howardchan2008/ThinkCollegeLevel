/* Think College Level — interactivity (vanilla, no deps) */
(function () {
  'use strict';

  // FAQ accordion
  document.addEventListener('click', function (e) {
    var q = e.target.closest('.faq-q');
    if (!q) return;
    var item = q.closest('.faq-item');
    var open = item.classList.toggle('open');
    q.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // TOC scroll-spy
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.prose section[data-idx]'));
  if (tocLinks.length && sections.length && 'IntersectionObserver' in window) {
    var setActive = function (idx) {
      tocLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#s' + idx);
      });
    };
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setActive(Number(en.target.getAttribute('data-idx')));
      });
    }, { rootMargin: '-80px 0px -65% 0px', threshold: 0 });
    sections.forEach(function (s) { obs.observe(s); });
  }

  // Topic filter (guides index)
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-theme]'));
  var blocks = Array.prototype.slice.call(document.querySelectorAll('.theme-block[data-theme]'));
  if (chips.length && blocks.length) {
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var t = chip.getAttribute('data-theme');
        chips.forEach(function (c) { c.classList.toggle('on', c === chip); });
        blocks.forEach(function (b) {
          b.style.display = (t === 'all' || b.getAttribute('data-theme') === t) ? '' : 'none';
        });
      });
    });
  }
})();
