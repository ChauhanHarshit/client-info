import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, 
  ExternalLink,
  Pin,
  ArrowLeft,
  Palette,
  Eye,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const contentTypeLabels: Record<string, { label: string; color: string }> = {
  ppv: { label: "PPV Content", color: "bg-purple-100 text-purple-800" },
  sexting_sets: { label: "Sexting Sets", color: "bg-pink-100 text-pink-800" },
  fan_gifts: { label: "Fan Gifts", color: "bg-green-100 text-green-800" },
  wall_posts: { label: "Wall Posts", color: "bg-blue-100 text-blue-800" },
  instagram: { label: "Instagram", color: "bg-orange-100 text-orange-800" },
  twitter: { label: "Twitter", color: "bg-sky-100 text-sky-800" },
  pictures: { label: "Pictures", color: "bg-yellow-100 text-yellow-800" },
  videos: { label: "Videos", color: "bg-red-100 text-red-800" },
  ads: { label: "Ads", color: "bg-gray-100 text-gray-800" },
  whales: { label: "VIP Clients", color: "bg-amber-100 text-amber-800" },
};

interface CreatorPageViewProps {
  creatorId?: string;
  token?: string;
}

export default function CreatorPageView({ creatorId: propCreatorId, token }: CreatorPageViewProps) {
  const { creatorId: routeCreatorId, token: routeToken } = useParams();
  const [, setLocation] = useLocation();
  const [showAestheticDialog, setShowAestheticDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get creatorId from props or route params, prioritize token-based access
  const creatorId = propCreatorId || routeCreatorId;
  const publicToken = token || routeToken;

  // Check if this is token-based access (public page)
  const isPublicAccess = !!publicToken;
  
  // Check if accessed from admin panel (not token-based and has creatorId param)
  const isAdminAccess = !isPublicAccess && !!creatorId;

  // Fetch creator data by token if available, otherwise by ID
  const { data: creator, isLoading: creatorLoading } = useQuery({
    queryKey: publicToken ? [`/api/creators/by-token/${publicToken}`] : [`/api/creators/${creatorId}`],
    enabled: !!(publicToken || creatorId),
  });

  // Use creator ID from fetched data if accessed by token
  const actualCreatorId = creator?.id || creatorId;

  // Fetch creator with aesthetic template data
  const { data: creatorWithAesthetics, isLoading: aestheticsLoading } = useQuery({
    queryKey: [`/api/creators/with-aesthetics`],
    enabled: !!actualCreatorId,
  });

  // Find the current creator's aesthetic template
  const creatorAesthetic = creatorWithAesthetics?.find((c: any) => c.id === parseInt(actualCreatorId));
  const aestheticTemplate = creatorAesthetic?.aestheticTemplate;

  // Fetch inspiration pages for this creator
  const { data: inspirationPages = [], isLoading: inspirationLoading } = useQuery({
    queryKey: [`/api/inspiration-pages/creator/${actualCreatorId}`],
    enabled: !!actualCreatorId,
  });

  // Fetch available aesthetic templates
  const { data: availableTemplates = [] } = useQuery({
    queryKey: ['/api/page-templates'],
  });

  // Apply aesthetic template mutation
  const applyAestheticMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return apiRequest('POST', `/api/creators/${actualCreatorId}/assign-aesthetic`, { templateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/creators/with-aesthetics`] });
      toast({
        title: "Success",
        description: "Your aesthetic template has been applied!",
      });
      setShowAestheticDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply aesthetic template",
        variant: "destructive",
      });
    },
  });

  const isLoading = creatorLoading || inspirationLoading || aestheticsLoading;

  if (isLoading) {
    return (
      <div className={isPublicAccess ? "min-h-screen bg-gray-50 flex items-center justify-center" : "p-6"}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading creator page...</p>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className={isPublicAccess ? "min-h-screen bg-gray-50 flex items-center justify-center" : "p-6"}>
        <div className="text-center">
          <p className="text-slate-600">Creator page not found</p>
        </div>
      </div>
    );
  }

  // Apply aesthetic template styling or fallback to default
  const pageStyle = aestheticTemplate ? {
    backgroundColor: aestheticTemplate.backgroundColor,
    color: aestheticTemplate.textColor,
  } : {};

  const heroStyle = aestheticTemplate ? {
    backgroundImage: aestheticTemplate.bannerUrl 
      ? `url(${aestheticTemplate.bannerUrl}), linear-gradient(135deg, ${aestheticTemplate.backgroundColor}, ${aestheticTemplate.accentColor})`
      : `linear-gradient(135deg, ${aestheticTemplate.backgroundColor}, ${aestheticTemplate.accentColor})`,
    backgroundSize: 'cover, cover',
    backgroundPosition: 'center, center',
    backgroundRepeat: 'no-repeat, no-repeat',
    color: aestheticTemplate.textColor,
  } : {};

  return (
    <div className="min-h-screen" style={pageStyle}>
      {/* Back Button - Consistent with Content & Comms layout */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-3">
        <Button
          variant="outline"
          size="default"
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </Button>
      </div>
      
      {/* Hero Section with Template Colors */}
      <div 
        className={aestheticTemplate ? "text-white relative overflow-hidden" : "bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white relative overflow-hidden"}
        style={aestheticTemplate ? heroStyle : {}}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          {/* Creator Avatar */}
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
              {creator.profileImageUrl ? (
                <img 
                  src={creator.profileImageUrl} 
                  alt={creator.displayName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {creator.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          
          {/* Creator Name and Title */}
          <h1 className="text-4xl font-bold mb-2">
            {creator.displayName} - Creator Page
          </h1>
          <p className="text-xl text-white/90 mb-6">
            Personalized content page for {creator.displayName}
          </p>
          
          {/* Status Badges */}
          <div className="flex justify-center space-x-3">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              👤 Active Creator
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              ⭐ Verified
            </Badge>
          </div>
          
          {/* Choose Your Aesthetic Button */}
          <div className="mt-6">
            <Button
              onClick={() => setShowAestheticDialog(true)}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              variant="outline"
            >
              <Palette className="w-4 h-4 mr-2" />
              Choose Your Aesthetic
            </Button>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Priority Content Section */}
        <div className="space-y-4">
          <div 
            className="flex items-center space-x-3 rounded-lg p-6 shadow-sm border"
            style={aestheticTemplate ? {
              backgroundColor: aestheticTemplate.backgroundColor,
              borderColor: aestheticTemplate.accentColor,
              color: aestheticTemplate.textColor
            } : {
              backgroundColor: 'white',
              borderColor: '#fecaca'
            }}
          >
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={aestheticTemplate ? {
                backgroundColor: aestheticTemplate.accentColor + '20',
              } : { backgroundColor: '#fef2f2' }}
            >
              <FileText 
                className="w-6 h-6"
                style={aestheticTemplate ? { color: aestheticTemplate.accentColor } : { color: '#dc2626' }}
              />
            </div>
            <div className="flex-1">
              <h2 
                className="text-xl font-semibold"
                style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#111827' }}
              >
                Priority Content Needs
              </h2>
              <p 
                className="opacity-70"
                style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#4b5563' }}
              >
                High-priority content requests and urgent tasks
              </p>
            </div>
            <Badge 
              variant="secondary" 
              className="border"
              style={aestheticTemplate ? {
                backgroundColor: aestheticTemplate.accentColor + '10',
                color: aestheticTemplate.accentColor,
                borderColor: aestheticTemplate.accentColor + '30'
              } : {
                backgroundColor: '#f3f4f6',
                color: '#4b5563'
              }}
            >
              0 items
            </Badge>
          </div>
          
          <div 
            className="rounded-lg p-8 text-center border"
            style={aestheticTemplate ? {
              backgroundColor: aestheticTemplate.backgroundColor,
              borderColor: aestheticTemplate.accentColor + '20',
              color: aestheticTemplate.textColor
            } : {
              backgroundColor: 'white',
              borderColor: '#e5e7eb'
            }}
          >
            <FileText 
              className="w-12 h-12 mx-auto mb-4 opacity-40"
              style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#9ca3af' }}
            />
            <p 
              className="mb-2 opacity-60"
              style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#6b7280' }}
            >
              No content assigned to this section
            </p>
            <p 
              className="text-sm opacity-40"
              style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#9ca3af' }}
            >
              Priority content is managed separately
            </p>
          </div>
        </div>

        {/* OnlyFans Content Section */}
        <div className="space-y-4">
          <div 
            className="flex items-center space-x-3 rounded-lg p-6 shadow-sm border"
            style={aestheticTemplate ? {
              backgroundColor: aestheticTemplate.backgroundColor,
              borderColor: aestheticTemplate.accentColor,
              color: aestheticTemplate.textColor
            } : {
              backgroundColor: 'white',
              borderColor: '#fce7f3'
            }}
          >
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={aestheticTemplate ? {
                backgroundColor: aestheticTemplate.accentColor + '20',
              } : { backgroundColor: '#fdf2f8' }}
            >
              ⭐
            </div>
            <div className="flex-1">
              <h2 
                className="text-xl font-semibold"
                style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#111827' }}
              >
                OnlyFans Content
              </h2>
              <p 
                className="opacity-70"
                style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#4b5563' }}
              >
                Content planning and management for OnlyFans
              </p>
            </div>
            <Badge 
              variant="secondary" 
              className="border"
              style={aestheticTemplate ? {
                backgroundColor: aestheticTemplate.accentColor + '10',
                color: aestheticTemplate.accentColor,
                borderColor: aestheticTemplate.accentColor + '30'
              } : {
                backgroundColor: '#f3f4f6',
                color: '#4b5563'
              }}
            >
              8 items
            </Badge>
          </div>
          
          <div 
            className="rounded-lg border"
            style={aestheticTemplate ? {
              backgroundColor: aestheticTemplate.backgroundColor,
              borderColor: aestheticTemplate.accentColor + '20',
              color: aestheticTemplate.textColor
            } : {
              backgroundColor: 'white',
              borderColor: '#e5e7eb'
            }}
          >
            <div 
              className="p-6 border-b"
              style={aestheticTemplate ? {
                borderColor: aestheticTemplate.accentColor + '20'
              } : { borderColor: '#f3f4f6' }}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">😊</span>
                <div>
                  <h3 
                    className="font-medium"
                    style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#111827' }}
                  >
                    SundayJune8
                  </h3>
                  <p 
                    className="text-sm opacity-60"
                    style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#6b7280' }}
                  >
                    Testing This
                  </p>
                </div>
                <div className="ml-auto">
                  <span 
                    className="text-sm opacity-40"
                    style={aestheticTemplate ? { color: aestheticTemplate.textColor } : { color: '#9ca3af' }}
                  >
                    Click to view
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Inspiration */}
        <Card 
          className="border"
          style={aestheticTemplate ? {
            backgroundColor: aestheticTemplate.backgroundColor,
            borderColor: aestheticTemplate.accentColor + '20',
            color: aestheticTemplate.textColor
          } : {}}
        >
          <CardHeader>
            <CardTitle 
              className="flex items-center space-x-2"
              style={aestheticTemplate ? { color: aestheticTemplate.textColor } : {}}
            >
              <FileText 
                className="w-5 h-5"
                style={aestheticTemplate ? { color: aestheticTemplate.accentColor } : {}}
              />
              <span>Content Inspiration</span>
              <Badge 
                variant="secondary" 
                className="ml-auto border"
                style={aestheticTemplate ? {
                  backgroundColor: aestheticTemplate.accentColor + '10',
                  color: aestheticTemplate.accentColor,
                  borderColor: aestheticTemplate.accentColor + '30'
                } : {}}
              >
                {inspirationPages.length} pages assigned
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inspirationPages.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No inspiration pages assigned to this creator.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inspirationPages.map((page: any) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/public/inspiration/${page.id}?from=creator&creatorId=${creatorId}`)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{page.emoji || "📄"}</span>
                      <div>
                        <h4 className="font-medium">{page.title}</h4>
                        {page.description && (
                          <p className="text-sm text-slate-600">{page.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          {page.contentType && contentTypeLabels[page.contentType] && (
                            <Badge className={`text-xs ${contentTypeLabels[page.contentType].color}`}>
                              {contentTypeLabels[page.contentType].label}
                            </Badge>
                          )}
                          {page.tags && page.tags.length > 0 && (
                            <div className="flex space-x-1">
                              {page.tags.slice(0, 2).map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {page.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{page.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {page.isPinned && (
                        <Pin className="w-4 h-4 text-blue-500" />
                      )}
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Choose Your Aesthetic Dialog */}
      <Dialog open={showAestheticDialog} onOpenChange={setShowAestheticDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-6 h-6" />
              Choose Your Aesthetic
            </DialogTitle>
            <DialogDescription>
              Choose a template that matches your style and brand. You can change this anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Available Aesthetic Templates */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Available Aesthetic Templates
              </h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                {(availableTemplates as any[]).map((template: any) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {/* Template Preview */}
                      <div className="w-full space-y-3">
                        {/* Main visual preview */}
                        <div 
                          className="w-full h-40 rounded-lg border-2 p-4 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                          style={{
                            backgroundColor: template.background_color || template.backgroundColor,
                            borderColor: template.accent_color || template.accentColor
                          }}
                        >
                          {/* Background pattern/texture overlay */}
                          <div className="absolute inset-0 opacity-5">
                            <div className="w-full h-full" style={{
                              backgroundImage: `linear-gradient(45deg, ${(template.accent_color || template.accentColor)}40 25%, transparent 25%), linear-gradient(-45deg, ${(template.accent_color || template.accentColor)}40 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${(template.accent_color || template.accentColor)}40 75%), linear-gradient(-45deg, transparent 75%, ${(template.accent_color || template.accentColor)}40 75%)`,
                              backgroundSize: '12px 12px',
                              backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px'
                            }} />
                          </div>
                          
                          {/* Banner area simulation - exactly matching test 2 behavior */}
                          {(template.banner_url || template.bannerUrl) && (
                            <div 
                              className="absolute inset-0 rounded-lg overflow-hidden"
                              style={{
                                backgroundImage: `url(${template.banner_url || template.bannerUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                opacity: 0.3
                              }}
                            />
                          )}
                          
                          {/* Content area */}
                          <div className="relative z-10 flex flex-col justify-center items-center h-full text-center">
                            <h3 
                              className="font-bold text-lg mb-2 drop-shadow-sm"
                              style={{ 
                                color: template.text_color || template.textColor
                              }}
                            >
                              {template.name}
                            </h3>
                            
                            {/* Simulated content elements */}
                            <div className="space-y-1.5 w-full max-w-[100px] mb-2">
                              <div 
                                className="h-1.5 rounded-full"
                                style={{ backgroundColor: `${template.text_color || template.textColor}50` }}
                              />
                              <div 
                                className="h-1.5 rounded-full w-3/4 mx-auto"
                                style={{ backgroundColor: `${template.text_color || template.textColor}30` }}
                              />
                              <div 
                                className="h-1.5 rounded-full w-1/2 mx-auto"
                                style={{ backgroundColor: `${template.text_color || template.textColor}20` }}
                              />
                            </div>
                            
                            {/* Accent button simulation */}
                            <div 
                              className="w-16 h-5 rounded-full flex items-center justify-center text-xs font-medium shadow-sm"
                              style={{ 
                                backgroundColor: template.accent_color || template.accentColor,
                                color: template.background_color || template.backgroundColor
                              }}
                            >
                              Link
                            </div>
                          </div>
                        </div>
                        
                        {/* Colorway display */}
                        <div className="flex items-center justify-between">
                          <div className="flex space-x-2">
                            <div 
                              className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                              style={{ backgroundColor: template.background_color || template.backgroundColor }}
                              title={`Background: ${template.background_color || template.backgroundColor}`}
                            />
                            <div 
                              className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                              style={{ backgroundColor: template.text_color || template.textColor }}
                              title={`Text: ${template.text_color || template.textColor}`}
                            />
                            <div 
                              className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                              style={{ backgroundColor: template.accent_color || template.accentColor }}
                              title={`Accent: ${template.accent_color || template.accentColor}`}
                            />
                          </div>
                          
                          {/* Theme metadata */}
                          <div className="text-right text-xs">
                            <div className="text-muted-foreground">
                              {template.description ? 'Custom' : 'Basic'} Theme
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Template Info */}
                      <div className="mt-4 space-y-3">
                        <div>
                          <h3 className="font-semibold">{template.name}</h3>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                          )}
                        </div>
                        
                        {/* Action Buttons - Only Preview and Apply */}
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewTemplate(template)}
                            className="flex-1 gap-2"
                          >
                            <Eye className="h-3 w-3" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applyAestheticMutation.mutate(template.id)}
                            disabled={applyAestheticMutation.isPending}
                            className="flex-1 gap-2"
                          >
                            <Sparkles className="h-3 w-3" />
                            {applyAestheticMutation.isPending ? 'Applying...' : 'Apply'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Preview: {(previewTemplate as any).name}
              </DialogTitle>
              <DialogDescription>
                This is how your page would look with this aesthetic template
              </DialogDescription>
            </DialogHeader>
            
            {/* Full page preview */}
            <div className="space-y-4">
              <div 
                className="min-h-[400px] rounded-lg border overflow-hidden"
                style={{
                  backgroundColor: (previewTemplate as any).background_color || (previewTemplate as any).backgroundColor,
                  color: (previewTemplate as any).text_color || (previewTemplate as any).textColor
                }}
              >
                {/* Hero section preview */}
                <div 
                  className="text-white relative overflow-hidden p-8"
                  style={{
                    backgroundImage: ((previewTemplate as any).banner_url || (previewTemplate as any).bannerUrl) 
                      ? `url(${(previewTemplate as any).banner_url || (previewTemplate as any).bannerUrl}), linear-gradient(135deg, ${(previewTemplate as any).background_color || (previewTemplate as any).backgroundColor}, ${(previewTemplate as any).accent_color || (previewTemplate as any).accentColor})`
                      : `linear-gradient(135deg, ${(previewTemplate as any).background_color || (previewTemplate as any).backgroundColor}, ${(previewTemplate as any).accent_color || (previewTemplate as any).accentColor})`,
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat'
                  }}
                >
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                      <span className="text-white text-xl font-bold">
                        {creator?.displayName?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">{creator?.displayName} - Creator Page</h1>
                    <p className="text-white/90">Personalized content page</p>
                  </div>
                </div>
                
                {/* Content sections preview */}
                <div className="p-6 space-y-4">
                  <div 
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: (previewTemplate as any).background_color || (previewTemplate as any).backgroundColor,
                      borderColor: (previewTemplate as any).accent_color || (previewTemplate as any).accentColor,
                      color: (previewTemplate as any).text_color || (previewTemplate as any).textColor
                    }}
                  >
                    <h3 className="font-semibold mb-2">Content Section</h3>
                    <p className="text-sm opacity-70">This is how your content sections will look</p>
                  </div>
                </div>
              </div>
              
              {/* Apply button in preview */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close Preview
                </Button>
                <Button 
                  onClick={() => {
                    applyAestheticMutation.mutate((previewTemplate as any).id);
                    setPreviewTemplate(null);
                  }}
                  disabled={applyAestheticMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {applyAestheticMutation.isPending ? 'Applying...' : 'Apply This Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}