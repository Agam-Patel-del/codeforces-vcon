import React, { useState, useEffect } from 'react';
import VirtualContests from './pages/VirtualContests.jsx';
import ContestDetailsPage from './pages/ContestDetailsPage.jsx';

function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderPage = () => {
    const hash = currentHash.replace(/^#\/?/, '');
    
    if (hash === '' || hash === '/') {
      return <VirtualContests />;
    }

    if (hash.startsWith('contest/')) {
      const parts = hash.split('/');
      if (parts.length >= 3) {
        const contestId = parts[1];
        const virtualStartTime = parseInt(parts[2], 10);
        return <ContestDetailsPage contestId={contestId} virtualStartTime={virtualStartTime} />;
      }
    }

    return <VirtualContests />;
  };

  return (
    <div id="body">
      {renderPage()}
    </div>
  );
}

export default App;
