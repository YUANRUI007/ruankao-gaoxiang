/* ============================================================
   软考高项学习平台 · 前端交互 v2.1
   主题 / 导航 / 搜索 / 学习进度(donut+继续学习) / 自测 / 思维导图控制
   所有导航数据中的路径均为"站点根相对路径"（如 chapters/ch01.html），
   通过 window.ROOT_REL 前缀解析，保证从任何目录的页面打开都正确。
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
  if (ROOT.length && ROOT.charAt(ROOT.length - 1) === "/") {
    ROOT = ROOT.slice(0, -1); /* "./" -> ""，"/" -> "" */
  }

  /* 把站点根相对路径解析为当前页面可用的相对路径 */
  function u(href) {
    if (!href) return href;
    return (ROOT ? ROOT + "/" : "") + href;
  }

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
      }, pct, 950);
    }
    if (dt) dt.innerHTML = "<b>" + cnt + "</b> / " + total + " 章已完成";
    var hp = $("#homePct"), hpt = $("#homePctTxt");
    if (hp) hp.textContent = pct + "%";
    if (hpt) hpt.textContent = "已掌握 " + cnt + " / " + total + " 章";
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

  /* ---------- 继续学习（记住最后浏览章节） ---------- */
  function initContinueBtn() {
    var btn = $("#continueBtn");
    if (!btn) return;
    var last = store(LS_LAST);
    if (last && last.href && last.n >= 1 && last.n <= 24) {
      btn.href = u(last.href);
      btn.innerHTML = "<span class=\"lbl\">▶ 继续学习：第" + last.n + "章 · " + esc(last.t || "") + "</span>";
    } else {
      btn.innerHTML = "▶ <span class=\"lbl\">从第6章 项目管理概论开始</span>";
    }
  }

  /* ---------- 滚动进场 ---------- */
  function initReveal() {
    var els = $all(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
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
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
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
  }

  /* ---------- 自测 ---------- */
  function initQuiz() {
    var host = $("#quizHost");
    if (!host || !window.QUIZ_DATA || !QUIZ_DATA.length) return;
    var html = [];
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
        }
        opt.addEventListener("click", pick);
        opt.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
        });
      });
    });
  }

  /* ---------- 思维导图控制（滚轮模拟缩放，不依赖内部 API） ---------- */
  function initMap() {
    var box = $(".map-box");
    if (!box) return;
    var fb = $(".map-fallback", box);
    var hint = $(".map-toolbar .hint", box);

    function fakeWheel(dy) {
      var svg = $("svg", box);
      if (!svg || dy === 0) return;
      var r = svg.getBoundingClientRect();
      svg.dispatchEvent(new WheelEvent("wheel", {
        bubbles: true, cancelable: true, deltaY: dy,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
      }));
    }
    var zi = $("[data-zoomin]", box), zo = $("[data-zoomout]", box), fit = $("[data-fit]", box);
    if (zi) zi.addEventListener("click", function () { fakeWheel(-330); });
    if (zo) zo.addEventListener("click", function () { fakeWheel(330); });
    if (fit) fit.addEventListener("click", function () {
      var holder = $(".markmap", box);
      try {
        if (holder && holder.markmap && typeof holder.markmap.fit === "function") holder.markmap.fit();
      } catch (e) { /* 忽略 */ }
    });

    setTimeout(function () {
      var ok = !!$("svg", box);
      if (fb) fb.style.display = ok ? "none" : "block";
      if (!ok && hint) {
        hint.innerHTML = "⚠ 思维导图组件需联网加载，当前已降级为文字版大纲（内容完全一致）";
        hint.style.color = "#b45309";
      }
    }, 4000);
  }

  /* ---------- 章节访问记录（供首页"继续学习"） ---------- */
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
  });
})();
