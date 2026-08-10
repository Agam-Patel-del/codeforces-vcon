import React from 'react';

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const startPage = Math.max(1, currentPage - 3);
  const endPage = Math.min(totalPages, currentPage + 3);

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push('...');
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="pagination">
      <ul>
        <li className={`arrow a ${currentPage === 1 ? 'inactive' : ''}`}>
          {currentPage === 1 ? (
            <span>&#9664;</span>
          ) : (
            <a href="#/" onClick={(e) => { e.preventDefault(); onPageChange(currentPage - 1); }}>&#9664;</a>
          )}
        </li>
        {pages.map((p, idx) => (
          <React.Fragment key={idx}>
            {p === '...' ? (
              <li><span className="page-index" style={{ border: 'none', background: 'transparent', color: '#888' }}>...</span></li>
            ) : (
              <li className={`page-index ${currentPage === p ? 'active' : ''}`}>
                {currentPage === p ? (
                  <span>{p}</span>
                ) : (
                  <a href="#/" onClick={(e) => { e.preventDefault(); onPageChange(p); }}>{p}</a>
                )}
              </li>
            )}
          </React.Fragment>
        ))}
        <li className={`arrow ${currentPage === totalPages ? 'inactive' : ''}`}>
          {currentPage === totalPages ? (
            <span>&#9654;</span>
          ) : (
            <a href="#/" onClick={(e) => { e.preventDefault(); onPageChange(currentPage + 1); }}>&#9654;</a>
          )}
        </li>
        <li className="page-count">{currentPage} / {totalPages}</li>
      </ul>
    </div>
  );
}

export default Pagination;
