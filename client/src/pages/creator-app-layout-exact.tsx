import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCreatorAuth } from '@/contexts/CreatorAuthContext';
import { apiRequest } from '@/lib/queryClient';
import { CreatorGroupChats } from '@/components/creator-group-chats';
import { CreatorCalendar } from '@/components/creator-calendar';
import MuxVideoPlayer from '@/components/mux-video-player';
import { useComprehensiveProfileOptimization, useOptimizedProfileImage, useVirtualScrolling } from '@/hooks/useProfileOptimization';
import { profileOptimizer } from '@/lib/profile-optimization';
import { profileDatabaseOptimizer } from '@/lib/profile-database-optimization';
import { profileMediaOptimizer } from '@/lib/profile-media-optimization';
import { getCreatorAvatarUrl } from '@/lib/creator-avatar-utils';
import { usePaginatedReels } from '@/hooks/usePaginatedReels';
import { 
  Home, 
  Play, 
  User, 
  MessageCircle,
  Calendar as CalendarIcon,
  Heart,
  Check,
  Bookmark,
  Share2,
  ChevronLeft,
  ThumbsDown,
  Plus,
  Minus,
  X,
  Download,
  FileText,
  Copy,
  LogOut
} from 'lucide-react';
import { SiInstagram, SiTiktok, SiX, SiFacebook, SiYoutube, SiSnapchat } from 'react-icons/si';

// Helper function to render platform icons
const renderPlatformIcon = (platformType: string) => {
  const iconProps = { size: 14, className: "text-white" };
  
  switch (platformType?.toLowerCase()) {
    case 'instagram':
      return <SiInstagram {...iconProps} />;
    case 'tiktok':
      return <SiTiktok {...iconProps} />;
    case 'twitter':
      return <SiX {...iconProps} />;
    case 'facebook':
      return <SiFacebook {...iconProps} />;
    case 'youtube':
      return <SiYoutube {...iconProps} />;
    case 'snapchat':
      return <SiSnapchat {...iconProps} />;
    case 'onlyfans':
      return <span className="text-white text-sm">🔥</span>;
    default:
      return <span className="text-white text-sm">📱</span>;
  }
};

// Cloudinary video optimization utility with smart fallback
const optimizeVideoUrl = (originalUrl: string): string => {
  if (!originalUrl || !originalUrl.includes('/uploads/')) {
    return originalUrl;
  }
  
  // Extract filename from local path (e.g., "/uploads/file-123.mov" -> "file-123")
  const filename = originalUrl.split('/').pop()?.split('.')[0];
  if (!filename) {
    return originalUrl;
  }
  
  // Return Cloudinary optimized URL with automatic format and quality optimization
  // Note: This will be used as the primary URL, with fallback handled by onError events
  return `https://res.cloudinary.com/dlewnypg/video/upload/f_auto,q_auto/${filename}.mp4`;
};

// Enhanced fallback handler for failed video loads with smart error handling
const handleVideoLoadError = (e: React.SyntheticEvent<HTMLVideoElement>, originalUrl: string, contentId?: number, setBrokenVideos?: React.Dispatch<React.SetStateAction<Set<number>>>, setCurrentContentIndex?: React.Dispatch<React.SetStateAction<number>>, feedContent?: any[], currentContentIndex?: number) => {
  const video = e.target as HTMLVideoElement;
  
  // If this was a Cloudinary URL that failed, try the original local URL
  if (video.src.includes('cloudinary.com')) {
    console.log('🔄 Cloudinary optimization failed, falling back to local URL:', originalUrl);
    video.src = originalUrl;
    return;
  }
  
  // If local URL also fails, this video is broken
  console.error('❌ Video failed to load completely:', video.src);
  video.style.display = 'none';
  
  // Track this as a broken video and flag for admin
  if (contentId && setBrokenVideos) {
    console.log('🚫 Flagging broken video for admin review:', contentId);
    setBrokenVideos(prev => {
      const newSet = new Set(prev);
      newSet.add(contentId);
      
      // Report broken video to admin endpoint
      if (window.location.hostname !== 'localhost') {
        fetch('/api/report-broken-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contentId, 
            fileUrl: originalUrl,
            error: 'Video failed to load',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.log('Failed to report broken video:', err));
      }
      
      return newSet;
    });
    
    // Auto-skip to next video if we have the necessary functions and data
    if (setCurrentContentIndex && feedContent && typeof currentContentIndex === 'number') {
      setTimeout(() => {
        const nextIndex = currentContentIndex + 1;
        if (nextIndex < feedContent.length) {
          console.log('⏭️ Auto-skipping broken video to next content');
          setCurrentContentIndex(nextIndex);
        } else {
          console.log('📝 Reached end of feed with broken video');
        }
      }, 1000); // Small delay to show error briefly before skipping
    }
  }
  
  // Show brief error message (will be hidden when auto-skip occurs)
  const container = video.parentElement;
  if (container) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'w-full h-full bg-gray-900 flex items-center justify-center';
    errorDiv.innerHTML = `
      <div class="text-center text-white">
        <div class="text-4xl mb-3">📱</div>
        <p class="text-lg font-bold mb-2">Video Unavailable</p>
        <p class="text-gray-300 text-sm">Skipping to next content...</p>
      </div>
    `;
    container.appendChild(errorDiv);
  }
};

interface CreatorAppLayoutExactProps {
  isAdminPreview?: boolean;
}

