/* 学习进度模型：本地存储、备份和云端同步共用同一套结构 */
(function () {
  'use strict';

  var VERSION = 2;

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function timeOf(v) {
    if (!v) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var t = Date.parse(v);
    return isFinite(t) ? t : 0;
  }

  /* 兼容旧格式：
     mastered: ['mod::0', ...] 或 { key: {done, at} }
     answers:  { key: 'html' } 或 { key: {html, updatedAt} } */
  function normalize(p) {
    p = p && typeof p === 'object' ? p : {};

    var mastered = {};
    var rawM = p.mastered;
    if (Array.isArray(rawM)) {
      rawM.forEach(function (k) {
        if (typeof k === 'string') mastered[k] = { done: true, at: 0 };
      });
    } else if (rawM && typeof rawM === 'object') {
      Object.keys(rawM).forEach(function (k) {
        var v = rawM[k];
        if (typeof v === 'boolean') mastered[k] = { done: v, at: 0 };
        else if (v && typeof v === 'object') mastered[k] = { done: !!v.done, at: num(v.at) };
      });
    }

    var answers = {};
    var rawA = p.answers;
    if (rawA && typeof rawA === 'object' && !Array.isArray(rawA)) {
      Object.keys(rawA).forEach(function (k) {
        var v = rawA[k];
        if (typeof v === 'string') answers[k] = { html: v, updatedAt: null };
        else if (v && typeof v === 'object' && typeof v.html === 'string') {
          answers[k] = { html: v.html, updatedAt: v.updatedAt || null };
        }
      });
    }

    var theme = p.theme;
    if (theme && typeof theme === 'object') theme = theme.value;

    return {
      version: VERSION,
      updatedAt: p.updatedAt || new Date().toISOString(),
      masteredResetAt: num(p.masteredResetAt),
      mastered: mastered,
      answersResetAt: num(p.answersResetAt),
      answers: answers,
      quizBest: num(p.quizBest),
      theme: theme === 'dark' ? 'dark' : (theme === 'light' ? 'light' : ''),
      themeUpdatedAt: num(p.themeUpdatedAt)
    };
  }

  function pickMark(a, b) {
    if (!a) return b;
    if (!b) return a;
    return num(b.at) > num(a.at) ? b : a;
  }

  function pickAnswer(a, b) {
    if (!a) return b;
    if (!b) return a;
    return timeOf(b.updatedAt) > timeOf(a.updatedAt) ? b : a;
  }

  /* 合并两份进度：
     - 已掌握：按每条的时间戳取较新；resetAt 之后的新标记保留
     - 答案：按 updatedAt 取较新；空 html 作为删除标记保留
     - 测验最高分取 max，主题取较新 */
  function merge(a, b) {
    a = normalize(a);
    b = normalize(b);

    var out = {
      version: VERSION,
      updatedAt: new Date().toISOString(),
      masteredResetAt: Math.max(a.masteredResetAt, b.masteredResetAt),
      mastered: {},
      answersResetAt: Math.max(a.answersResetAt, b.answersResetAt),
      answers: {},
      quizBest: Math.max(a.quizBest, b.quizBest),
      theme: a.theme,
      themeUpdatedAt: a.themeUpdatedAt
    };

    var keys = {};
    Object.keys(a.mastered).forEach(function (k) { keys[k] = 1; });
    Object.keys(b.mastered).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      var m = pickMark(a.mastered[k], b.mastered[k]);
      if (!m) return;
      if (num(m.at) < out.masteredResetAt) return;
      out.mastered[k] = { done: !!m.done, at: num(m.at) };
    });

    keys = {};
    Object.keys(a.answers).forEach(function (k) { keys[k] = 1; });
    Object.keys(b.answers).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      var v = pickAnswer(a.answers[k], b.answers[k]);
      if (!v) return;
      if (timeOf(v.updatedAt) < out.answersResetAt) return;
      out.answers[k] = { html: v.html, updatedAt: v.updatedAt || null };
    });

    if (b.themeUpdatedAt > a.themeUpdatedAt) {
      out.theme = b.theme;
      out.themeUpdatedAt = b.themeUpdatedAt;
    }

    return out;
  }

  function setOf(p) {
    p = normalize(p);
    var s = new Set();
    Object.keys(p.mastered).forEach(function (k) {
      if (p.mastered[k].done) s.add(k);
    });
    return s;
  }

  function fingerprint(p) {
    p = normalize(p);
    var m = Object.keys(p.mastered).sort().map(function (k) {
      return k + '=' + (p.mastered[k].done ? 1 : 0) + '@' + num(p.mastered[k].at);
    }).join('|');
    var a = Object.keys(p.answers).sort().map(function (k) {
      var v = p.answers[k];
      return k + '=' + (v.html || '') + '@' + (v.updatedAt || '');
    }).join('|');
    return [p.masteredResetAt, m, p.answersResetAt, a, p.quizBest, p.theme, p.themeUpdatedAt].join('||');
  }

  window.Progress = {
    VERSION: VERSION,
    normalize: normalize,
    merge: merge,
    setOf: setOf,
    fingerprint: fingerprint,
    timeOf: timeOf
  };
})();
