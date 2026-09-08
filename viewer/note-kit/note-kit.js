/* ccnotes note-kit — zero-dependency interactive layer for notes.
 * Hydrates declarative markup so section HTML stays tiny. Loads KaTeX + mermaid
 * from /note-kit/vendor/ when present; degrades gracefully when they are not.
 * Everything here is offline; no external network calls.  */
(function () {
  "use strict";
  var NK = (window.NoteKit = window.NoteKit || {});
  var VENDOR = "/note-kit/vendor/";

  /* ---------- tiny helpers ---------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function dig(obj, path) { return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function loadScript(src) { return new Promise(function (res) {
    var s = document.createElement("script"); s.src = src; s.onload = function () { res(true); };
    s.onerror = function () { res(false); }; document.head.appendChild(s); }); }
  function loadCss(href) { var l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }
  async function getJson(url) { var r = await fetch(url); if (!r.ok) throw new Error(url + " -> " + r.status); return r.json(); }

  /* ---------- vendor (KaTeX, mermaid) ---------- */
  var vendorReady = (async function () {
    var out = { katex: false, mermaid: false };
    loadCss(VENDOR + "katex/katex.min.css");
    out.katex = await loadScript(VENDOR + "katex/katex.min.js");
    out.mermaid = await loadScript(VENDOR + "mermaid/mermaid.min.js");
    if (out.mermaid && window.mermaid) {
      try { window.mermaid.initialize({ startOnLoad: false, theme: "dark",
        themeVariables: { fontFamily: "system-ui, sans-serif", background: "#0a0b0e" } }); }
      catch (e) { out.mermaid = false; }
    }
    return out;
  })();

  /* ---------- math ---------- */
  var MATH_SPLIT_RE = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?:\$(?!\s)[^$\n]+?(?<!\s)\$))/;
  var MATH_TEST_RE = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?:\$(?!\s)[^$\n]+?(?<!\s)\$)/;

  async function renderMath(root) {
    if (!root) return;
    var v = await vendorReady;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !MATH_TEST_RE.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode; if (!p) return NodeFilter.FILTER_REJECT;
        if (/^(SCRIPT|STYLE|CODE|PRE|TEXTAREA)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(MATH_SPLIT_RE);
      if (parts.length < 2) return;
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part) return;
        var isDoubleDollar = /^\$\$[\s\S]+\$\$$/.test(part);
        var isBracketBlock = /^\\\[[\s\S]+\\\]$/.test(part);
        var isParenInline = /^\\\([\s\S]+\\\)$/.test(part);
        var isSingleDollar = /^\$(?!\s)[^$\n]+(?<!\s)\$$/.test(part);

        var block = isDoubleDollar || isBracketBlock;
        var inline = isParenInline || isSingleDollar;

        if (!block && !inline) {
          frag.appendChild(document.createTextNode(part));
          return;
        }

        var tex = "";
        if (isDoubleDollar || isBracketBlock || isParenInline) {
          tex = part.slice(2, -2).trim();
        } else if (isSingleDollar) {
          tex = part.slice(1, -1).trim();
        }

        var span = document.createElement(block ? "div" : "span");
        if (block) span.className = "nk-math-block";
        if (v.katex && window.katex) {
          try {
            window.katex.render(tex, span, { displayMode: block, throwOnError: false });
          } catch (e) {
            span.textContent = part;
          }
        } else {
          span.className += " nk-math-raw";
          span.textContent = tex;
        }
        frag.appendChild(span);
      });
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------- mermaid ---------- */
  async function renderMermaid(root) {
    var v = await vendorReady;
    var blocks = root.querySelectorAll("pre.mermaid:not([data-nk-rendered])");
    if (!blocks.length) return;
    if (!v.mermaid || !window.mermaid) { blocks.forEach(function (b) { b.setAttribute("data-nk-rendered", "fallback"); }); return; }
    var i = 0;
    for (var b of blocks) {
      var code = b.textContent;
      try {
        var id = "nkm" + Date.now() + i++;
        var res = await window.mermaid.render(id, code);
        b.innerHTML = res.svg; b.setAttribute("data-nk-rendered", "1");
      } catch (e) { b.setAttribute("data-nk-rendered", "error"); }
    }
  }

  /* ---------- callouts / reveal ---------- */
  function hydrateReveal(root) {
    root.querySelectorAll("div[data-reveal]").forEach(function (el) {
      var title = el.getAttribute("data-reveal") || "Details";
      var d = h("details", { "data-reveal": "" }, [h("summary", { text: title })]);
      var body = h("div", { class: "reveal-body" });
      while (el.firstChild) body.appendChild(el.firstChild);
      d.appendChild(body);
      el.replaceWith(d);
    });
  }

  /* ---------- tabs ---------- */
  function hydrateTabs(root) {
    root.querySelectorAll("[data-tabs]").forEach(function (el) {
      var panels = Array.prototype.slice.call(el.querySelectorAll(":scope > [data-tab]"));
      if (!panels.length) return;
      var wrap = h("div", { class: "nk-tabs" });
      var bar = h("div", { class: "nk-tabbar", role: "tablist" });
      wrap.appendChild(bar);
      panels.forEach(function (p, i) {
        var label = p.getAttribute("data-tab") || ("Tab " + (i + 1));
        p.className = "nk-tabpanel"; p.setAttribute("role", "tabpanel"); p.hidden = i !== 0;
        var btn = h("button", { role: "tab", "aria-selected": i === 0 ? "true" : "false", text: label });
        btn.addEventListener("click", function () {
          panels.forEach(function (pp, j) { pp.hidden = j !== i; });
          bar.querySelectorAll("button").forEach(function (bb, j) { bb.setAttribute("aria-selected", j === i ? "true" : "false"); });
        });
        bar.appendChild(btn);
        wrap.appendChild(p);
      });
      el.replaceWith(wrap);
    });
  }

  /* ---------- steps ---------- */
  function hydrateSteps(root) {
    root.querySelectorAll("[data-steps]").forEach(function (el) {
      var steps = Array.prototype.slice.call(el.querySelectorAll(":scope > [data-step]"));
      if (!steps.length) return;
      var idx = 0;
      var box = h("div", { class: "nk-steps" });
      var label = h("span", {});
      var prev = h("button", { text: "← Prev" });
      var next = h("button", { text: "Next →" });
      var head = h("div", { class: "nk-steps-head" }, [label, h("span", {}, [prev, document.createTextNode(" "), next])]);
      var body = h("div", { class: "nk-steps-body" });
      box.appendChild(head); box.appendChild(body);
      function show() {
        body.innerHTML = ""; body.appendChild(steps[idx]);
        steps[idx].hidden = false;
        label.textContent = "Step " + (idx + 1) + " of " + steps.length + " — " + (steps[idx].getAttribute("data-step") || "");
        prev.disabled = idx === 0; next.disabled = idx === steps.length - 1;
      }
      prev.addEventListener("click", function () { if (idx > 0) { idx--; show(); } });
      next.addEventListener("click", function () { if (idx < steps.length - 1) { idx++; show(); } });
      el.replaceWith(box); show();
    });
  }

  /* ---------- quiz / mcq ---------- */
  function normQuestions(data, pool) {
    var arr = pool ? dig(data, pool) : (data.questions || data.items || data);
    if (!Array.isArray(arr)) arr = [];
    return arr.map(function (q) {
      return {
        stem: q.stem || q.front || q.q || "",
        options: q.options || q.choices || [],
        answer: typeof q.answer === "number" ? q.answer : (q.correct || 0),
        explanation: q.explanation || q.why || ""
      };
    });
  }
  function renderQuiz(mount, questions, opts) {
    opts = opts || {};
    questions = opts.shuffle === false ? questions : shuffle(questions);
    var answered = 0, correct = 0;
    var box = h("div", { class: "nk-quiz" });
    var score = h("span", { class: "nk-score", text: "0 / " + questions.length });
    box.appendChild(h("div", { class: "nk-quiz-head" }, [h("span", { text: opts.title || "Quick check" }), score]));
    questions.forEach(function (q, qi) {
      var qEl = h("div", { class: "nk-q" });
      qEl.appendChild(h("p", { class: "nk-q-stem", text: q.stem }));
      var explain = h("div", { class: "nk-explain", hidden: "", text: q.explanation });
      var locked = false;
      q.options.forEach(function (opt, oi) {
        var b = h("button", { class: "nk-opt", text: opt });
        b.addEventListener("click", function () {
          if (locked) return; locked = true; answered++;
          var right = oi === q.answer;
          if (right) { b.classList.add("is-correct"); correct++; }
          else { b.classList.add("is-wrong");
            var btns = qEl.querySelectorAll(".nk-opt"); if (btns[q.answer]) btns[q.answer].classList.add("is-correct"); }
          qEl.querySelectorAll(".nk-opt").forEach(function (x) { x.disabled = true; });
          if (q.explanation) explain.hidden = false;
          score.textContent = correct + " / " + questions.length + (answered === questions.length ? "  ✓ done" : "");
        });
        qEl.appendChild(b);
      });
      qEl.appendChild(explain);
      box.appendChild(qEl);
    });
    var reset = h("button", { class: "nk-btn ghost", text: "Reset" });
    reset.addEventListener("click", function () { renderQuiz(mount, questions, opts); });
    box.appendChild(h("div", { class: "nk-quiz-foot" }, [reset]));
    mount.innerHTML = ""; mount.appendChild(box);
    renderMath(box);
  }
  NK.quiz = renderQuiz;

  function hydrateQuizzes(root) {
    root.querySelectorAll("[data-mcq]").forEach(function (el) {
      var src = el.parentNode.querySelector("script[data-mcq-src]") || root.querySelector("script[data-mcq-src]");
      if (!src) return;
      var data;
      try { data = JSON.parse(src.textContent); } catch (e) { el.textContent = "MCQ JSON parse error."; return; }
      renderQuiz(el, normQuestions(data), { title: "Check your understanding" });
    });
    root.querySelectorAll("[data-quiz][data-quiz-src]").forEach(async function (el) {
      try {
        var data = await getJson(el.getAttribute("data-quiz-src"));
        renderQuiz(el, normQuestions(data, el.getAttribute("data-quiz-pool") || ""), { title: el.getAttribute("data-quiz-title") || "Quiz" });
      } catch (e) { el.textContent = "Could not load quiz: " + e.message; }
    });
  }

  /* ---------- flashcards ---------- */
  function renderFlashcards(mount, cards) {
    if (!cards.length) { mount.textContent = "No flashcards."; return; }
    var order = shuffle(cards), i = 0, showFront = true;
    var known = Object.create(null);
    var stage = h("div", { class: "nk-fc-stage" });
    var tag = h("span", { class: "nk-fc-tag" });
    var face = h("div", { class: "nk-fc-face" });
    var hint = h("span", { class: "nk-fc-hint", text: "click to flip" });
    stage.appendChild(tag); stage.appendChild(face); stage.appendChild(hint);
    var meterFill = h("i");
    var meter = h("div", { class: "nk-fc-meter" }, [meterFill]);
    var count = h("span", { class: "nk-fc-count" });
    var prev = h("button", { class: "nk-btn ghost", text: "←" });
    var known1 = h("button", { class: "nk-btn", text: "Know it ✓" });
    var again = h("button", { class: "nk-btn ghost", text: "Review" });
    var next = h("button", { class: "nk-btn ghost", text: "→" });
    var shuf = h("button", { class: "nk-btn ghost", text: "Shuffle" });
    var bar = h("div", { class: "nk-fc-bar" }, [prev, known1, again, next, meter, count, shuf]);
    function render() {
      var c = order[i];
      tag.textContent = (c.kind || "card") + "  ·  section " + (c.section || "?");
      face.textContent = showFront ? c.front : c.back;
      face.style.color = showFront ? "var(--ink)" : "var(--ink-dim)";
      var k = Object.keys(known).length;
      meterFill.style.width = Math.round((k / cards.length) * 100) + "%";
      count.textContent = k + " / " + cards.length + " known  ·  card " + (i + 1) + "/" + order.length;
      renderMath(face);
    }
    stage.addEventListener("click", function () { showFront = !showFront; render(); });
    function go(d) { i = (i + d + order.length) % order.length; showFront = true; render(); }
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    known1.addEventListener("click", function () { known[order[i].id || i] = 1; go(1); });
    again.addEventListener("click", function () { delete known[order[i].id || i]; go(1); });
    shuf.addEventListener("click", function () { order = shuffle(cards); i = 0; showFront = true; render(); });
    mount.innerHTML = ""; mount.appendChild(h("div", { class: "nk-fc" }, [stage, bar]));
    render();
  }
  NK.flashcards = renderFlashcards;
  function hydrateFlashcards(root) {
    root.querySelectorAll("[data-flashcards]").forEach(async function (el) {
      var src = el.getAttribute("data-flashcards-src"); if (!src) return;
      try { var data = await getJson(src); renderFlashcards(el, data.deck || data.cards || []); }
      catch (e) { el.textContent = "Could not load flashcards: " + e.message; }
    });
  }

  /* ---------- quickref / formulas ---------- */
  function hydrateQuickref(root) {
    root.querySelectorAll("[data-quickref-src]").forEach(async function (el) {
      try {
        var d = await getJson(el.getAttribute("data-quickref-src"));
        var box = h("div", { class: "nk-qr" });
        (d.sections || []).forEach(function (s) {
          box.appendChild(h("h3", { text: s.title }));
          box.appendChild(h("ul", {}, (s.points || []).map(function (p) { return h("li", { text: p }); })));
        });
        if ((d.keyTerms || []).length) {
          box.appendChild(h("h3", { text: "Key terms" }));
          var dl = h("dl", { class: "nk-kt" });
          d.keyTerms.forEach(function (t) {
            var termText = /^\s*(\\\(|\\\$|\$)/.test(t.term) ? t.term : t.term;
            dl.appendChild(h("dt", { text: termText }));
            dl.appendChild(h("dd", { text: t.definition }));
          });
          box.appendChild(dl);
        }
        el.replaceWith(box); renderMath(box);
      } catch (e) { el.textContent = "Could not load quick reference: " + e.message; }
    });
  }
  function hydrateFormulas(root) {
    root.querySelectorAll("[data-formulas-src]").forEach(async function (el) {
      try {
        var d = await getJson(el.getAttribute("data-formulas-src"));
        var box = h("div", {});
        if (!(d.formulas || []).length) box.appendChild(h("p", { class: "lede", text: "No formulas in this unit." }));
        (d.formulas || []).forEach(function (f) {
          var card = h("div", { class: "nk-formula" });
          card.appendChild(h("div", { class: "nk-formula-name", text: f.name }));
          card.appendChild(h("div", { class: "nk-math-block", text: "$$" + f.latex + "$$" }));
          if ((f.symbols || []).length) {
            var dl = h("dl", { class: "nk-kt" });
            f.symbols.forEach(function (s) {
              var symText = /^\s*(\\\(|\\\$|\$)/.test(s.sym) ? s.sym : ("\\(" + s.sym + "\\)");
              dl.appendChild(h("dt", { text: symText }));
              dl.appendChild(h("dd", { text: s.meaning }));
            });
            card.appendChild(dl);
          }
          if (f.useWhen) card.appendChild(h("div", { class: "nk-formula-when", text: "Use when: " + f.useWhen }));
          box.appendChild(card);
        });
        el.replaceWith(box); renderMath(box);
      } catch (e) { el.textContent = "Could not load formulas: " + e.message; }
    });
  }

  /* ---------- theory ---------- */
  function hydrateTheory(root) {
    root.querySelectorAll("[data-theory][data-theory-src]").forEach(async function (el) {
      try {
        var d = await getJson(el.getAttribute("data-theory-src"));
        var box = h("div", { class: "nk-theory" });
        (d.questions || []).forEach(function (q) {
          var qEl = h("div", { class: "nk-theory-q" });
          qEl.appendChild(h("p", { class: "nk-theory-prompt", text: q.prompt }));
          qEl.appendChild(h("p", { class: "nk-theory-meta", text: (q.marks || 4) + " marks  ·  section " + (q.section || "?") }));
          var det = h("details", { "data-reveal": "" }, [h("summary", { text: "Model answer & marking scheme" })]);
          var body = h("div", { class: "reveal-body" });
          body.appendChild(h("div", { html: mdLite(q.modelAnswer || "") }));
          if ((q.markingScheme || []).length)
            body.appendChild(h("ul", {}, q.markingScheme.map(function (m) { return h("li", { text: m }); })));
          det.appendChild(body); qEl.appendChild(det); box.appendChild(qEl);
        });
        el.replaceWith(box); renderMath(box);
      } catch (e) { el.textContent = "Could not load theory questions: " + e.message; }
    });
  }
  function mdLite(s) {
    if (!s) return "";
    var mathTokens = [];
    var protectedStr = String(s).replace(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?:\$(?!\s)[^$\n]+?(?<!\s)\$))/g, function (m) {
      var idx = mathTokens.length;
      mathTokens.push(m);
      return "%%NKMATH" + idx + "%%";
    });
    var html = esc(protectedStr)
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>");
    return html.replace(/%%NKMATH(\d+)%%/g, function (_, idx) {
      return mathTokens[Number(idx)] || "";
    });
  }

  /* ---------- charts (canvas, bar/line) ---------- */
  function drawChart(canvas, spec) {
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth || 600, H = canvas.clientHeight || 260;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var g = canvas.getContext("2d"); g.scale(dpr, dpr);
    var pad = { l: 42, r: 12, t: 12, b: 28 };
    var labels = spec.labels || [];
    var series = spec.series || [];
    var flat = series.reduce(function (a, s) { return a.concat(s.data || s); }, []);
    var max = Math.max.apply(null, flat.concat([1])), min = Math.min.apply(null, flat.concat([0]));
    function x(i) { return pad.l + (W - pad.l - pad.r) * (labels.length <= 1 ? 0.5 : i / (labels.length - 1)); }
    function y(v) { return H - pad.b - (H - pad.t - pad.b) * ((v - min) / (max - min || 1)); }
    g.strokeStyle = "#242833"; g.fillStyle = "#6b7280"; g.font = "11px system-ui"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(pad.l, pad.t); g.lineTo(pad.l, H - pad.b); g.lineTo(W - pad.r, H - pad.b); g.stroke();
    labels.forEach(function (lb, i) { g.fillText(String(lb), x(i) - 8, H - pad.b + 16); });
    var colors = ["#6cc4c0", "#7bbd8b", "#d9c48a", "#d98a8a"];
    series.forEach(function (s, si) {
      var data = s.data || s; g.strokeStyle = colors[si % 4]; g.fillStyle = colors[si % 4];
      if ((spec.type || "line") === "bar") {
        var bw = (W - pad.l - pad.r) / labels.length * 0.6 / series.length;
        data.forEach(function (v, i) {
          var bx = x(i) - bw * series.length / 2 + si * bw;
          g.fillRect(bx, y(v), bw, H - pad.b - y(v));
        });
      } else {
        g.beginPath();
        data.forEach(function (v, i) { i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); });
        g.lineWidth = 2; g.stroke();
      }
    });
  }
  NK.chart = drawChart;
  function hydrateCharts(root) {
    root.querySelectorAll("canvas[data-chart]").forEach(function (c) {
      try { drawChart(c, JSON.parse(c.getAttribute("data-chart"))); } catch (e) {}
    });
  }

  /* ---------- viz iframes (auto-fit height, zero scrollbars) ---------- */
  function hydrateVizIframes(root) {
    root.querySelectorAll("figure iframe.viz").forEach(function (ifr) {
      function adjustHeight() {
        try {
          var doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
          if (doc && doc.body) {
            var h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
            if (h > 50) {
              ifr.style.height = (h + 12) + "px";
            }
          }
        } catch (e) {}
      }
      ifr.addEventListener("load", function () {
        adjustHeight();
        try {
          var doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
          if (doc && doc.defaultView && doc.defaultView.ResizeObserver) {
            var ro = new doc.defaultView.ResizeObserver(adjustHeight);
            ro.observe(doc.body);
          }
        } catch (e) {}
      });
      adjustHeight();
    });
  }

  /* ---------- boot ---------- */
  async function hydrate(root) {
    root = root || document;
    hydrateReveal(root);
    hydrateTabs(root);
    hydrateSteps(root);
    hydrateQuizzes(root);
    hydrateFlashcards(root);
    hydrateQuickref(root);
    hydrateFormulas(root);
    hydrateTheory(root);
    hydrateCharts(root);
    hydrateVizIframes(root);
    await renderMath(root);
    await renderMermaid(root);
    document.documentElement.setAttribute("data-nk-ready", "1");
  }
  NK.hydrate = hydrate;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { hydrate(); });
  else hydrate();
})();
