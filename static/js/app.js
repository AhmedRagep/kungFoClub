/* ==========================================================================
   نادي الكونغ فو — واجهة AJAX
   ========================================================================== */
(function () {
  "use strict";

  // ----------------------------------------------------------------- أدوات

  const $ = (sel, root) => (root || document).querySelector(sel);
  const CSRF = ($('meta[name="csrf-token"]') || {}).content || "";

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  let CURRENCY = "ج.م";

  function fmt(value) {
    const n = Number(value || 0);
    const whole = Math.abs(n % 1) < 0.005;
    const text = whole
      ? Math.round(n).toLocaleString("en-US")
      : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return text + " " + CURRENCY;
  }

  async function api(path, options) {
    const opts = options || {};
    const init = {
      method: opts.method || "GET",
      headers: { "X-CSRFToken": CSRF, "X-Requested-With": "XMLHttpRequest" },
      credentials: "same-origin",
    };
    if (opts.body) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, init);
    if (res.status === 403 || res.redirected) {
      if (res.url && res.url.indexOf("/login") !== -1) {
        window.location.href = "/login/";
        return { ok: false, error: "محتاج تسجّل دخول" };
      }
    }
    let data;
    try {
      data = await res.json();
    } catch (e) {
      return { ok: false, error: "السيرفر رجّع رد غير متوقع" };
    }
    if (!res.ok) data.ok = false;
    return data;
  }

  let toastTimer = null;
  function toast(message, isError) {
    const box = $("#toast");
    if (!box) return;
    box.innerHTML = '<div class="' + (isError ? "err" : "") + '">' + esc(message) + "</div>";
    const el = box.firstChild;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => (box.innerHTML = ""), 250);
    }, 2400);
  }

  function waLink(phone, text) {
    let p = String(phone || "").replace(/[^\d]/g, "");
    if (!p) return null;
    if (p.indexOf("0") === 0) p = "20" + p.slice(1);
    else if (p.indexOf("20") !== 0 && p.length === 10) p = "20" + p;
    return "https://wa.me/" + p + "?text=" + encodeURIComponent(text);
  }

  // ------------------------------------------------------------------ أيقونات

  const I = {
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 5 8.9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9.5a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 5h16M7 12h10M10 19h4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M17 11a3 3 0 1 0 0-6M18 20c0-2.2-.8-4.1-2-5.4"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4l10-10-4-4L4 16v4z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.5-.6-2.7-1.2-4.4-3.9-4.5-4.1-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.3.3c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l2 1c.2.1.4.2.4.3.1.1.1.6-.1 1.2z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  };

  // -------------------------------------------------------------------- الشيت

  const scrim = $("#scrim");
  const sheet = $("#sheet");
  let sheetCloser = null;

  function openSheet(html, onClose) {
    if (!sheet) return;
    sheet.innerHTML = '<div class="grip"></div><div class="sheet-inner">' + html + "</div>";
    sheet.scrollTop = 0;
    scrim.classList.add("open");
    sheet.classList.add("open");
    document.body.classList.add("no-scroll");
    sheetCloser = onClose || null;
  }

  function closeSheet() {
    if (!sheet || !sheet.classList.contains("open")) return;
    sheet.classList.remove("open");
    scrim.classList.remove("open");
    document.body.classList.remove("no-scroll");
    const cb = sheetCloser;
    sheetCloser = null;
    if (cb) cb();
  }

  if (scrim) scrim.addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
  });

  function confirmSheet(opts) {
    return new Promise((resolve) => {
      let answered = false;
      openSheet(
        "<h2>" + esc(opts.title) + "</h2>" +
        '<p class="sub">' + esc(opts.message) + "</p>" +
        '<div class="sheet-actions">' +
        '<button class="btn btn-ghost" data-act="no">رجوع</button>' +
        '<button class="btn ' + (opts.danger ? "btn-danger" : "btn-primary") + '" data-act="yes">' +
        esc(opts.confirmText || "تأكيد") + "</button></div>",
        () => { if (!answered) resolve(false); }
      );
      sheet.querySelector('[data-act="no"]').onclick = () => { answered = true; closeSheet(); resolve(false); };
      sheet.querySelector('[data-act="yes"]').onclick = () => { answered = true; closeSheet(); resolve(true); };
    });
  }

  function amountSheet(opts) {
    return new Promise((resolve) => {
      let answered = false;
      const quick = (opts.quick || [])
        .map((v) => '<button type="button" data-v="' + v + '">' + fmt(v) + "</button>")
        .join("");
      openSheet(
        "<h2>" + esc(opts.title) + "</h2>" +
        (opts.sub ? '<p class="sub">' + esc(opts.sub) + "</p>" : "") +
        (quick ? '<div class="quick-amounts">' + quick + "</div>" : "") +
        '<div class="field"><label>' + esc(opts.label || "المبلغ") + "</label>" +
        '<input type="number" inputmode="decimal" step="any" id="amt" value="' +
        (opts.initial != null ? opts.initial : "") + '" placeholder="0"></div>' +
        (opts.hint ? '<p class="sub">' + esc(opts.hint) + "</p>" : "") +
        '<div class="sheet-actions">' +
        '<button class="btn btn-ghost" data-act="no">إلغاء</button>' +
        '<button class="btn btn-primary" data-act="yes">' + esc(opts.confirmText || "تأكيد") + "</button></div>",
        () => { if (!answered) resolve(null); }
      );
      const input = sheet.querySelector("#amt");
      setTimeout(() => input.focus(), 220);
      sheet.querySelectorAll(".quick-amounts button").forEach((b) => {
        b.onclick = () => { input.value = b.dataset.v; };
      });
      const done = () => {
        const v = parseFloat(String(input.value).replace(",", "."));
        answered = true;
        closeSheet();
        resolve(isNaN(v) ? null : v);
      };
      input.onkeydown = (e) => { if (e.key === "Enter") done(); };
      sheet.querySelector('[data-act="yes"]').onclick = done;
      sheet.querySelector('[data-act="no"]').onclick = () => { answered = true; closeSheet(); resolve(null); };
    });
  }

  // =========================================================================
  //  الصفحة الرئيسية
  // =========================================================================

  function initApp() {
    const now = new Date();
    const state = {
      year: Number(document.body.dataset.year) || now.getFullYear(),
      month: Number(document.body.dataset.month) || now.getMonth() + 1,
      q: "",
      group: "all",
      unpaid: false,
      data: null,
      pickMode: false,
      picked: new Set(),
      openPlayer: null,
    };

    const els = {
      label: $("#monthLabel"),
      sub: $("#monthSub"),
      summary: $("#summary"),
      list: $("#list"),
      search: $("#search"),
      bottom: $("#bottombar"),
    };

    // ------------------------------------------------------------ تحميل

    async function load(silent) {
      if (!silent) els.list.innerHTML = '<div class="skeleton"></div><div class="skeleton" style="margin-top:9px"></div><div class="skeleton" style="margin-top:9px"></div>';
      const data = await api("/api/data/?year=" + state.year + "&month=" + state.month);
      if (!data.ok) { toast(data.error || "تعذّر تحميل البيانات", true); return; }
      state.data = data;
      CURRENCY = data.settings.currency || "ج.م";
      render();
    }

    function visiblePlayers() {
      let list = state.data.players.slice();
      if (state.group !== "all") list = list.filter((p) => p.group === state.group);
      if (state.unpaid) list = list.filter((p) => p.remaining > 0);
      const q = state.q.trim();
      if (q) list = list.filter((p) => p.name.indexOf(q) !== -1 || (p.phone || "").indexOf(q) !== -1);
      return list;
    }

    function totalsOf(list) {
      const due = list.reduce((s, p) => s + p.due, 0);
      const paid = list.reduce((s, p) => s + p.paid, 0);
      return { due, paid, remaining: due - paid, count: list.length, progress: due <= 0 ? 100 : Math.min(100, Math.round((paid / due) * 100)) };
    }

    // ------------------------------------------------------------ الرسم

    function render() {
      const d = state.data;
      const now2 = new Date();
      const isCurrent = state.year === now2.getFullYear() && state.month === now2.getMonth() + 1;

      $("#monthText").textContent = d.month.label;
      els.sub.textContent = isCurrent ? "الشهر الحالي" : "اضغط للرجوع للشهر الحالي";

      const list = visiblePlayers();
      const t = totalsOf(list);

      els.summary.innerHTML =
        '<div class="summary-head"><h2>حصيلة ' + esc(d.month.label) + "</h2>" +
        "<span>" + t.count + " لاعب</span></div>" +
        '<div class="stats">' +
        '<div class="stat jade"><b>' + fmt(t.paid) + "</b><span>المحصّل</span></div>" +
        '<div class="stat center ' + (t.remaining > 0 ? "red" : "jade") + '"><b>' + fmt(t.remaining) + "</b><span>المتبقي</span></div>" +
        '<div class="stat end"><b>' + fmt(t.due) + "</b><span>المطلوب</span></div>" +
        "</div>" +
        '<div class="bar"><i style="width:' + t.progress + '%"></i></div>';

      if (!d.players.length) {
        els.list.innerHTML = emptyBox(I.users, "ابدأ بإضافة أول لاعب",
          "اضغط على «لاعب جديد» تحت، اكتب الاسم واختار المجموعة، وهيظهر هنا باشتراك الشهر.");
      } else if (!list.length) {
        els.list.innerHTML = emptyBox(I.empty, "مفيش نتائج", "غيّر كلمة البحث أو الفلتر عشان تشوف لاعبين تاني.");
      } else {
        els.list.innerHTML = list.map(playerCard).join("");
      }

      renderBottom(list);
    }

    function emptyBox(icon, title, text) {
      return '<div class="empty">' + icon + "<h3>" + esc(title) + "</h3><p>" + esc(text) + "</p></div>";
    }

    function playerCard(p) {
      const picked = state.picked.has(p.id);
      const sealClass = state.pickMode ? (picked ? "seal pick" : "seal") : (p.settled ? "seal paid" : "seal");
      const sealContent = state.pickMode && picked ? I.check : esc(p.name.charAt(0));

      return (
        '<article class="player' + (picked ? " selected" : "") + '" data-id="' + p.id + '">' +
        '<div class="player-top">' +
        '<div class="' + sealClass + '">' + sealContent + "</div>" +
        '<div class="player-id"><h3>' + esc(p.name) + "</h3>" +
        '<div class="tags"><span class="tag ' + (p.group === "juniors" ? "brass" : "ink") + '">' + esc(p.group_label) + "</span>" +
        (p.discount > 0 ? '<span class="tag jade">خصم ' + fmt(p.discount) + "</span>" : "") +
        (p.custom_monthly_fee != null ? '<span class="tag red">اشتراك ' + fmt(p.fee) + "</span>" : "") +
        "</div></div>" +
        '<div class="player-amount' + (p.settled ? " done" : "") + '"><b>' +
        (p.settled ? "خالص" : fmt(p.remaining)) + "</b><span>" +
        (p.settled ? "مفيش متبقي" : "متبقي") + "</span></div></div>" +
        '<div class="bar thin' + (p.settled ? " done" : "") + '"><i style="width:' + p.progress + '%"></i></div>' +
        '<div class="player-foot"><small>دفع ' + fmt(p.paid) + " من " + fmt(p.due) + "</small>" +
        (state.pickMode ? "" :
          '<button class="mini-btn" data-pay="' + p.id + '">' + I.plus + " حصة " + fmt(state.data.settings.session_fee) + "</button>") +
        "</div></article>"
      );
    }

    function renderBottom(list) {
      if (state.pickMode) {
        const n = state.picked.size;
        els.bottom.innerHTML =
          '<div class="shell">' +
          '<button class="btn btn-ghost" id="cancelPick">إلغاء</button>' +
          '<button class="btn btn-jade" id="doPick"' + (n ? "" : " disabled") + ">" + I.check +
          " سجّل حصة لـ " + n + "</button></div>";
        $("#cancelPick").onclick = () => { state.pickMode = false; state.picked.clear(); render(); };
        $("#doPick").onclick = bulkPay;
      } else {
        els.bottom.innerHTML =
          '<div class="shell">' +
          '<button class="btn btn-primary" id="addPlayer">' + I.plus + " لاعب جديد</button>" +
          '<button class="btn btn-dark" id="startPick">' + I.check + " تحضير اليوم</button></div>";
        $("#addPlayer").onclick = () => playerForm(null);
        $("#startPick").onclick = () => {
          if (!list.length) { toast("مفيش لاعبين معروضين", true); return; }
          state.pickMode = true; state.picked.clear(); render();
        };
      }
    }

    // ------------------------------------------------------------ الأحداث

    els.list.addEventListener("click", (e) => {
      const payBtn = e.target.closest("[data-pay]");
      if (payBtn) {
        e.stopPropagation();
        quickSession(Number(payBtn.dataset.pay));
        return;
      }
      const card = e.target.closest(".player");
      if (!card) return;
      const id = Number(card.dataset.id);
      if (state.pickMode) {
        if (state.picked.has(id)) state.picked.delete(id);
        else state.picked.add(id);
        render();
      } else {
        playerSheet(id);
      }
    });

    $("#prevMonth").onclick = () => shift(-1);
    $("#nextMonth").onclick = () => shift(1);
    els.label.parentElement.onclick = (e) => {
      if (e.target.closest("button")) return;
      const n = new Date();
      state.year = n.getFullYear();
      state.month = n.getMonth() + 1;
      load();
    };

    function shift(delta) {
      let m = state.month + delta;
      let y = state.year;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      state.month = m; state.year = y;
      state.picked.clear();
      load();
    }

    let searchTimer = null;
    els.search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.q = els.search.value; render(); }, 120);
    });

    $("#unpaidToggle").onclick = function () {
      state.unpaid = !state.unpaid;
      this.classList.toggle("on", state.unpaid);
      render();
    };

    document.querySelectorAll("[data-group]").forEach((chip) => {
      chip.onclick = () => {
        state.group = chip.dataset.group;
        document.querySelectorAll("[data-group]").forEach((c) => c.classList.remove("on"));
        chip.classList.add("on");
        render();
      };
    });

    // ------------------------------------------------------------ العمليات

    function playerById(id) {
      return state.data.players.find((p) => p.id === id);
    }

    async function quickSession(id) {
      const res = await api("/api/players/" + id + "/pay/", {
        method: "POST",
        body: { amount: state.data.settings.session_fee, kind: "session", note: "حصة", year: state.year, month: state.month },
      });
      toast(res.message || res.error, !res.ok);
      if (res.ok) await load(true);
    }

    async function bulkPay() {
      const ids = Array.from(state.picked);
      const res = await api("/api/bulk-pay/", {
        method: "POST",
        body: { player_ids: ids, year: state.year, month: state.month },
      });
      toast(res.message || res.error, !res.ok);
      if (res.ok) {
        state.pickMode = false;
        state.picked.clear();
        await load(true);
      }
    }

    // ------------------------------------------------------- شيت اللاعب

    async function playerSheet(id) {
      const p = playerById(id);
      if (!p) return;
      state.openPlayer = id;

      const payments = p.payments.length
        ? '<ul class="pay-list">' + p.payments.map((x) =>
            "<li>" +
            '<span class="pay-ico">' + I.cash + "</span>" +
            '<span class="pay-meta"><b>' + esc(x.note || x.kind_label) + "</b>" +
            "<span>" + esc(x.date) + " · " + esc(x.time) + " · " + esc(x.method_label) + "</span></span>" +
            '<span class="pay-amount">' + fmt(x.amount) + "</span>" +
            '<button class="pay-del" data-del="' + x.id + '">' + I.x + "</button></li>"
          ).join("") + "</ul>"
        : '<p class="sub" style="margin:12px 0 0">لسه مفيش دفعات في الشهر ده.</p>';

      const wa = waLink(p.phone,
        "السلام عليكم، تذكير باشتراك " + p.name + " في " + state.data.settings.club_name +
        " عن " + state.data.month.label + ": المتبقي " + fmt(p.remaining) + ". شكراً.");

      openSheet(
        "<h2>" + esc(p.name) + "</h2>" +
        '<p class="sub">' + esc(p.group_label) + " · " + esc(state.data.month.label) +
        (p.phone ? " · " + esc(p.phone) : "") + "</p>" +

        '<div class="card"><div class="stats">' +
        '<div class="stat jade"><b>' + fmt(p.paid) + "</b><span>مدفوع</span></div>" +
        '<div class="stat center ' + (p.settled ? "jade" : "red") + '"><b>' + fmt(p.remaining) + "</b><span>" +
        (p.settled ? "خالص" : "متبقي") + "</span></div>" +
        '<div class="stat end"><b>' + fmt(p.due) + "</b><span>مطلوب الشهر</span></div></div>" +
        '<div class="bar"><i style="width:' + p.progress + '%"></i></div>' +
        '<p class="sub" style="margin:12px 0 0">اشتراكه ' + fmt(p.fee) +
        (p.discount > 0 ? " · خصم " + fmt(p.discount) : "") + " · الحصة " + fmt(state.data.settings.session_fee) + "</p></div>" +

        '<div class="sheet-actions">' +
        '<button class="btn btn-primary" data-act="session">' + I.plus + " حصة</button>" +
        '<button class="btn btn-dark" data-act="rest"' + (p.settled ? " disabled" : "") + ">" + I.check + " سداد الباقي</button>" +
        "</div>" +
        '<div class="sheet-actions">' +
        '<button class="btn btn-ghost small" data-act="custom">مبلغ مخصص</button>' +
        '<button class="btn btn-ghost small" data-act="discount">خصم</button>' +
        '<button class="btn btn-ghost small" data-act="edit">تعديل</button>' +
        "</div>" +
        (wa ? '<div class="sheet-actions"><a class="btn btn-jade small" href="' + wa + '" target="_blank" rel="noopener">' + I.wa + " تذكير واتساب</a></div>" : "") +

        '<div class="section-title" style="margin-bottom:0">دفعات الشهر</div>' + payments +

        '<div class="sheet-actions" style="margin-top:22px">' +
        '<button class="btn btn-ghost small" data-act="history">سجل الشهور</button>' +
        '<button class="btn btn-ghost small" data-act="delete" style="color:var(--cinnabar)">حذف اللاعب</button>' +
        "</div>",
        () => { state.openPlayer = null; }
      );

      sheet.querySelectorAll("[data-del]").forEach((b) => {
        b.onclick = async () => {
          const ok = await confirmSheet({
            title: "حذف الدفعة",
            message: "هتتشال الدفعة ويزيد المتبقي على اللاعب.",
            confirmText: "احذف", danger: true,
          });
          if (!ok) { playerSheet(id); return; }
          const res = await api("/api/payments/" + b.dataset.del + "/delete/", { method: "POST" });
          toast(res.message || res.error, !res.ok);
          await load(true);
          playerSheet(id);
        };
      });

      const act = (name, fn) => {
        const btn = sheet.querySelector('[data-act="' + name + '"]');
        if (btn) btn.onclick = fn;
      };

      act("session", async () => {
        await quickSession(id);
        playerSheet(id);
      });

      act("rest", async () => {
        const res = await api("/api/players/" + id + "/pay/", {
          method: "POST",
          body: { amount: null, kind: "month", note: "سداد باقي الشهر", year: state.year, month: state.month },
        });
        toast(res.message || res.error, !res.ok);
        await load(true);
        playerSheet(id);
      });

      act("custom", async () => {
        const fresh = playerById(id);
        const v = await amountSheet({
          title: "مبلغ مخصص",
          sub: p.name,
          quick: [state.data.settings.session_fee, 50, 100, state.data.settings.monthly_fee],
          confirmText: "سجّل الدفعة",
          label: "المبلغ المدفوع",
          hint: "المتبقي حالياً " + fmt(fresh ? fresh.remaining : p.remaining),
        });
        if (v == null) { playerSheet(id); return; }
        if (v <= 0) { toast("المبلغ لازم يكون أكبر من صفر", true); playerSheet(id); return; }
        const res = await api("/api/players/" + id + "/pay/", {
          method: "POST",
          body: { amount: v, kind: "custom", note: "دفعة", year: state.year, month: state.month },
        });
        toast(res.message || res.error, !res.ok);
        await load(true);
        playerSheet(id);
      });

      act("discount", async () => {
        const v = await amountSheet({
          title: "خصم لـ " + p.name,
          label: "قيمة الخصم الشهري",
          initial: p.discount || "",
          hint: "الخصم بيتخصم من اشتراك كل شهر. اكتب 0 لإلغائه.",
          confirmText: "حفظ الخصم",
        });
        if (v == null) { playerSheet(id); return; }
        const res = await api("/api/players/" + id + "/update/", { method: "POST", body: { discount: v } });
        toast(res.message || res.error, !res.ok);
        await load(true);
        playerSheet(id);
      });

      act("edit", () => playerForm(playerById(id)));

      act("history", async () => {
        const res = await api("/api/players/" + id + "/history/");
        const rows = (res.history || []).length
          ? '<ul class="rows">' + res.history.map((h) =>
              '<li><span class="grow"><b>' + esc(h.label) + "</b></span>" +
              '<span class="pay-amount">' + fmt(h.total) + "</span></li>").join("") + "</ul>"
          : '<p class="sub">مفيش سجل دفعات لسه.</p>';
        openSheet("<h2>سجل " + esc(p.name) + "</h2>" +
          '<p class="sub">إجمالي المدفوع في كل شهر</p>' + rows +
          '<div class="sheet-actions"><button class="btn btn-ghost" id="backBtn">رجوع</button></div>');
        $("#backBtn").onclick = () => playerSheet(id);
      });

      act("delete", async () => {
        const ok = await confirmSheet({
          title: "حذف " + p.name,
          message: "هيتشال اللاعب وكل دفعاته نهائياً.",
          confirmText: "احذف", danger: true,
        });
        if (!ok) { playerSheet(id); return; }
        const res = await api("/api/players/" + id + "/delete/", { method: "POST" });
        toast(res.message || res.error, !res.ok);
        closeSheet();
        await load(true);
      });
    }

    // -------------------------------------------------------- فورم اللاعب

    function playerForm(player) {
      const isEdit = !!player;
      openSheet(
        "<h2>" + (isEdit ? "تعديل بيانات اللاعب" : "لاعب جديد") + "</h2>" +
        '<p class="sub">الاسم والمجموعة كفاية عشان تبدأ.</p>' +
        '<div class="field"><label>اسم اللاعب</label>' +
        '<input id="fName" value="' + esc(isEdit ? player.name : "") + '" placeholder="مثال: يوسف محمود"></div>' +
        '<div class="field"><label>المجموعة</label><div class="seg">' +
        '<button type="button" data-g="juniors" class="' + (!isEdit || player.group === "juniors" ? "on" : "") + '">الصغار</button>' +
        '<button type="button" data-g="seniors" class="' + (isEdit && player.group === "seniors" ? "on" : "") + '">الكبار</button>' +
        "</div></div>" +
        '<div class="field"><label>رقم الموبايل (اختياري)</label>' +
        '<input id="fPhone" inputmode="tel" value="' + esc(isEdit ? player.phone : "") + '" placeholder="01xxxxxxxxx"></div>' +
        '<div class="grid-2">' +
        '<div class="field"><label>اشتراك خاص</label>' +
        '<input id="fFee" type="number" inputmode="decimal" step="any" value="' +
        (isEdit && player.custom_monthly_fee != null ? player.custom_monthly_fee : "") +
        '" placeholder="' + state.data.settings.monthly_fee + '">' +
        '<div class="hint">سيبه فاضي = الاشتراك العام</div></div>' +
        '<div class="field"><label>خصم شهري</label>' +
        '<input id="fDisc" type="number" inputmode="decimal" step="any" value="' +
        (isEdit && player.discount ? player.discount : "") + '" placeholder="0">' +
        '<div class="hint">يتخصم كل شهر</div></div></div>' +
        '<div class="field"><label>ملاحظات (اختياري)</label>' +
        '<input id="fNote" value="' + esc(isEdit ? player.note : "") + '" placeholder="مثال: أخو مالك"></div>' +
        '<div class="sheet-actions">' +
        '<button class="btn btn-ghost" id="fCancel">إلغاء</button>' +
        '<button class="btn btn-primary" id="fSave">' + (isEdit ? "حفظ التعديلات" : "إضافة اللاعب") + "</button></div>"
      );

      let group = isEdit ? player.group : "juniors";
      sheet.querySelectorAll("[data-g]").forEach((b) => {
        b.onclick = () => {
          group = b.dataset.g;
          sheet.querySelectorAll("[data-g]").forEach((x) => x.classList.remove("on"));
          b.classList.add("on");
        };
      });

      $("#fCancel").onclick = () => (isEdit ? playerSheet(player.id) : closeSheet());
      $("#fSave").onclick = async () => {
        const body = {
          name: $("#fName").value,
          group: group,
          phone: $("#fPhone").value,
          note: $("#fNote").value,
          discount: $("#fDisc").value || 0,
          custom_monthly_fee: $("#fFee").value === "" ? null : $("#fFee").value,
        };
        const url = isEdit ? "/api/players/" + player.id + "/update/" : "/api/players/create/";
        const res = await api(url, { method: "POST", body: body });
        toast(res.message || res.error, !res.ok);
        if (!res.ok) return;
        closeSheet();
        await load(true);
      };
      setTimeout(() => { const n = $("#fName"); if (n && !isEdit) n.focus(); }, 220);
    }

    load();
  }

  // =========================================================================
  //  صفحة الإعدادات
  // =========================================================================

  function initSettings() {
    const now = new Date();
    const state = {
      year: Number(document.body.dataset.year) || now.getFullYear(),
      month: Number(document.body.dataset.month) || now.getMonth() + 1,
      data: null,
    };

    async function load() {
      const data = await api("/api/data/?year=" + state.year + "&month=" + state.month);
      if (!data.ok) { toast(data.error || "تعذّر التحميل", true); return; }
      state.data = data;
      CURRENCY = data.settings.currency || "ج.م";
      render();
    }

    function render() {
      const d = state.data;
      $("#sClub").value = d.settings.club_name;
      $("#sMonthly").value = d.settings.monthly_fee;
      $("#sSession").value = d.settings.session_fee;
      $("#sCurrency").value = d.settings.currency;
      $("#monthName").textContent = d.month.label;

      $("#totals").innerHTML =
        totalsCard("كل اللاعبين", d.totals, true) +
        totalsCard("الصغار", d.groups.juniors) +
        totalsCard("الكبار", d.groups.seniors);

      // الرسم البياني لآخر 6 شهور
      const trend = d.trend || [];
      const max = Math.max(1, ...trend.map((t) => t.total));
      $("#trend").innerHTML =
        '<div class="trend">' + trend.map((t, i) =>
          '<div class="trend-col' + (i === trend.length - 1 ? " now" : "") + '">' +
          '<span class="trend-val">' + (t.total ? Math.round(t.total) : "") + "</span>" +
          '<div class="trend-bar" style="height:' + Math.max(4, (t.total / max) * 78) + 'px"></div>' +
          "<small>" + esc(t.label.split(" ")[0]) + "</small></div>").join("") + "</div>";

      // اللاعبون
      const players = d.players;
      $("#playersBox").innerHTML = players.length
        ? '<ul class="rows">' + players.map((p) =>
            '<li><span class="grow"><b>' + esc(p.name) + "</b><small>" +
            esc(p.group_label) + " · اشتراكه " + fmt(p.fee) +
            (p.discount > 0 ? " · خصم " + fmt(p.discount) : "") + "</small></span>" +
            '<button class="mini-btn" data-fee="' + p.id + '">اشتراك</button>' +
            '<button class="mini-btn" data-disc="' + p.id + '">خصم</button></li>').join("") + "</ul>"
        : '<p class="sub">مفيش لاعبين لسه. ضيفهم من الشاشة الرئيسية.</p>';

      $("#playersBox").querySelectorAll("[data-fee]").forEach((b) => {
        b.onclick = () => editFee(Number(b.dataset.fee));
      });
      $("#playersBox").querySelectorAll("[data-disc]").forEach((b) => {
        b.onclick = () => editDiscount(Number(b.dataset.disc));
      });

      // تذكيرات واتساب
      const unpaid = players.filter((p) => p.remaining > 0 && p.phone);
      $("#reminders").innerHTML = unpaid.length
        ? '<ul class="rows">' + unpaid.map((p) => {
            const link = waLink(p.phone,
              "السلام عليكم، تذكير باشتراك " + p.name + " في " + d.settings.club_name +
              " عن " + d.month.label + ": المتبقي " + fmt(p.remaining) + ". شكراً.");
            return '<li><span class="grow"><b>' + esc(p.name) + "</b><small>متبقي " + fmt(p.remaining) +
              "</small></span>" +
              '<a class="mini-btn" style="color:var(--jade)" href="' + link + '" target="_blank" rel="noopener">واتساب</a></li>';
          }).join("") + "</ul>"
        : '<p class="sub">مفيش متأخرات عليها أرقام موبايل. تمام كده.</p>';

      $("#reportLink").href = "/report/?year=" + state.year + "&month=" + state.month;
      $("#exportLink").href = "/export/?year=" + state.year + "&month=" + state.month;
    }

    function totalsCard(label, t, strong) {
      return '<div class="card' + (strong ? " dark" : "") + '" style="margin-bottom:10px">' +
        '<div style="font-weight:700;font-size:14px;margin-bottom:12px">' + esc(label) +
        ' <span style="font-weight:400;opacity:.6">(' + t.count + ")</span></div>" +
        '<div class="stats">' +
        '<div class="stat"><b style="color:' + (strong ? "#5fd6b4" : "var(--jade)") + '">' + fmt(t.paid) + "</b><span" +
        (strong ? ' style="color:rgba(255,255,255,.6)"' : "") + ">محصّل</span></div>" +
        '<div class="stat center"><b style="color:' + (strong ? "#ff9b96" : "var(--cinnabar)") + '">' + fmt(t.remaining) + "</b><span" +
        (strong ? ' style="color:rgba(255,255,255,.6)"' : "") + ">متبقي</span></div>" +
        '<div class="stat end"><b>' + fmt(t.due) + "</b><span" +
        (strong ? ' style="color:rgba(255,255,255,.6)"' : "") + ">مطلوب</span></div></div></div>";
    }

    async function editFee(id) {
      const p = state.data.players.find((x) => x.id === id);
      const v = await amountSheet({
        title: "اشتراك خاص لـ " + p.name,
        label: "قيمة الاشتراك الشهري",
        initial: p.custom_monthly_fee != null ? p.custom_monthly_fee : "",
        hint: "اكتب 0 أو سيبه فاضي عشان يرجع للاشتراك العام (" + fmt(state.data.settings.monthly_fee) + ")",
        confirmText: "حفظ",
      });
      if (v == null) return;
      const res = await api("/api/players/" + id + "/update/", { method: "POST", body: { custom_monthly_fee: v } });
      toast(res.message || res.error, !res.ok);
      if (res.ok) load();
    }

    async function editDiscount(id) {
      const p = state.data.players.find((x) => x.id === id);
      const v = await amountSheet({
        title: "خصم لـ " + p.name,
        label: "قيمة الخصم الشهري",
        initial: p.discount || "",
        hint: "اكتب 0 لإلغاء الخصم.",
        confirmText: "حفظ",
      });
      if (v == null) return;
      const res = await api("/api/players/" + id + "/update/", { method: "POST", body: { discount: v } });
      toast(res.message || res.error, !res.ok);
      if (res.ok) load();
    }

    $("#saveSettings").onclick = async () => {
      const res = await api("/api/settings/", {
        method: "POST",
        body: {
          club_name: $("#sClub").value,
          monthly_fee: $("#sMonthly").value,
          session_fee: $("#sSession").value,
          currency: $("#sCurrency").value,
        },
      });
      toast(res.message || res.error, !res.ok);
      if (res.ok) load();
    };

    load();
  }

  // ------------------------------------------------------------------ تشغيل

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.dataset.page;
    if (page === "app") initApp();
    else if (page === "settings") initSettings();
  });
})();
