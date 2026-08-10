import React from 'react';

function ErrorState({ error, onRetry }) {
  return (
    <div className="error-notice">
      <span>&#9888; Unable to fetch data: {error}</span>
      {onRetry && (
        <button className="cf-btn" onClick={onRetry} style={{ marginLeft: '10px' }}>
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;
