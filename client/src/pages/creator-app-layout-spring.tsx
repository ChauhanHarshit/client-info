import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCreatorAuth } from "@/contexts/CreatorAuthContext";
import { useAuth } from "@/hooks/useAuth";
import { AdminOverlay } from "@/components/AdminOverlay";
import { Home, Play, User, Heart, Bookmark, Share, ThumbsDown, Plus, Check, Info, ExternalLink, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { CenteredPageLoader } from '@/components/ui/loading-animation';

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

export default function CreatorAppLayoutSpring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [playingVideos, setPlayingVideos] = useState<Set<number>>(new Set());
  const [isMuted, setIsMuted] = useState(true);
  const { creatorId, creatorUsername } = useCreatorAuth();
  const { user: adminUser, isAuthenticated: isAdminAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Check if this is an admin previewing the creator layout
  const currentPath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminParam = urlParams.get('admin') === 'true';
  const isAdminPreview = isAdminAuthenticated && !creatorId && (
    currentPath === '/creator-app-preview' ||
    (currentPath === '/creator-app-layout' && isAdminParam) ||
    (currentPath === '/creator-app-layout' && !creatorId) // Admin accessing directly
  );

  // Debug logging for authentication
  console.log('CreatorAppLayout - Auth Status:', { 
    creatorId, 
    creatorUsername,
    isAdminAuthenticated,
    adminUser,
    currentPath,
    isAdminParam,
    isAdminPreview 
  });

  // Fetch Spring Content from Inspo Pages (Page ID 1)
  const { data: allContent = [], isLoading: isContentLoading } = useQuery({
    queryKey: ['/api/inspo-pages/1/content'],
  });

  // Disable creator-specific queries when showing Inspo Pages content
  const { data: engagements = [], refetch: refetchEngagements } = useQuery<Engagement[]>({
    queryKey: ['/api/creator/engagements', creatorId],
    enabled: false, // Disabled for Inspo Pages content
  });

  // Disable bookmarks for Inspo Pages content
  const { data: bookmarks = [], refetch: refetchBookmarks } = useQuery({
    queryKey: ['/api/creator/bookmarks', creatorId],
    enabled: false, // Disabled for Inspo Pages content
  });

  const currentContent = (allContent as SpringContentItem[])[currentContentIndex];

  const handleShare = async (content: SpringContentItem) => {
    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: content.title,
          text: content.description || '',
          url: window.location.href,
        };
        await navigator.share(shareData);
        toast({
          title: "Content shared successfully!",
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support native sharing
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied to clipboard!",
      });
    }
  };

  const toggleVideo = (contentId: number) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.add(contentId);
      }
      return newSet;
    });
  };

  const getEngagement = (contentId: number) => {
    return engagements.find(e => e.contentId === contentId);
  };

  const handleNext = () => {
    if (currentContentIndex < (allContent as SpringContentItem[]).length - 1) {
      setCurrentContentIndex(currentContentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(currentContentIndex - 1);
    }
  };

  const renderSpringContent = (content: SpringContentItem) => (
    <div key={content.id} className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Content Media */}
      {(content.videoUrl || content.imageUrl) && (
        <div className="relative aspect-square">
          {content.mediaType === 'video' && content.videoUrl ? (
            <video
              src={content.videoUrl}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              autoPlay={playingVideos.has(content.id)}
              onClick={() => toggleVideo(content.id)}
            />
          ) : (
            <img
              src={content.imageUrl || content.videoUrl}
              alt={content.title}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Spring Content Badge */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-pink-500 text-white text-xs">🌸 Spring</Badge>
          </div>
        </div>
      )}

      {/* Content Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-2">{content.title}</h3>
        {content.description && (
          <p className="text-gray-600 text-xs mb-2 line-clamp-2">{content.description}</p>
        )}
        <Badge variant="secondary" className="text-xs mb-3">{content.category || 'Spring Inspo'}</Badge>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleShare(content)}
              className="p-2 text-gray-500"
            >
              <Share className="w-4 h-4" />
            </Button>
            
            {content.originalPostLink && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(content.originalPostLink, '_blank')}
                className="p-2 text-gray-500"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <Button size="sm" variant="ghost" className="p-2 text-gray-400">
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (isContentLoading) {
    return <CenteredPageLoader message="Loading Spring Content..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 relative">
      {/* Admin Overlay */}
      <AdminOverlay 
        isVisible={isAdminPreview} 
        creatorName={creatorUsername || 'Spring Content Preview'}
      />
      
      {/* Main Content */}
      <div className={`${isAdminPreview ? 'pt-14' : ''}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-200/80 to-rose-200/80 backdrop-blur-lg border-b border-pink-200/50 sticky top-0 z-50">
            <div className="text-center py-6">
              <div className="relative mb-3">
                <div className="text-4xl font-bold text-pink-700 mb-2 animate-pulse">🌸</div>
                <div className="absolute -top-2 -left-2 text-pink-300 text-sm animate-ping" style={{ animationDelay: '0s' }}>✨</div>
                <div className="absolute -top-1 -right-2 text-rose-300 text-sm animate-ping" style={{ animationDelay: '1s' }}>✨</div>
                <div className="absolute -bottom-1 -left-1 text-pink-200 text-xs animate-ping" style={{ animationDelay: '1.5s' }}>✨</div>
                <div className="absolute -bottom-2 -right-1 text-rose-200 text-xs animate-ping" style={{ animationDelay: '0.5s' }}>✨</div>
              </div>
              <div className="text-xl font-bold text-pink-800 mb-1 tracking-wide">Spring Content</div>
              <div className="text-sm text-pink-600 font-medium">Fresh Inspiration</div>
              <div className="mt-2 px-4 py-1 bg-pink-200/50 rounded-full text-xs text-pink-700 inline-block backdrop-blur-sm">
                🌸 Spring Collection
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="px-4 pb-6">
            {(allContent as SpringContentItem[]).length === 0 ? (
              <div className="text-center py-8">
                <div className="text-pink-600">No spring content available yet</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {(allContent as SpringContentItem[]).map((content) => renderSpringContent(content))}
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-pink-200/50 z-40">
            <TabsList className="w-full bg-transparent h-16 p-0 rounded-none">
              <TabsTrigger 
                value="home" 
                className="flex-1 flex-col gap-1 h-full bg-transparent border-none data-[state=active]:bg-pink-100/50 data-[state=active]:text-pink-700 text-gray-500"
              >
                <Home className="w-5 h-5" />
                <span className="text-xs font-medium">Spring</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="browse" 
                className="flex-1 flex-col gap-1 h-full bg-transparent border-none data-[state=active]:bg-pink-100/50 data-[state=active]:text-pink-700 text-gray-500"
              >
                <Play className="w-5 h-5" />
                <span className="text-xs font-medium">Browse</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="profile" 
                className="flex-1 flex-col gap-1 h-full bg-transparent border-none data-[state=active]:bg-pink-100/50 data-[state=active]:text-pink-700 text-gray-500"
              >
                <User className="w-5 h-5" />
                <span className="text-xs font-medium">Profile</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>
    </div>
  );
}