import React from 'react';

function CodeforcesHeader({ handle }) {
  return (
    <div id="header">
      <div style={{ float: 'left', maxHeight: '60px' }}>
        <a href="https://codeforces.com/" className="logo-href">
          <img
            height="65"
            style={{ height: '65px' }}
            alt="Codeforces"
            title="Codeforces"
            src="https://codeforces.org/s/12684/images/codeforces-sponsored-by-ton.png"
          />
        </a>
      </div>
      <div className="lang-chooser">
        <div style={{ textAlign: 'right', marginBottom: '4px' }}>
          <a href="https://codeforces.com/notifications" style={{ textDecoration: 'none' }}>
            <img src="https://codeforces.org/s/12684/images/icons/bell.png" alt="Notifications" title="Notifications" style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          </a>
          <span style={{ margin: '0 4px', color: '#000', fontSize: '13px' }}>|</span>
          <a href="?locale=en"><img src="https://codeforces.org/s/12684/images/flags/24/gb.png" alt="In English" title="In English" style={{ verticalAlign: 'middle', margin: '0 2px' }} /></a>
          <a href="?locale=ru"><img src="https://codeforces.org/s/12684/images/flags/24/ru.png" alt="По-русски" title="По-русски" style={{ verticalAlign: 'middle', margin: '0 2px' }} /></a>
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px' }}>
          {handle ? (
            <>
              <a href={`https://codeforces.com/profile/${handle}`} className="rated-user user-violet">{handle}</a>
              <span style={{ margin: '0 4px', color: '#000' }}>|</span>
              <a href="https://codeforces.com/logout">Logout</a>
            </>
          ) : (
            <>
              <a href="https://codeforces.com/enter?back=%2F">Enter</a>
              {' | '}
              <a href="https://codeforces.com/register">Register</a>
            </>
          )}
        </div>
      </div>
      <br style={{ clear: 'both' }} />

      <div className="roundbox menu-box borderTopRound borderBottomRound">
        <div className="menu-list-container">
          <form method="post" action="https://codeforces.com/search">
            <input className="search" name="query" data-isPlaceholder="true" defaultValue="" placeholder="Search..." />
          </form>
          <ul className="menu-list main-menu-list">
            <li><a href="https://codeforces.com/">Home</a></li>
            <li><a href="https://codeforces.com/top">Top</a></li>
            <li><a href="https://codeforces.com/catalog">Catalog</a></li>
            <li><a href="https://codeforces.com/contests">Contests</a></li>
            <li><a href="#/">Virtuals</a></li>
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
    </div>
  );
}

export default CodeforcesHeader;
