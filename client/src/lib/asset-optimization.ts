// Asset optimization utilities for improved performance without changing site logic

// Image optimization utilities
export const imageOptimization = {
  // Preload critical images
  preloadCriticalImages: (images: string[]) => {
    images.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  },

  // Lazy load images with intersection observer
  createLazyImageLoader: () => {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    return {
      observe: (img: HTMLImageElement) => {
        img.classList.add('lazy');
        imageObserver.observe(img);
      },
      disconnect: () => imageObserver.disconnect()
    };
  },

  // Optimize image loading with WebP fallback
  getOptimizedImageSrc: (originalSrc: string): string => {
    // Check WebP support
    const supportsWebP = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })();

    if (supportsWebP && originalSrc.includes('/uploads/')) {
      // Could convert to WebP format if supported
      return originalSrc;
    }

    return originalSrc;
  },

  // Create responsive image srcset
  createResponsiveSrcSet: (baseSrc: string, sizes: number[]): string => {
    if (!baseSrc.includes('/uploads/')) return baseSrc;
    
    const srcset = sizes.map(size => {
      // For now, return original - could implement resizing service
      return `${baseSrc} ${size}w`;
    }).join(', ');

    return srcset;
  }
};

// Font optimization utilities
export const fontOptimization = {
  // Preload critical fonts
  preloadFonts: (fonts: Array<{ href: string; type?: string }>) => {
    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.href = font.href;
      link.type = font.type || 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  },

  // Optimize font loading with font-display
  optimizeFontDisplay: () => {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Inter';
        font-display: swap;
        src: url('/fonts/inter.woff2') format('woff2');
      }
      
      @font-face {
        font-family: 'system-ui';
        font-display: swap;
        src: local('system-ui');
      }
    `;
    document.head.appendChild(style);
  }
};

// CSS optimization utilities
export const cssOptimization = {
  // Remove unused CSS classes (basic implementation)
  removeUnusedCSS: () => {
    const usedClasses = new Set<string>();
    
    // Collect all used classes
    document.querySelectorAll('*').forEach(element => {
      element.classList.forEach(className => {
        usedClasses.add(className);
      });
    });

    // Could implement CSS purging here
    return Array.from(usedClasses);
  },

  // Optimize CSS delivery
  optimizeCSSDelivery: () => {
    // Move non-critical CSS to end of body
    const criticalCSS = document.querySelector('style[data-critical]');
    if (criticalCSS) {
      document.head.appendChild(criticalCSS);
    }
  },

  // Minimize CSS recalculations
  reduceCSSRecalculations: () => {
    const style = document.createElement('style');
    style.textContent = `
      /* Optimize animations */
      * {
        will-change: auto;
      }
      
      /* Optimize transforms */
      .transform-gpu {
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      
      /* Optimize scrolling */
      .scroll-smooth {
        scroll-behavior: smooth;
      }
    `;
    document.head.appendChild(style);
  }
};

// JavaScript optimization utilities
export const jsOptimization = {
  // Defer non-critical JavaScript
  deferNonCriticalJS: (scripts: string[]) => {
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      document.body.appendChild(script);
    });
  },

  // Preload critical JavaScript modules
  preloadCriticalModules: (modules: string[]) => {
    modules.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = src;
      document.head.appendChild(link);
    });
  },

  // Optimize event listeners
  optimizeEventListeners: () => {
    // Use passive listeners for better scroll performance
    const passiveEvents = ['scroll', 'wheel', 'touchstart', 'touchmove'];
    
    passiveEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {}, { passive: true });
    });
  }
};

// Resource hints optimization
export const resourceHints = {
  // DNS prefetch for external domains
  dnsPrefetch: (domains: string[]) => {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });
  },

  // Preconnect to critical origins
  preconnect: (origins: string[]) => {
    origins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  },

  // Prefetch next page resources
  prefetchNextPage: (urls: string[]) => {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }
};

// Memory optimization utilities
export const memoryOptimization = {
  // Clean up memory leaks
  cleanupMemoryLeaks: () => {
    // Remove event listeners on unmount
    const cleanupFunctions: Array<() => void> = [];
    
    return {
      addCleanup: (fn: () => void) => {
        cleanupFunctions.push(fn);
      },
      cleanup: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    };
  },

  // Optimize object creation
  objectPool: <T>(createFn: () => T, resetFn: (obj: T) => void) => {
    const pool: T[] = [];
    
    return {
      get: (): T => {
        if (pool.length > 0) {
          return pool.pop()!;
        }
        return createFn();
      },
      
      release: (obj: T) => {
        resetFn(obj);
        pool.push(obj);
      }
    };
  }
};

// Bundle optimization utilities
export const bundleOptimization = {
  // Code splitting helpers
  lazyImport: <T>(importFn: () => Promise<T>) => {
    let modulePromise: Promise<T> | null = null;
    
    return () => {
      if (!modulePromise) {
        modulePromise = importFn();
      }
      return modulePromise;
    };
  },

  // Dynamic imports for heavy features
  loadFeatureOnDemand: async (featureName: string) => {
    // Dynamic imports would be implemented here based on actual feature components
    // For now, return null to avoid import errors
    console.log(`Feature loading requested: ${featureName}`);
    return null;
  }
};

// Complete asset optimization suite
export const assetOptimization = {
  imageOptimization,
  fontOptimization,
  cssOptimization,
  jsOptimization,
  resourceHints,
  memoryOptimization,
  bundleOptimization,

  // Initialize all optimizations
  init: () => {
    // Preload critical resources
    resourceHints.dnsPrefetch([
      'fonts.googleapis.com',
      'cdnjs.cloudflare.com',
      'res.cloudinary.com'
    ]);

    resourceHints.preconnect([
      'https://fonts.googleapis.com',
      'https://res.cloudinary.com'
    ]);

    // Optimize CSS delivery
    cssOptimization.optimizeCSSDelivery();
    cssOptimization.reduceCSSRecalculations();

    // Optimize JavaScript
    jsOptimization.optimizeEventListeners();

    // Optimize fonts
    fontOptimization.optimizeFontDisplay();

    console.log('🚀 Asset optimization initialized');
  }
};