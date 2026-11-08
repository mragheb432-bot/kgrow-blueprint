/* Kgrow.io Blueprint - dashboard tour. One half shows the real Kgrow.io dashboard (its own HTML, CSS and script,
   in its built-in demo run); clicking any element zooms to it and a thin line leads to its explanation in the other
   half. Loaded on first use. Data: KGBP.D.tour (build/content_tour.py). */
(() => {
  "use strict";
  const K = window.KGBP, D = K.D;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = K.esc;
  const tour = { ready: false, doc: null, win: null, cur: null, el: null, allow: false, paused: false, z: { s: 1, tx: 0, ty: 0 } };

  function strings() {
    return K.state.lang === "ar"
      ? { intro: "هذه لوحة تحكم Kgrow.io الحقيقية، تعمل بتشغيل تجريبي كأن سير عمل يجري الآن. انقر أي زر أو رقم أو جزء من الحلقة أو لوحة، فتقترب الصورة منه ويقودك خط رفيع إلى شرحه هنا.",
          plain: "بكلمات بسيطة", what: "ماذا يحدث", tech: "تحت الغطاء (للمهتمين بالتفاصيل التقنية)", related: "مرتبط به على الخريطة", tryIt: "جرّبه في اللوحة",
          all: "كل عناصر لوحة التحكم", hidden: "يظهر هذا العنصر في اللوحة فقط في حالته (مثلاً عند طلب موافقة أو عند الإيقاف المؤقت).", pause: "إيقاف الحركة", play: "تشغيل الحركة",
          tried: "نُفّذ في اللوحة التجريبية", index: "الفهرس" }
      : { intro: "This is the real Kgrow.io dashboard, running a sample run as if a workflow were going on now. Click any button, number, part of the loop or panel: the view zooms to it and a thin line leads you to its explanation here.",
          plain: "In plain words", what: "What happens", tech: "Under the hood (for technical detail)", related: "Linked on the map", tryIt: "Try it on the dashboard",
          all: "Every element of the dashboard", hidden: "This element shows on the dashboard only in its own state (for example when an approval is asked or while paused).", pause: "Pause the motion", play: "Play the motion",
          tried: "Done on the sample dashboard", index: "Index" };
  }
  const L = (o) => (o ? (o[K.state.lang] ?? o.en) : "");

  async function open() {
    K.hideApp(); const scr = $("#tour"); scr.classList.add("is-active", "entering"); setTimeout(() => scr.classList.remove("entering"), 900); requestAnimationFrame(K.fitBars);
    paint(); renderIndex();
    if (!tour.ready) {
      await K.loadScript("assets/dashboard/bundle.js"); await window.KG_DASH_WAIT;
      const f = $("#dashFrame");
      f.onload = () => { tour.doc = f.contentDocument; tour.win = f.contentWindow; hook(); syncTheme(); tour.ready = true; };
      f.srcdoc = window.KG_DASH;
    } else syncTheme();
    history.replaceState(null, "", "#tour");
  }
  function leave(toIntro) {
    $("#tour").classList.remove("is-active"); clearLine(); resetZoom(true);
    history.replaceState(null, "", location.pathname + location.search);
    if (toIntro) K.toIntro(); else K.showApp();
  }
  function hook() {
    const d = tour.doc;
    const st = d.createElement("style"); st.id = "tour-style";
    st.textContent = "html.tour-paused *{animation-play-state:paused!important;transition:none!important} .__tour-hl{outline:2.5px solid #fbbf24!important;outline-offset:3px;border-radius:6px} g.__tour-hl{outline:none!important} body{cursor:pointer}";
    d.head.appendChild(st);
    d.addEventListener("click", (e) => {
      if (tour.allow) { tour.allow = false; return; }
      const hit = match(e.target, e.clientX, e.clientY);
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (hit) focus(hit.t, hit.el); else resetZoom();
    }, true);
    d.addEventListener("submit", (e) => { if (!tour.allow) e.preventDefault(); }, true);
    tour.win.addEventListener("resize", () => tour.cur && setTimeout(() => focus(tour.cur, tour.el, true), 60));
  }
  // the smallest object under the click wins; objects the dashboard draws without pointer events (the moving
  // dots) are found by where they are on screen, through their "hit" parts, with a few pixels of margin
  function match(target, x, y) {
    let direct = null, drawn = null;
    const keep = (cur, t, el, q) => { const a = q.width * q.height; return !cur || a < cur.a ? { t, el, a } : cur; };
    for (const t of D.tour) {
      const el = target.closest && target.closest(t.sel);
      if (el) direct = keep(direct, t, el, el.getBoundingClientRect());
      if (t.hit && x != null) for (const host of tour.doc.querySelectorAll(t.sel)) for (const part of host.querySelectorAll(t.hit)) {
        const q = part.getBoundingClientRect(), pad = 4;
        if (q.width && x >= q.left - pad && x <= q.right + pad && y >= q.top - pad && y <= q.bottom + pad) drawn = keep(drawn, t, host, q);
      }
    }
    // the object under the pointer wins; a drawn-only part wins only over nothing or over a large area (the loop)
    return drawn && (!direct || drawn.a * 20 < direct.a) ? drawn : direct;
  }
  function visible(el) { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && !el.closest(".hidden") && !el.closest("dialog:not([open])"); }

  function focus(t, el, quiet) {
    if (!t) return;                 // a delayed redraw after the view was reset
    tour.cur = t; tour.el = el || tour.doc && tour.doc.querySelector(t.sel.split(",")[0]);
    $$(".__tour-hl").forEach((x) => x.classList.remove("__tour-hl"));
    renderCard(t);
    const vp = $("#dashViewport"), W = vp.clientWidth, H = vp.clientHeight;
    if (!visible(tour.el)) { resetZoom(); clearLine(); return; }
    tour.el.classList.add("__tour-hl");
    const r = tour.el.getBoundingClientRect();
    const s = Math.max(1.3, Math.min(3.3, (W * .62) / Math.max(r.width, 1), (H * .5) / Math.max(r.height, 1)));
    let tx = W / 2 - (r.left + r.width / 2) * s, ty = H / 2 - (r.top + r.height / 2) * s;
    tx = Math.min(0, Math.max(W - W * s, tx)); ty = Math.min(0, Math.max(H - H * s, ty));
    tour.z = { s, tx, ty };
    const z = $("#dashZoom"); z.style.transition = quiet ? "none" : ""; z.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    clearLine(); clearTimeout(tour.lineT); tour.lineT = setTimeout(() => drawLine(!quiet), quiet ? 30 : 780);
  }
  const $$ = (s) => (tour.doc ? Array.from(tour.doc.querySelectorAll(s)) : []);
  function resetZoom(silent) {
    tour.z = { s: 1, tx: 0, ty: 0 }; const z = $("#dashZoom"); z.style.transform = ""; clearLine();
    $$(".__tour-hl").forEach((x) => x.classList.remove("__tour-hl"));
    if (!silent) { tour.cur = null; renderIntro(); }
  }
  function clearLine() { $("#tourLine").innerHTML = ""; }
  function drawLine(animate) {
    if (!tour.cur || !visible(tour.el)) return;
    const main = $(".tour-main").getBoundingClientRect(), pane = $("#tourExplain").getBoundingClientRect();
    const vp = $("#dashViewport").getBoundingClientRect(), r = tour.el.getBoundingClientRect(), z = tour.z;
    const x0 = vp.left + z.tx + r.left * z.s, y0 = vp.top + z.ty + r.top * z.s, w = r.width * z.s, h = r.height * z.s;
    const card = $("#tourCardHead"); if (!card) return; const c = card.getBoundingClientRect();
    // the real arrangement on screen decides: explanation below the dashboard, or beside it on either side
    const stacked = pane.top >= vp.bottom - 1, onLeft = pane.right <= vp.left + 1;
    let sx, sy, ex, ey;
    if (stacked) { sx = x0 + w / 2; sy = Math.min(y0 + h, vp.bottom - 4); ex = document.documentElement.dir === "rtl" ? c.right - 30 : c.left + 30; ey = c.top; }
    else { sx = onLeft ? x0 : x0 + w; sy = y0 + h / 2; ex = onLeft ? c.right : c.left; ey = c.top + c.height / 2; }
    // the explanation may be scrolled: keep the end of the line inside its pane, never over the top bar
    ey = Math.max(pane.top + 18, Math.min(pane.bottom - 18, ey));
    sx = Math.max(vp.left + 2, Math.min(vp.right - 2, sx)); sy = Math.max(vp.top + 2, Math.min(vp.bottom - 2, sy));
    const mx = (sx + ex) / 2;
    const d = stacked ? `M${sx} ${sy} C ${sx} ${(sy + ey) / 2}, ${ex} ${(sy + ey) / 2}, ${ex} ${ey}` : `M${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`;
    const hx = Math.max(vp.left, x0 - 5), hy = Math.max(vp.top, y0 - 5), hw = Math.min(w + 10, vp.right - hx), hh = Math.min(h + 10, vp.bottom - hy);
    const svg = $("#tourLine"); svg.style.clipPath = `inset(${Math.max(0, main.top)}px 0 0 0)`; svg.classList.toggle("anim", !!animate);
    $("#tourLine").innerHTML = `<defs><linearGradient id="tlg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#34d399"/></linearGradient></defs>
      <rect class="tl-box" x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="8"/>
      <path class="tl-path" d="${d}" pathLength="1"/><circle class="tl-dot" cx="${sx}" cy="${sy}" r="4.5"/><circle class="tl-end" cx="${ex}" cy="${ey}" r="3.5"/>`;
  }

  function renderIntro() {
    const S = strings();
    $("#tourExplain").innerHTML = `<div class="tcard intro"><div class="tc-head" id="tourCardHead"><span class="tc-ico">${K.icon("hand")}</span><div><b>${esc(L({ en: "How to use this page", ar: "كيف تستخدم هذه الصفحة" }))}</b></div></div><p class="tc-plain">${esc(S.intro)}</p></div>` + indexHtml();
  }
  function renderCard(t) {
    const S = strings(), steps = (t.steps[K.state.lang] || t.steps.en);
    const rel = t.related.map((id) => { const n = K.byId.get(id); return n ? `<button class="lnk" data-tourgo="${id}" style="--lc:${K.colorOf(n)}"><i>${K.icon(n.icon)}</i>${esc(K.L(n.title))}</button>` : ""; }).join("");
    const shown = visible(tour.el);
    $("#tourExplain").innerHTML = `<article class="tcard" key="${t.id}">
      <div class="tc-head" id="tourCardHead"><span class="tc-ico">${K.icon(t.group === "buttons" ? "pointer" : t.group === "loop" ? "route" : t.group === "panels" ? "layout" : t.group === "ask" ? "shield" : "info")}</span>
        <div><small>${esc(L(D.tourGroups[t.group]))}</small><b>${esc(L(t.name))}</b></div></div>
      ${shown ? "" : `<p class="note">${esc(S.hidden)}</p>`}
      <h4>${esc(S.plain)}</h4><p class="tc-plain">${K.rich(L(t.plain), new Set())}</p>
      <h4>${esc(S.what)}</h4><ul class="tc-steps">${steps.map((x) => `<li>${K.rich(x, new Set())}</li>`).join("")}</ul>
      <details class="tc-tech"><summary>${esc(S.tech)}</summary><p>${K.rich(L(t.tech), new Set())}</p></details>
      ${rel ? `<h4>${esc(S.related)}</h4><div class="links">${rel}</div>` : ""}
      ${shown && /^(#b-|#ap-|#rep-|#repeat)/.test(t.sel) ? `<div class="p-actions"><button class="btn primary" id="tourTry">${K.icon("pointer")}${esc(S.tryIt)}</button></div>` : ""}
    </article>` + indexHtml();
  }
  function indexHtml() {
    const S = strings(), groups = {};
    D.tour.forEach((t) => (groups[t.group] = groups[t.group] || []).push(t));
    return `<section class="tindex"><h4>${esc(S.all)} (${D.tour.length})</h4>${Object.entries(groups).map(([g, list]) => `<div class="tg"><small>${esc(L(D.tourGroups[g]))}</small><div class="tchips">${list.map((t) => `<button class="tchip${tour.cur && tour.cur.id === t.id ? " on" : ""}" data-tourid="${t.id}">${esc(L(t.name))}</button>`).join("")}</div></div>`).join("")}</section>`;
  }
  function renderIndex() { if (tour.cur) renderCard(tour.cur); else renderIntro(); }
  function paint() { const S = strings(); $("#tourAnimLabel").textContent = tour.paused ? S.play : S.pause; $("#tourAnim").innerHTML = K.icon(tour.paused ? "play" : "pause") + `<span id="tourAnimLabel">${esc(tour.paused ? S.play : S.pause)}</span>`; $("#tourAnim").setAttribute("aria-pressed", String(!tour.paused)); $("#tourAnim").setAttribute("aria-label", tour.paused ? S.play : S.pause); $("#tourAnim").title = tour.paused ? S.play : S.pause; }
  function syncTheme() { try { tour.win.setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); } catch { /* not ready */ } }
  function setPaused(p) { tour.paused = p; if (tour.win) { tour.win.__tourPaused = p; tour.doc.documentElement.classList.toggle("tour-paused", p); } paint(); }

  // events on the tour screen
  $("#tourBack").addEventListener("click", () => leave(false));
  $("#tourClose").addEventListener("click", () => leave(true));
  $("#tourReset").addEventListener("click", () => resetZoom());
  $("#tourAnim").addEventListener("click", () => setPaused(!tour.paused));
  $("#tourExplain").addEventListener("click", (e) => {
    const c = e.target.closest("[data-tourid]"); if (c) { const t = D.tour.find((x) => x.id === c.dataset.tourid); const el = tour.doc && Array.from(tour.doc.querySelectorAll(t.sel)).find(visible); focus(t, el || null); return; }
    const g = e.target.closest("[data-tourgo]"); if (g) { leave(false); setTimeout(() => K.select(g.dataset.tourgo, { reveal: true, center: true }), 120); return; }
    if (e.target.closest("#tourTry") && tour.el) { tour.allow = true; const el = tour.el; el.dispatchEvent(new (tour.win.MouseEvent)("click", { bubbles: true, cancelable: true })); K.toast(strings().tried); setTimeout(() => focus(tour.cur, el, true), 400); }
  });
  let lineRaf = 0;   // follow the scroll frame by frame, without hiding or re-drawing the line
  $("#tourExplain").addEventListener("scroll", () => { if (!tour.cur) return; cancelAnimationFrame(lineRaf); lineRaf = requestAnimationFrame(() => drawLine(false)); }, { passive: true });
  addEventListener("resize", () => { if ($("#tour").classList.contains("is-active") && tour.cur) { clearLine(); clearTimeout(tour.lineT); tour.lineT = setTimeout(() => focus(tour.cur, tour.el, true), 150); } });
  new MutationObserver(() => { if ($("#tour").classList.contains("is-active")) { syncTheme(); paint(); renderIndex(); if (tour.cur) setTimeout(drawLine, 400); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "lang"] });

  window.KGBP_TOUR = { open, focusById: (id) => { const t = D.tour.find((x) => x.id === id); if (t) focus(t); } };
})();
