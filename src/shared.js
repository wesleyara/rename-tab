/*
 * Lógica compartilhada entre content script e popup.
 *
 * Uma regra casa com "host + caminho + query" da URL:
 *   - "localhost:3333"        → qualquer rota do domínio (regra geral)
 *   - "localhost:3333/teste"  → /teste e, se `exact` for falso, /teste/qualquer-coisa
 *   - "*" funciona como curinga ("*.meusite.com", "localhost:3333/users/*")
 * Quando várias regras casam, vence a mais específica (padrão mais longo).
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'rules';

  function normalizePattern(input) {
    const p = String(input ?? '')
      .trim()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .replace(/#.*$/, '')
      .replace(/\/+$/, '');
    const cut = p.search(/[/?]/);
    if (cut === -1) return p.toLowerCase();
    return p.slice(0, cut).toLowerCase() + p.slice(cut);
  }

  function urlTarget(url) {
    try {
      const u = new URL(url);
      if (!/^(https?|file):$/.test(u.protocol)) return null;
      return u.host + u.pathname + u.search;
    } catch {
      return null;
    }
  }

  const escapeRe = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

  function toRegExp(pattern, exact) {
    const body = normalizePattern(pattern).split('*').map(escapeRe).join('.*');
    const tail = exact ? '\\/?(?:\\?.*)?$' : '(?:[/?].*)?$';
    return new RegExp('^' + body + tail, 'i');
  }

  function isUsable(rule) {
    return !!rule && rule.enabled !== false && !!normalizePattern(rule.pattern) && !!String(rule.title || '').trim();
  }

  function specificity(rule) {
    return normalizePattern(rule.pattern).replace(/\*/g, '').length * 2 + (rule.exact ? 1 : 0);
  }

  function matches(rule, url) {
    const target = urlTarget(url);
    if (!target || !normalizePattern(rule.pattern)) return false;
    try {
      return toRegExp(rule.pattern, !!rule.exact).test(target);
    } catch {
      return false;
    }
  }

  function findRule(rules, url) {
    let best = null;
    let bestScore = -1;
    for (const rule of rules || []) {
      if (!isUsable(rule) || !matches(rule, url)) continue;
      const score = specificity(rule);
      if (score > bestScore) {
        best = rule;
        bestScore = score;
      }
    }
    return best;
  }

  function renderTitle(template, original) {
    const out = String(template ?? '').replace(/\{title\}/gi, original || '').trim();
    return out || original || '';
  }

  function isGeneral(pattern) {
    return !normalizePattern(pattern).includes('/');
  }

  function ruleKey(rule) {
    return normalizePattern(rule.pattern).toLowerCase() + '|' + (rule.exact ? 1 : 0);
  }

  global.RenameTab = {
    STORAGE_KEY,
    normalizePattern,
    urlTarget,
    matches,
    findRule,
    renderTitle,
    isGeneral,
    ruleKey,
  };
})(globalThis);
