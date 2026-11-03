// This file makes the to-do list work. You don't need to edit it.
(function () {
  function $(id) { return document.getElementById(id); }
  var KEY = GIFT.storageKey || "birthday-todo-1";

  // ---------- saved data (kept in this phone or browser only) ----------
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(s)) return s; } catch (e) {}
    return null;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) {} }
  var uid = Date.now();
  function newId() { return "t" + (uid++); }
  function seed() { return GIFT.tasks.map(function (t) { return { id: newId(), text: t, done: false }; }); }
  var tasks = load() || seed();

  // ---------- page text ----------
  document.title = GIFT.pageTitle;
  $("title").textContent = GIFT.title;
  $("message").textContent = GIFT.message;
  $("from").textContent = GIFT.from;
  $("doneTitle").textContent = GIFT.doneTitle;
  $("doneMessage").textContent = GIFT.doneMessage;
  $("footer").textContent = GIFT.footer;

  // ---------- confetti ----------
  var cv = $("confetti"), cx = cv.getContext("2d"), parts = [], running = false;
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function size() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
  addEventListener("resize", size); size();
  var CH = ["💜", "🩷", "✨", "🎈", "⭐", "🏸"], COL = ["#a78bfa", "#ff8cc4", "#38b6f5", "#ffd166", "#7ee0b0"];
  function burst(x, y, n) {
    if (still) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 7;
      parts.push({ x: x * devicePixelRatio, y: y * devicePixelRatio, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5,
        r: Math.random() * 6, vr: (Math.random() - .5) * .3, life: 70 + Math.random() * 40,
        ch: Math.random() < .45 ? CH[(Math.random() * CH.length) | 0] : null, c: COL[(Math.random() * COL.length) | 0], s: 8 + Math.random() * 10 });
    }
    if (!running) { running = true; requestAnimationFrame(frame); }
  }
  function frame() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < cv.height + 40; });
    parts.forEach(function (p) {
      p.vy += .22; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr; p.life--;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = Math.min(1, p.life / 25);
      var s = p.s * devicePixelRatio;
      if (p.ch) { cx.font = s * 1.6 + "px serif"; cx.textAlign = "center"; cx.fillText(p.ch, 0, 0); }
      else { cx.fillStyle = p.c; cx.fillRect(-s / 2, -s / 4, s, s / 2); }
      cx.restore();
    });
    if (parts.length) requestAnimationFrame(frame); else { running = false; cx.clearRect(0, 0, cv.width, cv.height); }
  }

  // ---------- drawing the list ----------
  function render() {
    var list = $("list"); list.innerHTML = "";
    tasks.forEach(function (t) {
      var li = document.createElement("li"); li.className = "task";
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "c" + t.id; cb.checked = t.done;
      var lb = document.createElement("label"); lb.htmlFor = cb.id;
      var box = document.createElement("span"); box.className = "box"; box.textContent = "✓"; box.setAttribute("aria-hidden", "true");
      var tx = document.createElement("span"); tx.className = "txt"; tx.textContent = t.text;
      lb.appendChild(box); lb.appendChild(tx);
      var del = document.createElement("button"); del.type = "button"; del.className = "del"; del.textContent = "✕";
      del.setAttribute("aria-label", "Delete task: " + t.text);
      cb.addEventListener("change", function () {
        t.done = cb.checked; save(); stats();
        if (t.done) { var r = box.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 26); if (allDone()) finale(); }
      });
      del.addEventListener("click", function () { tasks = tasks.filter(function (x) { return x !== t; }); save(); render(); });
      li.appendChild(cb); li.appendChild(lb); li.appendChild(del); list.appendChild(li);
    });
    $("empty").hidden = tasks.length > 0;
    stats();
  }
  function allDone() { return tasks.length > 0 && tasks.every(function (t) { return t.done; }); }
  function finale() {
    for (var i = 0; i < 5; i++) setTimeout(function () { burst(Math.random() * innerWidth, innerHeight * .25, 40); }, i * 220);
  }
  function stats() {
    var n = tasks.length, d = tasks.filter(function (t) { return t.done; }).length, p = n ? Math.round(d / n * 100) : 0;
    $("count").textContent = d + " of " + n + " done";
    $("pct").textContent = p + "%";
    $("fill").style.width = p + "%";
    $("fill").parentNode.setAttribute("aria-valuenow", p);
    $("doneBox").hidden = !allDone();
  }

  // ---------- buttons ----------
  $("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("newTask").value.trim(); if (!v) return;
    tasks.push({ id: newId(), text: v, done: false }); $("newTask").value = ""; save(); render();
    var items = $("list").children; if (items.length) items[items.length - 1].scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  $("clearDone").addEventListener("click", function () {
    if (!tasks.some(function (t) { return t.done; })) return;
    if (confirm("Remove all ticked tasks?")) { tasks = tasks.filter(function (t) { return !t.done; }); save(); render(); }
  });
  $("resetAll").addEventListener("click", function () {
    if (confirm("Start again with the original list? Your own tasks will be removed.")) { tasks = seed(); save(); render(); }
  });

  render();
})();
