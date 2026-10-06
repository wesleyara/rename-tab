const BADGE_COLOR = '#6d5dfc';

chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });

// Injeta o content script nas abas que já estavam abertas antes da instalação/atualização.
chrome.runtime.onInstalled.addListener(async () => {
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*', 'file:///*'] });
  for (const tab of tabs) {
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files: ['src/shared.js', 'src/content.js'] })
      .catch(() => {});
  }
});

// Indicador no ícone: mostra quando a aba atual está renomeada.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'status' || sender.tab?.id == null) return;
  chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.active ? '•' : '' });
});
