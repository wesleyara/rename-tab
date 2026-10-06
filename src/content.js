(() => {
  'use strict';

  // Evita instâncias duplicadas (ex.: injeção após instalar/atualizar a extensão).
  const prev = window.__renameTab;
  if (prev && prev.alive()) return;
  window.__renameTab = { alive: () => !!chrome.runtime?.id };

  const RT = globalThis.RenameTab;
  const KEY = RT.STORAGE_KEY;

  let rules = [];
  let applied = null; // título que a extensão definiu (null = nenhum)
  let original = document.title; // título que a própria página quer
  let seenTitle = document.title;
  let href = location.href;
  let lastStatus = null;

  function reportStatus(active) {
    if (active === lastStatus) return;
    lastStatus = active;
    chrome.runtime.sendMessage({ type: 'status', active }).catch(() => {});
  }

  function apply() {
    const rule = RT.findRule(rules, location.href);
    if (rule) {
      applied = RT.renderTitle(rule.title, original);
      if (document.title !== applied) document.title = applied;
    } else if (applied !== null) {
      applied = null;
      if (document.title !== original) document.title = original;
    }
    seenTitle = document.title;
    reportStatus(!!rule);
  }

  function check() {
    // Contexto antigo após recarregar a extensão: desliga tudo.
    if (!chrome.runtime?.id) {
      observer.disconnect();
      clearInterval(timer);
      return;
    }
    const title = document.title;
    const urlChanged = location.href !== href;
    if (title === seenTitle && !urlChanged) return;
    href = location.href;
    if (title !== applied) original = title;
    apply();
  }

  const observer = new MutationObserver(check);
  observer.observe(document.head || document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // SPAs podem trocar de rota sem mexer no <head>.
  const timer = setInterval(check, 800);
  addEventListener('popstate', check);
  addEventListener('hashchange', check);

  chrome.storage.local.get(KEY).then((data) => {
    rules = data[KEY] || [];
    apply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[KEY]) return;
    rules = changes[KEY].newValue || [];
    apply();
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'getInfo') sendResponse({ original, applied });
  });
})();
