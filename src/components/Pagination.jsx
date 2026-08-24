import React from 'react';

function getPageList(currentPage, totalPages) {
  if (totalPages <= 6) {
    const list = [];
    for (let i = 1; i <= totalPages; i++) list.push(i);
    return list;
  }

  const set = new Set();
  set.add(1);
  set.add(2);
  set.add(totalPages - 1);
  set.add(totalPages);

  set.add(currentPage);
  if (currentPage > 1) set.add(currentPage - 1);
  if (currentPage < totalPages) set.add(currentPage + 1);
  if (currentPage === 1 || currentPage === 2) set.add(3);
  if (currentPage === totalPages || currentPage === totalPages - 1) set.add(totalPages - 2);

  const sorted = Array.from(set).filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] > sorted[i - 1] + 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }
  return result;
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = getPageList(currentPage, totalPages);

  return (
    <div className="pagination">
      <ul>
        <li className={`arrow ${currentPage === 1 ? 'inactive' : ''}`}>
          {currentPage === 1 ? (
            <span>&larr;</span>
          ) : (
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                onPageChange(currentPage - 1);
              }}
              title="Previous Page"
            >
              &larr;
            </a>
          )}
        </li>
        {pages.map((p, idx) => (
          <React.Fragment key={idx}>
            {p === '...' ? (
              <li className="page-ellipsis">...</li>
            ) : (
              <li className={`page-index ${currentPage === p ? 'active' : ''}`}>
                {currentPage === p ? (
                  <span>{p}</span>
                ) : (
                  <a
                    href="#/"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(p);
                    }}
                  >
                    {p}
                  </a>
                )}
              </li>
            )}
          </React.Fragment>
        ))}
        <li className={`arrow ${currentPage === totalPages ? 'inactive' : ''}`}>
          {currentPage === totalPages ? (
            <span>&rarr;</span>
          ) : (
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                onPageChange(currentPage + 1);
              }}
              title="Next Page"
            >
              &rarr;
            </a>
          )}
        </li>
      </ul>
    </div>
  );
}

export default Pagination;
