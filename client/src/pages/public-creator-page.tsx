import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, DollarSign, Users, Star, Target, Smartphone, Globe, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface LayoutBlock {
  id: string;
  type: string;
  style: string;
  title: string;
  width: string;
  position: number;
  description: string;
}

interface CreatorTemplate {
  id: number;
  name: string;
  description?: string;
  pageId: string;
  creatorId?: number;
  layout: LayoutBlock[];
  themeConfig: any;
  publicUrl: string;
  isTemplate: boolean;
  status: "draft" | "published" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function PublicCreatorPage() {
  const [, params] = useRoute("/creator-page/:pageId");
  const [, setLocation] = useLocation();
  const pageId = params?.pageId;
  
  // Check if accessed from admin panel via URL parameter or referrer
  const urlParams = new URLSearchParams(window.location.search);
  const fromAdmin = urlParams.get('from') === 'admin' || document.referrer.includes('/creators-management');

  // Fetch template data
  const { data: template, isLoading: templateLoading, error } = useQuery({
    queryKey: [`/api/creator-page-templates/public/${pageId}`],
    enabled: !!pageId,
  });

  const templateData = template as CreatorTemplate;

  // Fetch inspiration pages for this creator
  const { data: inspirationPages = [], isLoading: inspirationLoading } = useQuery({
    queryKey: [`/api/inspiration-pages/creator/${templateData?.creatorId}`],
    enabled: !!templateData?.creatorId,
  });

  if (templateLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading creator dashboard...</p>
        </div>
      </div>
    );
  }

  if (!templateData || templateData.status !== "published") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h1>
          <p className="text-gray-600">This creator page doesn't exist or isn't publicly available.</p>
        </div>
      </div>
    );
  }

  // Map content section types to inspiration page content types
  const getContentTypesForSection = (sectionType: string): string[] => {
    switch (sectionType) {
      case "onlyfans_content":
        return ["sexting_sets", "ppv", "wall_posts", "fan_gifts", "pictures", "videos"];
      case "social_media":
        return ["instagram", "twitter", "ads"];
      case "priority_content":
        return []; // Priority content doesn't use inspiration pages - would be managed separately
      case "whales":
        return ["whales"]; // VIP client content - only content specifically tagged for high-value clients
      case "customs":
        return ["sexting_sets", "pictures", "videos"];
      default:
        return [];
    }
  };

  const renderLayoutBlock = (block: LayoutBlock) => {
    const getBlockIcon = (type: string) => {
      switch (type) {
        case "priority_content": return <Clock className="w-4 h-4" />;
        case "onlyfans_content": return <Star className="w-4 h-4" />;
        case "social_media": return <Globe className="w-4 h-4" />;
        case "whales": return <Users className="w-4 h-4" />;
        case "customs": return <Target className="w-4 h-4" />;
        default: return <Smartphone className="w-4 h-4" />;
      }
    };

    // Filter inspiration pages for this content section
    const sectionContentTypes = getContentTypesForSection(block.type);
    const sectionPages = inspirationPages.filter((page: any) => 
      page.contentType && sectionContentTypes.includes(page.contentType)
    );

    return (
      <Card key={block.id} className="mb-6 shadow-sm border-0 bg-white">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(block.type)} text-white`}>
                {getBlockIcon(block.type)}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                  {block.title}
                </h2>
                <p className="text-sm text-gray-600">
                  {block.description}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {sectionPages.length} items
            </Badge>
          </div>
          
          {sectionPages.length > 0 ? (
            <div className="space-y-3">
              {sectionPages.map((page: any, index: number) => (
                <div
                  key={`${block.type}-${page.id}-${index}`}
                  onClick={() => setLocation(`/inspiration-page/${page.id}`)}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{page.emoji || "📄"}</span>
                    <div>
                      <h4 className="font-medium text-sm">{page.title}</h4>
                      {page.description && (
                        <p className="text-xs text-gray-600">{page.description}</p>
                      )}
                      {page.contentType && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {page.contentType.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {page.isPinned && (
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    )}
                    <div className="text-xs text-gray-400">
                      Click to view
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No content assigned to this section</p>
              <p className="text-xs text-gray-400 mt-1">
                {block.type === "priority_content" 
                  ? "Priority content is managed separately" 
                  : "Assign inspiration pages with matching content types"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "priority_content": return "bg-red-500";
      case "onlyfans_content": return "bg-pink-500";
      case "social_media": return "bg-blue-500";
      case "customs": return "bg-purple-500";
      case "whales": return "bg-yellow-500";
      case "calendar": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const handleBackToAdmin = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Back button for admin access */}
      {fromAdmin && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <Button
              variant="ghost"
              onClick={handleBackToAdmin}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin Panel
            </Button>
          </div>
        </div>
      )}
      
      {/* Creator Header */}
      <div className="relative w-full h-48 sm:h-64 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <div className="relative h-full flex flex-col justify-center items-center text-white px-4 text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <span className="text-2xl sm:text-3xl font-bold">
              {templateData.name?.charAt(0) || "J"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {templateData.name}
          </h1>
          <p className="text-sm sm:text-base opacity-90 max-w-sm">
            {templateData.description || "Professional Content Creator & Business Hub"}
          </p>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            <Badge variant="secondary" className="bg-white bg-opacity-20 text-white border-0">
              <Users className="w-3 h-3 mr-1" />
              Active Creator
            </Badge>
            <Badge variant="secondary" className="bg-white bg-opacity-20 text-white border-0">
              <Star className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          </div>
        </div>
      </div>

      {/* Mobile-optimized container */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Render layout blocks */}
        <div className="space-y-6">
          {templateData.layout && templateData.layout.length > 0 ? (
            templateData.layout
              .sort((a: LayoutBlock, b: LayoutBlock) => a.position - b.position)
              .map(renderLayoutBlock)
          ) : (
            <Card className="shadow-sm border-0">
              <CardContent className="p-8 text-center">
                <div className="max-w-md mx-auto">
                  <Smartphone className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Dashboard Coming Soon</h2>
                  <p className="text-gray-600 text-sm">
                    This creator is setting up their personalized dashboard. Check back soon!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 text-xs text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm">
            <Globe className="w-3 h-3" />
            <span>Powered by Creator Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
}