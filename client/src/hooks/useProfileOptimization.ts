/**
 * Profile Optimization Hooks
 * React hooks for integrating Profile tab performance optimizations
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { profileOptimizer } from '../lib/profile-optimization';
import { profileDatabaseOptimizer } from '../lib/profile-database-optimization';
import { profileMediaOptimizer } from '../lib/profile-media-optimization';

// Main profile optimization hook
export function useProfileOptimization(username: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const [isOptimized, setIsOptimized] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState({
    profileLoadTime: 0,
    bookmarkLoadTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
  });
  
  const initializationRef = useRef(false);
  
  // Initialize optimization system
  useEffect(() => {
    if (!enabled || !username || initializationRef.current) return;
    
    const initializeOptimization = async () => {
      try {
        console.log('🚀 Initializing profile optimization system...');
        
        // Initialize main optimizer
        profileOptimizer.initialize(queryClient);
        
        // Prefetch profile data
        await profileOptimizer.optimizeProfileLoad(username, queryClient);
        
        // Setup media optimization
        const profileData = await profileDatabaseOptimizer.loadProfileBatch(username);
        profileMediaOptimizer.setupPrefetching(profileData);
        
        setIsOptimized(true);
        initializationRef.current = true;
        
        console.log('✅ Profile optimization system initialized');
      } catch (error) {
        console.error('❌ Profile optimization initialization failed:', error);
      }
    };
    
    initializeOptimization();
  }, [username, enabled, queryClient]);
  
  // Update optimization stats
  useEffect(() => {
    if (!isOptimized) return;
    
    const updateStats = () => {
      const mainStats = profileOptimizer.getMetrics();
      const dbStats = profileDatabaseOptimizer.getPerformanceStats();
      const mediaStats = profileMediaOptimizer.getOptimizationStats();
      
      setOptimizationStats({
        profileLoadTime: mainStats.profileLoadTime,
        bookmarkLoadTime: mainStats.bookmarkLoadTime,
        cacheHitRate: dbStats.cache.hitRate,
        memoryUsage: mainStats.totalMemoryUsage,
      });
    };
    
    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [isOptimized]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isOptimized) {
        profileOptimizer.cleanup();
        profileDatabaseOptimizer.clearAllCaches();
        profileMediaOptimizer.clearAllCaches();
      }
    };
  }, [isOptimized]);
  
  const optimizeProfileLoad = useCallback(async () => {
    if (!username || !isOptimized) return null;
    
    try {
      return await profileOptimizer.optimizeProfileLoad(username, queryClient);
    } catch (error) {
      console.error('Profile load optimization failed:', error);
      return null;
    }
  }, [username, isOptimized, queryClient]);
  
  const prefetchProfileData = useCallback(async () => {
    if (!username || !isOptimized) return;
    
    try {
      await profileDatabaseOptimizer.prefetchRelatedData(username);
    } catch (error) {
      console.error('Profile prefetch failed:', error);
    }
  }, [username, isOptimized]);
  
  const invalidateProfileCache = useCallback((type: 'profile' | 'bookmarks' | 'all' = 'all') => {
    if (!username || !isOptimized) return;
    
    profileDatabaseOptimizer.invalidateUserCache(username, type);
  }, [username, isOptimized]);
  
  return {
    isOptimized,
    optimizationStats,
    optimizeProfileLoad,
    prefetchProfileData,
    invalidateProfileCache,
  };
}

// Hook for optimized profile image loading
export function useOptimizedProfileImage(imageUrl: string | null, enabled: boolean = true) {
  const [optimizedImage, setOptimizedImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!imageUrl || !enabled) {
      setOptimizedImage(null);
      return;
    }
    
    const loadOptimizedImage = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const image = await profileMediaOptimizer.loadProfileImage(imageUrl);
        setOptimizedImage(image);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setOptimizedImage(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOptimizedImage();
  }, [imageUrl, enabled]);
  
  const setupLazyLoading = useCallback((img: HTMLImageElement, src: string) => {
    if (enabled) {
      profileMediaOptimizer.setupLazyLoading(img, src);
    } else {
      img.src = src;
    }
  }, [enabled]);
  
  return {
    optimizedImage,
    isLoading,
    error,
    setupLazyLoading,
  };
}

// Hook for optimized bookmark data loading
export function useOptimizedBookmarks(username: string, enabled: boolean = true) {
  const [bookmarkData, setBookmarkData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadBookmarks = useCallback(async () => {
    if (!username || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await profileDatabaseOptimizer.loadBookmarkData(username);
      const processedData = await profileOptimizer.optimizeBookmarkProcessing(data);
      setBookmarkData(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
      setBookmarkData(null);
    } finally {
      setIsLoading(false);
    }
  }, [username, enabled]);
  
  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);
  
  const refetchBookmarks = useCallback(() => {
    loadBookmarks();
  }, [loadBookmarks]);
  
  return {
    bookmarkData,
    isLoading,
    error,
    refetchBookmarks,
  };
}

// Hook for virtual scrolling optimization
export function useVirtualScrolling(
  items: any[],
  itemHeight: number = 80,
  containerHeight: number = 400,
  enabled: boolean = true
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  
  const virtualScroller = useMemo(() => {
    return profileOptimizer.virtualScroller;
  }, []);
  
  useEffect(() => {
    if (!enabled || items.length === 0) return;
    
    const range = virtualScroller.calculateVisibleRange(scrollTop, items.length);
    setVisibleRange(range);
  }, [scrollTop, items.length, enabled, virtualScroller]);
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  const visibleItems = useMemo(() => {
    if (!enabled) return items;
    
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      ...item,
      virtualIndex: visibleRange.start + index,
      style: {
        transform: virtualScroller.getTransform(visibleRange.start + index),
        position: 'absolute' as const,
        width: '100%',
        height: `${itemHeight}px`,
      },
    }));
  }, [items, visibleRange, enabled, virtualScroller, itemHeight]);
  
  const totalHeight = items.length * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    handleScroll,
    isVirtualized: enabled && items.length > 20, // Only virtualize for large lists
  };
}

// Hook for mobile optimization
export function useMobileOptimization(enabled: boolean = true) {
  const [isMobile, setIsMobile] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState('4g');
  const [optimizedSettings, setOptimizedSettings] = useState({
    cacheTime: 120000,
    batchSize: 10,
    imageQuality: 0.8,
  });
  
  useEffect(() => {
    if (!enabled) return;
    
    const updateMobileSettings = () => {
      const mobileOptimizations = profileOptimizer.getMobileOptimizations();
      
      setIsMobile(mobileOptimizations.isMobile);
      setNetworkSpeed(mobileOptimizations.networkSpeed);
      setOptimizedSettings({
        cacheTime: mobileOptimizations.cacheTime,
        batchSize: mobileOptimizations.adaptations.batchSize,
        imageQuality: mobileOptimizations.isMobile ? 0.7 : 0.8,
      });
    };
    
    updateMobileSettings();
    
    // Listen for orientation changes
    const handleOrientationChange = () => {
      setTimeout(updateMobileSettings, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', updateMobileSettings);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', updateMobileSettings);
    };
  }, [enabled]);
  
  return {
    isMobile,
    networkSpeed,
    optimizedSettings,
  };
}

// Hook for performance monitoring
export function useProfilePerformanceMonitoring(enabled: boolean = true) {
  const [performanceData, setPerformanceData] = useState({
    loadTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    errorRate: 0,
    optimizationLevel: 0,
  });
  
  useEffect(() => {
    if (!enabled) return;
    
    const updatePerformanceData = () => {
      const metrics = profileOptimizer.getMetrics();
      const dbStats = profileDatabaseOptimizer.getPerformanceStats();
      const mediaStats = profileMediaOptimizer.getOptimizationStats();
      
      setPerformanceData({
        loadTime: metrics.profileLoadTime,
        memoryUsage: metrics.totalMemoryUsage,
        cacheHitRate: dbStats.cache.hitRate,
        errorRate: metrics.errorCount > 0 ? (metrics.errorCount / metrics.apiCallCount) * 100 : 0,
        optimizationLevel: calculateOptimizationLevel(metrics, dbStats, mediaStats),
      });
    };
    
    updatePerformanceData();
    const interval = setInterval(updatePerformanceData, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [enabled]);
  
  const calculateOptimizationLevel = (metrics: any, dbStats: any, mediaStats: any) => {
    let score = 0;
    
    // Load time score (max 25 points)
    if (metrics.profileLoadTime < 1000) score += 25;
    else if (metrics.profileLoadTime < 2000) score += 15;
    else if (metrics.profileLoadTime < 3000) score += 10;
    
    // Cache hit rate score (max 25 points)
    score += Math.min(25, dbStats.cache.hitRate * 0.25);
    
    // Memory usage score (max 25 points)
    const memoryMB = metrics.totalMemoryUsage / 1024 / 1024;
    if (memoryMB < 50) score += 25;
    else if (memoryMB < 100) score += 15;
    else if (memoryMB < 150) score += 10;
    
    // Error rate score (max 25 points)
    const errorRate = metrics.errorCount > 0 ? (metrics.errorCount / metrics.apiCallCount) * 100 : 0;
    if (errorRate === 0) score += 25;
    else if (errorRate < 5) score += 15;
    else if (errorRate < 10) score += 10;
    
    return Math.min(100, score);
  };
  
  return {
    performanceData,
    isPerformanceGood: performanceData.optimizationLevel > 70,
  };
}

// Main comprehensive profile optimization hook
export function useComprehensiveProfileOptimization(username: string, enabled: boolean = true) {
  const profileOptimization = useProfileOptimization(username, enabled);
  const mobileOptimization = useMobileOptimization(enabled);
  const performanceMonitoring = useProfilePerformanceMonitoring(enabled);
  
  return {
    ...profileOptimization,
    mobile: mobileOptimization,
    performance: performanceMonitoring,
  };
}