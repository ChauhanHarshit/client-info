import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Heart, Bookmark, Share2, VolumeX, Volume2, MoreVertical, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { HLSVideoPlayer } from './hls-video-player';
import { MuxVideoPlayer } from './mux-video-player';

interface BookmarkedVideoFeedProps {
  videos: any[];
  initialVideoIndex?: number;
  onBack?: () => void;
}

export const BookmarkedVideoFeed: React.FC<BookmarkedVideoFeedProps> = ({
  videos,
  initialVideoIndex = 0,
  onBack
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialVideoIndex);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<number>>(new Set());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle video interaction mutations
  const interactionMutation = useMutation({
    mutationFn: async ({ contentId, type, metadata }: {
      contentId: number;
      type: string;
      metadata?: any;
    }) => {
      const response = await fetch('/api/creator/content/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, interactionType: type, metadata })
      });
      if (!response.ok) throw new Error('Failed to record interaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creator/content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/creator-auth/bookmarks'] });
    }
  });

  // Handle like/unlike
  const handleLike = useCallback((videoId: number) => {
    const isLiked = likedVideos.has(videoId);
    const newLikedVideos = new Set(likedVideos);
    
    if (isLiked) {
      newLikedVideos.delete(videoId);
    } else {
      newLikedVideos.add(videoId);
    }
    
    setLikedVideos(newLikedVideos);
    
    interactionMutation.mutate({
      contentId: videoId,
      type: isLiked ? 'unliked' : 'liked'
    });

    toast({
      title: isLiked ? "Removed from likes" : "Added to likes",
      description: isLiked ? "Video removed from your likes" : "Video added to your likes"
    });
  }, [likedVideos, interactionMutation, toast]);

  // Handle bookmark/unbookmark
  const handleBookmark = useCallback((videoId: number) => {
    const isBookmarked = bookmarkedVideos.has(videoId);
    const newBookmarkedVideos = new Set(bookmarkedVideos);
    
    if (isBookmarked) {
      newBookmarkedVideos.delete(videoId);
    } else {
      newBookmarkedVideos.add(videoId);
    }
    
    setBookmarkedVideos(newBookmarkedVideos);
    
    interactionMutation.mutate({
      contentId: videoId,
      type: isBookmarked ? 'unbookmarked' : 'bookmarked'
    });

    toast({
      title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
      description: isBookmarked ? "Video removed from your bookmarks" : "Video saved to your bookmarks"
    });
  }, [bookmarkedVideos, interactionMutation, toast]);

  // Handle share
  const handleShare = useCallback(async (video: any) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: video.description,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Video link copied to clipboard"
        });
      }
      
      interactionMutation.mutate({
        contentId: video.id,
        type: 'shared',
        metadata: { method: navigator.share ? 'native' : 'clipboard' }
      });
    } catch (error) {
      console.log('Share cancelled or failed');
    }
  }, [interactionMutation, toast]);

  // Handle vertical scrolling (swipe up/down)
  const handleScroll = useCallback((direction: 'up' | 'down') => {
    const newIndex = direction === 'up' 
      ? Math.max(0, currentVideoIndex - 1)
      : Math.min(videos.length - 1, currentVideoIndex + 1);
    
    setCurrentVideoIndex(newIndex);
    
    // Scroll to the new video
    const videoElement = videoRefs.current.get(newIndex);
    if (videoElement) {
      videoElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentVideoIndex, videos.length]);

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<{ y: number; x: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ y: number; x: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      y: e.targetTouches[0].clientY,
      x: e.targetTouches[0].clientX
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      y: e.targetTouches[0].clientY,
      x: e.targetTouches[0].clientX
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const yDistance = touchStart.y - touchEnd.y;
    const xDistance = Math.abs(touchStart.x - touchEnd.x);
    
    const isVerticalSwipe = Math.abs(yDistance) > xDistance;
    const minSwipeDistance = 50;
    
    if (isVerticalSwipe && Math.abs(yDistance) > minSwipeDistance) {
      if (yDistance > 0) {
        handleScroll('up');
      } else {
        handleScroll('down');
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleScroll('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleScroll('down');
          break;
        case 'm':
        case 'M':
          setIsMuted(!isMuted);
          break;
        case ' ':
          e.preventDefault();
          setIsAutoPlaying(!isAutoPlaying);
          break;
        case 'Escape':
          if (onBack) onBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleScroll, isMuted, isAutoPlaying, onBack]);

  if (!videos.length) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-6">
        <div className="text-xl font-semibold mb-2">No bookmarked videos</div>
        <div className="text-gray-400 text-center">
          Your bookmarked videos will appear here
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative h-screen overflow-hidden bg-black"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {videos.map((video: any, index: number) => (
        <div
          key={video.id}
          ref={(el) => {
            if (el) videoRefs.current.set(index, el);
          }}
          className={`absolute inset-0 transition-transform duration-300 ${
            index === currentVideoIndex ? 'translate-y-0' : 
            index < currentVideoIndex ? '-translate-y-full' : 'translate-y-full'
          }`}
        >
          {/* Video Player */}
          <div className="relative w-full h-full">
            {video.muxPlaybackId ? (
              <MuxVideoPlayer
                playbackId={video.muxPlaybackId}
                autoPlay={isAutoPlaying && index === currentVideoIndex}
                muted={isMuted}
                loop={true}
                onPlay={() => setIsAutoPlaying(true)}
                onPause={() => setIsAutoPlaying(false)}
                className="w-full h-full object-cover"
              />
            ) : video.hlsPlaylistUrl && video.transloaditStatus === 'completed' ? (
              <HLSVideoPlayer
                src={video.hlsPlaylistUrl}
                poster={video.processingThumbnailUrl}
                autoPlay={isAutoPlaying && index === currentVideoIndex}
                muted={isMuted}
                loop={true}
                onPlay={() => setIsAutoPlaying(true)}
                onPause={() => setIsAutoPlaying(false)}
                className="w-full h-full"
              />
            ) : video.videoUrl ? (
              <video
                src={video.videoUrl === '[Large Video Content]' 
                  ? `/api/inspo-pages/${video.pageId}/content/${video.id}/video`
                  : video.videoUrl}
                autoPlay={isAutoPlaying && index === currentVideoIndex}
                muted={isMuted}
                loop={true}
                playsInline
                className="w-full h-full object-cover"
                onPlay={() => setIsAutoPlaying(true)}
                onPause={() => setIsAutoPlaying(false)}
              />
            ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-xl mb-2">Video Processing</div>
                  <div className="text-gray-400">Status: {video.transloaditStatus || 'processing'}</div>
                </div>
              </div>
            )}

            {/* Back Button - Top Left */}
            {onBack && (
              <button
                onClick={onBack}
                className="absolute top-4 left-4 z-50 bg-black/40 backdrop-blur-sm rounded-full p-2"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Video Info Overlay */}
            <div className="absolute bottom-0 left-0 right-20 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <h3 className="text-white text-lg font-semibold mb-2">{video.title}</h3>
              {video.description && (
                <p className="text-white/90 text-sm mb-2 line-clamp-2">{video.description}</p>
              )}
              {video.extraInstructions && (
                <p className="text-yellow-300 text-sm mb-2 line-clamp-3">{video.extraInstructions}</p>
              )}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {video.tags.slice(0, 3).map((tag: string, idx: number) => (
                    <span key={idx} className="text-blue-300 text-xs">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons - Right Side */}
            <div className="absolute right-2 bottom-20 flex flex-col space-y-4">
              {/* Like Button */}
              <button
                onClick={() => handleLike(video.id)}
                className="flex flex-col items-center space-y-1 p-2"
              >
                <div className={`p-3 rounded-full ${likedVideos.has(video.id) ? 'bg-red-500' : 'bg-black/40'} backdrop-blur-sm`}>
                  <Heart 
                    className={`w-6 h-6 ${likedVideos.has(video.id) ? 'text-white fill-current' : 'text-white'}`} 
                  />
                </div>
              </button>

              {/* Bookmark Button */}
              <button
                onClick={() => handleBookmark(video.id)}
                className="flex flex-col items-center space-y-1 p-2"
              >
                <div className={`p-3 rounded-full ${bookmarkedVideos.has(video.id) ? 'bg-yellow-500' : 'bg-black/40'} backdrop-blur-sm`}>
                  <Bookmark 
                    className={`w-6 h-6 ${bookmarkedVideos.has(video.id) ? 'text-white fill-current' : 'text-white'}`} 
                  />
                </div>
              </button>

              {/* Share Button */}
              <button
                onClick={() => handleShare(video)}
                className="flex flex-col items-center space-y-1 p-2"
              >
                <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
              </button>

              {/* Sound Toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="flex flex-col items-center space-y-1 p-2"
              >
                <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm">
                  {isMuted ? (
                    <VolumeX className="w-6 h-6 text-white" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-white" />
                  )}
                </div>
              </button>

              {/* More Options */}
              <button className="flex flex-col items-center space-y-1 p-2">
                <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm">
                  <MoreVertical className="w-6 h-6 text-white" />
                </div>
              </button>
            </div>

            {/* Video Counter */}
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-white text-sm font-medium">
                {currentVideoIndex + 1} / {videos.length}
              </span>
            </div>

            {/* Navigation Hint */}
            {currentVideoIndex === 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center animate-pulse">
                <div className="text-sm opacity-75">Swipe up/down to navigate</div>
                <div className="text-xs opacity-50 mt-1">Press 'M' to toggle sound</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookmarkedVideoFeed;