import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft,
  Users,
  Edit,
  Share,
  Play,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Video,
  Link as LinkIcon
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

interface PageViewerProps {
  pageId: string;
}

export default function InspirationPageViewer({ pageId }: PageViewerProps) {
  const [, setLocation] = useLocation();
  
  // Check URL parameters to determine navigation context
  const urlParams = new URLSearchParams(window.location.search);
  const fromCreator = urlParams.get('from') === 'creator';
  const creatorSlug = urlParams.get('slug');
  
  const handleBack = () => {
    // If user came from a creator page, navigate back to that creator
    if (fromCreator && creatorSlug) {
      setLocation(`/creator/${creatorSlug}`);
      return;
    }
    
    // Use browser's native back functionality
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback if there's no history (e.g., direct navigation)
      setLocation('/inspiration-dashboard');
    }
  };

  // Fetch page data
  const { data: page, isLoading } = useQuery({
    queryKey: [`/api/inspiration-pages/${pageId}`],
    enabled: !!pageId,
  });

  // Fetch page blocks if needed
  const { data: blocks = [] } = useQuery({
    queryKey: [`/api/inspiration-pages/${pageId}/blocks`],
    enabled: !!pageId && !!page,
  });

  const getContentIcon = (type: string) => {
    const iconMap = {
      text: FileText,
      image: ImageIcon,
      video: Video,
      link: LinkIcon,
    };
    return iconMap[type as keyof typeof iconMap] || FileText;
  };



  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-4">The page you're looking for doesn't exist.</p>
        <Button onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${(page as any)?.emoji || '📄'} ${(page as any)?.title || 'Inspiration Page'}`}
        description={(page as any)?.description}
        showBackButton={true}
        backTo="/inspiration-dashboard"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button size="sm" onClick={() => setLocation(`/notion/${pageId}`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Page
            </Button>
          </div>
        }
      />
      
      <div className="px-6 pb-6 space-y-6">
        {(page as any)?.tags && (page as any).tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(page as any).tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Info */}
          <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>Content Type: {(page as any)?.contentType || 'General'}</span>
              </div>
            </div>

          </CardHeader>
        </Card>

        {/* Content Blocks */}
        {(blocks as any[]).map((block: any, index: number) => {
          const IconComponent = getContentIcon(block.type);
          
          return (
            <Card key={`${block.id}-${index}`}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">
                    {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Content
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">
                      {typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {(blocks as any[]).length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No content added to this page yet.</p>
              <Button className="mt-4">
                <Edit className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}