export default function CreatorAppLayoutExact({ isAdminPreview = false }: CreatorAppLayoutExactProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'feed' | 'chat' | 'calendar' | 'profile'>('home');
  const [homeActiveSection, setHomeActiveSection] = useState<'onlyfans' | 'social'>('onlyfans');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [dismissedContent, setDismissedContent] = useState<Set<number>>(new Set());
  const [likedContent, setLikedContent] = useState<Set<number>>(new Set());
  const [bookmarkedContent, setBookmarkedContent] = useState<Set<number>>(new Set());
  const [showBookmarkViewer, setShowBookmarkViewer] = useState(false);
  const [selectedBookmarkCategory, setSelectedBookmarkCategory] = useState<string | null>(null);
  const [bookmarkFeedMode, setBookmarkFeedMode] = useState(false);
  const [selectedCustomContent, setSelectedCustomContent] = useState<any>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedPriorityContent, setSelectedPriorityContent] = useState<any>(null);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showVideoExportModal, setShowVideoExportModal] = useState(false);
  const [selectedVideoForExport, setSelectedVideoForExport] = useState<any>(null);
  const [showAestheticModal, setShowAestheticModal] = useState(false);
  const [appliedAesthetic, setAppliedAesthetic] = useState<any>(null);
  const [isApplyingTheme, setIsApplyingTheme] = useState(false);
  const [selectedAesthetic, setSelectedAesthetic] = useState<any>(null);
  const [brokenVideos, setBrokenVideos] = useState<Set<number>>(new Set());
  const [showComingSoonPopup, setShowComingSoonPopup] = useState(false);
  
  // Circuit breaker state to prevent accumulating API failures
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const FAILURE_THRESHOLD = 3; // Open circuit after 3 consecutive failures
  
  const { creatorUsername, creatorId, isCreatorAuthenticated } = useCreatorAuth();
  const queryClient = useQueryClient();

  // ⚡ EFFICIENT CACHE MANAGEMENT - Static keys with refresh mechanism
  const [cacheRefreshTrigger, setCacheRefreshTrigger] = useState(0);
  const refreshContent = useCallback(() => {
    setCacheRefreshTrigger(prev => prev + 1);
  }, []);



  // ⚡ PROFILE OPTIMIZATION SYSTEM INTEGRATION
  const profileOptimization = useComprehensiveProfileOptimization(creatorUsername || '', true);
  const profileImageOptimization = useOptimizedProfileImage(null, true);
  
  // Initialize profile optimization on component mount
  useEffect(() => {
    if (creatorUsername && isCreatorAuthenticated) {
      console.log('🚀 Initializing profile optimization for:', creatorUsername);
      profileOptimization.optimizeProfileLoad?.();
    }
  }, [creatorUsername, isCreatorAuthenticated]);
  
  // Prefetch profile data when profile tab is about to be activated
  useEffect(() => {
    if (activeTab === 'profile' && creatorUsername) {
      console.log('📈 Profile tab activated - prefetching data');
      profileOptimization.prefetchProfileData?.();
    }
  }, [activeTab, creatorUsername]);

  // Helper function to check video format compatibility
  const checkVideoCompatibility = (fileName: string) => {
    const browserAgent = navigator.userAgent.toLowerCase();
    const isChrome = browserAgent.includes('chrome');
    const isSafari = browserAgent.includes('safari') && !browserAgent.includes('chrome');
    const isFirefox = browserAgent.includes('firefox');
    const isEdge = browserAgent.includes('edge');
    
    const fileExt = fileName.toLowerCase().split('.').pop();
    
    // Define format compatibility matrix
    const formatSupport = {
      'mp4': { chrome: true, safari: true, firefox: true, edge: true },
      'webm': { chrome: true, safari: false, firefox: true, edge: true },
      'mov': { chrome: false, safari: true, firefox: false, edge: false },
      'avi': { chrome: false, safari: false, firefox: false, edge: false },
      'mkv': { chrome: false, safari: false, firefox: false, edge: false }
    };
    
    const currentBrowser = isChrome ? 'chrome' : isSafari ? 'safari' : isFirefox ? 'firefox' : 'edge';
    const isSupported = formatSupport[fileExt as keyof typeof formatSupport]?.[currentBrowser as keyof typeof formatSupport.mp4] || false;
    
    return { isSupported, fileExt, currentBrowser };
  };

  // Helper function to create enhanced video error display
  const createVideoErrorDisplay = (container: HTMLElement, fileUrl: string, contentId: number) => {
    const fileName = fileUrl?.split('/').pop() || '';
    const { isSupported, fileExt, currentBrowser } = checkVideoCompatibility(fileName);
    
    let errorMessage = 'This video file could not be loaded';
    let suggestion = '';
    let icon = '📱';
    
    if (fileExt === 'mov') {
      icon = '🎬';
      if (currentBrowser === 'firefox') {
        errorMessage = 'MOV files are not supported in Firefox';
        suggestion = 'For best experience, use Chrome, Safari, or request MP4 format';
      } else if (currentBrowser === 'chrome') {
        errorMessage = 'This MOV file cannot be played in Chrome';
        suggestion = 'MOV format works best in Safari. Consider requesting MP4 format for universal compatibility';
      } else if (currentBrowser === 'edge') {
        errorMessage = 'MOV files are not supported in Edge';
        suggestion = 'Try Chrome, Safari, or request MP4 format for better compatibility';
      } else {
        errorMessage = 'MOV file playback issue';
        suggestion = 'For universal compatibility, MP4 format is recommended';
      }
    } else if (!isSupported) {
      errorMessage = `${fileExt?.toUpperCase()} format is not supported in ${currentBrowser}`;
      suggestion = 'MP4 format provides the best cross-browser compatibility';
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'w-full h-full bg-gradient-to-br from-red-900/30 to-purple-900/20 flex items-center justify-center p-6';
    errorDiv.innerHTML = `
      <div class="text-center text-white max-w-sm">
        <div class="text-4xl mb-3">${icon}</div>
        <h2 class="text-lg font-bold mb-2">Video Format Issue</h2>
        <p class="text-gray-300 mb-3 text-sm">${errorMessage}</p>
        ${suggestion ? `<p class="text-blue-200 mb-3 text-xs italic">${suggestion}</p>` : ''}
        <div class="text-xs text-gray-400 space-y-1 bg-black/20 rounded p-2">
          <p>File: ${fileName}</p>
          <p>Format: ${fileExt?.toUpperCase()} | Browser: ${currentBrowser}</p>
          <p>Content ID: ${contentId}</p>
        </div>
        <div class="mt-3 text-xs text-yellow-200">
          💡 For creators: Upload as MP4 for best compatibility
        </div>
      </div>
    `;
    
    container.innerHTML = '';
    container.appendChild(errorDiv);
  };
  
  // Video management for optimized autoplay (only current video)
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [playingVideos, setPlayingVideos] = useState<Set<number>>(new Set());
  const [visibleVideos, setVisibleVideos] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  


  // Fetch assigned inspiration pages for this creator
  const { data: assignedPages = [], isLoading: isPagesLoading } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/assigned-pages`],
    queryFn: async () => {
      if (!creatorUsername || isAdminPreview) {
        // For admin preview, show sample data
        return [
          {
            id: 4,
            title: 'gloriver',
            description: 'Instagram content creation',
            pageType: 'feed',
            platformType: 'Instagram',
            createdAt: new Date().toISOString()
          }
        ];
      }
      const response = await apiRequest('GET', `/api/creator/${creatorUsername}/assigned-pages`);
      return response.json();
    },
    enabled: !!creatorUsername,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  // Use paginated reels hook for Feed tab content
  const {
    reels: paginatedReels,
    isLoading: isPaginatedLoading,
    isLoadingMore: isLoadingMoreReels,
    hasMoreReels,
    loadMoreReels,
    refreshReels,
    totalCount: totalReelsCount,
    loadedCount: loadedReelsCount,
  } = usePaginatedReels({
    creatorUsername: creatorUsername || '',
    assignedPages: assignedPages || [],
    pageSize: 2, // Load 2 reels at a time
  });

  // Fetch customs content for this creator
  const { data: customsContent = [], isLoading: isCustomsLoading } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/custom-contents`],
    queryFn: async () => {
      if (!creatorUsername || isAdminPreview) {
        return [];
      }
      
      const response = await apiRequest('GET', `/api/creator/${creatorUsername}/custom-contents`);
      const customs = await response.json();
      return customs;
    },
    enabled: !!creatorUsername,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  // Fetch priority content for this creator
  const { data: priorityContent = [], isLoading: isPriorityLoading } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/priority-content`],
    queryFn: async () => {
      if (!creatorUsername || isAdminPreview) {
        // Query skipped
        return [];
      }
      
      // Fetching priority content
      const response = await apiRequest('GET', `/api/creator/${creatorUsername}/priority-content`);
      const priority = await response.json();
      // Priority content loaded
      return priority;
    },
    enabled: !!creatorUsername && !isAdminPreview,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  // Fetch content for a specific selected page (for home tab individual pages)
  const { data: selectedPageContent = [], isLoading: isSelectedPageLoading } = useQuery({
    queryKey: [`/api/creator/pages/${selectedCategory?.id}/content`, selectedCategory?.id],
    queryFn: async () => {
      if (!creatorUsername || !selectedCategory?.id) return [];
      
      const response = await apiRequest('GET', `/api/creator/pages/${selectedCategory.id}/content`);
      return response.json();
    },
    enabled: !!creatorUsername && !!selectedCategory?.id,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  // Fetch all content from all assigned pages (for global feed mode)
  const { data: globalFeedContent = [], isLoading: isGlobalFeedLoading } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/all-content`],
    queryFn: async () => {
      if (!creatorUsername || !assignedPages || !Array.isArray(assignedPages) || assignedPages.length === 0) {
        return [];
      }
      
      // Circuit breaker: Don't make API calls if circuit is open
      if (circuitBreakerOpen) {
        console.warn('Circuit breaker is open - skipping global content fetch to prevent errors');
        return [];
      }
      
      // Fetch content from all assigned pages with comprehensive error handling
      const contentPromises = assignedPages.map(async (page: any) => {
        try {
          const response = await apiRequest('GET', `/api/creator/pages/${page.id}/content`);
          const content = await response.json();
          
          // Add page information to each content item
          return content.map((item: any) => ({
            ...item,
            sourcePage: {
              id: page.id,
              title: page.title,
              platformType: page.platformType || page.title
            }
          }));
        } catch (error) {
          // Increment failure count for circuit breaker
          setFailureCount(prev => {
            const newCount = prev + 1;
            if (newCount >= FAILURE_THRESHOLD) {
              console.warn('Circuit breaker opening - too many API failures');
              setCircuitBreakerOpen(true);
              // Reset circuit breaker after 30 seconds
              setTimeout(() => {
                console.log('Circuit breaker resetting');
                setCircuitBreakerOpen(false);
                setFailureCount(0);
              }, 30000);
            }
            return newCount;
          });
          
          // Silently handle errors to prevent browser error accumulation
          console.warn(`Global feed content fetch failed for page ${page.id} (${page.title}):`, error instanceof Error ? error.message : 'Unknown error');
          return []; // Return empty array instead of throwing
        }
      });
      
      const allContentArrays = await Promise.all(contentPromises);
      const allContent = allContentArrays.flat();
      
      // Sort by creation date (most recent first)
      return allContent.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    enabled: false, // DISABLED - Using paginated reels instead
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    retry: false, // Disable retries to prevent error accumulation
  });

  // Fetch Notion-style blocks for the selected page (contains PDF files and rich content)
  const { data: selectedPageBlocks = [], isLoading: isPageBlocksLoading } = useQuery({
    queryKey: [`/api/creator/pages/${selectedCategory?.id}/blocks`, selectedCategory?.id],
    queryFn: async () => {
      if (!creatorUsername || !selectedCategory?.id) return { blocks: [] };
      
      try {
        const response = await apiRequest('GET', `/api/creator/pages/${selectedCategory.id}/blocks`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.log('No Notion blocks found for this page');
        return { blocks: [] };
      }
    },
    enabled: !!creatorUsername && !!selectedCategory?.id,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  // Fetch banner data for the selected page (creator endpoint)
  const { data: selectedPageBanner } = useQuery({
    queryKey: [`/api/creator/pages/${selectedCategory?.id}/banner`, selectedCategory?.id],
    queryFn: async () => {
      if (!selectedCategory?.id) return null;
      
      try {
        const response = await apiRequest('GET', `/api/creator/pages/${selectedCategory.id}/banner`);
        const data = await response.json();
        return data;
      } catch (error: any) {
        if (error?.message?.includes('404')) {
          return null; // No banner set
        }
        console.log('Error fetching banner:', error);
        return null;
      }
    },
    enabled: !!selectedCategory?.id,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  // Fetch all content for bookmark categorization
  const { data: allContentForBookmarks = [] } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/all-assigned-content-v2`],
    queryFn: async () => {
      if (!creatorUsername || assignedPages.length === 0) return [];
      
      // Circuit breaker: Don't make API calls if circuit is open
      if (circuitBreakerOpen) {
        console.warn('Circuit breaker is open - skipping bookmark content fetch to prevent errors');
        return [];
      }
      
      const contentPromises = assignedPages.map(async (page: any) => {
        try {
          const response = await apiRequest('GET', `/api/creator/pages/${page.id}/content`);
          return response.json();
        } catch (error) {
          // Increment failure count for circuit breaker
          setFailureCount(prev => {
            const newCount = prev + 1;
            if (newCount >= FAILURE_THRESHOLD) {
              console.warn('Circuit breaker opening - too many API failures');
              setCircuitBreakerOpen(true);
              // Reset circuit breaker after 30 seconds
              setTimeout(() => {
                console.log('Circuit breaker resetting');
                setCircuitBreakerOpen(false);
                setFailureCount(0);
              }, 30000);
            }
            return newCount;
          });
          
          // Silently handle errors to prevent browser error accumulation
          console.warn(`Bookmark content fetch failed for page ${page.id}:`, error instanceof Error ? error.message : 'Unknown error');
          return []; // Return empty array instead of throwing
        }
      });
      
      const contentArrays = await Promise.all(contentPromises);
      const flatContent = contentArrays.flat();
      return flatContent;
    },
    enabled: false, // DISABLED - Using paginated reels instead to prevent API overload
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    retry: false, // Disable retries to prevent error accumulation
  });

  // ⚡ OPTIMIZED BOOKMARK QUERY - Enhanced with profile optimization and cache bypass
  const { data: bookmarkData = { folders: [], totalBookmarks: 0 }, isLoading: isBookmarksLoading, refetch: refetchBookmarks, error: bookmarkError } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/bookmarks`],
    enabled: !!creatorUsername,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
    retry: 3, // Intelligent retry with exponential backoff
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async () => {
      console.log('📚 Loading optimized bookmark data for:', creatorUsername);
      
      // Use optimized database loader if available
      if (profileOptimization.isOptimized) {
        try {
          const optimizedData = await profileDatabaseOptimizer.loadBookmarkData(creatorUsername || '');
          const processedData = await profileOptimizer.optimizeBookmarkProcessing(optimizedData);
          console.log('✅ Bookmark data loaded via optimization system');
          return processedData;
        } catch (optimizationError) {
          console.warn('⚠️ Optimization failed, falling back to standard loading:', optimizationError);
        }
      }
      
      // Fallback to standard loading with cache buster
      const response = await fetch(`/api/creator/${creatorUsername}/bookmarks`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        console.error('Bookmark API call failed:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Bookmark API response:', data);
      return data;
    }
  });

  // Extract bookmark folders and total count
  const bookmarkFolders = bookmarkData.folders || [];
  const totalBookmarks = bookmarkData.totalBookmarks || 0;
  
  // ⚡ Virtual scrolling for bookmark folders (must be called after bookmarkFolders is defined)
  const virtualBookmarkFolders = useVirtualScrolling(
    bookmarkFolders,
    70, // Height of each folder item
    300, // Container height
    bookmarkFolders.length > 10 // Only enable virtualization for large lists
  );
  
  // Debug logging for bookmark data
  console.log('Profile Debug - Bookmark Data:', {
    bookmarkData,
    bookmarkFolders,
    totalBookmarks,
    foldersLength: bookmarkFolders.length,
    isBookmarksLoading,
    creatorUsername
  });

  // Force refresh bookmarks when switching to profile tab
  useEffect(() => {
    if (activeTab === 'profile' && creatorUsername) {
      console.log('Profile tab activated - forcing bookmark refresh');
      refetchBookmarks();
      
      // ⚡ Profile optimization: invalidate cache when switching to profile
      if (profileOptimization.isOptimized) {
        profileOptimization.invalidateProfileCache?.('all');
      }
    }
  }, [activeTab, creatorUsername, refetchBookmarks, profileOptimization]);

  // Database-backed bookmark system - no longer need localStorage helper functions

  // Load persistent state from localStorage
  useEffect(() => {
    if (creatorUsername) {
      // Load dismissed content from localStorage
      const savedDismissed = localStorage.getItem(`dismissed_${creatorUsername}`);
      if (savedDismissed) {
        setDismissedContent(new Set(JSON.parse(savedDismissed)));
      }
      
      // Load completed content from localStorage
      const savedCompleted = localStorage.getItem(`liked_${creatorUsername}`);
      if (savedCompleted) {
        setLikedContent(new Set(JSON.parse(savedCompleted)));
      }
    }
  }, [creatorUsername]);

  // Separate effect for syncing bookmarks from database to avoid infinite loop
  useEffect(() => {
    if (creatorUsername && Array.isArray(bookmarkFolders) && bookmarkFolders.length > 0) {
      // Extract bookmarked content IDs from database for state synchronization
      const bookmarkedIds: number[] = [];
      bookmarkFolders.forEach((folder: any) => {
        if (folder.items && Array.isArray(folder.items)) {
          folder.items.forEach((item: any) => {
            if (item.id) {
              bookmarkedIds.push(item.id);
            }
          });
        }
      });
      
      // Reduce logging for performance
      
      // Always update state from database - it's the source of truth
      setBookmarkedContent(new Set(bookmarkedIds));
    } else if (creatorUsername && Array.isArray(bookmarkFolders) && bookmarkFolders.length === 0) {
      // Clear bookmarks if no folders exist
      setBookmarkedContent(new Set());
    }
  }, [creatorUsername, JSON.stringify(bookmarkFolders)]); // Use JSON.stringify to avoid reference issues

  // React Query mutations for creator engagement
  const dislikeMutation = useMutation({
    mutationFn: async ({ contentId, pageId }: { contentId: number; pageId?: number }) => {
      if (!creatorUsername) return;
      
      // Mutation processing
      
      // Send to server with correct endpoint and payload
      const response = await apiRequest("POST", `/api/creator/${creatorUsername}/feed-engagement`, {
        contentId,
        pageId,
        action: 'dislike'
      });
      return response.json();
    },
    onSuccess: async () => {
      // Success - invalidating queries
      // Invalidate relevant queries using partial key matching to bypass cache
      await queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().includes(`/api/creator/${creatorUsername}/content`) ||
          query.queryKey[0]?.toString().includes(`/api/creator/${creatorUsername}/engagements`)
      });
    },
    onError: (error) => {
      console.error('[DISLIKE MUTATION] Error:', error);
    }
  });

  const likeMutation = useMutation({
    mutationFn: async ({ contentId, pageId }: { contentId: number; pageId?: number }) => {
      if (!creatorUsername) return;
      
      // Like mutation processing
      
      // Send to server with correct endpoint and payload
      const response = await apiRequest("POST", `/api/creator/${creatorUsername}/feed-engagement`, {
        contentId,
        pageId,
        action: 'like'
      });
      return response.json();
    },
    onSuccess: async () => {
      // Success - invalidating queries
      // Invalidate relevant queries using partial key matching to bypass cache
      await queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().includes(`/api/creator/${creatorUsername}/content`) ||
          query.queryKey[0]?.toString().includes(`/api/creator/${creatorUsername}/engagements`)
      });
    },
    onError: (error) => {
      console.error('[LIKE MUTATION] Error:', error);
    }
  });

  const bookmarkMutation = useMutation({
    mutationFn: async ({ contentId, isBookmarked }: { contentId: number; isBookmarked: boolean }) => {
      if (!creatorUsername) return;
      
      console.log(`[BOOKMARK MUTATION] ${isBookmarked ? 'Removing' : 'Adding'} bookmark for content ${contentId}`);
      
      // Save to database via API
      const response = await apiRequest("POST", `/api/creator/${creatorUsername}/content/${contentId}/bookmark`, {
        bookmarked: !isBookmarked
      });
      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Bookmark mutation success
      
      // Invalidate bookmark queries using partial key matching to bypass cache
      await queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().includes(`/api/creator/${creatorUsername}/bookmarks`)
      });
      
      // Also update local state for immediate UI feedback
      setBookmarkedContent(prev => {
        const newSet = new Set(prev);
        if (data?.bookmarked) {
          newSet.add(variables.contentId);
        } else {
          newSet.delete(variables.contentId);
        }
        return newSet;
      });
    },
    onError: (error) => {
      console.error('Bookmark mutation error:', error);
    }
  });

  // Initialize intersection observer for video optimization
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisibleVideos = new Set(visibleVideos);
        
        entries.forEach((entry) => {
          const contentId = parseInt(entry.target.getAttribute('data-content-id') || '0');
          if (entry.isIntersecting) {
            newVisibleVideos.add(contentId);
          } else {
            newVisibleVideos.delete(contentId);
            // Pause videos that are no longer visible
            const video = videoRefs.current.get(contentId);
            if (video && !video.paused) {
              video.pause();
            }
          }
        });
        
        setVisibleVideos(newVisibleVideos);
      },
      {
        threshold: 0.5, // Video must be 50% visible
        rootMargin: '100px 0px' // Load videos slightly before they come into view
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Register video refs for playback control (optimized)
  const setVideoRef = useCallback((contentId: number) => (element: HTMLVideoElement | null) => {
    if (element) {
      videoRefs.current.set(contentId, element);
      // Observe video element for intersection
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      const video = videoRefs.current.get(contentId);
      if (video && observerRef.current) {
        observerRef.current.unobserve(video);
      }
      videoRefs.current.delete(contentId);
    }
  }, []);

  // Fetch content categories for filtering
  const { data: contentCategories = [] } = useQuery({
    queryKey: ['/api/content-categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/content-categories`);
      return response.json();
    },
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  // Fetch content for selected page or all content when in bookmark mode
  // Get bookmarked content for the selected category 
  const { data: bookmarkedContentData = [] } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/bookmarks/${selectedBookmarkCategory}`],
    queryFn: async () => {
      if (!creatorUsername || !selectedBookmarkCategory) return [];
      
      // Get the folder data for the selected category
      const folder = bookmarkFolders.find((f: any) => f.name === selectedBookmarkCategory);
      return folder ? folder.items : [];
    },
    enabled: bookmarkFeedMode && !!creatorUsername && !!selectedBookmarkCategory,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  const { data: assignedContent = [], isLoading: isFeedLoading } = useQuery({
    queryKey: [`/api/creator/pages/${selectedCategory?.id}/content`],
    queryFn: async () => {
      if (selectedCategory?.id) {
        try {
          const response = await apiRequest('GET', `/api/creator/pages/${selectedCategory.id}/content`);
          const data = await response.json();
          return data;
        } catch (error) {
          console.warn(`Content fetch failed for page ${selectedCategory.id}:`, error instanceof Error ? error.message : 'Unknown error');
          return [];
        }
      }
      return [];
    },
    enabled: !!selectedCategory?.id,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
    retry: false, // Disable retries to prevent error accumulation
  });

  // Fetch default feed content (all Feed Tab content when no category selected)
  const { data: defaultFeedContent = [], isLoading: isDefaultFeedLoading } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/default-feed-content`],
    queryFn: async () => {
      if (!creatorUsername || assignedPages.length === 0) return [];
      
      // Get all Feed Tab pages (pageType === 'feed')
      const feedPages = assignedPages.filter((page: any) => page.pageType === 'feed');
      
      if (feedPages.length === 0) return [];
      
      // Fetch content from all Feed Tab pages with error handling to prevent "Failed to fetch" accumulation
      const contentPromises = feedPages.map(async (page: any) => {
        try {
          const response = await apiRequest('GET', `/api/creator/pages/${page.id}/content`);
          const content = await response.json();
          
          // Add page information to each content item for labeling
          return content.map((item: any) => ({
            ...item,
            _sourcePageTitle: page.title,
            _sourcePageId: page.id
          }));
        } catch (error) {
          // Silently handle errors to prevent "99+" error notification accumulation
          console.warn(`Content fetch failed for page ${page.id} (${page.title}):`, error instanceof Error ? error.message : 'Unknown error');
          return []; // Return empty array instead of throwing
        }
      });
      
      const contentArrays = await Promise.all(contentPromises);
      const allContent = contentArrays.flat();
      
      // Sort by creation date (newest first) for chronological order
      const sortedContent = allContent.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      return sortedContent;
    },
    enabled: !!creatorUsername && assignedPages.length > 0,
    staleTime: 0, // Zero cache for fresh data
    gcTime: 0, // Zero garbage collection time
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
    retry: false, // Disable retries to prevent error accumulation
  });

  // Performance optimization - limit simultaneous video rendering
  const [virtualStartIndex, setVirtualStartIndex] = useState(0);
  


  // Filter content based on feed type - separate logic for regular feeds vs bookmark folders
  const feedContent = useMemo(() => {
    let sourceContent = [];
    
    if (bookmarkFeedMode) {
      // Profile tab → Bookmark folder view: Only show bookmarked content
      sourceContent = bookmarkedContentData;
      // Don't filter out dismissed/liked content in bookmark mode - show all bookmarked items
      return sourceContent || [];
    } else if (!selectedCategory) {
      // Global Feed Tab Mode: Show all content from all assigned pages, sorted chronologically  
      // Use defaultFeedContent to reduce API load and prevent errors
      sourceContent = defaultFeedContent;
    } else {
      // Home tab → Feed tab page: Show ALL content assigned to that page
      sourceContent = assignedContent;
    }
    
    if (!sourceContent || !Array.isArray(sourceContent)) return [];
    
    // CRITICAL: Display ALL uploaded content without filtering (per user requirement)
    // User demands all uploaded content must always be displayed unless manually removed from CRM
    // No filtering based on interactions - all content must show
    return sourceContent || [];
  }, [assignedContent, globalFeedContent, dismissedContent, likedContent, bookmarkFeedMode, selectedBookmarkCategory, bookmarkedContent, selectedCategory, bookmarkedContentData]);

  // Show all content - no virtual scrolling limitation
  useEffect(() => {
    // Always start from index 0 to show all content
    if (virtualStartIndex !== 0) {
      setVirtualStartIndex(0);
    }
  }, [feedContent.length]);

  // Video autoplay control - handle play/pause based on current content index (OPTIMIZED)
  useEffect(() => {
    // Get current content to determine if it's a video
    const currentContent = feedContent[currentContentIndex];
    if (!currentContent) return;

    // Play current video if it exists
    if (currentContent.fileType?.startsWith('video/') || currentContent.fileType === 'video') {
      const currentVideo = videoRefs.current.get(currentContent.id);
      if (currentVideo) {
        currentVideo.play().catch(e => console.log('Video play failed:', e));
        setPlayingVideos(prev => {
          const newSet = new Set(prev);
          newSet.add(currentContent.id);
          return newSet;
        });
      }
    }

    // Pause all other videos
    videoRefs.current.forEach((video, contentId) => {
      if (contentId !== currentContent.id) {
        video.pause();
        setPlayingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(contentId);
          return newSet;
        });
      }
    });
  }, [currentContentIndex, feedContent]);

  // Group assigned pages by platform type for display
  const groupedPages: {
    priority: any[];
    onlyfans: any[];
    social: any[];
  } = {
    priority: [...priorityContent, ...assignedPages.filter((page: any) => page.isPriority === true)],
    onlyfans: assignedPages.filter((page: any) => page.platformType === 'OnlyFans'),
    social: assignedPages.filter((page: any) => 
      ['Instagram', 'Twitter', 'Facebook', 'YouTube', 'TikTok', 'Snapchat', 'OFTV'].includes(page.platformType)
    )
  };

  // ⚡ OPTIMIZED PROFILE DATA QUERY - Enhanced with profile optimization
  const { data: creatorProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/profile`],
    queryFn: async () => {
      if (!creatorUsername) return null;
      
      console.log('👤 Loading optimized profile data for:', creatorUsername);
      
      // Use optimized database loader if available
      if (profileOptimization.isOptimized) {
        try {
          const optimizedData = await profileDatabaseOptimizer.loadProfileData(creatorUsername);
          console.log('✅ Profile data loaded via optimization system');
          return optimizedData;
        } catch (optimizationError) {
          console.warn('⚠️ Profile optimization failed, falling back to standard loading:', optimizationError);
        }
      }
      
      // Fallback to standard loading
      const response = await apiRequest('GET', `/api/creator/${creatorUsername}/profile`);
      return response.json();
    },
    enabled: !!creatorUsername,
    staleTime: profileOptimization.mobile?.optimizedSettings?.cacheTime || 120000, // 2 minutes - optimized for mobile
    gcTime: 300000, // 5 minutes - extended cache retention
    refetchOnMount: false, // Optimization: don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Optimization: don't refetch on window focus
    retry: 3, // Intelligent retry with exponential backoff
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Generate display username after profile is available
  const displayUsername = isAdminPreview ? 'admin_preview' : (creatorProfile?.displayName || creatorUsername || 'admin_preview');

  // Fetch current aesthetic assignment for creator
  const { data: currentAesthetic } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/current-aesthetic`],
    queryFn: async () => {
      if (!creatorUsername || isAdminPreview) return null;
      try {
        const response = await apiRequest('GET', `/api/creator/${creatorUsername}/current-aesthetic`);
        return response.json();
      } catch (error: any) {
        // If no aesthetic is assigned (404), return null instead of throwing error
        if (error.message && error.message.includes('404')) {
          console.log('🎨 No aesthetic template assigned to creator, using default');
          return null;
        }
        // Re-throw other errors
        throw error;
      }
    },
    enabled: !!creatorUsername && !isAdminPreview,
    staleTime: 60000, // 1 minute cache
  });

  // Fetch available aesthetic templates for selection
  const { data: availableAesthetics = [], error: aestheticsError, isLoading: aestheticsLoading } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/available-aesthetics-v5`], // Force fresh cache
    queryFn: async () => {
      console.log('🎨 Fetching aesthetics for creator:', creatorUsername);
      try {
        const response = await fetch(`/api/creator/${creatorUsername}/available-aesthetics`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('🎨 Aesthetics result:', result);
        console.log('🎨 Aesthetics result length:', result?.length);
        return result;
      } catch (error) {
        console.error('🎨 Aesthetics API error:', error);
        throw error;
      }
    },
    enabled: !!creatorUsername && !isAdminPreview,
    staleTime: 0, // No cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1, // Only retry once to avoid infinite loops
  });

  // Fetch all content for social media pages to calculate stats
  const { data: allSocialContent = [] } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/social-content`],
    queryFn: async () => {
      if (!creatorUsername || groupedPages.social.length === 0) return [];
      
      // Fetch content for all social media pages
      const contentPromises = groupedPages.social.map(async (page: any) => {
        const response = await apiRequest('GET', `/api/creator/pages/${page.id}/content`);
        return response.json();
      });
      
      const contentArrays = await Promise.all(contentPromises);
      return contentArrays.flat(); // Flatten all content into single array
    },
    enabled: false, // DISABLED - Using paginated reels instead to prevent API overload
    staleTime: 30000, // 30 seconds
  });

  // Calculate social media content statistics
  const socialMediaStats = useMemo(() => {
    const totalContent = allSocialContent.length;
    const bookmarkedCount = allSocialContent.filter((content: any) => 
      bookmarkedContent.has(content.id)
    ).length;
    const completedCount = allSocialContent.filter((content: any) => 
      likedContent.has(content.id)
    ).length;
    
    return {
      total: totalContent,
      bookmarked: bookmarkedCount,
      completed: completedCount
    };
  }, [allSocialContent, bookmarkedContent, likedContent]);

  // Handle page selection for feed content
  const handlePageSelect = (page: any) => {
    console.log('🔥 Page selected:', page);
    setSelectedCategory(page);
    if (page.pageType === 'feed') {
      setActiveTab('feed');
    } else if (page.pageType === 'normal') {
      // For normal pages (like OnlyFans content), show content in home tab
      console.log('🔥 Normal page selected - showing content in current view');
      // The content will be loaded via the existing query when selectedCategory changes
    }
  };

  console.log('Creator App Debug:', {
    creatorUsername,
    isAdminPreview,
    assignedPages: assignedPages.length,
    priorityContent: priorityContent.length,
    priorityContentItems: priorityContent,
    groupedPages: {
      priority: groupedPages.priority.length,
      onlyfans: groupedPages.onlyfans.length,
      social: groupedPages.social.length
    },
    selectedCategory,
    feedContent: feedContent.length
  });

  const renderPageCard = (page: any) => {
    // Check if this is priority content from the priority_content table
    const isPriorityContent = page.type === 'priority' || page.isPriority === true;
    
    return (
      <div
        key={page.id}
        onClick={() => {
          console.log('Page card clicked:', { 
            id: page.id, 
            title: page.title, 
            type: page.type, 
            isPriority: page.isPriority, 
            isPriorityContent 
          });
          
          if (isPriorityContent) {
            console.log('Opening priority content modal for:', page.title);
            // Handle priority content display - show modal or preview
            setSelectedPriorityContent(page);
            setShowPriorityModal(true);
          } else {
            console.log('Handling regular page select for:', page.title);
            handlePageSelect(page);
          }
        }}
        className={`bg-white/90 backdrop-blur-sm rounded-xl p-3 cursor-pointer hover:bg-white hover:scale-[1.02] transition-all duration-200 shadow-sm border ${
          isPriorityContent ? 'border-red-200 bg-red-50/50' : 'border-pink-100'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 bg-gradient-to-br rounded-lg flex items-center justify-center ${
            isPriorityContent ? 'from-red-400 to-orange-400' : 'from-pink-400 to-rose-400'
          }`}>
            <span className="text-white text-sm font-bold">
              {isPriorityContent ? '🚨' :
               page.platformType === 'Instagram' ? '📸' : 
               page.platformType === 'OnlyFans' ? '🔥' : 
               page.platformType === 'Twitter' ? '🐦' : 
               page.platformType === 'TikTok' ? '🎵' : '📱'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm truncate">{page.title}</h3>
            <p className="text-xs text-gray-600 truncate">
              {isPriorityContent ? 
                `${page.category} • Due: ${new Date(page.dueDate).toLocaleDateString()}` :
                page.description || page.platformType
              }
            </p>
            <div className="flex items-center space-x-2 mt-1">
              {isPriorityContent ? (
                <>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    page.priority === 'high' ? 'bg-red-100 text-red-800' :
                    page.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {page.priority} priority
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {page.status}
                  </span>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded-full text-xs font-medium">
                    {page.platformType}
                  </span>
                  {page.pageType === 'feed' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      Feed
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="text-pink-400">→</div>
        </div>
      </div>
    );
  };

  // Helper function to render customs content cards
  // LOCKED: Custom pricing and ID display - approved logic - do not modify without written confirmation
  const renderCustomsCard = (custom: any) => {
    // Extract price from various possible field names - prioritize requested_price over price
    const price = custom.requested_price || custom.requestedPrice || custom.requestedprice || custom.price || null;
    const formattedPrice = price ? parseFloat(price).toFixed(2) : null;
    
    return (
      <div 
        key={`custom-${custom.id}`} 
        onClick={() => {
          setSelectedCustomContent(custom);
          setShowCustomModal(true);
        }}
        className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 shadow-sm border border-purple-100 hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02]"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">💎</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-gray-800 text-sm">Custom Content Request</h3>
              {custom.custom_number && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  #{custom.custom_number}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 truncate">{custom.description}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                {custom.category}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                custom.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                custom.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {custom.status === 'pending_review' ? 'Pending' :
                 custom.status === 'approved' ? 'Approved' : custom.status}
              </span>
              {formattedPrice && (
                <span className="text-xs font-semibold text-green-600">
                  ${formattedPrice}
                </span>
              )}
            </div>
          </div>
          <div className="text-purple-400">💎</div>
        </div>
      </div>
    );
  };

  // Set applied aesthetic when current aesthetic is loaded
  useEffect(() => {
    if (currentAesthetic && !appliedAesthetic) {
      setAppliedAesthetic(currentAesthetic);
    }
  }, [currentAesthetic, appliedAesthetic]);

  // Get the current or applied aesthetic for theme styling
  const activeAesthetic = appliedAesthetic || currentAesthetic;

  return (
    <div 
      className={`creator-app-container flex flex-col ${isAdminPreview ? 'h-full admin-preview' : 'h-screen'}`}
      style={activeAesthetic ? {
        background: activeAesthetic.backgroundColor || '#ffffff',
        color: activeAesthetic.textColor || '#000000',
        backgroundImage: activeAesthetic.bannerUrl ? `url(${activeAesthetic.bannerUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } : {
        background: '#ffffff'
      }}
    >
      
      {/* Home Tab - Dashboard with Categories */}
      {activeTab === 'home' && (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Welcome Header */}
          <div className="relative bg-gradient-to-tr from-pink-300 via-pink-400 to-pink-500 rounded-3xl mx-4 my-4 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0">
              <div className="absolute top-4 left-8 text-pink-200 text-lg animate-bounce" style={{ animationDelay: '0s' }}>✨</div>
              <div className="absolute top-12 right-12 text-pink-100 text-sm animate-pulse" style={{ animationDelay: '1s' }}>💫</div>
              <div className="absolute top-20 left-16 text-pink-200 text-xs animate-bounce" style={{ animationDelay: '2s' }}>✨</div>
              <div className="absolute top-6 right-6 text-pink-100 text-base animate-pulse" style={{ animationDelay: '0.5s' }}>💫</div>
              <div className="absolute bottom-6 left-8 text-pink-200 text-sm animate-bounce" style={{ animationDelay: '1.5s' }}>✨</div>
              <div className="absolute bottom-12 right-20 text-pink-100 text-lg animate-pulse" style={{ animationDelay: '2.5s' }}>💫</div>
            </div>
            
            {/* Main flower */}
            <div className="absolute top-6 right-8 text-3xl animate-pulse" style={{ animationDelay: '1s' }}>🌸</div>
            
            <div className="relative z-10 px-6 py-8 text-center">
              <h1 className="text-2xl font-bold text-pink-900 mb-1">Welcome {displayUsername}!</h1>
              <p className="text-pink-700 font-medium mb-2">Creator Dashboard</p>
              <div className="inline-flex items-center px-3 py-1 bg-pink-200/50 rounded-full text-sm text-pink-800 backdrop-blur-sm">
                🌸 Your Creative Space
              </div>
            </div>
          </div>

          {/* Priority Content Section - Only shows when assigned */}
          {groupedPages.priority && groupedPages.priority.length > 0 && (
            <div className="px-4 mb-4">
              <div className="bg-white rounded-2xl p-4 border-2 border-red-200">
                {/* Priority Content Header */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-base font-semibold text-gray-800">Priority Content</h3>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                    URGENT
                  </span>
                </div>
                
                {/* Priority Content List */}
                <div className="space-y-3">
                  {groupedPages.priority.map((page: any) => renderPageCard(page))}
                </div>
              </div>
            </div>
          )}

          {/* Content Type Tabs */}
          <div className="px-4 mb-4">
            <div className="bg-white rounded-2xl p-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setHomeActiveSection('onlyfans')}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    homeActiveSection === 'onlyfans'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  💎 OnlyFans Content
                </button>
                <button
                  onClick={() => setHomeActiveSection('social')}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    homeActiveSection === 'social'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📱 Social Media Content
                </button>
              </div>
            </div>
          </div>

          {/* OnlyFans Content Section */}
          {homeActiveSection === 'onlyfans' && (
            <div className="px-4 space-y-4">
              {/* If a normal page is selected, show its content */}
              {selectedCategory && selectedCategory.pageType === 'normal' && selectedCategory.platformType === 'OnlyFans' ? (
                <div>
                  {/* Back button above banner */}
                  <div className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        ← Back
                      </button>
                      <span className="text-gray-400">•</span>
                      <span className="text-lg text-pink-600 font-medium">
                        {selectedCategory.title}
                      </span>
                    </div>
                  </div>

                  {/* Display page banner exactly like Notion editor */}
                  {selectedPageBanner?.banner_image_url ? (
                    <div className="w-full mb-4">
                      <img
                        src={selectedPageBanner.banner_image_url}
                        alt={selectedPageBanner.banner_alt_text || `Banner for ${selectedCategory?.title}`}
                        className="w-full h-44 object-cover"
                        onError={(e) => {
                          console.warn('Banner image failed to load:', selectedPageBanner.banner_image_url);
                          // Hide the image element if it fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Page Title like Notion editor */}
                  <div className="px-4">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-4xl">
                        {selectedPageBlocks?.emoji || "📄"}
                      </span>
                      <h1 className="text-4xl font-bold text-gray-900">
                        {selectedPageBlocks?.title || selectedCategory.title}
                      </h1>
                    </div>
                  </div>
                  
                  {/* Page description */}
                  {selectedCategory.description && (
                    <div className="px-4 mb-4">
                      <div className="bg-pink-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{selectedCategory.description}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Notion Page Editor Interface - Exact CRM Match */}
                  <div className="min-h-screen bg-white">
                    {/* Content Blocks */}
                    <div className="px-6 pb-8">
                      {(isSelectedPageLoading || isPageBlocksLoading) ? (
                        <div className="text-center py-8">
                          <div className="text-sm text-gray-500">Loading content...</div>
                        </div>
                      ) : (selectedPageContent.length > 0 || selectedPageBlocks?.blocks?.length > 0) ? (
                        <div className="space-y-6">
                          {/* Prioritize Notion blocks when they exist, otherwise show basic content */}
                          {selectedPageBlocks?.blocks?.length > 0 ? (
                            // Render Notion-style blocks (contains PDF files and rich content)
                            selectedPageBlocks.blocks.map((block: any, index: number) => (
                              <div key={`block-${block.id}`} className="notion-block">
                                <div className="w-full">
                                  {block.type === 'heading' && (
                                    <div className="mb-4">
                                      <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                                        {block.content.text}
                                      </h2>
                                    </div>
                                  )}
                                  {(block.type === 'paragraph' || block.type === 'text') && (
                                    <div className="mb-4">
                                      <p className="text-gray-700 leading-relaxed">
                                        {typeof block.content === 'string' ? block.content : block.content.text}
                                      </p>
                                    </div>
                                  )}
                                  {block.type === 'file' && (
                                    <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                                      <div className="flex items-center space-x-3">
                                        <div className="text-2xl">📄</div>
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900">
                                            {(() => {
                                              // Handle different content formats
                                              if (typeof block.content === 'string') {
                                                // Format: "📄 WEBSITE REVIEW - July 2nd 2025.pdf\n/uploads/file-1751568219844-647654647.pdf"
                                                const lines = block.content.split('\n');
                                                return lines[0].replace('📄 ', '') || 'Document';
                                              } else if (block.content.fileName) {
                                                return block.content.fileName;
                                              } else {
                                                return 'Document';
                                              }
                                            })()}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            PDF File
                                          </div>
                                        </div>
                                        <a
                                          href={(() => {
                                            // Handle different content formats
                                            if (typeof block.content === 'string') {
                                              // Format: "📄 WEBSITE REVIEW - July 2nd 2025.pdf\n/uploads/file-1751568219844-647654647.pdf"
                                              const lines = block.content.split('\n');
                                              return lines[1] || '#';
                                            } else if (block.content.fileUrl) {
                                              return block.content.fileUrl;
                                            } else {
                                              return '#';
                                            }
                                          })()}
                                          download
                                          className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                        >
                                          📥 Download
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {block.type === 'image' && (
                                    <div className="mb-4">
                                      <img 
                                        src={block.content.fileUrl} 
                                        alt={block.content.caption || 'Image'}
                                        className="max-w-full h-auto rounded-lg"
                                      />
                                      {block.content.caption && (
                                        <p className="text-sm text-gray-500 mt-2">{block.content.caption}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            // Fallback to basic content items only when no Notion blocks exist
                            selectedPageContent.map((content: any, index: number) => (
                              <div key={`content-${content.id}`} className="notion-block">
                                {/* Content Block - Read Only */}
                                <div className="w-full">
                                  {/* Content Title as Heading Block */}
                                  <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                                      {content.title}
                                    </h2>
                                  </div>
                                  
                                  {/* Content Description as Text Block */}
                                  {content.description && (
                                    <div className="mb-4">
                                      <p className="text-gray-700 leading-relaxed">
                                        {content.description}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Content Instructions as Text Block */}
                                  {content.instructions && (
                                    <div className="mb-4">
                                      <p className="text-gray-700 leading-relaxed">
                                        {content.instructions}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Meta info */}
                                  <div className="text-xs text-gray-400 mt-4">
                                    {new Date(content.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="py-16 text-center">
                          <div className="text-4xl mb-4">📝</div>
                          <p className="text-gray-500">No content available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* OnlyFans Content Header */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    <h2 className="text-base font-semibold text-gray-800">OnlyFans Content</h2>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 text-center mb-6">
                    <div className="relative">
                      <div className="text-2xl font-bold text-pink-600">{groupedPages.onlyfans.length + customsContent.length}</div>
                      <div className="text-sm text-gray-600">Total Content</div>
                      {/* Coming Soon Overlay */}
                      <div className="absolute inset-0 bg-gray-100 bg-opacity-90 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-700 mb-1">🚧</div>
                          <div className="text-xs font-semibold text-gray-700">Coming Soon</div>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="text-2xl font-bold text-red-600">0</div>
                      <div className="text-sm text-gray-600">Total Sexting Scripts</div>
                      {/* Coming Soon Overlay */}
                      <div className="absolute inset-0 bg-gray-100 bg-opacity-90 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-700 mb-1">🚧</div>
                          <div className="text-xs font-semibold text-gray-700">Coming Soon</div>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="text-2xl font-bold text-purple-600">0</div>
                      <div className="text-sm text-gray-600">Total PPVs</div>
                      {/* Coming Soon Overlay */}
                      <div className="absolute inset-0 bg-gray-100 bg-opacity-90 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-700 mb-1">🚧</div>
                          <div className="text-xs font-semibold text-gray-700">Coming Soon</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Latest OnlyFans Content */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    <h3 className="text-base font-semibold text-gray-800">Latest OnlyFans Content</h3>
                  </div>
                  
                  {(isPagesLoading || isCustomsLoading) ? (
                    <div className="text-center py-8">
                      <div className="text-sm text-gray-500">Loading content...</div>
                    </div>
                  ) : (groupedPages.onlyfans.length > 0 || customsContent.length > 0) ? (
                    <div className="space-y-3">
                      {/* Display OnlyFans Inspiration Pages */}
                      {groupedPages.onlyfans.map((page: any) => renderPageCard(page))}
                      
                      {/* Display Customs Content */}
                      {customsContent.length > 0 && (
                        <>
                          {groupedPages.onlyfans.length > 0 && (
                            <div className="flex items-center space-x-2 my-4">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <h4 className="text-sm font-semibold text-gray-600">Custom Requests</h4>
                            </div>
                          )}
                          {customsContent.map((custom: any) => renderCustomsCard(custom))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">💎</div>
                      <h3 className="text-lg text-gray-600 mb-2">No OnlyFans content available</h3>
                      <p className="text-sm text-gray-500">Content categorized as OnlyFans, Customs, or Whales will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Social Media Content Section */}
          {homeActiveSection === 'social' && (
            <div className="px-4 space-y-4">
              {/* If a normal page is selected, show its content */}
              {selectedCategory && selectedCategory.pageType === 'normal' && selectedCategory.platformType !== 'OnlyFans' ? (
                <div>
                  {/* Back button above banner */}
                  <div className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        ← Back
                      </button>
                      <span className="text-gray-400">•</span>
                      <span className="text-lg text-blue-600 font-medium">
                        {selectedCategory.title}
                      </span>
                    </div>
                  </div>

                  {/* Display page banner exactly like Notion editor */}
                  {selectedPageBanner?.banner_image_url ? (
                    <div className="w-full mb-4">
                      <img
                        src={selectedPageBanner.banner_image_url}
                        alt={selectedPageBanner.banner_alt_text || `Banner for ${selectedCategory?.title}`}
                        className="w-full h-44 object-cover"
                        onError={(e) => {
                          console.warn('Banner image failed to load:', selectedPageBanner.banner_image_url);
                          // Hide the image element if it fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Page Title like Notion editor */}
                  <div className="px-4">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-4xl">
                        {selectedPageBlocks?.emoji || "📄"}
                      </span>
                      <h1 className="text-4xl font-bold text-gray-900">
                        {selectedPageBlocks?.title || selectedCategory.title}
                      </h1>
                    </div>
                  </div>

                  
                  {/* Notion Page Editor Interface - Exact CRM Match */}
                  <div className="min-h-screen bg-white rounded-lg border">
                    <div className="p-6">
                      {/* Loading state */}
                      {(isSelectedPageLoading || isPageBlocksLoading) ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Display Notion blocks if they exist, otherwise show basic content */}
                          {selectedPageBlocks?.blocks && selectedPageBlocks.blocks.length > 0 ? (
                            selectedPageBlocks.blocks.map((block: any, index: number) => (
                              <div key={`block-${index}`} className="notion-block">
                                {/* Block Content - Read Only */}
                                <div className="w-full">
                                  {(block.type === 'text' || block.type === 'paragraph') && (
                                    <div className="mb-4">
                                      <p className="text-gray-700 leading-relaxed">
                                        {typeof block.content === 'string' 
                                          ? block.content 
                                          : block.content?.text || ''
                                        }
                                      </p>
                                    </div>
                                  )}
                                  {block.type === 'heading' && (
                                    <div className="mb-4">
                                      <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                                        {typeof block.content === 'string' 
                                          ? block.content 
                                          : block.content?.text || ''
                                        }
                                      </h2>
                                    </div>
                                  )}
                                  {block.type === 'file' && (
                                    <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="text-lg">📄</span>
                                          </div>
                                          <div>
                                            <div className="text-sm font-semibold text-gray-800">
                                              {(() => {
                                                if (typeof block.content === 'string') {
                                                  // Format: "📄 WEBSITE REVIEW - July 2nd 2025.pdf\n/uploads/file-1751568219844-647654647.pdf"
                                                  const lines = block.content.split('\n');
                                                  return lines[0] || 'File';
                                                } else if (block.content.fileName) {
                                                  return block.content.fileName;
                                                } else {
                                                  return 'File';
                                                }
                                              })()}
                                            </div>
                                            <div className="text-xs text-gray-500">PDF Document</div>
                                          </div>
                                        </div>
                                        <a
                                          href={(() => {
                                            if (typeof block.content === 'string') {
                                              // Format: "📄 WEBSITE REVIEW - July 2nd 2025.pdf\n/uploads/file-1751568219844-647654647.pdf"
                                              const lines = block.content.split('\n');
                                              return lines[1] || '#';
                                            } else if (block.content.fileUrl) {
                                              return block.content.fileUrl;
                                            } else {
                                              return '#';
                                            }
                                          })()}
                                          download
                                          className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                        >
                                          📥 Download
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {block.type === 'image' && (
                                    <div className="mb-4">
                                      <img 
                                        src={block.content.fileUrl} 
                                        alt={block.content.caption || 'Image'}
                                        className="max-w-full h-auto rounded-lg"
                                      />
                                      {block.content.caption && (
                                        <p className="text-sm text-gray-500 mt-2">{block.content.caption}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            // Fallback to basic content items only when no Notion blocks exist
                            selectedPageContent.map((content: any, index: number) => (
                              <div key={`content-${content.id}`} className="notion-block">
                                {/* Content Block - Read Only */}
                                <div className="w-full">
                                  {/* Content Title as Heading Block */}
                                  <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                                      {content.title}
                                    </h2>
                                  </div>
                                  
                                  {/* Content Description as Text Block */}
                                  {content.description && (
                                    <div className="mb-4">
                                      <p className="text-gray-700 leading-relaxed">
                                        {content.description}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Content Instructions as Text Block */}
                                  {content.instructions && (
                                    <div className="mb-4">
                                      <p className="text-gray-700 leading-relaxed">
                                        {content.instructions}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Meta info */}
                                  <div className="text-xs text-gray-400 mt-4">
                                    {new Date(content.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Social Media Content Header */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h2 className="text-base font-semibold text-gray-800">Social Media Content</h2>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 text-center mb-6">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{socialMediaStats.total}</div>
                      <div className="text-sm text-gray-600">Total Content</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{socialMediaStats.bookmarked}</div>
                      <div className="text-sm text-gray-600">Bookmarked</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-violet-600">{socialMediaStats.completed}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                  </div>
                  
                  {/* Latest Social Media Content */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h3 className="text-base font-semibold text-gray-800">Latest Social Media Content</h3>
                  </div>
                  
                  {isPagesLoading ? (
                    <div className="text-center py-8">
                      <div className="text-sm text-gray-500">Loading content...</div>
                    </div>
                  ) : groupedPages.social.length > 0 ? (
                    <div className="space-y-3">
                      {groupedPages.social.map((page: any) => renderPageCard(page))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📱</div>
                      <h3 className="text-lg text-gray-600 mb-2">No social media content available</h3>
                      <p className="text-sm text-gray-500">Content for Twitter, TikTok, and Facebook will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feed Tab */}
      {activeTab === 'feed' && (
        <div className="flex-1 bg-black overflow-hidden">
          {/* Feed Header */}
          <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {bookmarkFeedMode && (
                  <button
                    onClick={() => {
                      setBookmarkFeedMode(false);
                      setSelectedBookmarkCategory(null);
                    }}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-white font-semibold text-lg">
                  {bookmarkFeedMode 
                    ? `${selectedBookmarkCategory} Bookmarks`
                    : (selectedCategory ? selectedCategory.title : 'Content Feed')
                  }
                </h2>
              </div>
              {bookmarkFeedMode ? (
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                  📖 Bookmarks
                </span>
              ) : selectedCategory && (
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm">
                  {selectedCategory.platformType}
                </span>
              )}
            </div>
          </div>

          {/* Feed Content */}
          <div className="h-full -mt-16 pt-16">
            {isPaginatedLoading ? (
              <div className="text-center text-white py-12">
                <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading content...</p>
              </div>
            ) : paginatedReels.length > 0 ? (
              <div 
                className="h-full overflow-y-scroll snap-y snap-mandatory"
                style={{
                  scrollSnapType: 'y mandatory',
                  scrollBehavior: 'auto',
                  overscrollBehavior: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
                onScroll={(e) => {
                  const container = e.target as HTMLElement;
                  const scrollTop = container.scrollTop;
                  const containerHeight = container.clientHeight;
                  const scrollHeight = container.scrollHeight;
                  const newIndex = Math.round(scrollTop / containerHeight);
                  
                  // Filter out broken videos for carousel length calculation
                  const visibleContent = paginatedReels.filter((content: any) => !brokenVideos.has(content.id));
                  
                  if (newIndex !== currentContentIndex && newIndex >= 0 && newIndex < visibleContent.length) {
                    setCurrentContentIndex(newIndex);
                  }
                  
                  // Load more content when scrolling near the bottom
                  if (scrollTop + containerHeight >= scrollHeight - 200) {
                    if (hasMoreReels && !isLoadingMoreReels) {
                      console.log('🔄 Loading more reels...');
                      loadMoreReels();
                    }
                  }
                }}
              >
                {paginatedReels.filter((content: any) => !brokenVideos.has(content.id)).map((content: any, index: any) => {
                  const actualIndex = index; // No virtual scrolling - show all content
                  const isFlipped = flippedCards.has(content.id);
                  const isLiked = likedContent.has(content.id);
                  const isBookmarked = bookmarkedContent.has(content.id);
                  
                  return (
                    <div 
                      key={`content-${content.id}-${actualIndex}`}
                      className="w-full h-full relative flex-shrink-0 snap-start snap-always"
                      style={{ 
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always'
                      }}
                    >
                      {/* Card flip container */}
                      <div 
                        className="relative w-full h-full"
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)'
                        }}
                      >
                        {/* Front side - Media content */}
                        <div 
                          className="absolute inset-0 w-full h-full"
                          style={{ 
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(0deg)'
                          }}
                        >
                          {/* TikTok Fullscreen Video */}
                          <div className="absolute inset-0 w-full h-full bg-black">
                            
                            {/* Page Label Bubble (Global Feed Mode Only) */}
                            {!selectedCategory && !bookmarkFeedMode && content.sourcePage && (
                              <div className="absolute top-4 left-4 z-10">
                                <div className="bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full border border-white/20">
                                  {content.sourcePage.title}
                                </div>
                              </div>
                            )}
                            {(() => {
                              // Check if we have a valid file URL (must start with / or http)
                              const hasValidFileUrl = content?.fileUrl && 
                                (content.fileUrl.startsWith('/') || content.fileUrl.startsWith('http'));
                              

                              
                              if (hasValidFileUrl && (content.fileType?.startsWith('video/') || content.fileType === 'video')) {
                                // Check if this is a Mux playback ID (professional streaming)
                                const isMuxVideo = content.playbackId || content.fileUrl?.includes('mux.com');
                                
                                if (isMuxVideo) {
                                  return (
                                    <div className="w-full h-full">
                                      <MuxVideoPlayer
                                        playbackId={content.playbackId || content.fileUrl}
                                        title={content.title}
                                        autoPlay={actualIndex === currentContentIndex}
                                        muted={false}
                                        loop={true}
                                        controls={false}
                                        className="w-full h-full"
                                      />
                                    </div>
                                  );
                                } else {

                                  
                                  return (
                                    <video 
                                      ref={setVideoRef(content.id)}
                                      data-content-id={content.id}
                                      src={optimizeVideoUrl(content.fileUrl)}
                                      className="w-full h-full object-cover cursor-pointer"
                                      autoPlay={actualIndex === currentContentIndex}
                                      muted={false}
                                      loop
                                      playsInline
                                      preload="auto"
                                      onError={(e) => handleVideoLoadError(e, content.fileUrl, content.id, setBrokenVideos, setCurrentContentIndex, feedContent, currentContentIndex)}
                                      onLoadStart={() => {
                                        // Check compatibility on load attempt
                                        const fileName = content.fileUrl?.split('/').pop() || '';
                                        const { isSupported, fileExt } = checkVideoCompatibility(fileName);
                                        if (!isSupported && fileExt === 'mov') {
                                          console.warn(`Loading MOV file with limited browser support: ${content.fileUrl}`);
                                        }
                                      }}
                                      onCanPlay={() => {
                                        console.log(`Video ready to play: ${content.fileUrl}`);
                                      }}
                                      onLoadedData={() => {
                                        // Video loaded successfully, remove any previous error displays
                                        const container = (document.querySelector(`[data-content-id="${content.id}"]`) as HTMLVideoElement)?.parentElement;
                                        if (container) {
                                          const errorDisplays = container.querySelectorAll('.bg-gradient-to-br');
                                          errorDisplays.forEach(display => display.remove());
                                        }
                                      }}
                                      onClick={(e) => {
                                        const video = e.target as HTMLVideoElement;
                                        if (video.paused) {
                                          video.play().catch(() => {});
                                        } else {
                                          video.pause();
                                        }
                                      }}
                                    />
                                  );
                                }
                              } else if (hasValidFileUrl && !content.fileType?.startsWith('video/')) {
                                return (
                                  <img 
                                    src={optimizeVideoUrl(content.fileUrl)} 
                                    alt={content.title}
                                    className="w-full h-full object-cover"
                                    onError={() => {}}
                                  />
                                );
                              } else {
                                // Show text-based content for invalid URLs or content without media
                                return (
                                  <div className="w-full h-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 flex items-center justify-center p-8">
                                    <div className="text-center text-white">
                                      <h2 className="text-3xl font-bold mb-4">{content?.title || 'Content Title'}</h2>
                                      <p className="text-lg opacity-90 leading-relaxed max-w-lg">
                                        {content?.description || content?.instructions || 'Content description will appear here.'}
                                      </p>
                                      {content?.tags && content.tags.length > 0 && (
                                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                                          {content.tags.map((tag: string, idx: number) => (
                                            <span key={idx} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                              #{tag}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          
                          {/* Dark gradient overlay for text readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          
                          {/* Content info - bottom left */}
                          <div className="absolute bottom-20 left-4 right-20">
                            <h1 className="text-white text-2xl font-bold mb-1 leading-tight">
                              {content?.title || 'Sample Instagram Reel'}
                            </h1>
                            <div className="space-y-1">
                              {/* Show source page label for default feed content */}
                              {content?._sourcePageTitle && !selectedCategory && !bookmarkFeedMode && (
                                <p className="text-white/80 text-xs bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full w-fit">
                                  From: {content._sourcePageTitle}
                                </p>
                              )}
                              <p className="text-white/90 text-sm flex items-center">
                                {renderPlatformIcon(selectedCategory?.platformType || 'Instagram')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Back side - Metadata info */}
                        <div 
                          className="absolute inset-0 w-full h-full bg-gray-900 p-6 overflow-y-auto"
                          style={{ 
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                          }}
                        >
                          <div className="text-white space-y-4">
                            <h2 className="text-2xl font-bold mb-4">Content Details</h2>
                            
                            <div>
                              <h3 className="text-lg font-semibold text-pink-300">Title</h3>
                              <p className="text-gray-300">{content?.title || 'Untitled'}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-lg font-semibold text-pink-300">Description</h3>
                              <p className="text-gray-300">{content?.description || 'No description'}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-lg font-semibold text-pink-300">Instructions</h3>
                              <p className="text-gray-300">{content?.instructions || 'No instructions provided'}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-lg font-semibold text-pink-300">Original Post Link</h3>
                              {content?.originalPostLink ? (
                                <a 
                                  href={content.originalPostLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline break-all"
                                >
                                  {content.originalPostLink}
                                </a>
                              ) : (
                                <p className="text-gray-400">No original post link provided</p>
                              )}
                            </div>
                            
                            <div>
                              <h3 className="text-lg font-semibold text-pink-300">Audio Link</h3>
                              {content?.audioLink ? (
                                <a 
                                  href={content.audioLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline break-all"
                                >
                                  {content.audioLink}
                                </a>
                              ) : (
                                <p className="text-gray-400">No audio link provided</p>
                              )}
                            </div>
                            

                          </div>
                        </div>
                      </div>
                      
                      {/* Audio Control Button - Top Right */}
                      <div className="absolute right-4 top-4 z-10">
                        <button 
                          onClick={() => {
                            const videos = document.querySelectorAll('video');
                            const allMuted = Array.from(videos).every(v => v.muted);
                            
                            videos.forEach(video => {
                              video.muted = allMuted ? false : true;
                            });
                          }}
                          className="bg-black/50 backdrop-blur-sm rounded-full p-3 text-white hover:bg-black/70 transition-all"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                          </svg>
                        </button>
                      </div>

                      {/* TikTok Engagement Buttons - Bottom Right */}
                      <div className="absolute right-4 bottom-28 flex flex-col space-y-4 z-10">
                        {/* Dislike Button */}
                        <button 
                          onClick={() => {
                            // Trigger mutation for server-side tracking
                            console.log(`[DISLIKE CLICK] Content ID: ${content.id}, Page ID: ${content.pageId}, Content:`, content);
                            dislikeMutation.mutate({ 
                              contentId: content.id, 
                              pageId: content.pageId || selectedCategory?.id 
                            });
                            
                            // Instantly remove from feed and persist dismissal
                            setDismissedContent(prev => {
                              const newSet = new Set(prev);
                              newSet.add(content.id);
                              // Store in localStorage for persistence across sessions
                              localStorage.setItem(
                                `dismissed_${creatorUsername}`, 
                                JSON.stringify(Array.from(newSet))
                              );
                              return newSet;
                            });
                            
                            // Auto-advance to next content if available, or go back if at end
                            setTimeout(() => {
                              const filteredLength = feedContent.filter((content: any) => !brokenVideos.has(content.id)).length;
                              if (currentContentIndex < filteredLength - 1) {
                                setCurrentContentIndex(currentContentIndex + 1);
                              } else if (currentContentIndex > 0) {
                                setCurrentContentIndex(currentContentIndex - 1);
                              } else {
                                // If this was the last item, stay at 0 but content will be filtered out
                                setCurrentContentIndex(0);
                              }
                            }, 100);
                          }}
                          className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center text-white border border-white/20 hover:bg-red-500/90 transition-colors"
                        >
                          <ThumbsDown className="w-5 h-5" />
                        </button>
                        
                        {/* Flip Card Button */}
                        <button 
                          onClick={() => {
                            setFlippedCards(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(content.id)) {
                                newSet.delete(content.id);
                              } else {
                                newSet.add(content.id);
                              }
                              return newSet;
                            });
                          }}
                          className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
                        >
                          {isFlipped ? <Minus className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        </button>
                        
                        {/* Heart/Done Button */}
                        <button 
                          onClick={() => {
                            // Trigger mutation for server-side tracking
                            console.log(`[LIKE CLICK] Content ID: ${content.id}, Page ID: ${content.pageId}, Content:`, content);
                            likeMutation.mutate({ 
                              contentId: content.id, 
                              pageId: content.pageId || selectedCategory?.id 
                            });
                            
                            // Mark as completed and remove from feed
                            setLikedContent(prev => {
                              const newSet = new Set(prev);
                              newSet.add(content.id);
                              // Store completed content for profile display
                              localStorage.setItem(
                                `liked_${creatorUsername}`, 
                                JSON.stringify(Array.from(newSet))
                              );
                              return newSet;
                            });
                            
                            // Auto-advance to next content after completion
                            setTimeout(() => {
                              const filteredLength = feedContent.filter((content: any) => !brokenVideos.has(content.id)).length;
                              if (currentContentIndex < filteredLength - 1) {
                                setCurrentContentIndex(currentContentIndex + 1);
                              } else if (currentContentIndex > 0) {
                                setCurrentContentIndex(currentContentIndex - 1);
                              } else {
                                // If this was the last item, stay at 0 but content will be filtered out
                                setCurrentContentIndex(0);
                              }
                            }, 100);
                          }}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all ${
                            isLiked ? 'bg-green-600 scale-110' : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          <Check className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                        </button>
                        
                        {/* Bookmark Button */}
                        <button 
                          onClick={() => {
                            // Trigger mutation for server-side tracking - database handles persistence
                            const isCurrentlyBookmarked = bookmarkedContent.has(content.id);
                            bookmarkMutation.mutate({ contentId: content.id, isBookmarked: isCurrentlyBookmarked });
                            
                            // Local state update handled by mutation onSuccess callback
                            // No localStorage needed - database is source of truth
                          }}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all ${
                            isBookmarked ? 'bg-yellow-600 scale-110' : 'bg-yellow-500 hover:bg-yellow-600'
                          }`}
                        >
                          <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                        
                        {/* Share Button */}
                        <button 
                          onClick={async (event) => {
                            console.log('Share button clicked!');
                            event.preventDefault();
                            event.stopPropagation();
                            try {
                              // Create comprehensive share text with all metadata
                              const shareText = `${content.title || 'Content'}\n\n${content.description || ''}\n\nInstructions: ${content.instructions || 'None'}\n\nOriginal Post: ${content.originalPostLink || 'None'}\n\nAudio: ${content.audioLink || 'None'}`;
                              const fullShareText = shareText + (content.fileUrl ? `\n\nVideo: ${window.location.origin}${content.fileUrl}` : '');
                              
                              console.log('About to share:', fullShareText);
                              
                              // Try clipboard first (most reliable for desktop)
                              console.log('Attempting clipboard copy...');
                              if (navigator.clipboard) {
                                try {
                                  await navigator.clipboard.writeText(fullShareText);
                                  console.log('✅ Successfully copied to clipboard using modern API');
                                  // Show visual feedback
                                  const button = event.currentTarget;
                                  const originalHTML = button.innerHTML;
                                  button.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                                  setTimeout(() => {
                                    button.innerHTML = originalHTML;
                                  }, 2000);
                                  return;
                                } catch (clipboardError) {
                                  console.log('❌ Modern clipboard failed:', clipboardError);
                                }
                              }
                              
                              // Fallback to execCommand
                              console.log('Attempting execCommand copy...');
                              const textarea = document.createElement('textarea');
                              textarea.value = fullShareText;
                              textarea.style.position = 'fixed';
                              textarea.style.left = '-9999px';
                              textarea.style.top = '0';
                              document.body.appendChild(textarea);
                              textarea.focus();
                              textarea.select();
                              
                              try {
                                const successful = document.execCommand('copy');
                                if (successful) {
                                  console.log('✅ Successfully copied using execCommand');
                                  // Show visual feedback
                                  const button = event.currentTarget;
                                  const originalHTML = button.innerHTML;
                                  button.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                                  setTimeout(() => {
                                    button.innerHTML = originalHTML;
                                  }, 2000);
                                } else {
                                  console.log('❌ execCommand copy returned false');
                                }
                              } catch (err) {
                                console.log('❌ execCommand failed:', err);
                              } finally {
                                document.body.removeChild(textarea);
                              }
                              
                              // Try native share as last resort (mainly for mobile)
                              console.log('Attempting native share...');
                              if (navigator.share) {
                                try {
                                  await navigator.share({
                                    title: content.title || 'Shared Content',
                                    text: fullShareText,
                                    url: content.originalPostLink || undefined
                                  });
                                  console.log('✅ Successfully shared using native API');
                                  return;
                                } catch (shareError) {
                                  console.log('❌ Native sharing failed:', shareError);
                                }
                              }
                              
                              console.log('❌ All sharing methods failed');
                              
                            } catch (error) {
                              console.log('❌ Share button error:', error);
                            }
                          }}
                          className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {/* Page indicator - top right (only show on current item) */}
                      {index === currentContentIndex && (
                        <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded-full text-sm z-10">
                          {currentContentIndex + 1} of {paginatedReels.filter((content: any) => !brokenVideos.has(content.id)).length}
                          {hasMoreReels && <span className="ml-1 text-blue-300">+</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Loading more content indicator */}
                {isLoadingMoreReels && (
                  <div className="w-full h-screen flex items-center justify-center bg-black">
                    <div className="text-center text-white">
                      <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading more content...</p>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center text-white py-12">
                {bookmarkFeedMode ? (
                  <>
                    <div className="text-4xl mb-4">📖</div>
                    <h3 className="text-xl font-semibold mb-2">No Bookmarks Found</h3>
                    <p className="text-gray-400 mb-6">You haven't bookmarked any {selectedBookmarkCategory?.toLowerCase()} content yet</p>
                    <button 
                      onClick={() => {
                        setBookmarkFeedMode(false);
                        setSelectedBookmarkCategory(null);
                        setActiveTab('home');
                      }}
                      className="px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors"
                    >
                      Browse Content
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold mb-2">No Content Available</h3>
                    <p className="text-gray-400 mb-6">No content has been assigned to you yet</p>
                    <p className="text-sm text-gray-500">Content reels will appear here when available</p>
                    {totalReelsCount > 0 && (
                      <p className="text-xs text-gray-600 mt-2">
                        Total content available: {totalReelsCount}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 overflow-hidden">
          <CreatorGroupChats />
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4">
            {isCreatorAuthenticated && creatorId && creatorUsername && (
              <CreatorCalendar creatorId={creatorId} creatorUsername={creatorUsername} />
            )}
            {(!isCreatorAuthenticated || !creatorId) && (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <CalendarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Calendar</h2>
                  <p className="text-gray-600">Please log in to view your calendar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Profile Header with Gradient Banner */}
          <div className="relative bg-gradient-to-tr from-pink-300 via-pink-400 to-pink-500 rounded-3xl mx-4 mt-4 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0">
              <div className="absolute top-4 left-8 text-pink-200 text-lg animate-bounce" style={{ animationDelay: '0s' }}>✨</div>
              <div className="absolute top-12 right-12 text-pink-100 text-sm animate-pulse" style={{ animationDelay: '1s' }}>💫</div>
              <div className="absolute top-20 left-16 text-pink-200 text-xs animate-bounce" style={{ animationDelay: '2s' }}>✨</div>
              <div className="absolute top-6 right-6 text-pink-100 text-base animate-pulse" style={{ animationDelay: '0.5s' }}>💫</div>
              <div className="absolute bottom-6 left-8 text-pink-200 text-sm animate-bounce" style={{ animationDelay: '1.5s' }}>✨</div>
              <div className="absolute bottom-12 right-20 text-pink-100 text-lg animate-pulse" style={{ animationDelay: '2.5s' }}>💫</div>
            </div>
            
            {/* Main flower */}
            <div className="absolute top-6 right-8 text-3xl animate-pulse" style={{ animationDelay: '1s' }}>🌸</div>
            
            <div className="relative z-10 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-pink-200/50 rounded-full mx-auto mb-3 flex items-center justify-center backdrop-blur-sm overflow-hidden">
                {(() => {
                  const avatarUrl = creatorProfile ? getCreatorAvatarUrl(creatorProfile) : undefined;
                  return avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={`${displayUsername} profile`}
                      className="w-full h-full object-cover rounded-full"
                      loading="lazy"
                      onLoad={(e) => {
                        // Setup lazy loading optimization if available
                        if (profileImageOptimization.setupLazyLoading) {
                          profileImageOptimization.setupLazyLoading(e.currentTarget, avatarUrl);
                        }
                      }}
                      onError={(e) => {
                        // If image fails to load, hide it and show fallback icon
                        e.currentTarget.style.display = 'none';
                        const fallbackIcon = e.currentTarget.parentElement?.querySelector('.fallback-user-icon');
                        if (fallbackIcon) {
                          (fallbackIcon as HTMLElement).style.display = 'block';
                        }
                      }}
                    />
                  ) : (
                    <User className="w-8 h-8 text-pink-800" />
                  );
                })()}
              </div>
              <h1 className="text-xl font-bold text-pink-900 mb-1">{displayUsername}</h1>
            </div>
          </div>

          {/* Profile Stats */}
          <div className="px-4 mt-4">
            <div className="bg-white rounded-2xl p-4">
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div>
                  <div className="text-lg font-bold text-pink-600">{totalBookmarks}</div>
                  <div className="text-xs text-gray-600">Bookmarks</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">{bookmarkFolders.length}</div>
                  <div className="text-xs text-gray-600">Folders</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{likedContent.size}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
              </div>
              
              {/* ⚡ Loading State for Profile Optimization */}
              {(isBookmarksLoading || isProfileLoading) && (
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <span className="text-xs font-medium text-blue-800">Loading optimized data...</span>
                  </div>
                </div>
              )}
              
              {/* Change Aesthetic Button */}
              <button 
                onClick={() => setShowComingSoonPopup(true)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200"
              >
                ✨ Change Aesthetic
              </button>
            </div>
          </div>

          {/* Your Bookmarks Section */}
          <div className="px-4 mt-4">
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <h3 className="text-base font-semibold text-gray-800">Your Bookmarks</h3>
              </div>
              

              
              {/* Check if user has any bookmarks */}
              {(() => {
                // Use database bookmark count instead of localStorage calculation
                // const totalBookmarks = totalBookmarks;
                
                if (totalBookmarks > 0) {
                  
                  return (
                    /* Database-backed Bookmark Folders with Virtual Scrolling */
                    <div 
                      className="space-y-3" 
                      style={{ 
                        height: virtualBookmarkFolders.isVirtualized ? '300px' : 'auto',
                        overflowY: virtualBookmarkFolders.isVirtualized ? 'auto' : 'visible'
                      }}
                      onScroll={virtualBookmarkFolders.isVirtualized ? virtualBookmarkFolders.handleScroll : undefined}
                    >
                      {virtualBookmarkFolders.isVirtualized ? (
                        <div style={{ height: virtualBookmarkFolders.totalHeight, position: 'relative' }}>
                          {virtualBookmarkFolders.visibleItems.map((folder: any, index: number) => (
                            <div key={folder.name} style={folder.style}>
                              <button 
                                onClick={() => {
                                  console.log(`Opening ${folder.name} bookmarks folder`);
                                  setSelectedBookmarkCategory(folder.name);
                                  setBookmarkFeedMode(true);
                                  setActiveTab('feed');
                                }}
                                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-pink-50/50 to-rose-50/50 border border-pink-100/50 hover:bg-pink-100/50 transition-colors"
                              >
                                <div className="w-12 h-12 bg-pink-200 rounded-xl flex items-center justify-center">
                                  <span className="text-lg">
                                    {folder.platformType?.includes('onlyfans') ? '💎' : 
                                     folder.platformType?.includes('instagram') ? '📱' : 
                                     folder.name.toLowerCase().includes('onlyfans') ? '💎' :
                                     folder.name.toLowerCase().includes('social') ? '📱' : '📁'}
                                  </span>
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-semibold text-gray-800">{folder.name}</div>
                                  <div className="text-xs text-pink-600">{folder.count} bookmarks</div>
                                </div>
                                <div className="text-pink-400">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        bookmarkFolders.map((folder: any, index: number) => (
                          <button 
                            key={folder.name}
                            onClick={() => {
                              console.log(`Opening ${folder.name} bookmarks folder`);
                              setSelectedBookmarkCategory(folder.name);
                              setBookmarkFeedMode(true);
                              setActiveTab('feed');
                            }}
                            className="w-full flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-pink-50/50 to-rose-50/50 border border-pink-100/50 hover:bg-pink-100/50 transition-colors"
                          >
                            <div className="w-12 h-12 bg-pink-200 rounded-xl flex items-center justify-center">
                              <span className="text-lg">
                                {folder.platformType?.includes('onlyfans') ? '💎' : 
                                 folder.platformType?.includes('instagram') ? '📱' : 
                                 folder.name.toLowerCase().includes('onlyfans') ? '💎' :
                                 folder.name.toLowerCase().includes('social') ? '📱' : '📁'}
                              </span>
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-semibold text-gray-800">{folder.name}</div>
                              <div className="text-xs text-pink-600">{folder.count} bookmarks</div>
                            </div>
                            <div className="text-pink-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  );
                } else {
                  return (
                    /* Empty State Message */
                    <div className="text-center py-6 mt-4">
                      <div className="text-3xl mb-3">📚</div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">No bookmarks yet</h4>
                      <p className="text-xs text-gray-500">Start bookmarking content from the Feed tab to build your collection</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>

          {/* Log Out Button */}
          <div className="px-4 mt-4 pb-4">
            <button 
              onClick={async () => {
                try {
                  // Call logout API endpoint
                  await apiRequest('POST', '/api/creator-auth/logout', {});
                  
                  // Clear local state
                  localStorage.removeItem('creatorAuth');
                  sessionStorage.removeItem('creatorAuth');
                  
                  // Redirect to login page
                  window.location.href = '/creatorlogin';
                } catch (error) {
                  console.error('Logout failed:', error);
                  // Even if API fails, still clear local storage and redirect
                  localStorage.removeItem('creatorAuth');
                  sessionStorage.removeItem('creatorAuth');
                  window.location.href = '/creatorlogin';
                }
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Bottom Spacing */}
          <div className="h-4"></div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="relative">
        {/* Home indicator */}
        <div className="flex justify-center">
          <div className="w-32 h-1 bg-pink-400 rounded-full"></div>
        </div>
        
        {/* Navigation tabs */}
        <div className="bg-gradient-to-r from-pink-200 via-pink-300 to-pink-200 px-4 pb-4">
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center space-y-1 py-2 px-1 rounded-lg transition-all duration-200 ${
                activeTab === 'home'
                  ? 'bg-pink-200 text-pink-700'
                  : 'text-pink-400 hover:text-pink-600 hover:bg-pink-100'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">Home</span>
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`flex flex-col items-center space-y-1 py-2 px-1 rounded-lg transition-all duration-200 ${
                activeTab === 'feed'
                  ? 'bg-pink-200 text-pink-700'
                  : 'text-pink-400 hover:text-pink-600 hover:bg-pink-100'
              }`}
            >
              <Play className="w-5 h-5" />
              <span className="text-xs font-medium">Feed</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col items-center space-y-1 py-2 px-1 rounded-lg transition-all duration-200 ${
                activeTab === 'chat'
                  ? 'bg-pink-200 text-pink-700'
                  : 'text-pink-400 hover:text-pink-600 hover:bg-pink-100'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-medium">Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex flex-col items-center space-y-1 py-2 px-1 rounded-lg transition-all duration-200 ${
                activeTab === 'calendar'
                  ? 'bg-pink-200 text-pink-700'
                  : 'text-pink-400 hover:text-pink-600 hover:bg-pink-100'
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
              <span className="text-xs font-medium">Calendar</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center space-y-1 py-2 px-1 rounded-lg transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-pink-200 text-pink-700'
                  : 'text-pink-400 hover:text-pink-600 hover:bg-pink-100'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bookmark Viewer Modal */}
      {showBookmarkViewer && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 flex items-center space-x-3">
            <button 
              onClick={() => setShowBookmarkViewer(false)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-semibold text-lg">{selectedBookmarkCategory} Bookmarks</h2>
              <p className="text-sm text-white/80">
                {(() => {
                  const categoryBookmarks = Array.from(bookmarkedContent).filter((id: number) => {
                    const content = assignedContent.find((c: any) => c.id === id);
                    if (!content) return false;
                    
                    if (selectedBookmarkCategory === 'OnlyFans') {
                      return assignedPages.some((p: any) => p.platformType === 'OnlyFans');
                    } else if (selectedBookmarkCategory === 'Social Media') {
                      return assignedPages.some((p: any) => ['Instagram', 'Twitter', 'Facebook', 'YouTube', 'TikTok'].includes(p.platformType));
                    } else {
                      return !assignedPages.some((p: any) => ['OnlyFans', 'Instagram', 'Twitter', 'Facebook', 'YouTube', 'TikTok'].includes(p.platformType));
                    }
                  });
                  return `${Array.from(bookmarkedContent).length} saved items`;
                })()}
              </p>
            </div>
          </div>

          {/* Feed-Style Content Display */}
          <div className="flex-1 bg-black relative overflow-hidden">
            <div className="h-full w-full relative snap-y snap-mandatory overflow-y-auto">
              {(() => {
                console.log('Bookmark Viewer Debug:', {
                  bookmarkedContent: Array.from(bookmarkedContent),
                  assignedContent: assignedContent.map((c: any) => ({ id: c.id, title: c.title })),
                  selectedBookmarkCategory,
                  assignedPages: assignedPages.map((p: any) => ({ platformType: p.platformType, title: p.title }))
                });

                // Get all bookmarked content first
                const allBookmarkedContent = Array.from(bookmarkedContent)
                  .map((id: number) => assignedContent.find((c: any) => c.id === id))
                  .filter(Boolean);

                console.log('All bookmarked content found:', allBookmarkedContent.map((c: any) => ({ id: c.id, title: c.title })));

                // For now, show ALL bookmarked content regardless of category since the user confirmed there are 2 items
                const categoryBookmarks = allBookmarkedContent;

                if (categoryBookmarks.length === 0) {
                  return (
                    <div className="h-full w-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="text-6xl mb-4">📱</div>
                        <h3 className="text-lg font-medium mb-2">No bookmarks yet</h3>
                        <p className="text-gray-300">Start bookmarking content from the Feed tab</p>
                      </div>
                    </div>
                  );
                }

                return categoryBookmarks.map((content, index) => (
                  <div key={content.id} className="h-full w-full relative snap-start snap-always">
                    {/* TikTok-Style Video Container - Bookmark Viewer */}
                    <div className="absolute inset-0 bg-black">
                      <div className="w-full h-full flex items-center justify-center">
                        <div 
                          className="relative bg-white flex items-center justify-center"
                          style={{
                            width: '100%',
                            height: '100%',
                            maxWidth: 'calc(100vh * 9 / 16)',
                            aspectRatio: '9/16'
                          }}
                        >
                          {content.videoUrl ? (
                            <video
                              className="w-full h-full object-cover"
                              poster={content.thumbnailUrl || content.processingThumbnailUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              onError={(e) => handleVideoLoadError(e, content.videoUrl, content.id, setBrokenVideos, setCurrentContentIndex, feedContent, currentContentIndex)}
                            >
                              <source src={optimizeVideoUrl(content.videoUrl)} type="video/mp4" />
                            </video>
                          ) : content.imageUrl ? (
                            <img 
                              src={optimizeVideoUrl(content.imageUrl)} 
                              alt={content.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                              <Play className="w-24 h-24 text-white/60" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Content Info Overlay */}
                    <div className="absolute bottom-20 left-4 right-20 text-white z-10">
                      {content.title && (
                        <h3 className="text-lg font-bold mb-2 drop-shadow-lg">{content.title}</h3>
                      )}
                      {content.description && (
                        <p className="text-sm text-white/90 mb-3 drop-shadow-lg line-clamp-3">
                          {content.description}
                        </p>
                      )}
                      
                      {/* Tags */}
                      {content.tags && content.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {content.tags.slice(0, 3).map((tag: any, tagIndex: number) => (
                            <span key={tagIndex} className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* TikTok-Style Engagement Buttons - Bottom Right */}
                    <div className="absolute right-3 bottom-24 flex flex-col space-y-3 z-10">
                      {/* Remove Bookmark Button */}
                      <button 
                        onClick={() => {
                          // Use database-backed bookmark system
                          bookmarkMutation.mutate({ contentId: content.id, isBookmarked: true });
                        }}
                        className="w-12 h-12 rounded-full bg-red-500/90 flex items-center justify-center text-white border border-white/20 hover:bg-red-600/90 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* Share Button */}
                      <button 
                        onClick={() => {
                          if (navigator.share && content.videoUrl) {
                            navigator.share({
                              title: content.title,
                              text: content.description,
                              url: window.location.origin + content.videoUrl
                            });
                          } else {
                            navigator.clipboard.writeText(content.title + '\n' + (content.description || ''));
                          }
                        }}
                        className="w-12 h-12 rounded-full bg-blue-500/90 flex items-center justify-center text-white border border-white/20 hover:bg-blue-600/90 transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>

                      {/* Mark Complete Button */}
                      <button 
                        onClick={() => {
                          setLikedContent(prev => {
                            const newSet = new Set(prev);
                            newSet.add(content.id);
                            localStorage.setItem(
                              `liked_${creatorUsername}`, 
                              JSON.stringify(Array.from(newSet))
                            );
                            return newSet;
                          });
                        }}
                        className="w-12 h-12 rounded-full bg-green-500/90 flex items-center justify-center text-white border border-white/20 hover:bg-green-600/90 transition-colors"
                      >
                        <Heart className={`w-5 h-5 ${likedContent.has(content.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Custom Content Detail Modal */}
      {/* LOCKED: Modal dismiss-on-click-outside functionality - approved logic - do not modify without written confirmation */}
      {showCustomModal && selectedCustomContent && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCustomModal(false);
              setSelectedCustomContent(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 m-4 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Custom Content Request</h2>
              <button 
                onClick={() => {
                  setShowCustomModal(false);
                  setSelectedCustomContent(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">💎</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{selectedCustomContent.category} Custom</h3>
                    <p className="text-sm text-gray-600">{selectedCustomContent.platform}</p>
                  </div>
                </div>
                
                {/* Status and Price */}
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedCustomContent.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                    selectedCustomContent.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedCustomContent.status === 'pending_review' ? 'Pending Review' :
                     selectedCustomContent.status === 'approved' ? 'Approved' : selectedCustomContent.status}
                  </span>
                  {(() => {
                    // Extract price from various possible field names - prioritize requested_price over price
                    const price = selectedCustomContent.requested_price || selectedCustomContent.requestedPrice || selectedCustomContent.requestedprice || selectedCustomContent.price || null;
                    const formattedPrice = price ? parseFloat(price).toFixed(2) : null;
                    
                    return formattedPrice && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        ${formattedPrice}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
                <p className="text-gray-600 bg-gray-50 rounded-lg p-3">
                  {selectedCustomContent.description || 'No description provided'}
                </p>
              </div>

              {/* Fan Information */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Fan Details</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Username:</span>
                    <span className="font-medium">{selectedCustomContent.fan_username || 'Not provided'}</span>
                  </div>
                  {selectedCustomContent.fan_onlyfans_url && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">OnlyFans:</span>
                      <span className="font-medium text-pink-600">{selectedCustomContent.fan_onlyfans_url}</span>
                    </div>
                  )}
                  {/* Chatter field hidden for creator-facing view */}
                </div>
              </div>

              {/* Dates */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Timeline</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested:</span>
                    <span className="font-medium">
                      {selectedCustomContent.created_at ? 
                        new Date(selectedCustomContent.created_at).toLocaleDateString() : 'Not available'}
                    </span>
                  </div>
                  {selectedCustomContent.requested_delivery_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Date:</span>
                      <span className="font-medium">
                        {new Date(selectedCustomContent.requested_delivery_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              {(selectedCustomContent.priority !== 'normal' || selectedCustomContent.follow_up_attempts > 0) && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Additional Details</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {selectedCustomContent.priority !== 'normal' && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Priority:</span>
                        <span className={`font-medium ${
                          selectedCustomContent.priority === 'high' ? 'text-red-600' :
                          selectedCustomContent.priority === 'low' ? 'text-gray-500' : 'text-gray-800'
                        }`}>
                          {selectedCustomContent.priority}
                        </span>
                      </div>
                    )}
                    {selectedCustomContent.follow_up_attempts > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Follow-ups:</span>
                        <span className="font-medium">{selectedCustomContent.follow_up_attempts}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions for creators */}
              {selectedCustomContent.status === 'pending_review' && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Your Response</h4>
                  <div className="space-y-2">
                    <button 
                      onClick={async () => {
                        try {
                          const response = await apiRequest('POST', `/api/creator/custom-contents/${selectedCustomContent.id}/accept`, {
                            creator_response: 'Request accepted by creator'
                          });
                          
                          if (response.ok) {
                            // Invalidate cache to refresh custom content list
                            await queryClient.invalidateQueries({
                              queryKey: [`/api/creator/${creatorUsername}/custom-contents`]
                            });
                            // Close modal
                            setShowCustomModal(false);
                            setSelectedCustomContent(null);
                            console.log('Custom content request accepted successfully');
                          }
                        } catch (error) {
                          console.error('Failed to accept request:', error);
                        }
                      }}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Accept Request
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const response = await apiRequest('POST', `/api/creator/custom-contents/${selectedCustomContent.id}/decline`, {
                            creator_response: 'Request declined by creator',
                            rejection_reason: 'Creator declined this request'
                          });
                          
                          if (response.ok) {
                            // Invalidate cache to refresh custom content list
                            await queryClient.invalidateQueries({
                              queryKey: [`/api/creator/${creatorUsername}/custom-contents`]
                            });
                            // Close modal
                            setShowCustomModal(false);
                            setSelectedCustomContent(null);
                            console.log('Custom content request declined successfully');
                          }
                        } catch (error) {
                          console.error('Failed to decline request:', error);
                        }
                      }}
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Decline Request
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const response = await apiRequest('POST', `/api/creator/custom-contents/${selectedCustomContent.id}/request-info`, {
                            creator_response: 'Creator requested more information',
                            info_request: 'Creator needs more details about this request'
                          });
                          
                          if (response.ok) {
                            // Invalidate cache to refresh custom content list
                            await queryClient.invalidateQueries({
                              queryKey: [`/api/creator/${creatorUsername}/custom-contents`]
                            });
                            // Close modal
                            setShowCustomModal(false);
                            setSelectedCustomContent(null);
                            console.log('More information requested successfully');
                          }
                        } catch (error) {
                          console.error('Failed to request more info:', error);
                        }
                      }}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Request More Info
                    </button>
                  </div>
                </div>
              )}

              {/* Actions for approved content */}
              {selectedCustomContent.status === 'approved' && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Content Status</h4>
                  <div className="bg-green-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Content Approved</span>
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      This content has been approved and appears in your OnlyFans section. 
                      Mark it as done when you've completed it.
                    </p>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const response = await apiRequest('POST', `/api/creator/custom-contents/${selectedCustomContent.id}/complete`, {
                          creator_response: 'Content completed by creator'
                        });
                        
                        if (response.ok) {
                          // Invalidate cache to refresh custom content list
                          await queryClient.invalidateQueries({
                            queryKey: [`/api/creator/${creatorUsername}/custom-contents`]
                          });
                          // Close modal
                          setShowCustomModal(false);
                          setSelectedCustomContent(null);
                          console.log('Custom content marked as complete successfully');
                        }
                      } catch (error) {
                        console.error('Failed to mark as complete:', error);
                      }
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>✅</span>
                    <span>Mark as Done</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Priority Content Detail Modal */}
      {/* LOCKED: Modal dismiss-on-click-outside functionality - approved logic - do not modify without written confirmation */}
      {showPriorityModal && selectedPriorityContent && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPriorityModal(false);
              setSelectedPriorityContent(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🚨</span>
                  <div>
                    <h2 className="text-xl font-bold">{selectedPriorityContent.title}</h2>
                    <p className="text-red-100">Priority Request Details</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowPriorityModal(false);
                    setSelectedPriorityContent(null);
                  }}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Priority Badge */}
              <div className="flex items-center justify-between">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                  selectedPriorityContent.priority === 'high' ? 'bg-red-100 text-red-800' :
                  selectedPriorityContent.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedPriorityContent.priority?.toUpperCase()} PRIORITY
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {selectedPriorityContent.status}
                </span>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Category</p>
                  <p className="text-gray-900">{selectedPriorityContent.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Due Date</p>
                  <p className="text-gray-900">{new Date(selectedPriorityContent.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Requested By</p>
                  <p className="text-gray-900">{selectedPriorityContent.requestedBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Estimated Duration</p>
                  <p className="text-gray-900">{selectedPriorityContent.estimatedDuration}</p>
                </div>
              </div>

              {/* Description */}
              {selectedPriorityContent.description && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedPriorityContent.description}</p>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {selectedPriorityContent.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Additional Notes</p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedPriorityContent.notes}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedPriorityContent.status === 'pending' && (
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await apiRequest('POST', `/api/priority-content/${selectedPriorityContent.id}/complete`);
                        if (response.ok) {
                          // Refresh priority content for creator
                          await queryClient.invalidateQueries({
                            queryKey: [`/api/creator/${creatorUsername}/priority-content`]
                          });
                          // Also refresh CRM priority content list
                          await queryClient.invalidateQueries({
                            queryKey: ['/api/priority-content']
                          });
                          // Close modal
                          setShowPriorityModal(false);
                          setSelectedPriorityContent(null);
                          console.log('Priority content marked as completed successfully');
                        }
                      } catch (error) {
                        console.error('Failed to mark priority content as completed:', error);
                      }
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>✅</span>
                    <span>Mark as Completed</span>
                  </button>
                </div>
              )}

              {selectedPriorityContent.status === 'in-progress' && (
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await apiRequest('POST', `/api/priority-content/${selectedPriorityContent.id}/complete`);
                        if (response.ok) {
                          // Refresh priority content
                          await queryClient.invalidateQueries({
                            queryKey: [`/api/creator/${creatorUsername}/priority-content`]
                          });
                          // Close modal
                          setShowPriorityModal(false);
                          setSelectedPriorityContent(null);
                          console.log('Priority content completed successfully');
                        }
                      } catch (error) {
                        console.error('Failed to complete priority content:', error);
                      }
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>✅</span>
                    <span>Mark as Complete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Export Modal */}
      {showVideoExportModal && selectedVideoForExport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Video Export</h2>
                <button
                  onClick={() => {
                    setShowVideoExportModal(false);
                    setSelectedVideoForExport(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Video Preview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Video Preview</h3>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
                    {selectedVideoForExport.fileUrl && selectedVideoForExport.fileType?.startsWith('video') ? (
                      <video
                        src={optimizeVideoUrl(selectedVideoForExport.fileUrl)}
                        className="w-full h-full object-contain"
                        controls
                        playsInline
                        preload="metadata"
                        onError={(e) => handleVideoLoadError(e, selectedVideoForExport.fileUrl, selectedVideoForExport.id, setBrokenVideos)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <FileText className="w-12 h-12 mx-auto mb-2" />
                          <p>No video preview available</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Download Button */}
                  {selectedVideoForExport.fileUrl && (
                    <div className="flex gap-2">
                      <a
                        href={selectedVideoForExport.fileUrl}
                        download={`${selectedVideoForExport.title || 'video'}.${selectedVideoForExport.fileType?.split('/')[1] || 'mp4'}`}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download Video</span>
                      </a>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(selectedVideoForExport.fileUrl);
                            const blob = await response.blob();
                            const file = new File([blob], `${selectedVideoForExport.title || 'video'}.${selectedVideoForExport.fileType?.split('/')[1] || 'mp4'}`, { type: selectedVideoForExport.fileType });
                            
                            if (navigator.share) {
                              const shareData = {
                                title: selectedVideoForExport.title || 'Shared Video',
                                text: `${selectedVideoForExport.title || 'Video'}\n\n${selectedVideoForExport.description || ''}`,
                                files: [file]
                              };
                              await navigator.share(shareData);
                            } else {
                              // Fallback to clipboard
                              const shareText = `${selectedVideoForExport.title || 'Video'}\n\n${selectedVideoForExport.description || ''}\n\nFile: ${selectedVideoForExport.fileUrl}`;
                              await navigator.clipboard.writeText(shareText);
                              alert('Video details copied to clipboard!');
                            }
                          } catch (error) {
                            console.error('Share failed:', error);
                            alert('Share failed. Please try downloading instead.');
                          }
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <Share2 className="w-5 h-5" />
                        <span>Share</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Video Metadata */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Video Details</h3>
                  
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        <p className="text-gray-900">{selectedVideoForExport.title || 'No title'}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <div className="p-3 bg-gray-50 rounded-lg border max-h-24 overflow-y-auto">
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedVideoForExport.description || 'No description'}</p>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                      <div className="p-3 bg-gray-50 rounded-lg border max-h-24 overflow-y-auto">
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedVideoForExport.instructions || 'No instructions'}</p>
                      </div>
                    </div>

                    {/* Original Post Link */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Original Post Link</label>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        {selectedVideoForExport.originalPostLink ? (
                          <a
                            href={selectedVideoForExport.originalPostLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            {selectedVideoForExport.originalPostLink}
                          </a>
                        ) : (
                          <p className="text-gray-500">No original post link</p>
                        )}
                      </div>
                    </div>

                    {/* Audio Link */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Audio Link</label>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        {selectedVideoForExport.audioLink ? (
                          <a
                            href={selectedVideoForExport.audioLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            {selectedVideoForExport.audioLink}
                          </a>
                        ) : (
                          <p className="text-gray-500">No audio link</p>
                        )}
                      </div>
                    </div>

                    {/* File Info */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">File Information</label>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        <p className="text-gray-900">
                          <span className="font-medium">Type:</span> {selectedVideoForExport.fileType || 'Unknown'}
                        </p>
                        <p className="text-gray-900">
                          <span className="font-medium">Created:</span> {selectedVideoForExport.createdAt ? new Date(selectedVideoForExport.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Copy All Data Button */}
                    <button
                      onClick={async () => {
                        const exportData = `
Title: ${selectedVideoForExport.title || 'No title'}

Description: ${selectedVideoForExport.description || 'No description'}

Instructions: ${selectedVideoForExport.instructions || 'No instructions'}

Original Post Link: ${selectedVideoForExport.originalPostLink || 'No original post link'}

Audio Link: ${selectedVideoForExport.audioLink || 'No audio link'}

File Type: ${selectedVideoForExport.fileType || 'Unknown'}

Created: ${selectedVideoForExport.createdAt ? new Date(selectedVideoForExport.createdAt).toLocaleDateString() : 'Unknown'}

File URL: ${selectedVideoForExport.fileUrl || 'No file URL'}
                        `.trim();

                        try {
                          await navigator.clipboard.writeText(exportData);
                          alert('All video data copied to clipboard!');
                        } catch (error) {
                          console.error('Copy failed:', error);
                          alert('Copy failed. Please try selecting and copying manually.');
                        }
                      }}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Copy className="w-5 h-5" />
                      <span>Copy All Data</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aesthetic Selection Modal */}
      {showAestheticModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAestheticModal(false);
              setSelectedAesthetic(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 m-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Choose Your Aesthetic</h2>
              <button 
                onClick={() => {
                  setShowAestheticModal(false);
                  setSelectedAesthetic(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Current Aesthetic */}
            {currentAesthetic && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: currentAesthetic.accentColor }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-800">Current: {currentAesthetic.name}</h3>
                    <p className="text-sm text-gray-600">{currentAesthetic.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Available Aesthetics */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 mb-3">Available Aesthetics</h3>
              {availableAesthetics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🎨</div>
                  <p>No aesthetic templates are available right now</p>
                </div>
              ) : (
                availableAesthetics.map((aesthetic: any) => (
                  <div
                    key={aesthetic.id}
                    onClick={() => setSelectedAesthetic(aesthetic)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedAesthetic?.id === aesthetic.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : currentAesthetic?.id === aesthetic.id 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: aesthetic.accentColor }}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{aesthetic.name}</h4>
                        <p className="text-sm text-gray-600">{aesthetic.description}</p>
                      </div>
                      {selectedAesthetic?.id === aesthetic.id && (
                        <div className="text-blue-500">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                      {currentAesthetic?.id === aesthetic.id && selectedAesthetic?.id !== aesthetic.id && (
                        <div className="text-green-500">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    
                    {/* Preview colors */}
                    <div className="mt-3 flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Colors:</span>
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: aesthetic.backgroundColor }}
                        title="Background Color"
                      />
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: aesthetic.accentColor }}
                        title="Accent Color"
                      />
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: aesthetic.textColor }}
                        title="Text Color"
                      />
                    </div>

                    {/* Status indicators */}
                    <div className="mt-2">
                      {currentAesthetic?.id === aesthetic.id && (
                        <div className="text-xs text-green-600 font-medium">Currently Applied</div>
                      )}
                      {selectedAesthetic?.id === aesthetic.id && selectedAesthetic?.id !== currentAesthetic?.id && (
                        <div className="text-xs text-blue-600 font-medium">Selected</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Universal Apply Theme Button */}
            {selectedAesthetic && selectedAesthetic.id !== currentAesthetic?.id && (
              <div className="mt-6 border-t pt-6">
                <button
                  onClick={async () => {
                    setIsApplyingTheme(true);
                    
                    try {
                      const response = await fetch(`/api/creator/${creatorUsername}/select-aesthetic`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({ templateId: selectedAesthetic.id }),
                      });

                      if (response.ok) {
                        // Apply theme immediately
                        setAppliedAesthetic(selectedAesthetic);
                        
                        // Refresh current aesthetic
                        queryClient.invalidateQueries({ 
                          queryKey: [`/api/creator/${creatorUsername}/current-aesthetic`] 
                        });
                        
                        // Reset selection and close modal
                        setSelectedAesthetic(null);
                        setShowAestheticModal(false);
                        
                        console.log('Theme applied successfully');
                      } else {
                        console.log('Failed to select aesthetic');
                      }
                    } catch (error) {
                      console.error('Error selecting aesthetic:', error);
                    } finally {
                      setIsApplyingTheme(false);
                    }
                  }}
                  disabled={isApplyingTheme}
                  className={`w-full py-3 px-6 rounded-lg font-medium text-lg transition-colors ${
                    isApplyingTheme 
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isApplyingTheme ? 'Applying Theme...' : `Apply ${selectedAesthetic.name} Theme`}
                </button>
              </div>
            )}

            {/* Note */}
            <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                💡 Select an aesthetic above, then click the Apply Theme button to update your creator page
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Popup */}
      {showComingSoonPopup && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowComingSoonPopup(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full">
            <div className="text-center">
              <div className="text-4xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Coming Soon!</h3>
              <p className="text-gray-600 mb-6">This is being worked on currently!</p>
              <button 
                onClick={() => setShowComingSoonPopup(false)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}