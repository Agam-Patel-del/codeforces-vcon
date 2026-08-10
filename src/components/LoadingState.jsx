import React from 'react';

function LoadingState({ message, current, total }) {
  const text = message || 'Loading virtual contests...';
  const progressText = (current !== undefined && total !== undefined)
    ? ` (${current} / ${total})`
    : '';

  return (
    <div className="notice">
      {text}{progressText}
    </div>
  );
}

export default LoadingState;
