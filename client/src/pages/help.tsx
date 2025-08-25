import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { updateMetaTags, META_CONFIGS } from '@/utils/meta-tags';
import { apiRequest } from '@/lib/queryClient';

interface HelpSection {
  id: number;
  type: 'title' | 'description' | 'separator' | 'gif';
  title: string | null;
  content: string | null;
  gifUrl: string | null;
  orderIndex: number;
}

export default function Help() {
  const { data: sections, isLoading, error } = useQuery<HelpSection[]>({
    queryKey: ['/api/help-sections'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/help-sections');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update page title and meta tags for link previews
  useEffect(() => {
    updateMetaTags(META_CONFIGS.help);
    
    // Cleanup function to restore original meta tags when component unmounts
    return () => {
      updateMetaTags(META_CONFIGS.default);
    };
  }, []);

  // Helper function to render media (image or video) based on file extension
  const renderMedia = (gifUrl: string) => {
    const fileExtension = gifUrl.toLowerCase().split('.').pop();
    const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv', 'wmv'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

    if (videoExtensions.includes(fileExtension || '')) {
      return (
        <video 
          src={gifUrl} 
          controls 
          muted 
          className="max-w-full h-auto rounded-lg shadow-sm"
          style={{ maxHeight: '400px' }}
        >
          Your browser does not support the video tag.
        </video>
      );
    } else if (imageExtensions.includes(fileExtension || '')) {
      return (
        <img 
          src={gifUrl} 
          alt="Help demonstration" 
          className="max-w-full h-auto rounded-lg shadow-sm"
          style={{ maxHeight: '400px' }}
        />
      );
    } else {
      // Fallback for unknown file types
      return (
        <div className="max-w-full h-auto rounded-lg shadow-sm bg-gray-100 p-4 text-center" style={{ maxHeight: '400px' }}>
          <p className="text-gray-600">Media file: {gifUrl.split('/').pop()}</p>
          <a 
            href={gifUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Open in new tab
          </a>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading help content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Failed to load help content</p>
            <p className="text-gray-600">Please try again later or contact support</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Branded header background image */}
        <div className="w-full mb-8 relative rounded-lg shadow-sm overflow-hidden">
          <img 
            src="/tasty-share-background.png" 
            alt="Tasty Help & Support Header" 
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
              <p className="text-gray-100">Find answers to common questions and get help with our platform</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {sections && sections.length > 0 ? (
            sections.map((section) => (
              <div key={section.id} className="help-section">
                {section.type === 'title' && (
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    {section.content}
                  </h2>
                )}
                
                {section.type === 'description' && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="prose prose-gray max-w-none">
                        {section.title && (
                          <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            {section.title}
                          </h3>
                        )}
                        {section.content && (
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                            {section.content}
                          </p>
                        )}
                        {section.gifUrl && (
                          <div className="mt-4 flex justify-center">
                            {renderMedia(section.gifUrl)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {section.type === 'separator' && (
                  <div className="py-4">
                    <Separator className="bg-gray-300" />
                  </div>
                )}
                
                {section.type === 'gif' && section.gifUrl && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex justify-center">
                        {renderMedia(section.gifUrl)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Help Content Available</h3>
                <p className="text-gray-600">Help content is being prepared. Please check back later.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}