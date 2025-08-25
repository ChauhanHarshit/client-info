import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useCreatorAuth } from "@/contexts/CreatorAuthContext";
import { Home, Play, User, Heart, Bookmark, Share, ThumbsDown, Plus, Check, Info, ExternalLink } from "lucide-react";

interface ContentItem {
  id: number;
  title: string;
  description: string;
  category: string;
  mediaUrl?: string;
  mediaType?: string;
  content?: string;
  linkUrl?: string;
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
  const [activeTab, setActiveTab] = useState<'home' | 'feed' | 'profile'>('home');
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [bookmarkedItems, setBookmarkedItems] = useState<ContentItem[]>([]);
  const [playingVideos, setPlayingVideos] = useState<Set<number>>(new Set());
  const [isMuted, setIsMuted] = useState(true);
  const [showContentInfo, setShowContentInfo] = useState<number | null>(null);
  const [profileViewMode, setProfileViewMode] = useState<'categories' | 'all-bookmarks' | 'category-feed'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [bookmarkContentIndex, setBookmarkContentIndex] = useState(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { creatorId, creatorUsername } = useCreatorAuth();

  // Debug logging for creator authentication
  console.log('CreatorAppLayout - Creator Auth:', { creatorId, creatorUsername });

  // Fetch content for creator
  const { data: allContent = [], isLoading: isContentLoading } = useQuery({
    queryKey: ['/api/creator/content', creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      if (!creatorId) return [];
      
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/creator/content?creatorId=${creatorId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }
      
      return response.json();
    }
  });

  // Fetch engagements for creator
  const { data: engagements = [], refetch: refetchEngagements } = useQuery<Engagement[]>({
    queryKey: ['/api/creator/engagements', creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      if (!creatorId) return [];
      
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/creator/engagements?creatorId=${creatorId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch engagements: ${response.status}`);
      }
      
      return response.json();
    }
  });

  // Fetch bookmarks for creator
  const { data: bookmarks = [], refetch: refetchBookmarks } = useQuery({
    queryKey: ['/api/creator/bookmarks', creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      if (!creatorId) return [];
      
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/creator/bookmarks?creatorId=${creatorId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bookmarks: ${response.status}`);
      }
      
      return response.json();
    }
  });

