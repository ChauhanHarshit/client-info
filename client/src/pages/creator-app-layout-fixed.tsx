import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCreatorAuth } from '@/contexts/CreatorAuthContext';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { 
  Home, 
  Play, 
  User, 
  Heart, 
  Bookmark, 
  Check, 
  Share, 
  X,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { AdminOverlay } from '@/components/AdminOverlay';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Spring Content Item interface from Inspo Pages
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

export default function CreatorAppLayout() {
  const { creatorId, creatorUsername } = useCreatorAuth();
  const { user: adminUser, isAuthenticated: isAdminAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // Extract admin parameter from URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const isAdminParam = urlParams.get('admin') === 'true';
  const isAdminPreview = isAdminAuthenticated && isAdminParam;
  
  // State management
  const [activeTab, setActiveTab] = useState<'home' | 'feed' | 'profile'>('home');
  const [bookmarkedItems, setBookmarkedItems] = useState<SpringContentItem[]>([]);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [playingVideos, setPlayingVideos] = useState<Set<number>>(new Set());
  const [showContentInfo, setShowContentInfo] = useState<number | null>(null);

  // Swipe handling for Feed
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50;
    const isDownSwipe = distance < -50;

    if (isUpSwipe && currentContentIndex < (allContent as any[]).length - 1) {
      setCurrentContentIndex(prev => prev + 1);
    }
    if (isDownSwipe && currentContentIndex > 0) {
      setCurrentContentIndex(prev => prev - 1);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  // Fetch Spring Content from Inspo Pages (Page ID 1)
  const { data: allContent = [], isLoading: isContentLoading } = useQuery({
    queryKey: ['/api/inspo-pages/1/content'],
  });

  // Get current content for Feed tab
  const currentContent = (allContent as SpringContentItem[])[currentContentIndex];

  // Engagement handlers
  const handleDone = (content: SpringContentItem) => {
    console.log('Content marked as done:', content.title);
  };

  const handleBookmark = (content: SpringContentItem) => {
    setBookmarkedItems(prev => {
      const exists = prev.find(item => item.id === content.id);
      if (exists) {
        return prev.filter(item => item.id !== content.id);
      } else {
        return [...prev, content];
      }
    });
  };

  const handleShare = async (content: SpringContentItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  // Debug logging
  console.log('CreatorAppLayout - Auth Status:', { 
    creatorId, 
    creatorUsername, 
    isAdminAuthenticated, 
    adminUser,
    currentPath: location,
    isAdminParam,
    isAdminPreview 
  });

  if (!creatorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <div className="text-xl font-semibold text-gray-700 mb-2">Creator Access Required</div>
          <div className="text-gray-500">Please log in as a creator to access this content</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Admin Overlay - Only visible to authenticated admins */}
      {isAdminPreview && (
        <AdminOverlay 
          creatorId={creatorId}
          creatorUsername={creatorUsername}
        />
      )}

      {/* Main Creator App */}
      <div className="flex-1 flex flex-col max-w-md mx-auto bg-white shadow-lg relative overflow-hidden">
        
        {/* Home Tab - Dashboard with Categories */}
        {activeTab === 'home' && (
          <div className="flex-1 overflow-y-auto" style={{
            background: 'linear-gradient(135deg, #fef7f0 0%, #fef2f2 25%, #fef7f0 50%, #fff1f2 75%, #fef2f2 100%)',
            backgroundAttachment: 'fixed'
          }}>
            {/* Welcome Header */}
            <div className="relative h-48 mb-6 overflow-hidden rounded-b-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-rose-100 to-pink-50">
                {/* Cherry Blossom Animation */}
                <div className="absolute inset-0">
                  <div className="absolute top-4 left-8 text-pink-300 text-lg animate-bounce" style={{ animationDelay: '0s' }}>🌸</div>
                  <div className="absolute top-12 right-12 text-rose-400 text-sm animate-pulse" style={{ animationDelay: '1s' }}>✨</div>
                  <div className="absolute top-20 left-16 text-pink-300 text-xs animate-bounce" style={{ animationDelay: '2s' }}>🌸</div>
                  <div className="absolute top-6 right-6 text-rose-300 text-base animate-pulse" style={{ animationDelay: '0.5s' }}>💫</div>
                  <div className="absolute top-16 left-4 text-pink-400 text-sm animate-bounce" style={{ animationDelay: '1.5s' }}>🌸</div>
                  <div className="absolute top-24 right-20 text-rose-200 text-lg animate-pulse" style={{ animationDelay: '2.5s' }}>✨</div>
                  <div className="absolute top-8 left-20 text-pink-200 text-xs animate-bounce" style={{ animationDelay: '3s' }}>🌸</div>
                  <div className="absolute top-28 right-8 text-rose-300 text-sm animate-pulse" style={{ animationDelay: '3.5s' }}>💫</div>
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-pink-100/80 via-transparent to-transparent"></div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative mb-3">
                    <div className="text-4xl font-bold text-pink-700 mb-2 animate-pulse">🌸</div>
                    <div className="absolute -top-2 -left-2 text-pink-300 text-sm animate-ping" style={{ animationDelay: '0s' }}>✨</div>
                    <div className="absolute -top-1 -right-2 text-rose-300 text-sm animate-ping" style={{ animationDelay: '1s' }}>✨</div>
                    <div className="absolute -bottom-1 -left-1 text-pink-200 text-xs animate-ping" style={{ animationDelay: '1.5s' }}>✨</div>
                    <div className="absolute -bottom-2 -right-1 text-rose-200 text-xs animate-ping" style={{ animationDelay: '0.5s' }}>✨</div>
                  </div>
                  <div className="text-xl font-bold text-pink-800 mb-1 tracking-wide">Welcome {creatorUsername}!</div>
                  <div className="text-sm text-pink-600 font-medium">Creator Dashboard</div>
                  <div className="mt-2 px-4 py-1 bg-pink-200/50 rounded-full text-xs text-pink-700 inline-block backdrop-blur-sm">
                    🌸 Your Creative Space
                  </div>
                </div>
              </div>
            </div>

            {/* Content Categories Grid */}
            <div className="px-4 pb-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-pink-100/70 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <div className="text-2xl mb-2">📹</div>
                  <div className="text-sm font-semibold text-pink-800">Video Content</div>
                  <div className="text-xs text-pink-600 mt-1">{(allContent as any[]).filter(c => c.videoUrl).length} videos</div>
                </div>
                
                <div className="bg-rose-100/70 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <div className="text-2xl mb-2">🖼️</div>
                  <div className="text-sm font-semibold text-rose-800">Image Content</div>
                  <div className="text-xs text-rose-600 mt-1">{(allContent as any[]).filter(c => c.imageUrl).length} images</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-pink-400 rounded-full mr-2"></div>
                  Today's Progress
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-pink-600">{(allContent as any[]).length}</div>
                    <div className="text-xs text-gray-600">Total Content</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-rose-600">{bookmarkedItems.length}</div>
                    <div className="text-xs text-gray-600">Bookmarked</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">0</div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                </div>
              </div>

              {/* Recent Content Preview */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-rose-400 rounded-full mr-2"></div>
                  Latest Content
                </h3>
                {isContentLoading ? (
                  <div className="text-center py-4 text-pink-600">Loading content...</div>
                ) : (allContent as any[]).length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No content available</div>
                ) : (
                  <div className="space-y-3">
                    {(allContent as any[]).slice(0, 3).map((content: SpringContentItem) => (
                      <div key={content.id} className="flex items-center space-x-3 p-2 rounded-lg bg-pink-50/50">
                        <div className="w-12 h-12 bg-pink-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs">📱</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{content.title}</div>
                          <div className="text-xs text-gray-500">{content.category}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feed Tab - TikTok-style Video Feed */}
        {activeTab === 'feed' && (
          <div className="flex-1 bg-black relative">
            {isContentLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white">Loading Spring Content...</div>
              </div>
            ) : (allContent as any[]).length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white text-center">
                  <div className="text-4xl mb-4">📱</div>
                  <div>No Spring Content available</div>
                </div>
              </div>
            ) : currentContent ? (
              <div 
                className="h-full relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
              >
                {/* Video Background */}
                <video
                  key={currentContent.id}
                  src={currentContent.videoUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                />
                
                {/* Content Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent">
                  {/* Top Info */}
                  <div className="absolute top-4 left-4 right-4 text-white">
                    <h2 className="text-lg font-bold mb-1">{currentContent.title}</h2>
                    <p className="text-sm opacity-80">{currentContent.description}</p>
                  </div>
                  
                  {/* Side Actions */}
                  <div className="absolute right-4 bottom-32 flex flex-col space-y-4">
                    <button
                      onClick={() => handleDone(currentContent)}
                      className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                    >
                      <Heart className="w-6 h-6 text-white" />
                    </button>
                    
                    <button
                      onClick={() => handleBookmark(currentContent)}
                      className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                    >
                      <Bookmark className="w-6 h-6 text-white" />
                    </button>
                    
                    <button
                      onClick={() => handleShare(currentContent)}
                      className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                    >
                      <Share className="w-6 h-6 text-white" />
                    </button>
                    
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                    >
                      {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
                    </button>
                  </div>
                  
                  {/* Navigation Arrows */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-4">
                    <button
                      onClick={() => setCurrentContentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentContentIndex === 0}
                      className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm disabled:opacity-50"
                    >
                      <ChevronUp className="w-5 h-5 text-white" />
                    </button>
                    
                    <button
                      onClick={() => setCurrentContentIndex(prev => Math.min((allContent as any[]).length - 1, prev + 1))}
                      disabled={currentContentIndex === (allContent as any[]).length - 1}
                      className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm disabled:opacity-50"
                    >
                      <ChevronDown className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  
                  {/* Bottom Info */}
                  <div className="absolute bottom-4 left-4 right-20 text-white">
                    <div className="flex items-center space-x-2 mb-2">
                      {currentContent.category && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          {currentContent.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs opacity-60">
                      {currentContentIndex + 1} of {(allContent as any[]).length}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Profile Tab - User Profile with Bookmarked Content Only */}
        {activeTab === 'profile' && (
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-100">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 pb-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">{creatorUsername || 'Creator'}</h1>
                  <p className="text-indigo-100">Profile & Bookmarks</p>
                </div>
              </div>
            </div>

            {/* Profile Stats */}
            <div className="px-6 py-4 bg-white shadow-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{bookmarkedItems.length}</div>
                  <div className="text-sm text-gray-600">Bookmarked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{(allContent as any[]).length}</div>
                  <div className="text-sm text-gray-600">Total Content</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">0</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>
            </div>

            {/* Bookmarked Content Section */}
            <div className="px-6 py-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Bookmark className="w-5 h-5 mr-2" />
                Your Bookmarks
              </h2>
              
              {bookmarkedItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔖</div>
                  <div className="text-gray-500">No bookmarked content yet</div>
                  <div className="text-sm text-gray-400 mt-2">Start bookmarking content from the feed to see it here</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {bookmarkedItems.map((content) => (
                    <div key={content.id} className="bg-white rounded-lg shadow-sm p-4 flex items-start space-x-4">
                      {/* Video Thumbnail */}
                      {content.videoUrl && (
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          <video
                            src={content.videoUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                        </div>
                      )}
                      
                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">{content.title}</h3>
                        <p className="text-gray-600 text-xs mb-2 line-clamp-2">{content.description}</p>
                        {content.category && (
                          <Badge variant="secondary" className="text-xs">{content.category}</Badge>
                        )}
                      </div>
                      
                      {/* Remove Bookmark Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setBookmarkedItems(prev => prev.filter(item => item.id !== content.id));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex-shrink-0 bg-gradient-to-r from-pink-50 to-rose-50 border-t border-pink-200 px-6 py-3 pb-4 backdrop-blur-sm safe-area-inset-bottom">
          <div className="flex justify-around">
            <button
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'home' 
                  ? 'bg-pink-200 text-pink-700 shadow-sm' 
                  : 'text-pink-400 hover:bg-pink-100 hover:text-pink-600'
              }`}
              onClick={() => setActiveTab('home')}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">Home</span>
            </button>
            
            <button
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'feed' 
                  ? 'bg-pink-200 text-pink-700 shadow-sm' 
                  : 'text-pink-400 hover:bg-pink-100 hover:text-pink-600'
              }`}
              onClick={() => setActiveTab('feed')}
            >
              <Play className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">Feed</span>
            </button>
            
            <button
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'profile' 
                  ? 'bg-pink-200 text-pink-700 shadow-sm' 
                  : 'text-pink-400 hover:bg-pink-100 hover:text-pink-600'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              <User className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">Profile</span>
            </button>
          </div>
          
          {/* Home Indicator */}
          <div className="flex justify-center mt-2">
            <div className="w-24 h-1 bg-pink-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}