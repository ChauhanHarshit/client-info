// Rendering optimization utilities without changing site logic

// Virtual scrolling optimization
export const virtualScrolling = {
  // Calculate visible items for large lists
  calculateVisibleItems: (
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    overscan: number = 5
  ) => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  },

  // Create virtual scroll container
  createVirtualScrollContainer: (
    items: any[],
    itemHeight: number,
    containerHeight: number,
    renderItem: (item: any, index: number) => HTMLElement
  ) => {
    let scrollTop = 0;
    const container = document.createElement('div');
    container.style.height = `${containerHeight}px`;
    container.style.overflow = 'auto';
    
    const content = document.createElement('div');
    content.style.height = `${items.length * itemHeight}px`;
    content.style.position = 'relative';
    
    const updateVisibleItems = () => {
      const { startIndex, endIndex } = virtualScrolling.calculateVisibleItems(
        scrollTop,
        containerHeight,
        itemHeight,
        items.length
      );
      
      // Clear existing items
      content.innerHTML = '';
      
      // Render visible items
      for (let i = startIndex; i <= endIndex; i++) {
        const item = renderItem(items[i], i);
        item.style.position = 'absolute';
        item.style.top = `${i * itemHeight}px`;
        item.style.height = `${itemHeight}px`;
        content.appendChild(item);
      }
    };
    
    container.addEventListener('scroll', () => {
      scrollTop = container.scrollTop;
      updateVisibleItems();
    });
    
    container.appendChild(content);
    updateVisibleItems();
    
    return container;
  }
};

// DOM optimization utilities
export const domOptimization = {
  // Batch DOM operations
  batchDOMOperations: (operations: Array<() => void>) => {
    requestAnimationFrame(() => {
      operations.forEach(operation => operation());
    });
  },

  // Optimize DOM measurements
  measureDOM: (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    };
  },

  // Reduce layout thrashing
  optimizeLayout: (elements: HTMLElement[], updateFn: (element: HTMLElement) => void) => {
    // Read phase
    const measurements = elements.map(element => ({
      element,
      rect: element.getBoundingClientRect()
    }));
    
    // Write phase
    requestAnimationFrame(() => {
      measurements.forEach(({ element }) => {
        updateFn(element);
      });
    });
  },

  // Optimize event delegation
  createEventDelegator: (container: HTMLElement, eventType: string, selector: string, handler: (event: Event, target: HTMLElement) => void) => {
    const delegatedHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      const matchingElement = target.closest(selector) as HTMLElement;
      
      if (matchingElement && container.contains(matchingElement)) {
        handler(event, matchingElement);
      }
    };
    
    container.addEventListener(eventType, delegatedHandler);
    
    return () => {
      container.removeEventListener(eventType, delegatedHandler);
    };
  }
};

