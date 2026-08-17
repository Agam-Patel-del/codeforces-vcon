import React, { useState, useEffect } from 'react';
import { getAuthHandle, setAuthHandle as saveAuthHandle } from '../services/storageService.js';

function CodeforcesHeader({ handle }) {
  const [authHandle, setAuthHandle] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // Load authentic user handle detected by content script
    getAuthHandle().then(cached => {
      if (isMounted) {
        setAuthHandle(cached || null);
      }
    });

    const listener = (changes, areaName) => {
      if (areaName === 'local' && changes.cf_auth_handle) {
        setAuthHandle(changes.cf_auth_handle.newValue || null);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(listener);
      return () => {
        isMounted = false;
        chrome.storage.onChanged.removeListener(listener);
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogoutClick = async () => {
    await saveAuthHandle(null);
    setAuthHandle(null);
  };

  return (
    <>
      <div id="header" style={{ position: 'relative' }}>
        <div style={{ float: 'left', maxHeight: '60px' }}>
          <a href="https://codeforces.com/" className="logo-href">
            <img
              height="65"
              style={{ height: '65px' }}
              alt="Codeforces"
              title="Codeforces"
              src="https://codeforces.org/s/11564/images/codeforces-sponsored-by-ton.png"
            />
          </a>
        </div>
        <div className="lang-chooser">
          <div style={{ textAlign: 'right' }}>
            <a href="https://codeforces.com/notifications" title="Notifications">
              <img
                src="https://codeforces.org/s/0/images/icons/bell.png"
                title="Notifications"
                alt="Notifications"
              />
            </a>
            {' | '}
            <a href="https://codeforces.com/?locale=en">
              <img
                src="https://codeforces.org/s/0/images/flags/24/gb.png"
                title="In English"
                alt="In English"
              />
            </a>
            <a href="https://codeforces.com/?locale=ru">
              <img
                src="https://codeforces.org/s/0/images/flags/24/ru.png"
                title="По-русски"
                alt="По-русски"
              />
            </a>
          </div>
          <div>
            {authHandle ? (
              <>
                <a
                  href={`https://codeforces.com/profile/${authHandle}`}
                  className="rated-user user-violet"
                  style={{ fontWeight: 'normal', textDecoration: 'underline' }}
                >
                  {authHandle}
                </a>
                {' | '}
                <a
                  href="https://codeforces.com/logout"
                  onClick={handleLogoutClick}
                  style={{ textDecoration: 'underline' }}
                >
                  Logout
                </a>
              </>
            ) : (
              <>
                <a href="https://codeforces.com/enter?back=%2F" style={{ textDecoration: 'underline' }}>Enter</a>
                {' | '}
                <a href="https://codeforces.com/register" style={{ textDecoration: 'underline' }}>Register</a>
              </>
            )}
          </div>
        </div>
        <br style={{ clear: 'both' }} />
      </div>

      <div className="roundbox menu-box borderTopRound borderBottomRound">
        <div className="menu-list-container">
          <ul className="menu-list main-menu-list">
            <li><a href="https://codeforces.com/">Home</a></li>
            <li><a href="https://codeforces.com/top">Top</a></li>
            <li><a href="https://codeforces.com/catalog">Catalog</a></li>
            <li><a href="https://codeforces.com/contests">Contests</a></li>
            <li className={window.location.hash === '' || window.location.hash === '/' ? 'current' : ''}><a href="#/">Virtuals</a></li>
            <li><a href="https://codeforces.com/gyms">Gym</a></li>
            <li><a href="https://codeforces.com/problemset">Problemset</a></li>
            <li><a href="https://codeforces.com/groups">Groups</a></li>
            <li><a href="https://codeforces.com/ratings">Rating</a></li>
            <li><a href="https://codeforces.com/edu/courses"><span className="edu-menu-item">Edu</span></a></li>
            <li><a href="https://codeforces.com/apiHelp">API</a></li>
            <li><a href="https://codeforces.com/calendar">Calendar</a></li>
            <li><a href="https://codeforces.com/help">Help</a></li>
          </ul>
          <br style={{ clear: 'both' }} />
        </div>
      </div>
    </>
  );
}

export default CodeforcesHeader;
