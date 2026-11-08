/* Kgrow.io Blueprint - reader: any project file in full. Markdown is rendered (headings, lists, tables, quotes,
   code blocks, links); every other file is shown as code with line numbers. Loaded on first use. */
(() => {
  "use strict";
  const K = window.KGBP;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = K.esc;

  function inline(s) {
    let out = esc(s);
    out = out.replace(/`([^`]+)`/g, (m, c) => `<code>${c}</code>`);
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${/^https?:/.test(u) ? u : "#"}" ${/^https?:/.test(u) ? 'target="_blank" rel="noopener"' : `data-mdlink="${u}"`}>${t}</a>`);
    out = out.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    return out;
  }
  function markdown(src) {
    const lines = src.replace(/\r/g, "").split("\n"); let html = "", i = 0; const toc = [];
    const listStack = [];
    const closeLists = (depth = 0) => { while (listStack.length > depth) html += `</${listStack.pop()}>`; };
    while (i < lines.length) {
      const l = lines[i];
      const fence = /^(\s*)(```|~~~)(.*)$/.exec(l);
      if (fence) {
        closeLists(); const lang = fence[3].trim(); const buf = []; i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence[2])) buf.push(lines[i++]);
        i++; html += `<div class="md-code"><span class="md-lang">${esc(lang)}</span><button class="icon-btn ghost" data-copy="${esc(buf.join("\n"))}" aria-label="Copy">${K.icon("copy")}</button><pre><code>${esc(buf.join("\n"))}</code></pre></div>`; continue;
      }
      const hm = /^(#{1,6})\s+(.*)$/.exec(l);
      if (hm) { closeLists(); const lv = hm[1].length, id = "h" + toc.length; toc.push([lv, hm[2].replace(/[*`]/g, ""), id]); html += `<h${Math.min(lv + 1, 6)} id="${id}">${inline(hm[2])}</h${Math.min(lv + 1, 6)}>`; i++; continue; }
      if (/^\s*(---|\*\*\*|___)\s*$/.test(l)) { closeLists(); html += "<hr>"; i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        closeLists(); const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        const head = cells(l); i += 2; let body = "";
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { body += `<tr>${cells(lines[i]).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`; i++; }
        html += `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`; continue;
      }
      if (/^\s*>/.test(l)) { closeLists(); const buf = []; while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, "")); html += `<blockquote>${inline(buf.join(" "))}</blockquote>`; continue; }
      const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l);
      if (li) {
        const depth = Math.floor(li[1].replace(/\t/g, "  ").length / 2) + 1, tag = /\d/.test(li[2]) ? "ol" : "ul";
        if (listStack.length < depth) { while (listStack.length < depth) { listStack.push(tag); html += `<${tag}>`; } }
        else closeLists(depth);
        let text = li[3]; i++;
        while (i < lines.length && lines[i].trim() && !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i]) && /^\s{2,}/.test(lines[i]) && !/^\s*(```|~~~)/.test(lines[i])) text += " " + lines[i++].trim();
        html += `<li>${inline(text)}</li>`; continue;
      }
      if (!l.trim()) { closeLists(); i++; continue; }
      closeLists(); const buf = [l]; i++;
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*([-*+]|\d+[.)])\s|\s*>|\s*(```|~~~)|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
      html += `<p>${inline(buf.join(" "))}</p>`;
    }
    closeLists();
    return { html, toc };
  }
  function codeView(text, syms) {
    const lines = text.replace(/\r/g, "").split("\n");
    const marks = new Map((syms || []).filter((s) => s[2]).map((s) => [s[2], s]));
    const body = lines.map((ln, k) => { const m = marks.get(k + 1); return `<span class="cl${m ? " has-sym" : ""}" id="L${k + 1}"><i>${k + 1}</i>${esc(ln) || " "}</span>`; }).join("\n");
    return `<pre class="code-view"><code>${body}</code></pre>`;
  }

  let current = null;
  async function open(id, line) {
    const n = K.byId.get(id); if (!n) return;
    const tt = K.t(), modal = $("#readerModal"), main = $("#readerMain"), toc = $("#readerToc");
    modal.hidden = false; current = id;
    $("#readerTitle").textContent = K.L(n.title); $("#readerPath").textContent = n.path || "";
    main.innerHTML = `<p class="opt">…</p>`; toc.innerHTML = "";
    const text = await K.getCode(id).catch(() => null);
    if (current !== id) return;
    if (text === null) { main.innerHTML = `<p>${K.esc(tt.noResults)}</p>`; return; }
    const isMd = /\.md$/.test(n.path), syms = (window.KG_SYMBOLS || {})[id] || [];
    $("#readerTools").innerHTML = `<span class="chip-s"><b>${n.lines.toLocaleString("en-US")}</b> ${tt.lines}</span><button class="btn" data-copy="${esc(text.slice(0, 200000))}">${K.icon("copy")}${tt.copy}</button>`;
    if (isMd) {
      const r = markdown(text);
      main.innerHTML = `<div class="md" dir="auto">${r.html}</div>`;
      toc.innerHTML = r.toc.map(([lv, t, hid]) => `<a href="#${hid}" data-jump="${hid}" style="padding-inline-start:${(lv - 1) * 12 + 8}px">${esc(t)}</a>`).join("");
    } else {
      main.innerHTML = codeView(text, syms);
      toc.innerHTML = syms.filter((s) => s[2] && s[1] !== "section").map((s) => `<a href="#L${s[2]}" data-jump="L${s[2]}"><i class="st st-${s[1]}">${esc((tt.symKinds || {})[s[1]] || s[1])}</i>${esc(s[0])}</a>`).join("") || `<p class="opt">${esc(n.path)}</p>`;
    }
    toc.hidden = !toc.innerHTML;
    if (line) { const el = main.querySelector(`#L${line}`); if (el) { el.classList.add("hit"); el.scrollIntoView({ block: "center" }); } }
    else main.scrollTop = 0;
  }
  document.addEventListener("click", (e) => {
    const j = e.target.closest("[data-jump]"); if (j && j.closest("#readerModal")) { e.preventDefault(); const el = document.getElementById(j.dataset.jump); if (el) { el.scrollIntoView({ block: "start", behavior: "smooth" }); el.classList.add("hit"); setTimeout(() => el.classList.remove("hit"), 1600); } }
    const ml = e.target.closest("[data-mdlink]"); if (ml) { e.preventDefault(); const base = (K.byId.get(current).path || "").split("/").slice(0, -1); let parts = [...base];
      for (const p of ml.dataset.mdlink.split("#")[0].split("/")) { if (p === "..") parts.pop(); else if (p && p !== ".") parts.push(p); }
      const target = "f:" + parts.join("/"); if (K.byId.has(target)) open(target); }
  });
  window.KGBP_READER = { open, markdown };
})();
