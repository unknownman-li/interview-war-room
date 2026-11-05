/* 启动页：粒子星图 + 数字动效 + 进入动画（无依赖） */
(function () {
  'use strict';

  var intro = document.getElementById('intro');
  if (!intro) return;

  var btn = document.getElementById('enterBtn');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var entered = false;
  var rafId = null;

  /* ---------- 进入 ---------- */
  function enter() {
    if (entered) return;
    entered = true;

    intro.classList.add('leaving');
    document.documentElement.classList.remove('intro-lock');

    if (rafId) cancelAnimationFrame(rafId);

    window.setTimeout(function () {
      if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    }, 900);
  }

  intro.addEventListener('click', enter);
  document.addEventListener('keydown', function (e) {
    if (entered) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      enter();
    }
  });

  /* ---------- 数字滚动 ---------- */
  var counters = Array.prototype.slice.call(intro.querySelectorAll('[data-count]'));
  function runCounters() {
    var start = null;
    var duration = reduceMotion ? 0 : 1400;
    var delay = reduceMotion ? 0 : 320;

    function frame(ts) {
      if (start === null) start = ts;
      var elapsed = ts - start - delay;
      var p = duration <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / duration));
      var eased = 1 - Math.pow(1 - p, 3);
      counters.forEach(function (el) {
        var target = Number(el.getAttribute('data-count')) || 0;
        el.textContent = String(Math.round(target * eased));
      });
      if (p < 1) requestAnimationFrame(frame);
    }
    if (reduceMotion) {
      counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 粒子星图 ---------- */
  var canvas = document.getElementById('introCanvas');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var particles = [];
  var W = 0, H = 0, dpr = 1;
  var mouse = { x: -9999, y: -9999 };

  function sizeCanvas() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = intro.clientWidth;
    H = intro.clientHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedParticles();
  }

  function seedParticles() {
    var count = Math.max(36, Math.min(88, Math.round((W * H) / 19000)));
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.5 + 0.5,
        hue: Math.random() < 0.35 ? '34,211,238' : (Math.random() < 0.5 ? '167,139,250' : '124,92,255')
      });
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;

      // 鼠标轻微排斥
      var dx = p.x - mouse.x;
      var dy = p.y - mouse.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < 18000 && d2 > 1) {
        var f = (1 - d2 / 18000) * 0.55;
        var d = Math.sqrt(d2);
        p.x += (dx / d) * f;
        p.y += (dy / d) * f;
      }

      ctx.beginPath();
      ctx.fillStyle = 'rgba(' + p.hue + ',0.85)';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var a = 0; a < particles.length; a++) {
      for (var b = a + 1; b < particles.length; b++) {
        var pa = particles[a];
        var pb = particles[b];
        var ddx = pa.x - pb.x;
        var ddy = pa.y - pb.y;
        var dist2 = ddx * ddx + ddy * ddy;
        if (dist2 < 15000) {
          var alpha = (1 - dist2 / 15000) * 0.16;
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(124,92,255,' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 0.7;
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  function onMove(e) {
    var rect = intro.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }
  function onLeave() {
    mouse.x = -9999;
    mouse.y = -9999;
  }

  /* ---------- 启动 ---------- */
  runCounters();

  if (canvas && ctx && !reduceMotion) {
    sizeCanvas();
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sizeCanvas, 160);
    });
    intro.addEventListener('mousemove', onMove);
    intro.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(draw);
  } else if (canvas) {
    canvas.style.display = 'none';
  }

  // 进入后把焦点交给主界面，方便键盘继续操作
  window.setTimeout(function () {
    if (!entered && btn && document.activeElement === document.body) {
      try { btn.focus({ preventScroll: true }); } catch (err) { btn.focus(); }
    }
  }, 900);
})();
