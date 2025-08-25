import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Bookmark, Share2, Eye, ThumbsDown, Plus } from 'lucide-react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

interface FeedPageViewerProps {
  pageId: string;
}

interface ContentItem {
  id: number;
  title: string;
  description: string;
  instructions: string;
  mediaType: 'video' | 'image' | 'text';
  fileUrl?: string;
  originalPostLink?: string;
  audioLink?: string;
  platformType?: string;
  createdAt: string;
}

interface PageData {
  id: number;
  title: string;
  description: string;
  pageType: 'feed' | 'normal';
  platformType: string;
  isActive: boolean;
}

export default function FeedPageViewer({ pageId }: FeedPageViewerProps) {
  const [, setLocation] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  // Fetch page data
  const { data: pageData, isLoading: pageLoading } = useQuery({
    queryKey: [`/api/inspo-pages/${pageId}`],
  }) as { data: PageData; isLoading: boolean };

  // Fetch content data
  const { data: contentItems = [], isLoading: contentLoading } = useQuery({
    queryKey: [`/api/inspo-pages/${pageId}/content`],
  }) as { data: ContentItem[]; isLoading: boolean };

  // Auto-scroll functionality like TikTok
  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.feed-item');
      const windowHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      
      let currentIdx = 0;
      let closestDistance = Infinity;
      
      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const screenCenter = windowHeight / 2;
        const distance = Math.abs(elementCenter - screenCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          currentIdx = index;
        }
      });
      
      setCurrentIndex(currentIdx);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [contentItems]);

  const handleFlipCard = (contentId: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.add(contentId);
      }
      return newSet;
    });
  };

  const handleShare = async (item: ContentItem) => {
    const shareData = {
      title: item.title,
      text: `${item.title}\n\n${item.description}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
    }
  };

  if (pageLoading || contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading feed page...</p>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
          <Button onClick={() => setLocation('/inspo-pages-admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/inspo-pages-admin')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <div className="text-center">
            <h1 className="text-white font-bold">{pageData.title}</h1>
            <p className="text-white/70 text-sm">{pageData.platformType} • Feed View</p>
          </div>
          <div className="w-20" /> {/* Spacer for balance */}
        </div>
      </div>

      {/* Feed Content */}
      <div className="pt-20 snap-y snap-mandatory overflow-y-scroll h-screen">
        {contentItems.length === 0 ? (
          <div className="h-screen flex items-center justify-center text-white">
            <div className="text-center">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">No Content Yet</h3>
              <p className="text-white/70">This feed page doesn't have any content items.</p>
            </div>
          </div>
        ) : (
          contentItems.map((item, index) => (
            <div
              key={item.id}
              className="feed-item h-screen w-full snap-start relative flex items-center justify-center"
            >
              {/* Content Container */}
              <div className="relative w-full max-w-sm h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl">
                {/* Flip Card Container */}
                <div
                  className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                    flippedCards.has(item.id) ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Front Side - Content Display */}
                  <div className="absolute inset-0 backface-hidden">
                    {item.mediaType === 'video' && item.fileUrl ? (
                      <video
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                        poster={item.fileUrl}
                      >
                        <source src={item.fileUrl} type="video/mp4" />
                        <source src={item.fileUrl} type="video/quicktime" />
                        Your browser does not support the video tag.
                      </video>
                    ) : item.mediaType === 'image' && item.fileUrl ? (
                      <img
                        src={item.fileUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center p-6">
                        <div className="text-center text-white">
                          <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                          <p className="text-lg opacity-90">{item.description}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    
                    {/* Content Title Overlay */}
                    <div className="absolute bottom-4 left-4 right-16 text-white">
                      <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                      <p className="text-sm opacity-90 line-clamp-2">{item.description}</p>
                    </div>
                  </div>

                  {/* Back Side - Details */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white p-6 overflow-y-auto">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                        <p className="text-gray-600 text-sm">{item.description}</p>
                      </div>
                      
                      {item.instructions && (
                        <div>
                          <h5 className="font-semibold mb-1">Instructions:</h5>
                          <p className="text-gray-600 text-sm">{item.instructions}</p>
                        </div>
                      )}
                      
                      {item.originalPostLink && (
                        <div>
                          <h5 className="font-semibold mb-1">Original Post:</h5>
                          <a
                            href={item.originalPostLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm hover:underline"
                          >
                            View Original
                          </a>
                        </div>
                      )}
                      
                      {item.audioLink && (
                        <div>
                          <h5 className="font-semibold mb-1">Audio Reference:</h5>
                          <a
                            href={item.audioLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm hover:underline"
                          >
                            Listen to Audio
                          </a>
                        </div>
                      )}
                      
                      <div className="pt-2 text-xs text-gray-500">
                        Created: {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engagement Buttons */}
                <div className="absolute right-4 bottom-24 flex flex-col space-y-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
                    onClick={() => handleFlipCard(item.id)}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
                  >
                    <Heart className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
                  >
                    <Bookmark className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-12 h-12 rounded-full bg-blue-500/80 hover:bg-blue-600/80 text-white backdrop-blur-sm"
                    onClick={() => handleShare(item)}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Content Counter */}
      {contentItems.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
          {currentIndex + 1} / {contentItems.length}
        </div>
      )}
    </div>
  );
}