// Animation optimization
export const animationOptimization = {
  // Use requestAnimationFrame for smooth animations
  createAnimationLoop: (callback: (timestamp: number) => void) => {
    let isRunning = false;
    let animationId: number;
    
    const animate = (timestamp: number) => {
      if (isRunning) {
        callback(timestamp);
        animationId = requestAnimationFrame(animate);
      }
    };
    
    return {
      start: () => {
        if (!isRunning) {
          isRunning = true;
          animationId = requestAnimationFrame(animate);
        }
      },
      stop: () => {
        isRunning = false;
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      }
    };
  },

  // Optimize CSS animations
  optimizeCSSAnimations: () => {
    const style = document.createElement('style');
    style.textContent = `
      /* Use GPU acceleration for animations */
      .animate-gpu {
        will-change: transform, opacity;
        transform: translateZ(0);
      }
      
      /* Optimize transitions */
      .transition-optimized {
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      }
      
      /* Reduce motion for accessibility */
      @media (prefers-reduced-motion: reduce) {
        .animate-gpu,
        .transition-optimized {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  },

  // Intersection Observer for viewport animations
  createViewportAnimator: (
    elements: HTMLElement[],
    animationClass: string,
    threshold: number = 0.1
  ) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(animationClass);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold });
    
    elements.forEach(element => observer.observe(element));
    
    return () => observer.disconnect();
  }
};

// Image loading optimization
export const imageLoadingOptimization = {
  // Progressive image loading
  createProgressiveLoader: (src: string, placeholder: string) => {
    const img = new Image();
    const container = document.createElement('div');
    container.style.position = 'relative';
    
    // Show placeholder first
    const placeholderImg = document.createElement('img');
    placeholderImg.src = placeholder;
    placeholderImg.style.filter = 'blur(5px)';
    placeholderImg.style.transition = 'opacity 0.3s ease-in-out';
    container.appendChild(placeholderImg);
    
    // Load actual image
    img.onload = () => {
      img.style.position = 'absolute';
      img.style.top = '0';
      img.style.left = '0';
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.3s ease-in-out';
      container.appendChild(img);
      
      // Fade in actual image
      requestAnimationFrame(() => {
        img.style.opacity = '1';
        placeholderImg.style.opacity = '0';
      });
      
      // Remove placeholder after fade
      setTimeout(() => {
        if (placeholderImg.parentNode) {
          placeholderImg.parentNode.removeChild(placeholderImg);
        }
      }, 300);
    };
    
    img.src = src;
    return container;
  },

  // Lazy loading with intersection observer
  createLazyLoader: (threshold: number = 0.1) => {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.classList.remove('lazy');
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        }
      });
    }, { threshold });
    
    return {
      observe: (img: HTMLImageElement) => {
        img.classList.add('lazy');
        imageObserver.observe(img);
      },
      disconnect: () => imageObserver.disconnect()
    };
  },

  // Responsive image loading
  createResponsiveLoader: (
    srcSet: Array<{ src: string; width: number }>,
    sizes: string
  ) => {
    const img = document.createElement('img');
    
    // Generate srcset string
    const srcSetString = srcSet
      .map(({ src, width }) => `${src} ${width}w`)
      .join(', ');
    
    img.srcset = srcSetString;
    img.sizes = sizes;
    img.src = srcSet[0].src; // Fallback
    
    return img;
  }
};

// Scroll optimization
export const scrollOptimization = {
  // Smooth scroll polyfill
  smoothScroll: (element: HTMLElement, target: number, duration: number = 300) => {
    const start = element.scrollTop;
    const distance = target - start;
    const startTime = performance.now();
    
    const easeInOutQuad = (t: number) => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      element.scrollTop = start + distance * easeInOutQuad(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  },

  // Scroll position restoration
  createScrollRestorer: () => {
    const positions = new Map<string, number>();
    
    return {
      save: (key: string, element: HTMLElement) => {
        positions.set(key, element.scrollTop);
      },
      
      restore: (key: string, element: HTMLElement) => {
        const position = positions.get(key);
        if (position !== undefined) {
          element.scrollTop = position;
        }
      },
      
      clear: (key?: string) => {
        if (key) {
          positions.delete(key);
        } else {
          positions.clear();
        }
      }
    };
  },

  // Throttled scroll events
  createThrottledScrollHandler: (
    handler: (event: Event) => void,
    delay: number = 16 // ~60fps
  ) => {
    let isThrottled = false;
    
    return (event: Event) => {
      if (!isThrottled) {
        handler(event);
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
        }, delay);
      }
    };
  }
};

// Complete rendering optimization suite
export const renderingOptimization = {
  virtualScrolling,
  domOptimization,
  animationOptimization,
  imageLoadingOptimization,
  scrollOptimization,

  // Initialize all rendering optimizations
  init: () => {
    // Optimize CSS animations
    animationOptimization.optimizeCSSAnimations();

    // Add performance monitoring styles
    const style = document.createElement('style');
    style.textContent = `
      /* Performance optimization classes */
      .will-change-transform {
        will-change: transform;
      }
      
      .will-change-opacity {
        will-change: opacity;
      }
      
      .gpu-accelerated {
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      
      .contain-layout {
        contain: layout;
      }
      
      .contain-paint {
        contain: paint;
      }
      
      /* Loading states */
      .loading-skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
      }
      
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);

    console.log('🎨 Rendering optimization initialized');
  }
};