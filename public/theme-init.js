/* global window, document */
// One-time pre-paint initialization. React owns subsequent theme changes.
(() => {
  let preference = null;
  try {
    const saved = window.localStorage.getItem('stray-theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {
    // Restricted storage still permits the system default and manual switching.
  }
  document.documentElement.dataset.theme = preference ||
    (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
})();
