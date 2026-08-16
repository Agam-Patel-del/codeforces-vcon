import React, { useState, useEffect } from 'react';

function HandleInput({ handle, onLoad, loading }) {
  const [inputValue, setInputValue] = useState(handle || '');

  useEffect(() => {
    setInputValue(handle || '');
  }, [handle]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onLoad(inputValue.trim());
    }
  };

  return (
    <div className="roundbox borderTopRound borderBottomRound">
      <div className="caption titled">
        &rarr; Contests History
        <div className="top-links"></div>
      </div>
      <div className="roundbox-content">
        <form onSubmit={handleSubmit}>
          <div className="setting-name">
            <label htmlFor="handle-input">Codeforces Handle:</label>
          </div>
          <div className="setting-value">
            <input
              id="handle-input"
              type="text"
              className="cf-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter handle..."
              disabled={loading}
              style={{ maxWidth: '17em' }}
            />
          </div>
          <div className="setting-value" style={{ padding: '0.5em 0.5em 0 0.5em' }}>
            <button type="submit" className="cf-btn" disabled={loading}>
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HandleInput;
