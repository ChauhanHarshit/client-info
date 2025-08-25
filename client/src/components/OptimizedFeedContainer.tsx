// Optimized Feed Container - Virtual scrolling wrapper for existing feed content
// Preserves all existing functionality while adding performance optimizations

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOptimizedFeed, feedPerformanceMonitor } from '../lib/feed-optimization';
import { optimizedContentFetcher } from '../lib/database-optimization';

interface OptimizedFeedContainerProps {
  creatorUsername: string;
  children: (props: OptimizedFeedRenderProps) => React.ReactNode;
  className?: string;
  onContentChange?: (content: any[]) => void;
  onScrollChange?: (scrollTop: number) => void;
}

interface OptimizedFeedRenderProps {
  visibleItems: any[];
  totalItems: number;
  isLoading: boolean;
  hasMore: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  virtualScrollManager: any;
  mediaManager: any;
  currentIndex: number;
  onItemChange: (index: number) => void;
  loadMore: () => void;
}

// Optimized Feed Container that wraps existing feed components
export default function OptimizedFeedContainer({
  creatorUsername,
  children,
  className = '',
  onContentChange,
  onScrollChange
}: OptimizedFeedContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Initialize performance monitoring
  useEffect(() => {
    if (!isInitialized) {
      feedPerformanceMonitor.init();
      setIsInitialized(true);
    }
    
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isInitialized]);

  // Use optimized feed hook
  const {
    visibleItems,
    totalItems,
    isLoading,
    hasMore,
    containerRef,
    virtualScrollManager,
    mediaManager,
    scrollOptimizer,
    allContent,
    loadMoreContent
  } = useOptimizedFeed(creatorUsername);

  // Handle content changes
  useEffect(() => {
    if (onContentChange && visibleItems.length > 0) {
      onContentChange(allContent);
    }
  }, [allContent, onContentChange, visibleItems.length]);

  // Handle scroll events with optimization
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const scrollTop = target.scrollTop;
    
    // Use scroll optimizer for performance
    scrollOptimizer.handleScroll(scrollTop);
    
    // Notify parent of scroll changes
    if (onScrollChange) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        onScrollChange(scrollTop);
      }, 100);
    }
    
    // Calculate current item index based on scroll position
    const itemHeight = window.innerHeight;
    const newIndex = Math.floor(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalItems) {
      setCurrentIndex(newIndex);
    }
  }, [scrollOptimizer, onScrollChange, currentIndex, totalItems]);

  // Handle item changes
  const handleItemChange = useCallback((index: number) => {
    if (index >= 0 && index < totalItems) {
      setCurrentIndex(index);
      
      // Scroll to item
      const itemHeight = window.innerHeight;
      const scrollTop = index * itemHeight;
      
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [totalItems, containerRef]);

  // Memoize render props to prevent unnecessary re-renders
  const renderProps = useMemo<OptimizedFeedRenderProps>(() => ({
    visibleItems,
    totalItems,
    isLoading,
    hasMore,
    containerRef,
    virtualScrollManager,
    mediaManager,
    currentIndex,
    onItemChange: handleItemChange,
    loadMore: loadMoreContent
  }), [
    visibleItems,
    totalItems,
    isLoading,
    hasMore,
    containerRef,
    virtualScrollManager,
    mediaManager,
    currentIndex,
    handleItemChange,
    loadMoreContent
  ]);

  // Container styles for optimal performance
  const containerStyles: React.CSSProperties = {
    height: '100vh',
    overflow: 'auto',
    position: 'relative',
    scrollBehavior: 'smooth',
    scrollSnapType: 'y mandatory',
    WebkitOverflowScrolling: 'touch',
    // Optimize for performance
    willChange: 'scroll-position',
    contain: 'layout style paint',
    // Hide scrollbar for clean look
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  };

  return (
    <div
      ref={containerRef}
      className={`optimized-feed-container ${className}`}
      style={containerStyles}
      onScroll={handleScroll}
    >
      {/* CSS to hide scrollbar */}
      <style jsx>{`
        .optimized-feed-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* Render children with optimized props */}
      {children(renderProps)}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      )}
    </div>
  );
}

// HOC for wrapping existing feed components with optimizations
export function withFeedOptimization<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  options: {
    virtualize?: boolean;
    prefetch?: boolean;
    lazyLoad?: boolean;
  } = {}
) {
  const OptimizedComponent = React.forwardRef<any, T & { creatorUsername: string }>((props, ref) => {
    const { creatorUsername, ...otherProps } = props;
    
    if (options.virtualize) {
      return (
        <OptimizedFeedContainer creatorUsername={creatorUsername}>
          {(renderProps) => (
            <WrappedComponent
              {...(otherProps as T)}
              ref={ref}
              // Pass optimization data as props
              optimizedData={renderProps}
            />
          )}
        </OptimizedFeedContainer>
      );
    }
    
    return <WrappedComponent {...(otherProps as T)} ref={ref} />;
  });
  
  OptimizedComponent.displayName = `withFeedOptimization(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return OptimizedComponent;
}

// Optimized content item component with lazy loading
export function OptimizedContentItem({
  item,
  index,
  isVisible,
  onMediaLoad,
  onMediaError,
  children
}: {
  item: any;
  index: number;
  isVisible: boolean;
  onMediaLoad?: () => void;
  onMediaError?: (error: Error) => void;
  children: React.ReactNode;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Lazy load media when visible
  useEffect(() => {
    if (isVisible && !isLoaded && !hasError) {
      const loadMedia = async () => {
        try {
          if (item.mediaUrl) {
            // Preload media
            if (item.mediaType === 'video') {
              const video = document.createElement('video');
              video.src = item.mediaUrl;
              video.preload = 'metadata';
              
              video.onloadedmetadata = () => {
                setIsLoaded(true);
                onMediaLoad?.();
              };
              
              video.onerror = () => {
                setHasError(true);
                onMediaError?.(new Error('Video load failed'));
              };
            } else if (item.mediaType === 'image') {
              const img = new Image();
              img.src = item.mediaUrl;
              
              img.onload = () => {
                setIsLoaded(true);
                onMediaLoad?.();
              };
              
              img.onerror = () => {
                setHasError(true);
                onMediaError?.(new Error('Image load failed'));
              };
            }
          } else {
            setIsLoaded(true);
          }
        } catch (error) {
          setHasError(true);
          onMediaError?.(error as Error);
        }
      };

      loadMedia();
    }
  }, [isVisible, isLoaded, hasError, item.mediaUrl, item.mediaType, onMediaLoad, onMediaError]);

  // Intersection observer for visibility detection
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Mark as visible for media loading
            element.setAttribute('data-visible', 'true');
          } else {
            element.setAttribute('data-visible', 'false');
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const itemStyles: React.CSSProperties = {
    height: '100vh',
    scrollSnapAlign: 'start',
    position: 'relative',
    // Optimize for performance
    contain: 'layout style paint',
    willChange: isVisible ? 'transform' : 'auto',
  };

  return (
    <div
      ref={elementRef}
      style={itemStyles}
      data-index={index}
      data-item-id={item.id}
      data-visible={isVisible}
      className="optimized-content-item"
    >
      {/* Show loading placeholder until media is loaded */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-300 h-12 w-12"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="h-4 bg-gray-300 rounded w-24"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Show error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-red-600">Content failed to load</p>
          </div>
        </div>
      )}
      
      {/* Render children when loaded */}
      {(isLoaded || isVisible) && children}
    </div>
  );
}

// Hook for accessing optimization data in existing components
export function useOptimizationData() {
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = feedPerformanceMonitor.getMetrics();
      setPerformanceMetrics(metrics);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    performanceMetrics,
    clearCache: () => optimizedContentFetcher.clearCache(),
    getMetrics: () => feedPerformanceMonitor.getMetrics()
  };
}