  // Create engagement mutation
  const createEngagementMutation = useMutation({
    mutationFn: async (data: { contentId: number; type: 'like' | 'dislike' | 'done' }) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch('/api/creator/engagements', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          creatorId,
          contentId: data.contentId,
          [data.type]: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create engagement: ${response.status}`);
      }
      
      return response;
    },
    onSuccess: () => {
      refetchEngagements();
      queryClient.invalidateQueries({ queryKey: ['/api/creator/engagements'] });
    }
  });

  // Get engagement for specific content
  const getEngagement = (contentId: number) => {
    return engagements.find(e => e.contentId === contentId);
  };

  // Handle like action
  const handleLike = (content: ContentItem) => {
    const engagement = getEngagement(content.id);
    if (!engagement?.liked) {
      createEngagementMutation.mutate({ contentId: content.id, type: 'like' });
      toast({ description: "Content liked! 💖" });
    }
  };

  // Handle dislike action
  const handleDislike = (content: ContentItem) => {
    const engagement = getEngagement(content.id);
    if (!engagement?.disliked) {
      createEngagementMutation.mutate({ contentId: content.id, type: 'dislike' });
      toast({ description: "Content disliked" });
    }
  };

  // Handle done action
  const handleDone = (content: ContentItem) => {
    const engagement = getEngagement(content.id);
    if (!engagement?.done) {
      createEngagementMutation.mutate({ contentId: content.id, type: 'done' });
      toast({ description: "Marked as done! ✅" });
    }
  };

  // Handle bookmark action
  const handleBookmark = (content: ContentItem) => {
    if (!bookmarkedItems.find(item => item.id === content.id)) {
      setBookmarkedItems(prev => [...prev, content]);
      toast({ description: "Content bookmarked! 🔖" });
    }
  };

  // Handle share action
  const handleShare = async (content: ContentItem) => {
    try {
      const shareData: ShareData = {
        title: content.title,
        text: content.description,
        url: content.linkUrl || window.location.href,
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({ description: "Content shared successfully! 📤" });
      } else {
        await navigator.clipboard.writeText(content.linkUrl || window.location.href);
        toast({ description: "Link copied to clipboard! 📋" });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({ description: "Failed to share content", variant: "destructive" });
    }
  };

  // Handle video play/pause
  const toggleVideo = (contentId: number) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.clear(); // Only one video playing at a time
        newSet.add(contentId);
      }
      return newSet;
    });
  };

  // Handle next content
  const handleNextContent = () => {
    if (currentContentIndex < (allContent as any[]).length - 1) {
      setCurrentContentIndex(prev => prev + 1);
    }
  };

  // Handle previous content
  const handlePrevContent = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(prev => prev - 1);
    }
  };

  // Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    (e.currentTarget as any).startY = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const startY = (e.currentTarget as any).startY;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaY) > 50) { // Minimum swipe distance
      if (deltaY < 0) {
        handleNextContent();
      } else {
        handlePrevContent();
      }
    }
  };

  const currentContent = (allContent as any[])[currentContentIndex];

  return (
    <div className="min-h-screen bg-white w-full">
      {/* Clean Fullscreen Layout */}
      <div className="w-full min-h-screen bg-white relative">
        {/* Home Tab - Cherry Blossoms Theme */}
        {activeTab === 'home' && (
          <div className="h-full overflow-y-auto pb-20" style={{
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 25%, #f3e8ff 50%, #e0f2fe 75%, #f0fdf4 100%)',
            backgroundAttachment: 'fixed'
          }}>
            {/* Animated Cherry Blossoms Header Banner */}
            <div className="relative h-40 mb-6 overflow-hidden rounded-b-3xl">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-rose-100 to-pink-50">
                {/* Floating Cherry Blossoms Animation */}
                <div className="absolute inset-0">
                  <div className="absolute top-4 left-8 text-pink-300 text-lg animate-bounce" style={{ animationDelay: '0s' }}>🌸</div>
                  <div className="absolute top-12 right-12 text-pink-400 text-sm animate-pulse" style={{ animationDelay: '1s' }}>🌸</div>
                  <div className="absolute top-20 left-16 text-rose-300 text-xs animate-bounce" style={{ animationDelay: '2s' }}>🌸</div>
                  <div className="absolute top-6 right-6 text-pink-300 text-base animate-pulse" style={{ animationDelay: '0.5s' }}>🌸</div>
                  <div className="absolute top-16 left-4 text-rose-400 text-sm animate-bounce" style={{ animationDelay: '1.5s' }}>🌸</div>
                  <div className="absolute top-24 right-20 text-pink-200 text-lg animate-pulse" style={{ animationDelay: '2.5s' }}>🌸</div>
                  <div className="absolute top-8 left-20 text-pink-200 text-xs animate-bounce" style={{ animationDelay: '3s' }}>🌸</div>
                  <div className="absolute top-28 right-8 text-rose-300 text-sm animate-pulse" style={{ animationDelay: '3.5s' }}>🌸</div>
                </div>
                
                {/* Subtle Pattern Background */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f472b6' fill-opacity='0.3'%3E%3Cpath d='M30 25c2.761 0 5 2.239 5 5s-2.239 5-5 5-5-2.239-5-5 2.239-5 5-5zm0 2c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z'/%3E%3Cpath d='M15 10c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z'/%3E%3Cpath d='M45 50c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                />
              </div>
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-pink-100/80 via-transparent to-transparent"></div>
              
              {/* Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative mb-3">
                    <div className="text-4xl font-bold text-pink-700 mb-2 animate-pulse">🌸</div>
                    <div className="absolute -top-2 -left-2 text-pink-300 text-sm animate-ping" style={{ animationDelay: '0s' }}>✨</div>
                    <div className="absolute -top-1 -right-2 text-rose-300 text-sm animate-ping" style={{ animationDelay: '1s' }}>✨</div>
                    <div className="absolute -bottom-1 -left-1 text-pink-200 text-xs animate-ping" style={{ animationDelay: '1.5s' }}>✨</div>
                    <div className="absolute -bottom-2 -right-1 text-rose-200 text-xs animate-ping" style={{ animationDelay: '0.5s' }}>✨</div>
                  </div>
                  <div className="text-xl font-bold text-pink-800 mb-1 tracking-wide">{creatorUsername || 'Creator'}</div>
                  <div className="text-sm text-pink-600 font-medium">All Your Inspo</div>
                  <div className="mt-2 px-4 py-1 bg-pink-200/50 rounded-full text-xs text-pink-700 inline-block backdrop-blur-sm">
                    🤍 To Do!
                  </div>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="px-4 pb-6">
              {isContentLoading ? (
                <div className="text-center py-8">
                  <div className="text-pink-600">Loading your content...</div>
                </div>
              ) : (allContent as any[]).length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-pink-600">No content available yet</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {(allContent as any[]).map((content: ContentItem, index: number) => {
                    const engagement = getEngagement(content.id);
                    return (
                      <div key={content.id} className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                        {/* Content Media */}
                        {content.mediaUrl && (
                          <div className="relative aspect-square">
                            {content.mediaType?.includes('video') ? (
                              <video
                                src={content.mediaUrl}
                                className="w-full h-full object-cover"
                                muted={isMuted}
                                loop
                                autoPlay={playingVideos.has(content.id)}
                                onClick={() => toggleVideo(content.id)}
                              />
                            ) : (
                              <img
                                src={content.mediaUrl}
                                alt={content.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                            
                            {/* Engagement Indicators */}
                            <div className="absolute top-2 right-2 flex gap-1">
                              {engagement?.liked && <div className="bg-red-500 text-white rounded-full p-1 text-xs">❤️</div>}
                              {engagement?.done && <div className="bg-green-500 text-white rounded-full p-1 text-xs">✅</div>}
                            </div>
                          </div>
                        )}

                        {/* Content Info */}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-2">{content.title}</h3>
                          <Badge variant="secondary" className="text-xs mb-3">{content.category}</Badge>
                          
                          {/* Action Buttons */}
                          <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleLike(content)}
                                className={`p-2 ${engagement?.liked ? 'text-red-500' : 'text-gray-500'}`}
                              >
                                <Heart className="w-4 h-4" />
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleBookmark(content)}
                                className="p-2 text-gray-500"
                              >
                                <Bookmark className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDone(content)}
                              className={`p-2 ${engagement?.done ? 'text-green-500' : 'text-gray-500'}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feed Tab - TikTok Style */}
        {activeTab === 'feed' && (
          <div className="h-full bg-black relative">
            {currentContent && (
              <div
                className="h-full flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Content Display */}
                <div className="relative w-full h-full">
                  {currentContent.mediaUrl && currentContent.mediaType?.includes('video') ? (
                    <video
                      src={currentContent.mediaUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted={isMuted}
                      onClick={() => toggleVideo(currentContent.id)}
                    />
                  ) : currentContent.mediaUrl ? (
                    <img
                      src={currentContent.mediaUrl}
                      alt={currentContent.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <div className="text-center text-white p-8">
                        <h2 className="text-2xl font-bold mb-4">{currentContent.title}</h2>
                        <p className="text-gray-300">{currentContent.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Content Info Overlay */}
                  <div className="absolute bottom-20 left-4 right-20 text-white">
                    <h2 className="text-lg font-bold mb-2">{currentContent.title}</h2>
                    <p className="text-sm opacity-80 mb-3">{currentContent.description}</p>
                    <Badge variant="secondary" className="mb-2">{currentContent.category}</Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute bottom-32 right-4 flex flex-col gap-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleLike(currentContent)}
                      className="bg-black/50 text-white rounded-full p-3"
                    >
                      <Heart className="w-6 h-6" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleBookmark(currentContent)}
                      className="bg-black/50 text-white rounded-full p-3"
                    >
                      <Bookmark className="w-6 h-6" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleShare(currentContent)}
                      className="bg-black/50 text-white rounded-full p-3"
                    >
                      <Share className="w-6 h-6" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDone(currentContent)}
                      className="bg-black/50 text-white rounded-full p-3"
                    >
                      <Check className="w-6 h-6" />
                    </Button>
                  </div>

                  {/* Navigation Indicators */}
                  <div className="absolute top-4 right-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                    {currentContentIndex + 1} / {(allContent as any[]).length}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="h-full overflow-y-auto pb-20 bg-gradient-to-br from-purple-50 to-pink-50">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-b-3xl mb-6">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16 border-2 border-white">
                  <AvatarFallback className="bg-white text-purple-600 text-xl font-bold">
                    {creatorUsername ? creatorUsername.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{creatorUsername || 'Creator'}</h2>
                  <p className="text-purple-100">Content Creator</p>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex justify-around text-center">
                <div>
                  <div className="text-2xl font-bold">{(allContent as any[]).length}</div>
                  <div className="text-purple-100 text-sm">Content</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{bookmarkedItems.length}</div>
                  <div className="text-purple-100 text-sm">Bookmarks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{engagements.filter(e => e.liked).length}</div>
                  <div className="text-purple-100 text-sm">Liked</div>
                </div>
              </div>
            </div>

            {/* Content Categories */}
            <div className="px-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Your Bookmarks</h3>
              
              {bookmarkedItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No bookmarks yet</div>
                  <div className="text-sm text-gray-400 mt-2">Bookmark content from the home tab to see it here</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {bookmarkedItems.map((content) => (
                    <div key={content.id} className="bg-white rounded-2xl overflow-hidden shadow-lg">
                      {content.mediaUrl && (
                        <div className="aspect-square">
                          <img
                            src={content.mediaUrl}
                            alt={content.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <h4 className="font-semibold text-sm text-gray-800 line-clamp-2">{content.title}</h4>
                        <Badge variant="secondary" className="text-xs mt-2">{content.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation - Cherry Blossoms Theme */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-pink-50 to-rose-50 border-t border-pink-200 px-6 py-3 pb-4 backdrop-blur-sm">
          <div className="flex justify-around">
            <button
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'home' 
                  ? 'bg-pink-200 text-pink-700 shadow-sm' 
                  : 'text-pink-400 hover:bg-pink-100 hover:text-pink-600'
              }`}
              onClick={() => setActiveTab('home')}
            >
              <Home className="w-4 h-4" />
              <span className="text-xs font-medium mt-1">🌸 Home</span>
            </button>
            
            <button
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'feed' 
                  ? 'bg-green-200 text-green-700 shadow-sm' 
                  : 'text-green-400 hover:bg-green-100 hover:text-green-600'
              }`}
              onClick={() => setActiveTab('feed')}
            >
              <Play className="w-4 h-4" />
              <span className="text-xs font-medium mt-1">🌿 Feed</span>
            </button>
            
            <button
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'profile' 
                  ? 'bg-purple-200 text-purple-700 shadow-sm' 
                  : 'text-purple-400 hover:bg-purple-100 hover:text-purple-600'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              <User className="w-4 h-4" />
              <span className="text-xs font-medium mt-1">💖 Profile</span>
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