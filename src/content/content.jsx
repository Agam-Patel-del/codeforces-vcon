(function() {
  'use strict';
  
  const VIRTUAL_CONTESTS_ID = 'cf-virtual-contests-nav';
  
  function getExtensionPageUrl() {
    return chrome.runtime.getURL('virtual-contests.html');
  }
  
  function detectHandle() {
    try {
      const langChooser = document.querySelector('.lang-chooser');
      if (langChooser) {
        const hasLogout = !!langChooser.querySelector('a[href*="logout"], a[href*="Logout"]');
        if (hasLogout) {
          const profileLink = langChooser.querySelector('a[href^="/profile/"]');
          if (profileLink) {
            const handle = profileLink.textContent.trim();
            if (handle && handle !== 'Register' && handle !== 'Enter' && handle !== 'Login') {
              return handle;
            }
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
  
  function sendHandleToBackground(handle) {
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'HANDLE_DETECTED', handle: handle }).catch(() => {
        // Ignore connection errors if background is not listening
      });
    }
  }
  
  function init() {
    insertNavItem();
    const handle = detectHandle();
    sendHandleToBackground(handle);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  const observer = new MutationObserver(() => {
    if (!document.getElementById(VIRTUAL_CONTESTS_ID)) {
      insertNavItem();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
