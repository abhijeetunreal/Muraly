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

// Register Service Worker for PWA
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    });
  }
}

// Clear all caches (Service Worker cache and localStorage)
export async function clearAllCaches() {
  try {
    // Clear all Service Worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }

    // Clear localStorage session data
    try {
      localStorage.removeItem('muraly_session');
      console.log('Cleared localStorage session data');
    } catch (err) {
      console.warn('Error clearing localStorage:', err);
    }

    // Unregister service worker to ensure clean state
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );
      console.log('Unregistered service workers');
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing caches:', error);
    throw error;
  }
}

