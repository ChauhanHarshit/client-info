import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import SimpleNotionEditor from "@/components/notion-simple/simple-notion-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface NotionPageEditorProps {
  pageId: string;
}

interface PageData {
  id: number;
  title: string;
  description: string;
  pageType: string;
  platformType: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

interface BannerData {
  id: number;
  page_id: number;
  banner_image_url: string;
  banner_alt_text: string | null;
  created_at: string;
  updated_at: string;
}

export default function NotionPageEditor({ pageId }: NotionPageEditorProps) {
  const [, setLocation] = useLocation();

  // Fetch page data to get title and details
  const { data: page, isLoading } = useQuery<PageData>({
    queryKey: ['/api/inspo-pages', pageId],
    queryFn: async () => {
      const response = await fetch(`/api/inspo-pages/${pageId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch page data');
      }
      return response.json();
    },
    enabled: !!pageId,
  });

  // Fetch banner data for this page
  const { data: banner } = useQuery<BannerData | null>({
    queryKey: ['/api/page-banners', pageId],
    queryFn: async () => {
      const response = await fetch(`/api/page-banners/${pageId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No banner set
        }
        throw new Error('Failed to fetch banner data');
      }
      return response.json();
    },
    enabled: !!pageId,
  });

  // Debug logging for title loading
  console.log('NotionPageEditor - pageId:', pageId, 'page data:', page, 'isLoading:', isLoading);

  const handleBack = () => {
    setLocation("/inspo-pages-admin?tab=home-pages");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading page...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Editing Normal Page: {page?.title || 'Loading...'}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div id="save-status-indicator" className="flex items-center gap-1">
                {/* Save status will be updated by the editor */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Banner */}
      {banner?.banner_image_url && (
        <div className="w-full">
          <img
            src={banner.banner_image_url}
            alt={banner.banner_alt_text || `Banner for ${page?.title}`}
            className="w-full h-64 object-cover"
            onError={(e) => {
              console.warn('Banner image failed to load:', banner.banner_image_url);
              // Hide the image element if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Notion Editor */}
      <div className="max-w-4xl mx-auto">
        <SimpleNotionEditor 
          pageId={pageId}
          initialTitle={page?.title}
          initialEmoji="📄"
        />
      </div>
    </div>
  );
}