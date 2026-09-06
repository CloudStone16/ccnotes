/* ccnotes viewer shell — navigation + search over /api/catalog. Vanilla JS. */
(function () {
  "use strict";
  var tree = document.getElementById("tree");
  var iframe = document.getElementById("viewer");
  var welcome = document.getElementById("welcome");
  var search = document.getElementById("search");
  var results = document.getElementById("results");
  var stat = document.getElementById("stat");
  var emptyState = document.getElementById("emptyState");
  var CATALOG = { subjects: [] };
  var INDEX = [];      // flat search records
  var flatNav = [];    // ordered list of navigable {url,title} for j/k
  var curNav = -1;

  function el(t, a, k) { var e = document.createElement(t); if (a) for (var x in a) x === "text" ? e.textContent = a[x] : e.setAttribute(x, a[x]); (k || []).forEach(function (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return e; }

  function open(url, push) {
    welcome.hidden = true; iframe.hidden = false; iframe.src = url;
    if (push !== false) history.pushState({ url: url }, "", "#" + encodeURIComponent(url));
    tree.querySelectorAll("a.active").forEach(function (a) { a.classList.remove("active"); });
    var link = tree.querySelector('a[data-url="' + CSS.escape(url) + '"]');
    if (link) { link.classList.add("active"); ensureVisible(link); }
    curNav = flatNav.findIndex(function (n) { return n.url === url; });
    document.getElementById("app").classList.remove("nav-open");
  }
  function ensureVisible(node) {
    var p = node.closest(".unit"); if (p && p.classList.contains("collapsed")) p.classList.remove("collapsed");
    var s = node.closest(".subj"); if (s && s.classList.contains("collapsed")) s.classList.remove("collapsed");
    node.scrollIntoView({ block: "nearest" });
  }

  function buildTree() {
    tree.innerHTML = ""; flatNav = [];
    if (!CATALOG.subjects.length) { emptyState.hidden = false; }
    CATALOG.subjects.forEach(function (subj) {
      var kids = el("div", { class: "units" });
      var head = el("div", { class: "subj-h" }, [el("span", { class: "caret", text: "▾" }), subj.subject]);
      var box = el("div", { class: "subj" }, [head, kids]);
      head.addEventListener("click", function () { box.classList.toggle("collapsed"); });
      subj.units.sort(function (a, b) { return a.unitNo - b.unitNo; }).forEach(function (u) {
        var ukids = el("div", { class: "kids" });
        var uhead = el("div", { class: "unit-h" }, [
          el("span", { class: "caret", text: "▾" }),
          el("span", { class: "u-no", text: "U" + u.unitNo }),
          el("span", { text: u.title })
        ]);
        var ubox = el("div", { class: "unit collapsed" }, [uhead, ukids]);
        uhead.addEventListener("click", function () { ubox.classList.toggle("collapsed"); });
        var base = "/content/" + u.path + "/";
        addLink(ukids, base + "index.html", "Overview");
        (u.sections || []).forEach(function (s) {
          addLink(ukids, base + s.file, s.n + ". " + s.title, s.topics);
        });
        addLink(ukids, base + "isa/index.html", "ISA prep", null, true);
        ukids.appendChild(linkNode(base + "index.html#quickref", "Quick reference", true));
        ukids.appendChild(linkNode(base + "index.html#formulas", "Formula sheet", true));
        ukids.appendChild(linkNode(base + "index.html#flashcards", "Flashcards", true));
        kids.appendChild(ubox);
      });
      tree.appendChild(box);
    });
    stat.textContent = INDEX.length + " searchable · " + CATALOG.subjects.reduce(function (n, s) { return n + s.units.length; }, 0) + " units";
  }
  function linkNode(url, title, special) {
    var a = el("a", { href: "#", "data-url": url, text: title });
    if (special) a.classList.add("special");
    a.addEventListener("click", function (e) { e.preventDefault(); open(url); });
    return a;
  }
  function addLink(parent, url, title) {
    var a = linkNode(url, title, arguments[4]);
    parent.appendChild(a);
    flatNav.push({ url: url, title: title });
  }

  /* ---------- search ---------- */
  function tokenize(s) { return (s || "").toLowerCase().match(/[a-z0-9]+/g) || []; }
  function runSearch(q) {
    var terms = tokenize(q);
    if (!terms.length) { results.hidden = true; return; }
    var scored = [];
    INDEX.forEach(function (rec) {
      var hay = rec.hay, score = 0;
      terms.forEach(function (t) {
        var idx = hay.indexOf(t);
        if (idx === -1) { score -= 3; return; }
        score += 5;
        if (rec.title.toLowerCase().indexOf(t) !== -1) score += 8;
        if (rec.topics && rec.topics.toLowerCase().indexOf(t) !== -1) score += 6;
      });
      if (score > 0) scored.push({ rec: rec, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    renderResults(scored.slice(0, 12), terms);
  }
  function renderResults(items, terms) {
    results.innerHTML = "";
    if (!items.length) { results.innerHTML = '<div class="r"><div class="r-c">No matches</div></div>'; results.hidden = false; return; }
    items.forEach(function (it, i) {
      var rec = it.rec;
      var snippet = makeSnippet(rec.text, terms);
      var r = el("div", { class: "r" + (i === 0 ? " sel" : ""), "data-url": rec.url });
      r.innerHTML = '<div class="r-t">' + hl(rec.crumb + " › " + rec.title, terms) + '</div><div class="r-c">' + snippet + '</div>';
      r.addEventListener("click", function () { open(rec.url); results.hidden = true; search.value = ""; });
      results.appendChild(r);
    });
    results.hidden = false;
  }
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function hl(s, terms) { s = esc(s); terms.forEach(function (t) { s = s.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); }); return s; }
  function makeSnippet(text, terms) {
    var low = text.toLowerCase(), pos = -1;
    for (var i = 0; i < terms.length; i++) { pos = low.indexOf(terms[i]); if (pos !== -1) break; }
    if (pos === -1) pos = 0;
    var start = Math.max(0, pos - 40);
    return (start > 0 ? "…" : "") + hl(text.slice(start, start + 160), terms) + "…";
  }

  var selIdx = 0;
  search.addEventListener("input", function () { selIdx = 0; runSearch(this.value); });
  search.addEventListener("keydown", function (e) {
    var rs = results.querySelectorAll(".r");
    if (e.key === "ArrowDown") { e.preventDefault(); selIdx = Math.min(selIdx + 1, rs.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selIdx = Math.max(selIdx - 1, 0); }
    else if (e.key === "Enter") { if (rs[selIdx]) rs[selIdx].click(); return; }
    else if (e.key === "Escape") { results.hidden = true; this.blur(); return; }
    else return;
    rs.forEach(function (r, i) { r.classList.toggle("sel", i === selIdx); });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".search-wrap")) results.hidden = true; });

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "/") { e.preventDefault(); search.focus(); }
    else if (e.key === "j" || e.key === "k") {
      if (!flatNav.length) return;
      curNav = e.key === "j" ? Math.min(curNav + 1, flatNav.length - 1) : Math.max(curNav - 1, 0);
      open(flatNav[curNav].url);
    }
  });

  window.addEventListener("popstate", function (e) {
    var url = e.state && e.state.url; if (url) open(url, false);
    else { iframe.hidden = true; welcome.hidden = false; }
  });

  document.getElementById("healthBtn").addEventListener("click", function () {
    open("/health?html=1");
  });

  /* ---------- load ---------- */
  fetch("/api/catalog").then(function (r) { return r.json(); }).then(function (data) {
    CATALOG = data; INDEX = data.searchIndex || []; buildTree();
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash) open(hash, false);
  }).catch(function (e) {
    tree.innerHTML = '<p style="padding:16px;color:var(--bad)">Failed to load catalog: ' + e.message + "</p>";
  });
})();
