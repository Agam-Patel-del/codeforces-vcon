chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HANDLE_DETECTED') {
    chrome.storage.local.set({ cf_handle: message.handle }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        sendResponse({ success: true });
      }
    });
    return true; // Keep channel open for async response
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Codeforces Virtual Contests extension installed');
});
