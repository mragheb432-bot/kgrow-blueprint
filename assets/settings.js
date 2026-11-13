/* Kgp Blueprint engine - Settings. Three switches the owner asked for: open the content to everyone (no password),
   change the password, and turn the blueprint MCP on or off. Saving publishes to the GitHub repository that serves
   the site: the page reads the whole content, writes it either readable (open to everyone) or encrypted with the
   new password (AES-256-GCM, key from PBKDF2-SHA256), and replaces the repository with one commit, so no older
   version stays in its history. The GitHub key is pasted for that save only and never stored. Loaded on first use. */
(() => {
  "use strict";
  const K = window.KGBP, S = K.siteSettings;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = K.esc, IT = 400000;
  let busy = false;
  let curPwHash = null;   // after a password change in this session, the fingerprint of the password set last

  function strings() {
    return K.state.lang === "ar" ? {
      now: (pub, mcp) => `الحالة الآن: ${pub ? "المحتوى متاح للجميع بلا كلمة مرور" : "المحتوى محمي بكلمة مرور ومشفّر"}، وخادم MCP ${mcp ? "مُفعّل" : "متوقف"}.`,
      pubT: "جعل المحتوى متاحاً للجميع", pubH: "يفتح المخطط لأي زائر بلا كلمة مرور، وتُنشر كل الملفات مقروءة غير مشفّرة.",
      pubWarn: "عند الحفظ يصبح كل المحتوى (الخريطة وكل الملفات والصور) مقروءاً لأي شخص.",
      pwT: "تغيير كلمة المرور", pwH: "اكتب كلمة المرور الجديدة مرتين. يُعاد تشفير كل المحتوى بها، ولا تعود كلمة المرور القديمة تفتح الموقع.",
      pwBack: "المحتوى متاح للجميع الآن. اختر كلمة مرور لحمايته من جديد.", pwOff: "لا حاجة لكلمة مرور ما دام المحتوى متاحاً للجميع.",
      pw1: "كلمة المرور الجديدة", pw2: "أعد كتابة كلمة المرور",
      mcpT: "خادم MCP للوكلاء", mcpH: "عند الإيقاف يرد الخادم على كل وكيل بأنه متوقف من المالك، ولا يعطي أي معلومة حتى تعيد تفعيله.",
      pubTitle: "الحفظ والنشر", pubHelp: "يُنشر التغيير على GitHub فيتحدث الموقع لكل الزوار خلال دقيقة تقريباً.",
      cur: "كلمة المرور الحالية (لا يُقبل أي تغيير بدونها)",
      errCurNeed: "اكتب كلمة المرور الحالية؛ لا يُقبل أي تغيير بدونها.", errCur: "كلمة المرور الحالية غير صحيحة. لم يتغير شيء.",
      key: "مفتاح GitHub (لهذا الحفظ فقط، لا يُخزَّن)", how: "كيف أنشئ مفتاح GitHub؟",
      steps: [`افتح <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">صفحة إنشاء مفتاح جديد على GitHub</a>.`,
        `في «Repository access» اختر «Only select repositories» ثم المستودع <code>${esc(S.repo || "<owner>/<repo>")}</code> وحده.`,
        "في «Permissions» ثم «Repository permissions» اجعل «Contents» على «Read and write».",
        "اضغط «Generate token»، وانسخ المفتاح والصقه هنا. يمكنك استخدامه في كل حفظ حتى تنتهي مدته."],
      save: "احفظ وانشر", saving: "جارٍ النشر…",
      errMatch: "كلمتا المرور غير متطابقتين.", errNeedPw: "اختر كلمة مرور لحماية المحتوى من جديد.", errNothing: "لم يتغير شيء لحفظه.",
      errKey: "الصق مفتاح GitHub للنشر.", errRepo: "لا يُعرف مستودع النشر (assets/settings.json).",
      errAuth: "رفض GitHub المفتاح (خاطئ أو منتهي الصلاحية).", errPerm: (r) => `المفتاح لا يستطيع الكتابة في ${r}. تأكد أنه محصور في هذا المستودع وأن «Contents» على «Read and write».`,
      errNet: "تعذّر الوصول إلى GitHub. تحقق من الاتصال وحاول مجدداً.", errRead: (u) => `تعذّرت قراءة ${u}.`,
      errNotSite: (r) => `المستودع ${r} لا يحمل موقع هذا المخطط (لا يوجد فيه index.html ومجلد assets). لم يُغيَّر شيء. صحّح «repo» في assets/settings.json.`,
      pRead: (a, b) => `قراءة المحتوى: ${a} من ${b}`, pLock: "تشفير المحتوى بكلمة المرور الجديدة…", pUp: (a, b) => `الرفع إلى GitHub: ${a} من ${b}`, pCommit: "حفظ النسخة الجديدة…",
      done: (pub, pw) => `تم النشر. ${pub ? "أصبح المحتوى متاحاً للجميع." : pw ? "كلمة المرور الجديدة هي التي تفتح الموقع الآن." : ""} يحدّث GitHub الموقع خلال دقيقة تقريباً؛ أعد تحميل الصفحة بعدها.`,
      msg: (pub, pw, mcp) => `Settings: ${pub ? "open to everyone" : pw ? "protected with a new password" : "protected"}, MCP ${mcp ? "on" : "off"}`,
    } : {
      now: (pub, mcp) => `Now: ${pub ? "the content is open to everyone, with no password" : "the content is protected with a password and encrypted"}; the MCP is ${mcp ? "on" : "off"}.`,
      pubT: "Make the content public", pubH: "Opens the blueprint to every visitor with no password; all files are published readable, not encrypted.",
      pubWarn: "On save, all content (the map, every file and picture) becomes readable by anyone.",
      pwT: "Change the password", pwH: "Type the new password twice. All content is encrypted again with it, and the old password no longer opens the site.",
      pwBack: "The content is open to everyone now. Choose a password to protect it again.", pwOff: "No password is needed while the content is open to everyone.",
      pw1: "New password", pw2: "Type the password again",
      mcpT: "MCP for agents", mcpH: "When off, the server answers every agent that the owner turned it off, and gives no information until you turn it on again.",
      pubTitle: "Save and publish", pubHelp: "The change is published on GitHub, and the site updates for every visitor in about a minute.",
      cur: "Current password (no change is accepted without it)",
      errCurNeed: "Type the current password; no change is accepted without it.", errCur: "The current password is not correct. Nothing was changed.",
      key: "GitHub key (for this save only, never stored)", how: "How do I create a GitHub key?",
      steps: [`Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">GitHub's page for a new key</a>.`,
        `Under "Repository access" choose "Only select repositories", then the repository <code>${esc(S.repo || "<owner>/<repo>")}</code> alone.`,
        'Under "Permissions", "Repository permissions", set "Contents" to "Read and write".',
        'Press "Generate token", copy the key and paste it here. You can use it for every save until it expires.'],
      save: "Save and publish", saving: "Publishing…",
      errMatch: "The two passwords do not match.", errNeedPw: "Choose a password to protect the content again.", errNothing: "Nothing changed to save.",
      errKey: "Paste your GitHub key to publish.", errRepo: "The publishing repository is not known (assets/settings.json).",
      errAuth: "GitHub refused the key (wrong or expired).", errPerm: (r) => `The key cannot write to ${r}. Check that it is limited to this repository with "Contents" set to "Read and write".`,
      errNet: "GitHub cannot be reached. Check the connection and try again.", errRead: (u) => `Cannot read ${u}.`,
      errNotSite: (r) => `The repository ${r} does not hold this blueprint's site (no index.html and assets folder). Nothing was changed. Correct "repo" in assets/settings.json.`,
      pRead: (a, b) => `Reading the content: ${a} of ${b}`, pLock: "Encrypting the content with the new password…", pUp: (a, b) => `Uploading to GitHub: ${a} of ${b}`, pCommit: "Saving the new version…",
      done: (pub, pw) => `Published. ${pub ? "The content is now open to everyone." : pw ? "The new password is the one that opens the site now." : ""} GitHub updates the site in about a minute; reload the page then.`,
      msg: (pub, pw, mcp) => `Settings: ${pub ? "open to everyone" : pw ? "protected with a new password" : "protected"}, MCP ${mcp ? "on" : "off"}`,
    };
  }

  // after a save in this session (live), the saved state is the truth even on a still-encrypted loaded copy
  const current = () => ({ pub: S.live ? !!S.public : K.isPublic(), mcp: S.mcp !== false });
  const field = (id, label, type, auto) => `<label class="field"><span class="field-label">${label}</span><span class="field-row"><input id="${id}" type="${type}" autocomplete="${auto}" spellcheck="false"></span></label>`;
  const sw = (id, on, label) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? "checked" : ""} aria-label="${esc(label)}"><span aria-hidden="true"></span></label>`;

  function render() {
    const tt = strings(), c = current();
    $("#settingsBody").innerHTML = `<p class="st-now" id="stNow">${esc(tt.now(c.pub, c.mcp))}</p>
      <section class="st-card"><div class="st-row"><div><b>${tt.pubT}</b><small>${tt.pubH}</small></div>${sw("stPublic", c.pub, tt.pubT)}</div>
        <p class="st-warn" id="stPubWarn" hidden>${tt.pubWarn}</p></section>
      <section class="st-card" id="stPwCard"><b>${tt.pwT}</b><small id="stPwHelp">${tt.pwH}</small>
        <div class="st-fields">${field("stPw1", tt.pw1, "password", "new-password")}${field("stPw2", tt.pw2, "password", "new-password")}</div></section>
      <section class="st-card"><div class="st-row"><div><b>${tt.mcpT}</b><small>${tt.mcpH}</small></div>${sw("stMcp", c.mcp, tt.mcpT)}</div></section>
      <section class="st-card st-publish"><b>${tt.pubTitle}</b><small>${tt.pubHelp}</small>
        <div id="stCurWrap">${field("stCur", tt.cur, "password", "current-password")}</div>
        ${field("stKey", tt.key, "password", "off")}
        <details class="st-howto"><summary>${tt.how}</summary><ol>${tt.steps.map((x) => `<li>${x}</li>`).join("")}</ol></details>
        <p class="st-error" id="stErr" role="alert"></p>
        <div class="st-progress" id="stProg" hidden><div class="st-bar"><i id="stBar"></i></div><p id="stMsg" aria-live="polite"></p></div>
        <div class="st-actions"><button class="btn primary" id="stSave">${K.icon("check")}<span>${tt.save}</span></button></div></section>`;
    $("#stPublic").addEventListener("change", sync);
    $("#stSave").addEventListener("click", save);
    sync();
  }
  function sync() {
    const tt = strings(), c = current(), pub = $("#stPublic").checked;
    $("#stPubWarn").hidden = !(pub && !c.pub);
    $("#stPwCard").classList.toggle("off", pub);
    ["#stPw1", "#stPw2"].forEach((s) => { $(s).disabled = pub; });
    $("#stPwHelp").textContent = pub ? tt.pwOff : c.pub ? tt.pwBack : tt.pwH;
    // the current password is asked whenever the content is protected now; open content has none to ask for
    $("#stCurWrap").hidden = c.pub;
  }
  function open() {
    if (!busy) render();
    K.openSheet("#settingsModal");
  }

  /* ------------------------------------------------------------------ save */
  function fail(msg) { $("#stErr").textContent = msg; return false; }
  function progress(text, frac) { $("#stProg").hidden = false; $("#stMsg").textContent = text; if (frac != null) $("#stBar").style.width = Math.round(frac * 100) + "%"; }

  async function save() {
    if (busy) return;
    // the button stays disabled through every step, the password check included, so a result is never read half-way
    busy = true; const btn = $("#stSave"); btn.disabled = true; btn.querySelector("span").textContent = strings().saving;
    try {
      const tt = strings(), c = current();
      const want = { pub: $("#stPublic").checked, mcp: $("#stMcp").checked, pw: $("#stPw1").value };
      $("#stErr").textContent = "";
      if (!want.pub && $("#stPw1").value !== $("#stPw2").value) return fail(tt.errMatch);
      if (!want.pub && c.pub && !want.pw) return fail(tt.errNeedPw);
      const content = want.pub !== c.pub || (!want.pub && !!want.pw);
      if (!content && want.mcp === c.mcp) return fail(tt.errNothing);
      // protected content changes only for whoever proves the password set now (the one this copy is protected
      // with, or, after a change in this session, the one set last)
      if (!c.pub) {
        const cur = $("#stCur").value;
        if (!cur) return fail(tt.errCurNeed);
        if (!(curPwHash ? (await K.sha256(cur)) === curPwHash : await K.checkPassword(cur))) return fail(tt.errCur);
      }
      const key = $("#stKey").value.trim();
      if (!key) return fail(tt.errKey);
      if (!S.repo) return fail(tt.errRepo);
      const out = [];
      let newKey = null;
      if (content) {
        const plain = await readAll((a, b) => progress(tt.pRead(a, b), (a / b) * 0.45));
        if (want.pub) out.push(...openFiles(plain));
        else { progress(tt.pLock, 0.5); const r = await lockedFiles(plain, want.pw); out.push(...r.files); newKey = r.key; }
      }
      const settings = { mcp: want.mcp, public: want.pub, repo: S.repo, branch: S.branch || "main", site: S.site, api: S.api, updated: new Date().toISOString() };
      out.push({ path: "assets/settings.json", text: JSON.stringify(settings, null, 2) + "\n" });
      await upload(key, out, tt.msg(want.pub, !!want.pw, want.mcp), (a, b) => progress(tt.pUp(a, b), 0.55 + (a / b) * 0.4), () => progress(tt.pCommit, 0.97));
      progress(tt.done(want.pub, !want.pub && !!want.pw), 1);
      if (newKey) K.addKey(newKey);
      Object.assign(S, { mcp: want.mcp, public: want.pub, live: true });
      K.applyOpenState();
      curPwHash = want.pub ? null : (want.pw ? await K.sha256(want.pw) : curPwHash);
      $("#stKey").value = ""; $("#stPw1").value = ""; $("#stPw2").value = ""; $("#stCur").value = "";
      $("#stNow").textContent = tt.now(want.pub, want.mcp);
      sync();
    } catch (e) {
      $("#stProg").hidden = true;
      fail(e.userText || String(e.message || e));
    } finally {
      busy = false; btn.disabled = false; btn.querySelector("span").textContent = strings().save;
    }
    return true;
  }

  /* -------------------------------------------- read every content file, decrypted when needed */
  async function pool(items, n, fn) {
    let i = 0; const res = new Array(items.length);
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; res[k] = await fn(items[k], k); } }));
    return res;
  }
  async function getText(u) {
    const r = await fetch(u, { cache: "no-store" }).catch(() => null);
    if (!r || !r.ok) { const e = new Error(u); e.userText = strings().errRead(u); throw e; }
    return r.text();
  }
  const inner = (s, fn) => s.slice(s.indexOf(fn + "(") + fn.length + 1, s.lastIndexOf(")"));
  const afterEq = (s) => s.slice(s.indexOf("=") + 1).trim().replace(/;\s*$/, "");

  async function readAll(report) {
    let dataText = K.rawData();
    if (!dataText) dataText = afterEq(await getText("assets/data.js"));
    const full = JSON.parse(dataText);
    delete full.public; delete full.encImg; delete full.locked;
    const codes = [...new Set(full.nodes.filter((n) => n.code !== undefined).map((n) => n.code))];
    const imgs = [...new Set(full.nodes.filter((n) => n.img).map((n) => n.img))];
    const total = codes.length + imgs.length + 3; let doneN = 0; const tick = () => report(++doneN, total);
    const code = await pool(codes, 8, async (num) => {
      const s = await getText(`assets/code/${num}.js`);
      const pair = s.startsWith("KG_CODE_E(") ? JSON.parse(await K.decryptText(JSON.parse(inner(s, "KG_CODE_E")))) : JSON.parse("[" + inner(s, "KG_CODE") + "]");
      tick(); return { num, id: pair[0], text: pair[1] };
    });
    const symS = await getText("assets/symbols.js"); tick();
    const symbols = symS.startsWith("KG_SYMBOLS_E(") ? JSON.parse(await K.decryptText(JSON.parse(inner(symS, "KG_SYMBOLS_E")))) : JSON.parse(afterEq(symS));
    const hasTour = !!(full.features || {}).tour;
    const dashS = hasTour ? await getText("assets/dashboard/bundle.js") : ""; tick();
    const dash = !hasTour ? null : dashS.startsWith("KG_DASH_E(") ? await K.decryptText(JSON.parse(inner(dashS, "KG_DASH_E"))) : JSON.parse(afterEq(dashS));
    const pictures = await pool(imgs, 4, async (path) => {
      const r = await fetch(path, { cache: "no-store" }).catch(() => null);
      if (!r || !r.ok) { const e = new Error(path); e.userText = strings().errRead(path); throw e; }
      const raw = new Uint8Array(await r.arrayBuffer());
      let bytes = raw;
      if (K.encImgNow()) bytes = new Uint8Array(await K.decryptBytes(raw));
      tick(); return { path, bytes };
    });
    tick();
    return { full, code, symbols, dash, pictures };
  }

  /* ------------------------------------------------------- the two published forms */
  function openFiles(p) {
    const files = [{ path: "assets/data.js", text: "window.KGP_BLUEPRINT = " + JSON.stringify({ ...p.full, public: true }) + ";\n" }];
    p.code.forEach((c) => files.push({ path: `assets/code/${c.num}.js`, text: `KG_CODE(${JSON.stringify(c.id)},${JSON.stringify(c.text)});\n` }));
    files.push({ path: "assets/symbols.js", text: "window.KG_SYMBOLS = " + JSON.stringify(p.symbols) + ";\n" });
    if (p.dash !== null) files.push({ path: "assets/dashboard/bundle.js", text: "window.KG_DASH = " + JSON.stringify(p.dash) + ";\n" });
    p.pictures.forEach((x) => files.push({ path: x.path, bytes: x.bytes }));
    return files;
  }
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  async function lockedFiles(p, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: IT, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const enc = async (u8) => { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, u8)); const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out; };
    const pack = async (str) => b64(await enc(new TextEncoder().encode(str)));
    const full = { ...p.full, encImg: true };
    const pubKeys = {}; for (const k of ["ui", "brand", "logo", "languages", "defaultLang", "features"]) if (full[k] !== undefined) pubKeys[k] = full[k];
    const stub = { meta: full.meta, ...pubKeys, nodes: [], edges: [], lanes: [], flows: [], glossary: [], encImg: true, locked: { salt: b64(salt), it: IT, data: await pack(JSON.stringify(full)) } };
    const files = [{ path: "assets/data.js", text: "window.KGP_BLUEPRINT = " + JSON.stringify(stub) + ";\n" }];
    for (const c of p.code) files.push({ path: `assets/code/${c.num}.js`, text: "KG_CODE_E(" + JSON.stringify(await pack(JSON.stringify([c.id, c.text]))) + ");\n" });
    files.push({ path: "assets/symbols.js", text: "KG_SYMBOLS_E(" + JSON.stringify(await pack(JSON.stringify(p.symbols))) + ");\n" });
    if (p.dash !== null) files.push({ path: "assets/dashboard/bundle.js", text: "KG_DASH_E(" + JSON.stringify(await pack(p.dash)) + ");\n" });
    for (const x of p.pictures) files.push({ path: x.path, bytes: await enc(x.bytes) });
    return { files, key };
  }

  /* ------------------------------------------- GitHub: one commit that replaces the repository's history */
  async function upload(token, files, message, report, committing) {
    const tt = strings(), api = (S.api || "https://api.github.com").replace(/\/$/, ""), repo = S.repo, branch = S.branch || "main";
    const gh = async (method, path, body) => {
      let r;
      try {
        r = await fetch(api + path, { method, headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
      } catch { const e = new Error("network"); e.userText = tt.errNet; throw e; }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(`GitHub ${r.status}: ${j.message || ""}`); e.userText = r.status === 401 ? tt.errAuth : (r.status === 403 || r.status === 404) ? tt.errPerm(repo) : `GitHub ${r.status}: ${j.message || ""}`; throw e; }
      return j;
    };
    const ref = await gh("GET", `/repos/${repo}/git/ref/heads/${branch}`);
    const head = await gh("GET", `/repos/${repo}/git/commits/${ref.object.sha}`);
    // the save replaces the repository's whole history: go on only if it is this kind of site (a wrong "repo" must not be wiped)
    const top = new Set(((await gh("GET", `/repos/${repo}/git/trees/${head.tree.sha}`)).tree || []).map((x) => x.path));
    if (!top.has("index.html") || !top.has("assets")) { const e = new Error("not a blueprint site"); e.userText = tt.errNotSite(repo); throw e; }
    let tree = head.tree.sha;
    const total = files.length; let n = 0;
    const entries = await pool(files.filter((f) => f.bytes), 3, async (f) => {
      const blob = await gh("POST", `/repos/${repo}/git/blobs`, { content: b64(f.bytes), encoding: "base64" });
      report(++n, total); return { path: f.path, mode: "100644", type: "blob", sha: blob.sha };
    });
    // text files go inline in a few tree requests (about 1.5 MB each), each built on the previous tree
    let batch = [...entries], size = 0, texts = 0;
    const flush = async () => { tree = (await gh("POST", `/repos/${repo}/git/trees`, { base_tree: tree, tree: batch })).sha; n += texts; report(n, total); batch = []; size = 0; texts = 0; };
    for (const f of files.filter((x) => !x.bytes)) {
      batch.push({ path: f.path, mode: "100644", type: "blob", content: f.text }); size += f.text.length; texts++;
      if (size > 1500000) await flush();
    }
    if (batch.length) await flush();
    report(total, total); committing();
    const commit = await gh("POST", `/repos/${repo}/git/commits`, { message, tree, parents: [] });
    await gh("PATCH", `/repos/${repo}/git/refs/heads/${branch}`, { sha: commit.sha, force: true });
    return commit.sha;
  }

  K.openSettings = open;
  K.renderSettings = () => { if (!busy && !$("#settingsModal").hidden) render(); };
})();
