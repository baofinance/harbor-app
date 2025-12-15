// Initialize Safe SDK as early as possible for Safe App detection
(function() {
  'use strict';
  
  // Only run in iframe (Safe apps run in iframes)
  if (window.self === window.top) {
    return;
  }

  // Try to initialize Safe SDK immediately
  try {
    // Check if Safe Apps SDK is available
    if (typeof window !== 'undefined') {
      // Mark that we're attempting to initialize Safe
      window.__SAFE_APP_INIT__ = true;
      
      // Safe will detect this and know the app supports Safe App functionality
      // The actual SDK initialization will happen in React component
    }
  } catch (error) {
    console.error('Error initializing Safe App:', error);
  }
})();

