// SIS Birthday Checklist: password-protected shared family version
(function () {
  function $(id) { return document.getElementById(id); }
  var KEY = GIFT.storageKey || "birthday-todo-1"; // old single-device list, only used once to fill an empty shared list
  var API = (GIFT.supabaseUrl || "").replace(/\/$/, "");
  var API_KEY = GIFT.supabasePublishableKey || "";
  var PW_KEY = "sis-birthday-password";
  var PASSWORD = "";
  var tasks = [];
  var busy = false;
  var lastSnapshot = "";
  var pollTimer = null;

  // The old public family token is no longer used.
  try { localStorage.removeItem("sis-birthday-family-token"); } catch (e) {}

  // Every call sends the password. Supabase checks it on the server, so the checklist
  // data is never returned for a wrong password.
  function apiCall(fn, body) {
    return fetch(API + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { "apikey": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.text().then(function (t) {
        if (r.ok) return t ? JSON.parse(t) : null;
        var e = new Error(t || ("Supabase error " + r.status));
        e.restricted = /Permission restricted/i.test(t);
        throw e;
      });
    });
  }
  function getTasks() {
    return apiCall("get_birthday_tasks", { p_password: PASSWORD }).then(function (rows) {
      return (rows || []).map(function (r) { return { id: r.id, text: r.title, done: !!r.completed, sort_order: r.sort_order || 0 }; });
    });
  }
  function addTask(text, order) { return apiCall("add_birthday_task", { p_password: PASSWORD, p_title: text, p_sort_order: order || 0 }); }
  function updateTask(t) { return apiCall("update_birthday_task", { p_password: PASSWORD, p_task_id: t.id, p_completed: t.done }); }
  function deleteTask(t) { return apiCall("delete_birthday_task", { p_password: PASSWORD, p_task_id: t.id }); }

  function showError(err) {
    if (err && err.restricted) { lock(); showRestricted(); return; }
    console.error("Shared checklist error:", err);
    alert("Couldn't sync with the family checklist. Please check your internet connection and reload.\n\n" + (err.message || err));
  }

  // ---------- password screens ----------
  function show(id, on) { $(id).hidden = !on; }
  function showGate(message) {
    show("app", false); show("restricted", false); show("gate", true);
    $("pw").value = ""; $("gateBtn").disabled = false; $("gateBtn").textContent = "Open 💜";
    $("gateMsg").hidden = !message; $("gateMsg").textContent = message || "";
    $("pw").focus();
  }
  function showRestricted() { show("app", false); show("gate", false); show("restricted", true); $("retry").focus(); }
  function showApp() { show("gate", false); show("restricted", false); show("app", true); }
  function lock() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    PASSWORD = ""; tasks = []; lastSnapshot = ""; $("list").innerHTML = "";
    try { localStorage.removeItem(PW_KEY); } catch (e) {}
  }

  // Check the password, load (or fill) the shared list, then show the checklist.
  function login(pw, auto) {
    $("gateBtn").disabled = true; $("gateBtn").textContent = "Checking…";
    return apiCall("check_birthday_password", { p_password: pw }).then(function () {
      PASSWORD = pw;
      try { localStorage.setItem(PW_KEY, pw); } catch (e) {}
      return loadAll();
    }).then(function () {
      showApp(); render();
      if (!pollTimer) pollTimer = setInterval(function () {
        if (!busy && document.visibilityState === "visible") refresh(false).catch(function (e) { if (e.restricted) showError(e); else console.warn(e); });
      }, 4000);
    }).catch(function (err) {
      PASSWORD = "";
      if (err.restricted) {
        try { localStorage.removeItem(PW_KEY); } catch (e) {}
        if (auto) showGate("Please enter the password again."); else showRestricted();
      } else {
        showGate("Couldn't reach the shared list. Please check your internet and try again.");
      }
    });
  }
  function loadAll() {
    return getTasks().then(function (rows) {
      if (rows.length) return rows;
      // Empty shared list: fill it once (on the server) from the old local list or the starter tasks.
      var old = null; try { old = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
      var initial = Array.isArray(old) && old.length ? old : GIFT.tasks.map(function (text) { return { text: text, done: false }; });
      var items = initial.map(function (t) { return { title: t.text || t.title, completed: !!(t.done || t.completed) }; });
      return apiCall("seed_birthday_tasks", { p_password: PASSWORD, p_items: items }).then(getTasks);
    }).then(function (rows) { tasks = rows; lastSnapshot = JSON.stringify(tasks); });
  }

  // ---------- page text ----------
  document.title = GIFT.pageTitle;
  $("gateTitle").textContent = GIFT.gateTitle || "Birthday surprise 🔒";
  $("gateText").textContent = GIFT.gateMessage || "Please enter the password.";
  $("restrictedTitle").textContent = GIFT.restrictedTitle || "Permission restricted";
  $("restrictedText").textContent = GIFT.restrictedMessage || "That password isn't right.";
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
        if (busy) return; busy = true;
        var wasDone = t.done; t.done = cb.checked; cb.disabled = true;
        updateTask(t).then(function () {
          stats(); if (t.done && !wasDone) { var r = box.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 26); if (allDone()) finale(); }
          lastSnapshot = JSON.stringify(tasks);
        }).catch(function (e) { t.done = wasDone; cb.checked = wasDone; showError(e); }).finally(function () { busy = false; cb.disabled = false; });
      });
      del.addEventListener("click", function () {
        if (busy) return; busy = true; del.disabled = true;
        deleteTask(t).then(function () { tasks = tasks.filter(function (x) { return x.id !== t.id; }); lastSnapshot = JSON.stringify(tasks); render(); })
          .catch(showError).finally(function () { busy = false; del.disabled = false; });
      });
      li.appendChild(cb); li.appendChild(lb); li.appendChild(del); list.appendChild(li);
    });
    $("empty").hidden = tasks.length > 0;
    stats();
  }
  function allDone() { return tasks.length > 0 && tasks.every(function (t) { return t.done; }); }
  function finale() { for (var i = 0; i < 5; i++) setTimeout(function () { burst(Math.random() * innerWidth, innerHeight * .25, 40); }, i * 220); }
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
    var v = $("newTask").value.trim(); if (!v || busy) return;
    busy = true; var button = $("addForm").querySelector('button[type="submit"]'); button.disabled = true;
    addTask(v, tasks.length).then(function () { $("newTask").value = ""; return refresh(true); })
      .then(function () { var items = $("list").children; if (items.length) items[items.length - 1].scrollIntoView({ block: "nearest", behavior: "smooth" }); })
      .catch(showError).finally(function () { busy = false; button.disabled = false; });
  });
  $("clearDone").addEventListener("click", function () {
    var done = tasks.filter(function (t) { return t.done; });
    if (!done.length || busy) return;
    if (confirm("Remove all ticked tasks?")) {
      busy = true; apiCall("clear_done_birthday_tasks", { p_password: PASSWORD }).then(function () { return refresh(true); }).catch(showError).finally(function () { busy = false; });
    }
  });
  $("resetAll").addEventListener("click", function () {
    if (busy) return;
    if (confirm("Start again with the original list? Your own tasks will be removed.")) {
      busy = true; apiCall("reset_birthday_tasks", { p_password: PASSWORD, p_titles: GIFT.tasks }).then(function () { return refresh(true); }).catch(showError).finally(function () { busy = false; });
    }
  });
  $("lockBtn").addEventListener("click", function () { lock(); showGate(""); });
  $("gateForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("pw").value; if (!pw) return;
    login(pw, false);
  });
  $("retry").addEventListener("click", function () { showGate(""); });

  function refresh(force) {
    return getTasks().then(function (fresh) {
      var snapshot = JSON.stringify(fresh);
      if (force || snapshot !== lastSnapshot) { tasks = fresh; lastSnapshot = snapshot; render(); }
    });
  }
  document.addEventListener("visibilitychange", function () {
    if (PASSWORD && !busy && document.visibilityState === "visible") refresh(false).catch(function (e) { if (e.restricted) showError(e); });
  });

  // ---------- start ----------
  function start() {
    if (!API || !API_KEY) { showGate("This website is not connected to its database yet."); return; }
    var saved = ""; try { saved = localStorage.getItem(PW_KEY) || ""; } catch (e) {}
    if (saved) login(saved, true);
  }
  start();
})();
