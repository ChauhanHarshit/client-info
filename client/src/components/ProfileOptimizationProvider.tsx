/**
 * Profile Optimization Provider Component
 * Global provider for profile optimization context and performance monitoring
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { profileOptimizer } from '../lib/profile-optimization';
import { profileDatabaseOptimizer } from '../lib/profile-database-optimization';
import { profileMediaOptimizer } from '../lib/profile-media-optimization';

interface ProfileOptimizationContextType {
  isOptimized: boolean;
  optimizationStats: {
    profileLoadTime: number;
    bookmarkLoadTime: number;
    cacheHitRate: number;
    memoryUsage: number;
  };
  performanceMonitoring: {
    isEnabled: boolean;
    metrics: any;
  };
  mobile: {
    isMobile: boolean;
    networkSpeed: string;
    optimizedSettings: {
      cacheTime: number;
      batchSize: number;
      imageQuality: number;
    };
  };
  optimizeForUser: (username: string) => Promise<void>;
  invalidateUserCache: (username: string, type?: 'profile' | 'bookmarks' | 'all') => void;
  getOptimizationReport: () => any;
}

const ProfileOptimizationContext = createContext<ProfileOptimizationContextType | null>(null);

export const useProfileOptimizationContext = () => {
  const context = useContext(ProfileOptimizationContext);
  if (!context) {
    throw new Error('useProfileOptimizationContext must be used within a ProfileOptimizationProvider');
  }
  return context;
};

interface ProfileOptimizationProviderProps {
  children: React.ReactNode;
}

export const ProfileOptimizationProvider: React.FC<ProfileOptimizationProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [isOptimized, setIsOptimized] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState({
    profileLoadTime: 0,
    bookmarkLoadTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
  });
  const [performanceMonitoring, setPerformanceMonitoring] = useState({
    isEnabled: false,
    metrics: null,
  });
  const [mobile, setMobile] = useState({
    isMobile: false,
    networkSpeed: '4g',
    optimizedSettings: {
      cacheTime: 120000,
      batchSize: 10,
      imageQuality: 0.8,
    },
  });

  // Initialize optimization system
  useEffect(() => {
    const initializeOptimization = async () => {
      try {
        console.log('🚀 Initializing global profile optimization system');
        
        // Initialize main optimizer
        profileOptimizer.initialize(queryClient);
        
        // Setup mobile optimizations
        const mobileOptimizations = profileOptimizer.getMobileOptimizations();
        setMobile({
          isMobile: mobileOptimizations.isMobile,
          networkSpeed: mobileOptimizations.networkSpeed,
          optimizedSettings: {
            cacheTime: mobileOptimizations.cacheTime,
            batchSize: mobileOptimizations.adaptations.batchSize,
            imageQuality: mobileOptimizations.isMobile ? 0.7 : 0.8,
          },
        });
        
        // Enable performance monitoring
        setPerformanceMonitoring({
          isEnabled: true,
          metrics: profileOptimizer.getMetrics(),
        });
        
        setIsOptimized(true);
        console.log('✅ Global profile optimization system initialized');
      } catch (error) {
        console.error('❌ Profile optimization initialization failed:', error);
      }
    };

    initializeOptimization();
  }, [queryClient]);

  // Update optimization stats periodically
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

      setPerformanceMonitoring(prev => ({
        ...prev,
        metrics: {
          ...mainStats,
          database: dbStats,
          media: mediaStats,
        },
      }));
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isOptimized]);

  const optimizeForUser = useCallback(async (username: string) => {
    if (!isOptimized) return;

    try {
      console.log('🔄 Optimizing profile for user:', username);
      
      // Optimize profile load
      await profileOptimizer.optimizeProfileLoad(username, queryClient);
      
      // Prefetch profile data
      await profileDatabaseOptimizer.prefetchRelatedData(username);
      
      // Setup media optimization
      const profileData = await profileDatabaseOptimizer.loadProfileBatch(username);
      profileMediaOptimizer.setupPrefetching(profileData);
      
      console.log('✅ Profile optimization completed for:', username);
    } catch (error) {
      console.error('❌ Profile optimization failed for user:', username, error);
    }
  }, [isOptimized, queryClient]);

  const invalidateUserCache = useCallback((username: string, type: 'profile' | 'bookmarks' | 'all' = 'all') => {
    if (!isOptimized) return;

    console.log('🗑️ Invalidating cache for user:', username, 'type:', type);
    profileDatabaseOptimizer.invalidateUserCache(username, type);
  }, [isOptimized]);

  const getOptimizationReport = useCallback(() => {
    if (!isOptimized) return null;

    return {
      isOptimized,
      optimizationStats,
      performanceMonitoring,
      mobile,
      mainOptimizer: profileOptimizer.getMetrics(),
      databaseOptimizer: profileDatabaseOptimizer.getPerformanceStats(),
      mediaOptimizer: profileMediaOptimizer.getOptimizationStats(),
    };
  }, [isOptimized, optimizationStats, performanceMonitoring, mobile]);

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

  const value: ProfileOptimizationContextType = {
    isOptimized,
    optimizationStats,
    performanceMonitoring,
    mobile,
    optimizeForUser,
    invalidateUserCache,
    getOptimizationReport,
  };

  return (
    <ProfileOptimizationContext.Provider value={value}>
      {children}
    </ProfileOptimizationContext.Provider>
  );
};

export default ProfileOptimizationProvider;