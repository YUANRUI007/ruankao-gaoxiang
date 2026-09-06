/* ============================================================
   软考高项学习平台 · 前端交互 v3「高级质感」
   主题 / 导航 / 搜索 / 进度环 / 自测 / 导图控制
   v3 新增：滚动进度条 · 返回顶部 · 光斑追踪卡片 · Hero 3D 倾斜 + 视差
   所有导航数据均为"站点根相对路径"，经 window.ROOT_REL 解析前缀。
   ============================================================ */
(function () {
  "use strict";

  var LS_PROGRESS = "sx-progress-v1";
  var LS_THEME = "sx-theme";
  var LS_LAST = "sx-last-ch";

  document.documentElement.classList.add("js");

  /* ---------- 工具 ---------- */
  var ROOT = (typeof window.ROOT_REL === "string") ? window.ROOT_REL : "";
  if (ROOT === "/") ROOT = "";
  if (ROOT.length && ROOT.charAt(ROOT.length - 1) === "/") ROOT = ROOT.slice(0, -1);

  function u(href) { return href ? (ROOT ? ROOT + "/" : "") + href : href; }
  function $(s, el) { return (el || document).querySelector(s); }
  function $all(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function store(key, val) {
    try {
      if (val === undefined) {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* rAF 节流 */
  function rafThrottle(fn) {
    if (!window.requestAnimationFrame) return fn;
    var ticking = false;
    return function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; fn(); });
    };
  }

  /* ---------- 主题 ---------- */
  function initTheme() {
    var saved = store(LS_THEME);
    if (saved === "dark" || (!saved && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    var btn = $("#themeBtn");
    if (!btn) return;
    var sync = function () {
      btn.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀" : "🌙";
    };
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", cur);
      store(LS_THEME, cur);
      sync();
    });
    sync();
  }

  /* ---------- 滚动进度条 + 返回顶部 + Hero 视差 ---------- */
  function initScrollUX() {
    var bar = $("#scrollBar"), toTop = $("#toTop");
    var hero = $(".hero");

    var update = rafThrottle(function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var y = window.scrollY || doc.scrollTop;
      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
      if (toTop) toTop.classList.toggle("show", y > 560);
      if (hero && !reduceMotion && y < hero.offsetHeight) {
        var k = Math.min(y / Math.max(hero.offsetHeight, 1), 1);
        var left = $(".hero-left", hero), panel = $(".hero-panel", hero);
        if (left) left.style.transform = "translateY(" + (k * 34) + "px)";
        if (panel) panel.style.transform = "translateY(" + (k * 14) + "px)";
      }
    });
    window.addEventListener("scroll", update, { passive: true });
    update();

    if (toTop) {
      toTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      });
    }
  }

  /* ---------- 光斑追踪卡片 ---------- */
  function initSpotlight() {
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
    var targets = $all(".ch-card, .feat, .stage-card, .meta-card, .quiz-item");
    targets.forEach(function (el) { el.classList.add("spot"); });
    document.addEventListener("pointermove", function (e) {
      var el = e.target && e.target.closest ? e.target.closest(".spot") : null;
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  /* ---------- Hero 面板 3D 倾斜 ---------- */
  function initTilt() {
    if (reduceMotion || !window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
    var panel = $(".hero-panel");
    if (!panel) return;
    var MAX = 5;
    panel.addEventListener("pointermove", function (e) {
      var r = panel.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - .5;
      var py = (e.clientY - r.top) / r.height - .5;
      panel.style.transform = "perspective(900px) rotateX(" + (-py * MAX).toFixed(2) +
        "deg) rotateY(" + (px * MAX).toFixed(2) + "deg) translateZ(0)";
    });
    panel.addEventListener("pointerleave", function () {
      panel.style.transform = "";
    });
  }

  /* ---------- 学习进度 ---------- */
  function getProgress() { return store(LS_PROGRESS) || {}; }
  function doneCount(p, total) {
    var n = 0;
    for (var k in p) { if (p[k] && +k >= 1 && +k <= total) n++; }
    return n;
  }

  function renderProgress() {
    var total = (window.NAV_DATA && NAV_DATA.total) || 24;
    var p = getProgress();
    var cnt = doneCount(p, total);
    var pct = total ? Math.round(cnt / total * 100) : 0;

    var mp = $("#miniBar"), mt = $("#miniBarTxt");
    if (mp) mp.style.width = pct + "%";
    if (mt) mt.textContent = "已学 " + cnt + "/" + total + " 章";

    $all("[data-done-ch]").forEach(function (el) {
      el.style.display = p[el.getAttribute("data-done-ch")] ? "" : "none";
    });
    $all(".nav-link[data-ch]").forEach(function (el) {
      var ck = $(".done-ck", el);
      if (ck) ck.style.display = p[el.getAttribute("data-ch")] ? "" : "none";
    });
    var mb = $("#markBtn");
    if (mb && window.CH_NUM) {
      var done = !!p[window.CH_NUM];
      mb.classList.toggle("done", done);
      mb.innerHTML = done ? "✓ 已掌握（点击取消）" : "○ 标记本章已掌握";
    }
    var fg = $("#donutFg"), dc = $("#donutPct"), dt = $("#donutTxt");
    if (fg) {
      var C = 2 * Math.PI * 52;
      fg.style.strokeDasharray = C;
      animateNum(function (v) {
        fg.style.strokeDashoffset = C * (1 - v / 100);
        if (dc) dc.textContent = Math.round(v) + "%";
      }, pct, 1100);
    }
    if (dt) dt.innerHTML = "<b>" + cnt + "</b> / " + total + " 章已完成";
  }

  function animateNum(fn, target, dur) {
    if (!window.requestAnimationFrame || target === 0) { fn(target); return; }
    var t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - k, 3);
      fn(target * eased);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initMarkBtn() {
    var mb = $("#markBtn");
    if (!mb || !window.CH_NUM) return;
    mb.addEventListener("click", function () {
      var p = getProgress();
      setDone(window.CH_NUM, !p[window.CH_NUM]);
    });
  }
  function setDone(ch, val) {
    var p = getProgress();
    if (val) p[ch] = 1; else delete p[ch];
    store(LS_PROGRESS, p);
    renderProgress();
  }

  /* ---------- 继续学习 ---------- */
  function initContinueBtn() {
    var btn = $("#continueBtn");
    if (!btn) return;
    var last = store(LS_LAST);
    if (last && last.href && last.n >= 1 && last.n <= 24) {
      btn.href = u(last.href);
      btn.innerHTML = "<span class=\"lbl\">▶ 继续学习：第" + last.n + "章 · " + esc(last.t || "") + "</span>";
    } else {
      btn.innerHTML = "<span class=\"lbl\">▶ 从第6章 项目管理概论开始</span>";
    }
  }

  /* ---------- 滚动进场 ---------- */
  function initReveal() {
    var els = $all(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -26px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 侧边栏 ---------- */
  function initSidebar() {
    var menuBtn = $("#menuBtn"), sb = $("#sidebar"), scrim = $("#scrim");
    if (menuBtn && sb && scrim) {
      menuBtn.addEventListener("click", function () {
        sb.classList.toggle("open");
        scrim.classList.toggle("show");
      });
      scrim.addEventListener("click", function () {
        sb.classList.remove("open");
        scrim.classList.remove("show");
      });
    }
  }

  function buildNav() {
    var host = $("#navHost");
    if (!host || !window.NAV_DATA) return;
    var html = [];
    NAV_DATA.groups.forEach(function (g) {
      html.push('<div class="nav-group">');
      html.push('<div class="gt"><span class="dot" style="background:' + g.color + ';color:' + g.color + '"></span>' +
        esc(g.name) + '<span class="cnt">' + g.chapters.length + '章</span></div>');
      g.chapters.forEach(function (c) {
        var active = (window.CH_NUM === c.n) ? " active" : "";
        html.push('<a class="nav-link' + active + '" href="' + u(c.href) + '" data-ch="' + c.n + '">' +
          '<span class="no">' + (c.n < 10 ? "0" + c.n : c.n) + '</span><span>' + esc(c.title) + '</span>' +
          '<span class="done-ck" style="display:none">✔</span></a>');
      });
      html.push("</div>");
    });
    html.push('<div class="nav-sep"></div><div class="nav-group"><div class="gt">📌 专题</div>');
    NAV_DATA.topics.forEach(function (t) {
      var active = (window.PAGE_ID === t.id) ? " active" : "";
      html.push('<a class="nav-link' + active + '" href="' + u(t.href) + '"><span class="no">★</span><span>' + esc(t.title) + '</span></a>');
    });
    html.push("</div>");
    host.innerHTML = html.join("");
  }

  /* ---------- 搜索 ---------- */
  function initSearch() {
    var input = $("#searchInput"), pop = $("#searchPop");
    if (!input || !pop || !window.SEARCH_DATA) return;
    var timer = null;

    function doSearch() {
      var q = input.value.trim().toLowerCase();
      if (!q) { pop.classList.remove("show"); pop.innerHTML = ""; return; }
      var hits = [];
      var terms = q.split(/\s+/);
      SEARCH_DATA.forEach(function (it) {
        var hay = (it.title + " " + (it.kw || "")).toLowerCase();
        var score = 0;
        terms.forEach(function (t) {
          if (it.title.toLowerCase().indexOf(t) >= 0) score += 10;
          if (hay.indexOf(t) >= 0) score += 3;
        });
        if (score > 0) {
          var ti = it.title.toLowerCase().indexOf(terms[0]);
          var shown;
          if (ti >= 0 && terms[0]) {
            shown = esc(it.title.slice(0, ti)) + "<b>" +
              esc(it.title.slice(ti, ti + terms[0].length)) + "</b>" +
              esc(it.title.slice(ti + terms[0].length));
          } else shown = esc(it.title);
          hits.push({ s: score, html: '<a href="' + u(it.href) + '">' + shown +
            '<div class="hit">' + esc((it.sub || "").slice(0, 42)) + "</div></a>" });
        }
      });
      hits.sort(function (a, b) { return b.s - a.s; });
      pop.innerHTML = hits.length
        ? hits.slice(0, 12).map(function (h) { return h.html; }).join("")
        : '<div class="none">没有找到相关内容</div>';
      pop.classList.add("show");
    }
    input.addEventListener("input", function () {
      clearTimeout(timer); timer = setTimeout(doSearch, 120);
    });
    document.addEventListener("click", function (e) {
      if (!pop.contains(e.target) && e.target !== input) pop.classList.remove("show");
    });
    input.addEventListener("focus", function () { if (input.value.trim()) doSearch(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && e.target && !/^(input|textarea|select)$/i.test(e.target.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  /* ---------- 自测 ---------- */
  function initQuiz() {
    var host = $("#quizHost");
    if (!host || !window.QUIZ_DATA || !QUIZ_DATA.length) return;
    var html = ['<div class="quiz-scorebar"><span class="qz-t">📝 本章自测</span>'
      + '<span class="qz-dots" id="qzDots">' + QUIZ_DATA.map(function (_, i) {
        return '<span class="qz-dot" data-qi="' + i + '"></span>';
      }).join("") + '</span>'
      + '<span class="qz-stat">已答 <b id="qzDone">0</b> / ' + QUIZ_DATA.length
      + ' · 正确 <b id="qzRight">0</b></span></div>'];
    QUIZ_DATA.forEach(function (q, qi) {
      html.push('<div class="quiz-item" data-qi="' + qi + '"><div class="q-t"><span class="qn">' +
        (qi + 1) + "</span><span>" + esc(q.q) + "</span></div>");
      q.options.forEach(function (op, oi) {
        html.push('<div class="quiz-opt" data-oi="' + oi + '" role="button" tabindex="0"><span class="ol">' +
          "ABCD"[oi] + "</span><span>" + esc(op) + "</span></div>");
      });
      html.push('<div class="quiz-ex"><b>答案：' + "ABCD"[q.a] + "</b>　" + esc(q.ex) + "</div></div>");
    });
    host.innerHTML = html.join("");

    var qzDone = 0, qzRight = 0;
    $all(".quiz-item", host).forEach(function (item) {
      var qi = +item.getAttribute("data-qi");
      var q = QUIZ_DATA[qi];
      $all(".quiz-opt", item).forEach(function (opt) {
        function pick() {
          if (item.classList.contains("locked")) return;
          var oi = +opt.getAttribute("data-oi");
          item.classList.add("locked");
          $all(".quiz-opt", item).forEach(function (o2, j) {
            if (j === q.a) o2.classList.add("right");
            else if (j === oi) o2.classList.add("wrong");
            else o2.classList.add("dim");
          });
          var dot = document.querySelector('.qz-dot[data-qi="' + qi + '"]');
          if (dot) dot.classList.add(oi === q.a ? "right" : "wrong");
          qzDone++; if (oi === q.a) qzRight++;
          var elD = $("#qzDone"), elR = $("#qzRight");
          if (elD) elD.textContent = qzDone;
          if (elR) elR.textContent = qzRight;
        }
        opt.addEventListener("click", pick);
        opt.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
        });
      });
    });
  }

  /* ---------- 思维导图专业控制台（自建实例·完全控制） ---------- */
  function initMap() {
    var box = $(".map-box");
    if (!box) return;
    var holder = $(".markmap", box);
    var fb = $(".map-fallback", box);
    var hint = $(".map-toolbar .hint", box);
    var info = $("[data-mapinfo]", box);
    var tpl = holder ? holder.querySelector("script") : null;
    var mdSource = tpl ? tpl.textContent.trim() : "";
    var mapTitle = ((window.CH_NUM ? "第" + window.CH_NUM + "章思维导图"
      : (($(".ch-hero h1") && $(".ch-hero h1").textContent) || "思维导图")) + "")
      .replace(/[\\\/:*?"<>|]/g, "").trim();
    var mm = null;

    function showFallback() {
      if (fb) fb.style.display = "block";
      if (hint) {
        hint.innerHTML = "⚠ 思维导图组件需联网加载，当前已降级为文字版大纲（内容完全一致）";
        hint.style.color = "#b45309";
      }
    }

    function getMM() { return (mm && mm.svg && mm.zoom) ? mm : null; }
    function zoomBy(f) {
      var m = getMM();
      if (!m) return;
      try { m.svg.transition().duration(220).call(m.zoom.scaleBy, f); } catch (e) { /* noop */ }
    }
    function zoomReset() {
      var m = getMM();
      if (!m) return;
      try { m.svg.transition().duration(220).call(m.zoom.scaleTo, 1); } catch (e) { /* noop */ }
    }
    function fit() {
      var m = getMM();
      if (!m) return;
      try { m.fit(); } catch (e) { /* noop */ }
    }
    function setFold(level) {
      var m = getMM();
      if (!m || !m.state || !m.state.data) return false;
      try {
        var clone = JSON.parse(JSON.stringify(m.state.data, function (k, v) {
          return (k === "state" || k === "parent") ? undefined : v;
        }));
        (function walk(n, d) {
          if (!n) return;
          if (!n.payload) n.payload = {};
          var kids = n.children || [];
          n.payload.fold = (d >= level && kids.length) ? 1 : 0;
          kids.forEach(function (c) { walk(c, d + 1); });
        })(clone, 0);
        m.setData(clone);
        setTimeout(function () { try { m.fit(); } catch (e) { /* noop */ } }, 90);
        refreshInfo();
        return true;
      } catch (e) { return false; }
    }
    function countNodes() {
      var m = getMM();
      if (m && m.state && m.state.data) {
        var n = 0;
        (function walk(x) { if (!x) return; n++; (x.children || []).forEach(walk); })(m.state.data);
        return n;
      }
      return 0;
    }
    function refreshInfo() {
      if (info) info.textContent = countNodes() + " 节点";
    }

    function toggleFS() {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (box.requestFullscreen) box.requestFullscreen();
      } catch (e) { /* noop */ }
    }

    function downloadBlob(blob, name) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 900);
    }
    function svgMarkup() {
      var svg = box.querySelector("svg");
      if (!svg) return null;
      var clone = svg.cloneNode(true);
      var w = 0, h = 0;
      try {
        var b = svg.getBBox();
        w = Math.ceil(b.width) + 80;
        h = Math.ceil(b.height) + 80;
      } catch (e) {
        w = svg.clientWidth || 1200;
        h = svg.clientHeight || 800;
      }
      clone.setAttribute("width", w);
      clone.setAttribute("height", h);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      var st = document.createElementNS("http://www.w3.org/2000/svg", "style");
      st.textContent = "svg{background:" + (dark ? "#151823" : "#ffffff") + ";}" +
        ".markmap-foreign{font-family:'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;" +
        "font-size:14px;line-height:1.55;color:" + (dark ? "#c9d0e0" : "#1f2430") + ";}" +
        ".markmap-foreign div{white-space:pre-wrap;}";
      clone.insertBefore(st, clone.firstChild);
      return { markup: new XMLSerializer().serializeToString(clone), w: w, h: h };
    }
    function exportSVG() {
      var m = svgMarkup();
      if (!m) return;
      downloadBlob(new Blob([m.markup], { type: "image/svg+xml;charset=utf-8" }), mapTitle + ".svg");
    }
    function exportPNG() {
      var m = svgMarkup();
      if (!m) return;
      var blob = new Blob([m.markup], { type: "image/svg+xml;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement("canvas");
        var scale = 2;
        cv.width = m.w * scale;
        cv.height = m.h * scale;
        var ctx = cv.getContext("2d");
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        try {
          cv.toBlob(function (b) { if (b) downloadBlob(b, mapTitle + ".png"); }, "image/png");
        } catch (e) { /* noop */ }
      };
      img.onerror = function () { URL.revokeObjectURL(url); };
      img.src = url;
    }

    var acts = [
      ["[data-zoomin]", function () { zoomBy(1.25); }],
      ["[data-zoomout]", function () { zoomBy(0.8); }],
      ["[data-reset]", zoomReset],
      ["[data-fit]", fit],
      ["[data-expand]", function () { setFold(99); }],
      ["[data-fold]", function () { setFold(2); }],
      ["[data-fs]", toggleFS],
      ["[data-export-png]", exportPNG],
      ["[data-export-svg]", exportSVG]
    ];
    acts.forEach(function (pair) {
      var el = box.querySelector(pair[0]);
      if (el) el.addEventListener("click", pair[1]);
    });

    /* 快捷键：+ − 0 F（仅当导图在视口内且不在输入框） */
    document.addEventListener("keydown", function (e) {
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var r = box.getBoundingClientRect();
      if (r.top >= window.innerHeight || r.bottom <= 0) return;
      if (e.key === "+" || e.key === "=") zoomBy(1.25);
      else if (e.key === "-" || e.key === "_") zoomBy(0.8);
      else if (e.key === "0") fit();
      else if (e.key === "f" || e.key === "F") toggleFS();
    });

    /* 手动渲染管线：等 markmap 类库就绪后自建实例 */
    if (!mdSource) { showFallback(); return; }
    var svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.setAttribute("class", "markmap-svg");
    holder.appendChild(svgEl);

    var waited = 0;
    var timer = setInterval(function () {
      waited += 120;
      var ns = window.markmap;
      if (ns && ns.Markmap && ns.Transformer) {
        clearInterval(timer);
        try {
          var transformer = new ns.Transformer();
          var finish = function (result) {
            try {
              var opts = (result.frontmatter && result.frontmatter.markmap) || {};
              if (typeof ns.Markmap.create === "function") {
                mm = ns.Markmap.create(svgEl, opts, result.root);
              } else {
                mm = new ns.Markmap(svgEl, opts);
                mm.setData(result.root);
              }
              holder.mm = mm;
              setTimeout(function () { try { mm.fit(); } catch (e) { /* noop */ } }, 120);
              refreshInfo();
            } catch (err) { showFallback(); }
          };
          var res = transformer.transform(mdSource);
          if (res && typeof res.then === "function") {
            res.then(finish).catch(showFallback);
          } else {
            finish(res);
          }
        } catch (err) { showFallback(); }
      } else if (waited > 9000) {
        clearInterval(timer);
        showFallback();
      }
    }, 120);
  }

  /* ---------- 章节访问记录 ---------- */
  function trackLastChapter() {
    if (!window.CH_NUM) return;
    var link = null;
    if (window.NAV_DATA) {
      NAV_DATA.groups.some(function (g) {
        return g.chapters.some(function (c) {
          if (c.n === window.CH_NUM) { link = c; return true; }
          return false;
        });
      });
    }
    if (link) store(LS_LAST, { n: link.n, t: link.title, href: link.href });
  }

  /* ---------- 启动 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    buildNav();
    initSidebar();
    initSearch();
    initQuiz();
    initMarkBtn();
    initContinueBtn();
    trackLastChapter();
    renderProgress();
    initReveal();
    initMap();
    initScrollUX();
    initSpotlight();
    initTilt();
  });
})();
