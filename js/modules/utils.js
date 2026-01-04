// ================= UTILITY FUNCTIONS =================

// Detect if device is mobile
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768 && 'ontouchstart' in window);
}

// Detect if device is desktop or laptop (excludes tablets and smartphones)
export function isDesktopOrLaptop() {
  const ua = navigator.userAgent;
  const width = window.innerWidth;
  const hasTouch = 'ontouchstart' in window;
  
  // Check for mobile/tablet user agents (smartphones and tablets)
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  // Check for tablet-specific indicators
  // iPad detection (iPadOS 13+ reports as Mac, so we check for touch + screen size)
  const isIPad = /iPad/i.test(ua) || 
                 (/Macintosh/i.test(ua) && hasTouch && width <= 1024);
  
  // Android tablets (Android without Mobile in UA, or large touch screen)
  const isAndroidTablet = /Android/i.test(ua) && 
                          !/Mobile/i.test(ua) ||
                          (/Android/i.test(ua) && hasTouch && width >= 600 && width <= 1024);
  
  const isTablet = isIPad || isAndroidTablet;
  
  // Desktop/laptop characteristics:
  // 1. Not a mobile user agent (smartphone)
  // 2. Not a tablet
  // 3. Has large screen (>= 1024px) OR (no touch support AND screen >= 768px)
  const isLargeScreen = width >= 1024;
  const isMediumScreenNoTouch = width >= 768 && !hasTouch;
  
  return !isMobileUA && !isTablet && (isLargeScreen || isMediumScreenNoTouch);
}

// Detect if browser is Firefox
export function isFirefox() {
  return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}

