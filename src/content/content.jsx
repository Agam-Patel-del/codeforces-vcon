(function() {
  'use strict';
  
  const VIRTUAL_CONTESTS_ID = 'cf-virtual-contests-nav';
  
  function getExtensionPageUrl() {
    return chrome.runtime.getURL('virtual-contests.html');
  }
  
  function detectHandle() {
    try {
      const headerOrLang = document.querySelector('.lang-chooser') || document.querySelector('#header');
      if (headerOrLang) {
        const logoutLink = document.querySelector('.lang-chooser a[href*="logout"], #header a[href*="logout"], a[href*="logout"]');
        if (logoutLink) {
          const profileLink = document.querySelector('.lang-chooser a[href*="/profile/"], #header a[href*="/profile/"]');
          if (profileLink) {
            let handle = null;
            const href = profileLink.getAttribute('href') || '';
            const match = href.match(/\/profile\/([^\/\?#]+)/);
            if (match) {
              handle = match[1].trim();
            } else {
              handle = profileLink.textContent.trim();
            }
            if (handle && !['register', 'enter', 'login'].includes(handle.toLowerCase())) {
              return {
                handle: handle,
                userClass: profileLink.className || ''
              };
            }
          }
        } else {
          const enterLink = document.querySelector('.lang-chooser a[href*="enter"], #header a[href*="enter"], .lang-chooser a[href*="register"]');
          if (enterLink) {
            return {
              handle: null,
              userClass: null
            };
          }
        }
      }
    } catch (e) {
      console.error('Error detecting Codeforces handle:', e);
    }
    return null;
  }
  
  function insertNavItem() {
    try {
      if (document.getElementById(VIRTUAL_CONTESTS_ID)) return;
      
      const contestsLink = document.querySelector('#header a[href="/contests"], .menu-list-container a[href="/contests"], .main-menu-list a[href="/contests"]');
      
      if (!contestsLink) return;
      
      const parentLi = contestsLink.closest('li');
      if (!parentLi) return;
      
      const newLi = document.createElement('li');
      newLi.id = VIRTUAL_CONTESTS_ID;
      
      const newA = document.createElement('a');
      newA.href = getExtensionPageUrl();
      newA.textContent = 'Virtuals';
      newA.target = '_blank';
      
      // Copy base classes while ensuring active states (like 'current') are not inherited
      newA.className = contestsLink.className ? contestsLink.className.replace(/\bcurrent\b/g, '').trim() : '';
      newLi.className = parentLi.className ? parentLi.className.replace(/\bcurrent\b/g, '').trim() : '';
      
      newLi.appendChild(newA);
      parentLi.parentNode.insertBefore(newLi, parentLi.nextSibling);
    } catch (e) {
      console.error('Error inserting Virtual Contests nav item:', e);
    }
  }
  
  function sendAuthToBackground(handle, userClass) {
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ 
        type: 'HANDLE_DETECTED', 
        handle: handle, 
        userClass: userClass 
      }).catch(() => {
        // Ignore connection errors if background is not listening
      });
    }
  }
  
  let lastSyncedHandle = undefined;
  function syncAuth() {
    const auth = detectHandle();
    if (auth !== null) {
      const handle = auth.handle;
      const userClass = auth.userClass;
      if (handle !== lastSyncedHandle) {
        lastSyncedHandle = handle;
        sendAuthToBackground(handle, userClass);
      }
    }
  }

  function init() {
    insertNavItem();
    syncAuth();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', syncAuth);
  window.addEventListener('pageshow', syncAuth);
  
  const observer = new MutationObserver(() => {
    if (!document.getElementById(VIRTUAL_CONTESTS_ID)) {
      insertNavItem();
    }
    syncAuth();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
