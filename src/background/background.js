chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HANDLE_DETECTED') {
    const authHandle = message.handle || null;
    const authClass = message.userClass || null;
    chrome.storage.local.set({ cf_auth_handle: authHandle, cf_auth_class: authClass }, () => {
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
