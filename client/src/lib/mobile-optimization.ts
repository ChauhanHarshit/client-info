/**
 * Mobile Performance Optimization Utilities
 * Implements mobile-specific optimizations for CRM system performance
 */

// Mobile device detection
export const detectDevice = () => {
  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  const isDesktop = !isMobile && !isTablet;
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isLowEndDevice: isMobile && /Android.*[0-4]\./i.test(ua),
    userAgent: ua,
  };
};

// Network condition detection
export const getNetworkInfo = () => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  return {
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false,
    isSlowConnection: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g',
    isFastConnection: connection?.effectiveType === '4g' || connection?.effectiveType === '5g',
  };
};

// Mobile-optimized query configurations
export const mobileQueryConfigs = {
  // Reduced stale times for mobile
  auth: {
    staleTime: 1000 * 60 * 2, // 2 minutes instead of 5
    gcTime: 1000 * 60 * 10, // 10 minutes instead of 15
  },
  
  // Longer cache for mobile to reduce requests
  employees: {
    staleTime: 1000 * 60 * 60, // 1 hour instead of 30 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours instead of 1
  },
  
  // More aggressive caching for mobile
  static: {
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
    gcTime: 1000 * 60 * 60 * 4, // 4 hours
  },
};

// Touch gesture optimization
export const touchOptimization = {
  // Prevent double-tap zoom
  preventDoubleTab: () => {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  },
  
  // Optimize scroll performance
  optimizeScrolling: () => {
    document.addEventListener('touchmove', (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    }, { passive: false });
  },
  
  // Add touch-friendly CSS
  addTouchStyles: () => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      input, textarea, select {
        -webkit-user-select: auto;
        -khtml-user-select: auto;
        -moz-user-select: auto;
        -ms-user-select: auto;
        user-select: auto;
      }
      
      .btn, button {
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(style);
  },
};

// Memory management for mobile
export const memoryOptimization = {
  // Monitor memory usage
  monitorMemory: () => {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMB = memory.totalJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      console.log(`📱 Memory Usage: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (Limit: ${limitMB.toFixed(2)}MB)`);
      
      // Warn if memory usage is high
      if (usedMB > 100) {
        console.warn('🚨 High memory usage detected, consider optimizing');
      }
      
      return { usedMB, totalMB, limitMB };
    }
    return null;
  },
  
  // Force garbage collection on mobile
  forceGC: () => {
    if (detectDevice().isMobile) {
      // Clear caches
      if (typeof window !== 'undefined' && window.caches) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Force garbage collection if available
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    }
  },
  
  // Optimize images for mobile
  optimizeImages: () => {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (detectDevice().isMobile) {
        img.loading = 'lazy';
        img.decoding = 'async';
      }
    });
  },
};

// Battery optimization
export const batteryOptimization = {
  // Detect battery status
  getBatteryInfo: async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          charging: battery.charging,
          level: battery.level,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          isLowBattery: battery.level < 0.2,
        };
      } catch (error) {
        console.log('Battery API not available');
        return null;
      }
    }
    return null;
  },
  
  // Optimize based on battery level
  optimizeForBattery: async () => {
    const batteryInfo = await batteryOptimization.getBatteryInfo();
    
    if (batteryInfo && batteryInfo.isLowBattery) {
      console.log('🔋 Low battery detected, enabling power saving mode');
      
      // Reduce animation frequency
      document.body.style.animation = 'none';
      
      // Reduce query frequency
      return {
        reduceQueryFrequency: true,
        disableAnimations: true,
        reduceCacheSize: true,
      };
    }
    
    return {
      reduceQueryFrequency: false,
      disableAnimations: false,
      reduceCacheSize: false,
    };
  },
};

// Viewport optimization
export const viewportOptimization = {
  // Set optimal viewport
  setViewport: () => {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    
    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  },
  
  // Handle orientation changes
  handleOrientationChange: () => {
    const handleChange = () => {
      // Force layout recalculation
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    };
    
    window.addEventListener('orientationchange', handleChange);
    return () => window.removeEventListener('orientationchange', handleChange);
  },
  
  // Optimize for safe areas (notch, etc.)
  optimizeForSafeArea: () => {
    const style = document.createElement('style');
    style.textContent = `
      .safe-area-top { padding-top: env(safe-area-inset-top); }
      .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
      .safe-area-left { padding-left: env(safe-area-inset-left); }
      .safe-area-right { padding-right: env(safe-area-inset-right); }
    `;
    document.head.appendChild(style);
  },
};

// Performance throttling for mobile
export const performanceThrottling = {
  // Throttle scroll events
  throttleScroll: (callback: () => void, delay: number = 16) => {
    let lastCall = 0;
    return () => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        callback();
      }
    };
  },
  
  // Debounce input events
  debounceInput: (callback: (value: string) => void, delay: number = 300) => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(value), delay);
    };
  },
  
  // Throttle API calls
  throttleApiCalls: (callback: () => Promise<any>, delay: number = 1000) => {
    let lastCall = 0;
    let lastPromise: Promise<any> | null = null;
    
    return async () => {
      const now = Date.now();
      
      if (now - lastCall >= delay) {
        lastCall = now;
        lastPromise = callback();
        return lastPromise;
      }
      
      return lastPromise || Promise.resolve();
    };
  },
};

// Connection optimization
export const connectionOptimization = {
  // Optimize for slow connections
  optimizeForSlowConnection: () => {
    const networkInfo = getNetworkInfo();
    
    if (networkInfo.isSlowConnection) {
      console.log('🐌 Slow connection detected, optimizing...');
      
      // Disable auto-refresh
      return {
        disableAutoRefresh: true,
        increaseStaleTime: true,
        reduceConcurrentRequests: true,
        compressRequests: true,
      };
    }
    
    return {
      disableAutoRefresh: false,
      increaseStaleTime: false,
      reduceConcurrentRequests: false,
      compressRequests: false,
    };
  },
  
  // Handle offline state
  handleOfflineState: () => {
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        console.log('📶 Connection restored');
        document.body.classList.remove('offline');
      } else {
        console.log('📵 Connection lost');
        document.body.classList.add('offline');
      }
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  },
};

// Initialize mobile optimizations
export const initializeMobileOptimizations = () => {
  const device = detectDevice();
  
  if (device.isMobile) {
    console.log('📱 Initializing mobile optimizations...');
    
    // Apply mobile-specific optimizations
    touchOptimization.preventDoubleTab();
    touchOptimization.optimizeScrolling();
    touchOptimization.addTouchStyles();
    
    viewportOptimization.setViewport();
    viewportOptimization.handleOrientationChange();
    viewportOptimization.optimizeForSafeArea();
    
    memoryOptimization.optimizeImages();
    connectionOptimization.handleOfflineState();
    
    // Monitor performance
    setInterval(() => {
      memoryOptimization.monitorMemory();
    }, 60000); // Every minute
    
    // Check battery optimization
    batteryOptimization.optimizeForBattery();
    
    console.log('✅ Mobile optimizations initialized');
  }
};

// Export all optimizations
export default {
  detectDevice,
  getNetworkInfo,
  mobileQueryConfigs,
  touchOptimization,
  memoryOptimization,
  batteryOptimization,
  viewportOptimization,
  performanceThrottling,
  connectionOptimization,
  initializeMobileOptimizations,
};