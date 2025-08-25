import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Image, Video, Type, FileText, ArrowLeft } from "lucide-react";

interface InspirationPage {
  id: number;
  title: string;
  slug: string;
  description?: string;
  createdById: string;
  createdByName: string;
  isPinned: boolean;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  emoji?: string;
  bannerUrl?: string;
}

interface InspirationPageBlock {
  id: number;
  pageId: number;
  type?: "text" | "image" | "video";
  mediaType?: string;
  title: string;
  description?: string;
  instructions?: string;
  content?: any;
  videoUrl?: string;
  imageUrl?: string;
  tags?: string[];
  category?: string;
  displayOrder?: number;
  isVisible?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export default function SharedInspirationPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const pageId = parseInt(id || "0", 10);

  // Check URL parameters to determine navigation context
  const urlParams = new URLSearchParams(window.location.search);
  const fromCreator = urlParams.get('from') === 'creator';
  const creatorToken = urlParams.get('creatorToken');
  
  const handleBack = () => {
    // If user came from a public creator page, navigate back to that creator using token
    if (fromCreator && creatorToken) {
      setLocation(`/creator/${creatorToken}`);
      return;
    }
    
    // Use browser's native back functionality as fallback
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // No good fallback for public pages, just go to the current page
      window.location.reload();
    }
  };

  // Fetch the inspiration page data
  const { data: page, isLoading: pageLoading, error: pageError } = useQuery<InspirationPage>({
    queryKey: [`/api/shared/inspiration-pages/${pageId}`],
    enabled: !!pageId,
  });

  // Fetch the page blocks with full content data
  const { data: blocks, isLoading: blocksLoading } = useQuery<InspirationPageBlock[]>({
    queryKey: [`/api/inspo-pages/${pageId}/content`],
    queryFn: async () => {
      const response = await fetch(`/api/inspo-pages/${pageId}/content?full=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      return response.json();
    },
    enabled: !!pageId,
  });

  const getBlockIcon = (type: string) => {
    switch (type) {
      case "text": return <Type className="h-4 w-4" />;
      case "image": return <Image className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pageError || !page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-600">This inspiration page could not be found or is no longer available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      {page.bannerUrl && (
        <div 
          className="h-48 bg-cover bg-center bg-gray-200"
          style={{ backgroundImage: `url(${page.bannerUrl})` }}
        />
      )}
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Back Button - Only show when coming from creator page */}
        {fromCreator && (
          <div className="mb-8">
            <Button
              variant="outline"
              size="default"
              onClick={handleBack}
              className="flex items-center space-x-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Creator Page</span>
            </Button>
          </div>
        )}
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start space-x-4">
            {page.emoji && (
              <div className="text-4xl">{page.emoji}</div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{page.title}</h1>
              {page.description && (
                <p className="text-gray-600 mb-4">{page.description}</p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>By {page.createdByName}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Updated {new Date(page.updatedAt || page.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {page.tags && page.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {page.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="space-y-4">
          {blocksLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : blocks && blocks.length > 0 ? (
            blocks
              .filter(block => block.isVisible !== false)
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((block) => {
                console.log('Rendering block:', {
                  id: block.id,
                  title: block.title,
                  type: block.type,
                  mediaType: block.mediaType,
                  hasVideoUrl: !!block.videoUrl,
                  videoUrlLength: block.videoUrl?.length || 0
                });
                
                return (
                  <Card key={block.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center space-x-2">
                        {getBlockIcon(block.type || block.mediaType || 'text')}
                        <span className="capitalize">{block.title || (block.type || block.mediaType || 'content')}</span>
                        <span className="text-xs text-gray-400">({block.mediaType || block.type})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {block.type === "text" && (
                      <div className="prose max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {typeof block.content === 'object' ? block.content?.text || JSON.stringify(block.content) : block.content}
                        </p>
                      </div>
                    )}
                    
                    {block.type === "image" && (
                      <div className="space-y-2">
                        {typeof block.content === 'object' && block.content?.url && (
                          <img 
                            src={block.content.url} 
                            alt={block.content.caption || "Image"} 
                            className="max-w-full h-auto rounded-lg"
                          />
                        )}
                        {typeof block.content === 'object' && block.content?.caption && (
                          <p className="text-sm text-gray-600 italic">{block.content.caption}</p>
                        )}
                      </div>
                    )}
                    
                    {(block.mediaType === "video" || block.type === "video") && (
                      <div className="space-y-2">
                        {(block.videoUrl && block.videoUrl !== '[Large Video Content]') && (
                          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                            <div className="text-gray-500 mb-4">
                              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">{block.title}</h3>
                            <p className="text-sm text-gray-600 mb-4 text-center max-w-sm">Video available for download</p>
                            <a 
                              href={`/api/inspo-pages/${pageId}/content/${block.id}/video`} 
                              download={`${block.title}.mp4`}
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                              </svg>
                              Download Video (11.1MB)
                            </a>
                          </div>
                        )}
                        {block.videoUrl === '[Large Video Content]' && (
                          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="text-blue-500 mb-4">
                              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">{block.title}</h3>
                            <p className="text-sm text-blue-600 mb-4 text-center">Video content available (optimized for performance)</p>
                            {block.description && (
                              <p className="text-sm text-gray-600 text-center">{block.description}</p>
                            )}
                          </div>
                        )}
                        {block.description && block.videoUrl !== '[Large Video Content]' && (
                          <p className="text-sm text-gray-600 italic">{block.description}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                );
              })
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Yet</h3>
                <p className="text-gray-600">This inspiration page doesn't have any content blocks yet.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>This is a shared view of an inspiration page. Content is read-only.</p>
        </div>
      </div>
    </div>
  );
}