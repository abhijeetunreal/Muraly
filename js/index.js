// Import custom confirm dialog
import { showConfirm } from './modules/alert.js';

// Scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => {
  observer.observe(el);
});

// Register Service Worker for PWA
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

// Clear cache functionality
async function clearAllCaches() {
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

// Clear cache button handler
const clearCacheBtn = document.getElementById('clearCacheBtn');
if (clearCacheBtn) {
  clearCacheBtn.addEventListener('click', async () => {
    const confirmed = await showConfirm("Are you sure you want to clear all caches? This will remove cached files and saved sessions.");
    if (!confirmed) return;
    
    try {
      await clearAllCaches();
      clearCacheBtn.textContent = "✓ Cache Cleared!";
      clearCacheBtn.style.background = 'var(--success)';
      setTimeout(() => {
        clearCacheBtn.textContent = "🗑️ Clear Cache";
        clearCacheBtn.style.background = '';
      }, 3000);
    } catch (err) {
      console.error("Error clearing cache:", err);
      clearCacheBtn.textContent = "✗ Error";
      clearCacheBtn.style.background = 'var(--danger)';
      setTimeout(() => {
        clearCacheBtn.textContent = "🗑️ Clear Cache";
        clearCacheBtn.style.background = '';
      }, 3000);
    }
  });
}

