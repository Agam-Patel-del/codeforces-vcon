chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HANDLE_DETECTED') {
    const authHandle = message.handle || null;
    chrome.storage.local.set({ cf_auth_handle: authHandle }, () => {
      chrome.storage.local.get(['cf_handle'], (result) => {
        if (!result.cf_handle && authHandle) {
          chrome.storage.local.set({ cf_handle: authHandle });
        }
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Codeforces Virtual Contests extension installed');
});
