const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(timestamp) {
  if (!timestamp || timestamp <= 0) return '-';
  const date = new Date(timestamp * 1000);
  const d = date.getDate();
  const m = MONTHS[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

function formatDateTime(timestamp) {
  if (!timestamp || timestamp <= 0) return '-';
  const date = new Date(timestamp * 1000);
  const d = date.getDate();
  const m = MONTHS[date.getMonth()];
  const y = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${d} ${m} ${y}, ${hours}:${minutes}`;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes}m`;
}

function timeAgo(timestamp) {
  if (!timestamp || timestamp <= 0) return '-';
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 0) return 'just now';
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} years ago`;
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} months ago`;
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} days ago`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hours ago`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} minutes ago`;
  return 'just now';
}

export {
  formatDate,
  formatDateTime,
  formatDuration,
  timeAgo
};
