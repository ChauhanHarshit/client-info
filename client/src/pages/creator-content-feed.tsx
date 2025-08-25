import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ThumbsDown, 
  ThumbsUp, 
  Plus, 
  Minus,
  Bookmark, 
  Share, 
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX
} from "lucide-react";

interface ContentItem {
  id: number;
  title: string;
  description: string;
  instructions: string;
  mediaType: 'image' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  linkUrl?: string;
  soundUrl?: string;
  originalPostLink?: string;
  audioLink?: string;
  extraInstructions?: string;
  tags?: string[];
  category?: string;
  pageId?: number;
}

interface CreatorContentFeedProps {
  creatorSlug: string;
}

export default function CreatorContentFeed({ creatorSlug }: CreatorContentFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [playingVideos, setPlayingVideos] = useState<Set<number>>(new Set());
  const [isMuted, setIsMuted] = useState(true); // Start muted for better UX
  const queryClient = useQueryClient();

  // Check URL parameters for specific page filtering
  const urlParams = new URLSearchParams(window.location.search);
  const pageId = urlParams.get('page');

  // Fetch content from API
  const { data: content = [], isLoading } = useQuery<ContentItem[]>({
    queryKey: [`/api/inspo-pages/${pageId}/content`],
    enabled: !!pageId,
  });

  // Intersection Observer for auto-play functionality - setup after content loads
  useEffect(() => {
    if (!content.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const contentId = parseInt(video.dataset.contentId || '0');
          
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Video is in viewport - play it
            video.play().catch(() => {
              console.log(`Auto-play prevented for video ${contentId}`);
            });
          } else {
            // Video is out of viewport - pause it
            video.pause();
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of video is visible
        rootMargin: '0px'
      }
    );

    // Small delay to ensure DOM is ready
    const setupObserver = () => {
      const videos = document.querySelectorAll('video[data-content-id]');
      videos.forEach(video => observer.observe(video));
    };

    setTimeout(setupObserver, 100);

    return () => {
      observer.disconnect();
    };
  }, [content]);

  // Fetch page info
  const { data: pageData } = useQuery({
    queryKey: [`/api/inspo-pages`],
    enabled: !!pageId,
  });

  const currentPageInfo = Array.isArray(pageData) ? pageData.find((p: any) => p.id === parseInt(pageId || '0')) : null;

  const interactionMutation = useMutation({
    mutationFn: async (data: { creatorId: number; contentId: number; interactionType: string; metadata?: any }) => {
      // Mock interaction for demonstration
      console.log('Content interaction:', data);
      return { success: true };
    },
    onSuccess: () => {
      console.log('Interaction recorded successfully');
    },
  });

  const currentContent = content[currentIndex];

  useEffect(() => {
    const handleSwipe = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowDown' && currentIndex < content.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleSwipe);
    return () => window.removeEventListener('keydown', handleSwipe);
  }, [currentIndex, content.length]);

  const handleInteraction = (type: string, metadata?: any) => {
    if (!currentContent) return;

    interactionMutation.mutate({
      creatorId: 1, // This would come from the creator lookup
      contentId: currentContent.id,
      interactionType: type,
      metadata,
    });

    // For like/dislike, move to next content
    if (type === 'liked' || type === 'disliked') {
      setTimeout(() => {
        if (currentIndex < content.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }, 300);
    }
  };

  const toggleFlip = (contentId: number) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(contentId)) {
      newFlipped.delete(contentId);
    } else {
      newFlipped.add(contentId);
    }
    setFlippedCards(newFlipped);
  };

  const toggleVideoPlayback = (contentId: number) => {
    const videoElement = document.querySelector(`video[data-content-id="${contentId}"]`) as HTMLVideoElement;
    if (!videoElement) return;

    const newPlayingVideos = new Set(playingVideos);
    if (newPlayingVideos.has(contentId)) {
      videoElement.pause();
      newPlayingVideos.delete(contentId);
    } else {
      videoElement.play();
      newPlayingVideos.add(contentId);
    }
    setPlayingVideos(newPlayingVideos);
  };

  const handleShare = async () => {
    if (!currentContent) return;

    const shareData = {
      title: currentContent.title,
      text: `${currentContent.description}\n\nInstructions: ${currentContent.instructions}`,
      url: currentContent.linkUrl || window.location.href,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        handleInteraction('shared', { method: 'native' });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      const shareText = `${currentContent.title}\n${currentContent.description}\n\nInstructions: ${currentContent.instructions}`;
      navigator.clipboard.writeText(shareText);
      handleInteraction('shared', { method: 'clipboard' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading content...</div>
      </div>
    );
  }

  if (!content.length) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <h2 className="text-2xl font-bold mb-4">No Content Available</h2>
        <p className="text-gray-400 text-center">
          You don't have any content assigned yet. Check back later!
        </p>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="mt-6 text-white border-white hover:bg-white hover:text-black"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Page Header */}
      {currentPageInfo && (
        <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-sm border-b border-gray-800 p-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div>
              <h3 className="font-semibold text-lg">{currentPageInfo.title}</h3>
              <p className="text-sm text-gray-400">{currentPageInfo.description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="overflow-y-auto" style={{ height: currentPageInfo ? 'calc(100vh - 80px)' : '100vh' }}>
        <div className="max-w-md mx-auto p-4 space-y-6">
          {content.map((item, index) => {
            const isFlipped = flippedCards.has(item.id);
            return (
              <div key={item.id} className="w-full">
                {/* Content card with flip animation */}
                <div className="relative w-full aspect-[9/16]">
                  {/* Front of card */}
                  <div
                    className={`absolute inset-0 rounded-2xl overflow-hidden transition-opacity duration-300 ${
                      isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    {item.mediaType === 'video' ? (
                      <div className="relative w-full h-full bg-gray-900">
                        <video
                          data-content-id={item.id}
                          src={`/api/inspo-pages/${pageId}/content/${item.id}/video`}
                          poster={item.thumbnailUrl}
                          className="w-full h-full object-cover"
                          loop
                          muted={isMuted}
                          playsInline
                          controls={false}
                          preload="metadata"
                          onLoadStart={() => {
                            console.log(`Video ${item.id} loading started`);
                          }}
                          onCanPlay={() => {
                            console.log(`Video ${item.id} can play`);
                          }}
                          onPlay={() => {
                            const newPlayingVideos = new Set(playingVideos);
                            newPlayingVideos.add(item.id);
                            setPlayingVideos(newPlayingVideos);
                          }}
                          onPause={() => {
                            const newPlayingVideos = new Set(playingVideos);
                            newPlayingVideos.delete(item.id);
                            setPlayingVideos(newPlayingVideos);
                          }}
                          onError={(e) => {
                            console.error(`Video ${item.id} error:`, e);
                            // Keep the video element visible but add minimal overlay
                            const video = e.target as HTMLVideoElement;
                            const parent = video.parentElement;
                            if (parent && !parent.querySelector('.video-overlay')) {
                              const overlay = document.createElement('div');
                              overlay.className = 'video-overlay absolute inset-0 flex items-center justify-center bg-black/20 text-white backdrop-blur-sm';
                              overlay.innerHTML = `
                                <div class="text-center p-4 bg-black/40 rounded-lg">
                                  <div class="text-xl mb-2">📱</div>
                                  <p class="text-sm">Tap to play</p>
                                </div>
                              `;
                              overlay.onclick = () => {
                                video.load();
                                video.play().catch(() => {});
                                overlay.remove();
                              };
                              parent.appendChild(overlay);
                            }
                          }}
                        />
                        
                        {/* Video controls overlay */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-full w-10 h-10 p-0 bg-black/50 hover:bg-black/70"
                            onClick={() => toggleVideoPlayback(item.id)}
                          >
                            {playingVideos.has(item.id) ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-full w-10 h-10 p-0 bg-black/50 hover:bg-black/70"
                            onClick={() => setIsMuted(!isMuted)}
                          >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full bg-gray-900">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Content overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-300 mb-4">
                        {item.description}
                      </p>
                      
                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back of card - Flashcard Info */}
                  <div
                    className={`absolute inset-0 bg-gray-900 rounded-2xl p-6 flex flex-col justify-center transition-opacity duration-300 ${
                      isFlipped ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <h3 className="text-xl font-bold mb-6 text-center">Content Info</h3>
                    
                    <div className="space-y-6">
                      {/* Only show fields that have values */}
                      {item.originalPostLink && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-400 mb-2">Original Post Link</h4>
                          <a
                            href={item.originalPostLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 text-sm underline break-all"
                          >
                            {item.originalPostLink}
                          </a>
                        </div>
                      )}
                      
                      {item.audioLink && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-400 mb-2">Audio Link</h4>
                          <a
                            href={item.audioLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 text-sm underline break-all"
                          >
                            {item.audioLink}
                          </a>
                        </div>
                      )}
                      
                      {item.extraInstructions && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-400 mb-2">Extra Instructions / Info</h4>
                          <p className="text-sm leading-relaxed">{item.extraInstructions}</p>
                        </div>
                      )}
                      
                      {/* Show message if no metadata is available */}
                      {!item.originalPostLink && !item.audioLink && !item.extraInstructions && (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No additional info available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons for each card */}
                <div className="mt-4 mb-6">
                  <div className="flex justify-center gap-4">
                    {/* Dislike */}
                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-full w-12 h-12 p-0 bg-red-500/20 hover:bg-red-500/30 border-red-500"
                      onClick={() => handleInteraction('disliked')}
                      disabled={interactionMutation.isPending}
                    >
                      <ThumbsDown className="w-5 h-5 text-red-400" />
                    </Button>

                    {/* View Info / Flip */}
                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-full w-12 h-12 p-0 bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500"
                      onClick={() => {
                        toggleFlip(item.id);
                        handleInteraction('viewed_info');
                      }}
                    >
                      {isFlipped ? (
                        <Minus className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <Plus className="w-5 h-5 text-yellow-400" />
                      )}
                    </Button>

                    {/* Like / Done */}
                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-full w-12 h-12 p-0 bg-green-500/20 hover:bg-green-500/30 border-green-500"
                      onClick={() => handleInteraction('liked')}
                      disabled={interactionMutation.isPending}
                    >
                      <ThumbsUp className="w-5 h-5 text-green-400" />
                    </Button>

                    {/* Bookmark */}
                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-full w-12 h-12 p-0 bg-blue-500/20 hover:bg-blue-500/30 border-blue-500"
                      onClick={() => handleInteraction('bookmarked', { category: item.category })}
                    >
                      <Bookmark className="w-5 h-5 text-blue-400" />
                    </Button>

                    {/* Share */}
                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-full w-12 h-12 p-0 bg-gray-500/20 hover:bg-gray-500/30 border-gray-500"
                      onClick={handleShare}
                    >
                      <Share className="w-5 h-5 text-gray-400" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}