// ================= UTILITY FUNCTIONS =================

// Detect if device is mobile
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768 && 'ontouchstart' in window);
}

// Detect if browser is Firefox
export function isFirefox() {
  return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}

