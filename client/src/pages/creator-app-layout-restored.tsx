import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCreatorAuth } from '@/contexts/CreatorAuthContext';
import { CenteredPageLoader } from '@/components/ui/loading-animation';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Home, 
  Heart, 
  MessageCircle, 
  Calendar,
  User,
  ChevronLeft,
  Share,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Check,
  Plus,
  Minus,
  Play,
  Pause
} from 'lucide-react';

interface SpringContentItem {
  id: number;
  pageId: number;
  title: string;
  description?: string;
  instructions?: string;
  mediaType: string;
  videoUrl?: string;
  imageUrl?: string;
  originalPostLink?: string;
  audioLink?: string;
  extraInstructions?: string;
  muxPlaybackId?: string;
  tags?: string[];
  category?: string;
  createdAt: string;
}

interface Engagement {
  id: number;
  creatorId: number;
  contentId: number;
  liked: boolean;
  disliked: boolean;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'home' | 'feed' | 'chat' | 'calendar' | 'profile';

export default function CreatorAppLayoutRestored() {
  const { creatorId, creatorUsername, isLoading: isAuthLoading } = useCreatorAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Tab and UI state
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showContentInfo, setShowContentInfo] = useState<number | null>(null);

  // Fetch creator-specific assigned content
  const { data: assignedContent = [], isLoading: isContentLoading } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/content`],
    enabled: !!creatorId && !!creatorUsername,
    staleTime: 0,
    refetchOnMount: true
  });

  // Fetch creator-specific engagements
  const { data: creatorEngagements = [], refetch: refetchEngagements } = useQuery({
    queryKey: ['/api/creator-auth/engagements'],
    enabled: !!creatorId,
    staleTime: 0,
  });

  // Fetch creator bookmarks
  const { data: creatorBookmarks = [], refetch: refetchBookmarks } = useQuery({
    queryKey: ['/api/creator-auth/bookmarks'],
    enabled: !!creatorId,
    staleTime: 0,
  });

  // Filter content for feed (exclude completed items)
  const allContent = useMemo(() => {
    const contentList = Array.isArray(assignedContent) ? assignedContent : [];

    if (activeTab === 'feed' && creatorId) {
      return contentList.filter((content: SpringContentItem) => {
        const engagement = Array.isArray(creatorEngagements) ? 
          creatorEngagements.find((e: any) => e.contentId === content.id) : null;
        return !engagement?.done;
      });
    }

    return contentList;
  }, [assignedContent, creatorId, activeTab, creatorEngagements]);

  // Get engagement for specific content
  const getEngagement = (contentId: number) => {
    if (!Array.isArray(creatorEngagements)) return null;
    return creatorEngagements.find((e: any) => e.contentId === contentId);
  };

  // Engagement mutation
  const engagementMutation = useMutation({
    mutationFn: async (data: { contentId: number; liked?: boolean; disliked?: boolean; done?: boolean }) => {
      return apiRequest('POST', `/api/creator-auth/content/${data.contentId}/engage`, data);
    },
    onSuccess: () => {
      refetchEngagements();
      queryClient.invalidateQueries({ queryKey: ['/api/creator-auth/engagements'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update engagement",
        variant: "destructive"
      });
    }
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (contentId: number) => {
      return apiRequest('POST', '/api/creator-auth/bookmark', { contentId });
    },
    onSuccess: () => {
      refetchBookmarks();
      queryClient.invalidateQueries({ queryKey: ['/api/creator-auth/bookmarks'] });
      toast({
        title: "Success",
        description: "Content bookmarked successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to bookmark content",
        variant: "destructive"
      });
    }
  });

  // Handle engagement actions
  const handleLike = (contentId: number) => {
    engagementMutation.mutate({ contentId, liked: true });
  };

  const handleDislike = (contentId: number) => {
    engagementMutation.mutate({ contentId, disliked: true });
  };

  const handleDone = (contentId: number) => {
    engagementMutation.mutate({ contentId, done: true });
  };

  const handleBookmark = (content: SpringContentItem) => {
    bookmarkMutation.mutate(content.id);
  };

  const handleShare = async (content: SpringContentItem) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: content.title,
          text: content.description || 'Check out this content!',
          url: content.originalPostLink || window.location.href
        });
      } else {
        await navigator.clipboard.writeText(content.originalPostLink || window.location.href);
        toast({
          title: "Success",
          description: "Link copied to clipboard"
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Authentication check
  if (isAuthLoading) {
    return <CenteredPageLoader />;
  }

  if (!creatorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access your creator dashboard.</p>
        </div>
      </div>
    );
  }

  // Render Home Tab - Exact Visual Match to Expected Design
  const renderHomeTab = () => (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 pt-0 pb-24 relative overflow-hidden">
      {/* Background decorative elements matching expected design */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-6 w-20 h-20 bg-pink-300/20 rounded-full blur-xl"></div>
        <div className="absolute top-32 right-8 w-16 h-16 bg-purple-300/20 rounded-full blur-lg"></div>
        <div className="absolute bottom-40 left-4 w-24 h-24 bg-pink-400/15 rounded-full blur-2xl"></div>
        <div className="absolute top-20 left-1/2 text-pink-300/30 text-3xl animate-pulse">✨</div>
        <div className="absolute top-40 right-12 text-purple-300/40 text-2xl animate-bounce">🌸</div>
        <div className="absolute bottom-60 left-8 text-pink-400/30 text-xl animate-pulse" style={{animationDelay: '1s'}}>💫</div>
      </div>

      {/* Branded Header Banner - Exact Restoration */}
      <div className="bg-gradient-to-tr from-pink-400 via-pink-500 to-purple-500 text-white p-8 pb-12 rounded-t-3xl rounded-b-3xl shadow-xl relative overflow-hidden mx-4 mt-4">
        {/* Radial gradient overlay for soft bloom effect */}
        <div className="absolute inset-0 bg-gradient-radial from-pink-300/20 via-transparent to-transparent rounded-3xl"></div>
        
        {/* Header Background Decorative Elements - Exact Positioning */}
        <div className="absolute top-4 left-6 text-pink-300/60 text-2xl animate-pulse">✨</div>
        <div className="absolute top-6 right-8 text-purple-200/70 text-3xl animate-bounce" style={{animationDelay: '0.5s'}}>🌸</div>
        <div className="absolute bottom-4 left-8 text-pink-200/50 text-xl animate-pulse" style={{animationDelay: '1s'}}>💫</div>
        <div className="absolute bottom-6 right-6 text-purple-200/60 text-lg animate-twinkle" style={{animationDelay: '1.5s'}}>⭐</div>
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-pink-200/40 text-lg animate-float" style={{animationDelay: '2s'}}>💋</div>
        
        <div className="relative text-center z-10">
          <h1 className="text-4xl font-bold text-white drop-shadow-2xl mb-3">
            Welcome {creatorUsername}!
          </h1>
          <p className="text-pink-100 font-semibold text-xl mb-2">Creator Dashboard</p>
          <p className="text-pink-200 text-base flex items-center justify-center font-medium">
            <span className="mr-2 text-lg">🌸</span>
            Your Creative Space
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-2">
        {/* Content Category Tabs - Pill Container Toggle Style */}
        <div className="bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-lg border border-gray-200/50 mb-8">
          <div className="grid grid-cols-2 gap-0">
            <button className="bg-gradient-to-r from-pink-500 to-pink-600 text-white py-4 px-6 rounded-full shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">💎</span>
                <div className="text-center">
                  <div className="font-bold text-sm">OnlyFans Content</div>
                </div>
              </div>
            </button>
            
            <button className="bg-white text-gray-400 py-4 px-6 rounded-full transition-all duration-300 hover:text-gray-600">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">📱</span>
                <div className="text-center">
                  <div className="font-medium text-sm">Social Media Content</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* OnlyFans Content Section - Enhanced */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/60 mb-6">
          <div className="flex items-center mb-8">
            <div className="w-4 h-4 bg-pink-500 rounded-full mr-4"></div>
            <h3 className="text-2xl font-bold text-gray-900">OnlyFans Content</h3>
          </div>
          
          {/* Stats Row - Enhanced */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="text-center bg-gray-50 rounded-xl p-4">
              <div className="text-4xl font-bold text-gray-800 mb-2">
                {Array.isArray(assignedContent) ? assignedContent.length : 0}
              </div>
              <div className="text-base text-gray-600 font-semibold">Total</div>
            </div>
            <div className="text-center bg-red-50 rounded-xl p-4">
              <div className="text-4xl font-bold text-red-500 mb-2">0</div>
              <div className="text-base text-red-600 font-semibold">Bookmarked</div>
            </div>
            <div className="text-center bg-purple-50 rounded-xl p-4">
              <div className="text-4xl font-bold text-purple-500 mb-2">0</div>
              <div className="text-base text-purple-600 font-semibold">Completed</div>
            </div>
          </div>

          {/* Latest Content Section - Enhanced */}
          <div className="border-t border-gray-100 pt-8">
            <div className="flex items-center mb-6">
              <div className="w-4 h-4 bg-pink-500 rounded-full mr-4"></div>
              <h4 className="text-xl font-bold text-gray-900">Latest OnlyFans Content</h4>
            </div>
            
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl">💎</span>
              </div>
              <p className="text-gray-700 font-semibold text-lg mb-3">No OnlyFans content available</p>
              <p className="text-base text-gray-500 leading-relaxed max-w-sm mx-auto">
                Content categorized as OnlyFans, Customs, or Whales<br />
                will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Feed Tab
  const renderFeedTab = () => {
    if (isContentLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <CenteredPageLoader />
        </div>
      );
    }

    if (!allContent || allContent.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">No content available</h2>
            <p className="text-gray-400">Check back later for new content!</p>
          </div>
        </div>
      );
    }

    const currentContent = allContent[currentIndex];

    return (
      <div className="relative min-h-screen bg-black overflow-hidden">
        {/* Content Container */}
        <div className="relative w-full h-screen">
          {/* Video/Image Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            {currentContent.mediaType === 'video' && currentContent.videoUrl ? (
              <video
                src={currentContent.videoUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : currentContent.imageUrl ? (
              <img
                src={currentContent.imageUrl}
                alt={currentContent.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-white text-lg">No media available</span>
              </div>
            )}
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Right Side Action Buttons */}
          <div className="absolute right-3 bottom-32 flex flex-col space-y-4 z-50">
            <button
              onClick={() => handleLike(currentContent.id)}
              className="w-12 h-12 bg-red-500/90 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Heart className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={() => handleDislike(currentContent.id)}
              className="w-12 h-12 bg-blue-500/90 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <ThumbsDown className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={() => setShowContentInfo(showContentInfo === currentContent.id ? null : currentContent.id)}
              className="w-12 h-12 bg-blue-500/90 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
            >
              {showContentInfo === currentContent.id ? (
                <Minus className="w-6 h-6 text-white" />
              ) : (
                <Plus className="w-6 h-6 text-white" />
              )}
            </button>
            
            <button
              onClick={() => handleDone(currentContent.id)}
              className="w-12 h-12 bg-green-500/90 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Check className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={() => handleBookmark(currentContent)}
              className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Bookmark className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={() => handleShare(currentContent)}
              className="w-12 h-12 bg-blue-500/90 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Share className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Bottom Content Info */}
          <div className="absolute bottom-24 left-4 right-20 text-white pb-4">
            <h2 className="text-xl font-bold mb-1 drop-shadow-lg">{currentContent.title}</h2>
            {currentContent.description && (
              <p className="text-sm opacity-90 mb-2 drop-shadow-lg">{currentContent.description}</p>
            )}
            <div className="flex items-center space-x-1 text-sm">
              <span className="opacity-90">🌿</span>
              {currentContent.category && (
                <span className="text-sm opacity-80">#{currentContent.category}</span>
              )}
            </div>
          </div>

          {/* Content Info Overlay */}
          {showContentInfo === currentContent.id && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-40">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-bold mb-4">{currentContent.title}</h3>
                {currentContent.description && (
                  <p className="text-gray-600 mb-4">{currentContent.description}</p>
                )}
                {currentContent.instructions && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Instructions:</h4>
                    <p className="text-gray-600 text-sm">{currentContent.instructions}</p>
                  </div>
                )}
                <button
                  onClick={() => setShowContentInfo(null)}
                  className="w-full bg-gray-100 text-gray-800 py-2 rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-30"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          {currentIndex < allContent.length - 1 && (
            <button
              onClick={() => setCurrentIndex(prev => Math.min(allContent.length - 1, prev + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-30 rotate-180"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render Chat Tab
  const renderChatTab = () => (
    <div className="min-h-screen bg-gray-50 pt-8 pb-24">
      <div className="max-w-md mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Messages</h2>
        <div className="bg-white rounded-lg p-6 text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No messages yet</p>
          <p className="text-sm text-gray-500 mt-2">Your conversations will appear here</p>
        </div>
      </div>
    </div>
  );

  // Render Calendar Tab
  const renderCalendarTab = () => (
    <div className="min-h-screen bg-gray-50 pt-8 pb-24">
      <div className="max-w-md mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h2>
        <div className="bg-white rounded-lg p-6 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No events scheduled</p>
          <p className="text-sm text-gray-500 mt-2">Your upcoming events will appear here</p>
        </div>
      </div>
    </div>
  );

  // Render Profile Tab - Enhanced Version Matching Expected Design
  const renderProfileTab = () => (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 pt-0 pb-24">
      {/* Enhanced Gradient Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white p-8 pb-12 rounded-b-3xl shadow-2xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-600/20"></div>
        <div className="absolute top-4 right-4 text-purple-300/30 text-6xl">✨</div>
        <div className="absolute bottom-6 left-6 text-indigo-300/20 text-4xl">💫</div>
        
        <div className="relative flex items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-xl">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-white drop-shadow-lg">{creatorUsername}</h3>
            <p className="text-purple-200 font-medium">Profile & Bookmarks</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 text-center shadow-xl border border-white/60">
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {Array.isArray(creatorBookmarks) ? creatorBookmarks.length : 0}
            </div>
            <div className="text-sm text-gray-600 font-medium">Bookmarked</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 text-center shadow-xl border border-white/60">
            <div className="text-2xl font-bold text-gray-800 mb-1">1</div>
            <div className="text-sm text-gray-600 font-medium">Folders</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 text-center shadow-xl border border-white/60">
            <div className="text-2xl font-bold text-gray-800 mb-1">0</div>
            <div className="text-sm text-gray-600 font-medium">Completed</div>
          </div>
        </div>

        {/* Change Aesthetic Button */}
        <button className="w-full bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-pink-500/30 transform hover:scale-105 transition-all duration-300 mb-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm">🎨</span>
            </div>
            Change Aesthetic
          </div>
        </button>

        {/* Your Bookmarks Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/60 relative overflow-hidden">
          <div className="flex items-center mb-6">
            <Bookmark className="w-6 h-6 text-purple-600 mr-3" />
            <h4 className="text-xl font-bold text-gray-900">Your Bookmarks</h4>
          </div>
          
          {Array.isArray(creatorBookmarks) && creatorBookmarks.length > 0 ? (
            <div className="space-y-3">
              {creatorBookmarks.map((bookmark: any) => (
                <div key={bookmark.id} className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:shadow-md transition-all duration-200">
                  <Bookmark className="w-5 h-5 text-purple-600 mr-4" />
                  <span className="text-gray-800 font-medium">{bookmark.title || 'Bookmarked Content'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-2">No bookmarks yet</p>
              <p className="text-gray-600">Start bookmarking content from the Feed to see it here!</p>
            </div>
          )}
          
          {/* Subtle Background Pattern */}
          <div className="absolute top-4 right-4 text-purple-200/20 text-2xl">📌</div>
          <div className="absolute bottom-4 left-4 text-pink-200/20 text-xl">⭐</div>
        </div>
      </div>
    </div>
  );

  // Render current tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeTab();
      case 'feed':
        return renderFeedTab();
      case 'chat':
        return renderChatTab();
      case 'calendar':
        return renderCalendarTab();
      case 'profile':
        return renderProfileTab();
      default:
        return renderHomeTab();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <main className="relative">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-100 to-purple-100 border-t border-pink-200 z-50">
        <div className="flex justify-around items-center py-2 px-4">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'feed', icon: Play, label: 'Feed' },
            { id: 'chat', icon: MessageCircle, label: 'Chat' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' },
            { id: 'profile', icon: User, label: 'Profile' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
                activeTab === id
                  ? 'bg-pink-200 text-pink-700'
                  : 'text-pink-400 hover:text-pink-600 hover:bg-pink-100'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
        
        {/* Home Indicator */}
        <div className="flex justify-center pb-2">
          <div className="w-32 h-1 bg-pink-300 rounded-full"></div>
        </div>
      </nav>
    </div>
  );
}