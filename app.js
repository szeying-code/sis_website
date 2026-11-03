// SIS Birthday Checklist — shared family version
(function () {
  function $(id) { return document.getElementById(id); }
  var KEY = GIFT.storageKey || "birthday-todo-1";
  var API = (GIFT.supabaseUrl || "").replace(/\/$/, "");
  var API_KEY = GIFT.supabasePublishableKey || "";
  var TOKEN_KEY = "sis-birthday-family-token";
  var tasks = [];
  var busy = false;
  var lastSnapshot = "";

  // The family token is supplied in the URL fragment, which is not sent to the web server.
  var fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  var tokenFromLink = fragment.get("key");
  if (tokenFromLink) {
    try { localStorage.setItem(TOKEN_KEY, tokenFromLink); } catch (e) {}
    history.replaceState(null, "", location.pathname + location.search);
  }
  var TOKEN = tokenFromLink || (function () { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } })() || GIFT.familyToken || "";
  // Persist the configured fallback so the installed iPhone app can reopen without a special URL.
  if (TOKEN) { try { localStorage.setItem(TOKEN_KEY, TOKEN); } catch (e) {} }

  function apiCall(fn, body) {
    return fetch(API + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: {
        "apikey": API_KEY,
        "Authorization": "Bearer " + API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ("Supabase error " + r.status)); });
      return r.json();
    });
  }
  function getTasks() {
    return apiCall("get_birthday_tasks", { p_token: TOKEN }).then(function (rows) {
      return (rows || []).map(function (r) { return { id: r.id, text: r.title, done: !!r.completed, sort_order: r.sort_order || 0 }; });
    });
  }
  function addTask(text, order) {
    return apiCall("add_birthday_task", { p_token: TOKEN, p_title: text, p_sort_order: order || 0 });
  }
  function updateTask(t) {
    return apiCall("update_birthday_task", { p_token: TOKEN, p_task_id: t.id, p_completed: t.done });
  }
  function deleteTask(t) {
    return apiCall("delete_birthday_task", { p_token: TOKEN, p_task_id: t.id });
  }
  function showError(err) {
    console.error("Shared checklist error:", err);
    alert("Couldn't sync with the family checklist. Please check your internet connection and reload.\n\n" + (err.message || err));
  }

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
      busy = true; Promise.all(done.map(deleteTask)).then(function () { return refresh(true); }).catch(showError).finally(function () { busy = false; });
    }
  });
  $("resetAll").addEventListener("click", function () {
    if (busy) return;
    if (confirm("Start again with the original list? Your own tasks will be removed.")) {
      busy = true;
      Promise.all(tasks.map(deleteTask)).then(function () {
        return GIFT.tasks.reduce(function (promise, title, i) { return promise.then(function () { return addTask(title, i); }); }, Promise.resolve());
      }).then(function () { return refresh(true); }).catch(showError).finally(function () { busy = false; });
    }
  });

  function refresh(force) {
    return getTasks().then(function (fresh) {
      var snapshot = JSON.stringify(fresh);
      if (force || snapshot !== lastSnapshot) { tasks = fresh; lastSnapshot = snapshot; render(); }
    });
  }
  function start() {
    if (!API || !API_KEY || !TOKEN) {
      alert("Family link information is missing. Please open the special family sharing link.");
      return;
    }
    getTasks().then(function (rows) {
      if (!rows.length) {
        // First visit seeds the shared list from this browser's saved list, or the configured defaults.
        var old = null; try { old = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
        var initial = Array.isArray(old) && old.length ? old : GIFT.tasks.map(function (text) { return { text: text, done: false }; });
        return initial.reduce(function (promise, t, i) {
          return promise.then(function () {
            return addTask(t.text || t.title, i).then(function (newId) {
              if (t.done && newId) return apiCall("update_birthday_task", { p_token: TOKEN, p_task_id: newId, p_completed: true });
            });
          });
        }, Promise.resolve()).then(refresh);
      }
      tasks = rows; lastSnapshot = JSON.stringify(tasks); render();
    }).catch(showError);
    // Poll for changes made by other family members.
    setInterval(function () { if (!busy && document.visibilityState === "visible") refresh(false).catch(function (e) { console.warn(e); }); }, 4000);
  }
  start();
})();
