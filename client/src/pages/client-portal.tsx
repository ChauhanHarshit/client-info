import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { 
  Palette,
  Eye,
  TrendingUp,
  Image as ImageIcon,
  Play,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import ContentFolders from "@/components/content-folders";
import CreatorCalendar from "@/components/creator-calendar";

// Theme definitions
const PORTAL_THEMES = [
  {
    id: "soft-glam",
    name: "Soft Glam",
    slug: "soft-glam",
    description: "Elegant pastels with gold accents",
    colorPalette: {
      primary: "#D4AF37",
      secondary: "#F8E8E8",
      accent: "#E6B8C2",
      background: "#FEFEFE",
      text: "#2D2D2D"
    },
    fontSettings: {
      primary: "Inter",
      secondary: "serif",
      sizes: { h1: "2rem", h2: "1.5rem", body: "1rem" }
    },
    layoutConfig: {
      type: "grid",
      spacing: "comfortable",
      cardStyle: "rounded-lg shadow-soft"
    },
    thumbnailUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' viewBox='0 0 100 60'%3E%3Crect width='100' height='60' fill='%23F8E8E8'/%3E%3Crect x='10' y='15' width='80' height='30' rx='8' fill='%23D4AF37'/%3E%3C/svg%3E"
  },
  {
    id: "dark-luxe",
    name: "Dark Luxe",
    slug: "dark-luxe", 
    description: "Premium dark theme with rose gold",
    colorPalette: {
      primary: "#E8B4B8",
      secondary: "#1A1A1A",
      accent: "#FF6B9D",
      background: "#0F0F0F",
      text: "#FFFFFF"
    },
    fontSettings: {
      primary: "Inter",
      secondary: "sans-serif",
      sizes: { h1: "2.25rem", h2: "1.75rem", body: "1rem" }
    },
    layoutConfig: {
      type: "list",
      spacing: "compact",
      cardStyle: "rounded-xl shadow-dark"
    },
    thumbnailUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' viewBox='0 0 100 60'%3E%3Crect width='100' height='60' fill='%231A1A1A'/%3E%3Crect x='10' y='15' width='80' height='30' rx='8' fill='%23E8B4B8'/%3E%3C/svg%3E"
  },
  {
    id: "bright-modern",
    name: "Bright Modern",
    slug: "bright-modern",
    description: "Clean and vibrant contemporary style",
    colorPalette: {
      primary: "#6366F1",
      secondary: "#F0F9FF",
      accent: "#F59E0B",
      background: "#FFFFFF",
      text: "#111827"
    },
    fontSettings: {
      primary: "Inter",
      secondary: "sans-serif",
      sizes: { h1: "2rem", h2: "1.5rem", body: "0.95rem" }
    },
    layoutConfig: {
      type: "grid",
      spacing: "spacious",
      cardStyle: "rounded-2xl shadow-modern"
    },
    thumbnailUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' viewBox='0 0 100 60'%3E%3Crect width='100' height='60' fill='%23F0F9FF'/%3E%3Crect x='10' y='15' width='80' height='30' rx='12' fill='%236366F1'/%3E%3C/svg%3E"
  },
  {
    id: "vintage-charm",
    name: "Vintage Charm",
    slug: "vintage-charm",
    description: "Retro-inspired with warm earth tones",
    colorPalette: {
      primary: "#8B4513",
      secondary: "#F5E6D3",
      accent: "#CD853F",
      background: "#FAF5F0",
      text: "#3C2414"
    },
    fontSettings: {
      primary: "Georgia",
      secondary: "serif",
      sizes: { h1: "2.5rem", h2: "1.75rem", body: "1.1rem" }
    },
    layoutConfig: {
      type: "list",
      spacing: "cozy",
      cardStyle: "rounded-lg shadow-warm"
    },
    thumbnailUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' viewBox='0 0 100 60'%3E%3Crect width='100' height='60' fill='%23F5E6D3'/%3E%3Crect x='10' y='15' width='80' height='30' rx='6' fill='%238B4513'/%3E%3C/svg%3E"
  }
];

interface ClientPortalProps {
  slug: string;
}

export default function ClientPortal({ slug }: ClientPortalProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);

  // Get portal page data
  const { data: portalPage, isLoading: portalLoading, error } = useQuery({
    queryKey: [`/api/client-portal/${slug}`],
    retry: false,
  });

  // Get portal sections
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: [`/api/client-portal/${slug}/sections`],
    enabled: !!portalPage,
  });

  // Get portal stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/client-portal/${slug}/stats`],
    enabled: !!portalPage,
  });

  // Theme selection mutation
  const selectThemeMutation = useMutation({
    mutationFn: async (themeSlug: string) => {
      return await apiRequest(`/api/client-portal/${slug}/theme`, {
        method: "PUT",
        body: JSON.stringify({ themeSlug }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-portal/${slug}`] });
      setShowThemeSelector(false);
    },
  });

  // Track page access
  const trackAccessMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/client-portal/${slug}/access`, {
        method: "POST",
      });
    },
  });

  // Track access on mount
  useEffect(() => {
    if (portalPage) {
      trackAccessMutation.mutate();
    }
  }, [portalPage]);

  // Check if theme selection is needed
  useEffect(() => {
    if (portalPage && !portalPage.selectedThemeId) {
      setShowThemeSelector(true);
    }
  }, [portalPage]);

  // Get current theme
  const currentTheme = portalPage?.selectedThemeId 
    ? PORTAL_THEMES.find(t => t.slug === portalPage.selectedTheme?.slug) || PORTAL_THEMES[0]
    : PORTAL_THEMES[0];

  // Apply theme styles
  useEffect(() => {
    if (currentTheme) {
      const root = document.documentElement;
      const { colorPalette } = currentTheme;
      
      root.style.setProperty('--portal-primary', colorPalette.primary);
      root.style.setProperty('--portal-secondary', colorPalette.secondary);
      root.style.setProperty('--portal-accent', colorPalette.accent);
      root.style.setProperty('--portal-background', colorPalette.background);
      root.style.setProperty('--portal-text', colorPalette.text);
    }
  }, [currentTheme]);

  const handleThemeSelect = (themeSlug: string) => {
    setSelectedTheme(themeSlug);
    selectThemeMutation.mutate(themeSlug);
  };

  const renderSection = (section: any) => {
    const { type, title, content } = section;

    switch (type) {
      case "inspiration":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {content.items?.map((item: any, index: number) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setSelectedSection({ ...section, selectedItem: item })}
                style={{ backgroundColor: currentTheme.colorPalette.secondary }}
              >
                {item.type === "image" && (
                  <>
                    <img 
                      src={item.url} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                )}
                {item.type === "video" && (
                  <>
                    <img 
                      src={item.thumbnail} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-8 w-8 text-white drop-shadow-lg" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        );

      case "stats":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {content.metrics?.map((metric: any, index: number) => (
              <div
                key={index}
                className="text-center p-4 rounded-lg"
                style={{ backgroundColor: currentTheme.colorPalette.secondary }}
              >
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{ color: currentTheme.colorPalette.primary }}
                >
                  {metric.value}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: currentTheme.colorPalette.text }}
                >
                  {metric.label}
                </div>
                {metric.growth && (
                  <div className="flex items-center justify-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    <span className="text-xs text-green-500">{metric.growth}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "gallery":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.items?.map((item: any, index: number) => (
              <div
                key={index}
                className="rounded-lg overflow-hidden cursor-pointer"
                onClick={() => setSelectedSection({ ...section, selectedItem: item })}
                style={{ backgroundColor: currentTheme.colorPalette.secondary }}
              >
                <img 
                  src={item.url} 
                  alt={item.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h4 
                    className="font-medium mb-2"
                    style={{ color: currentTheme.colorPalette.text }}
                  >
                    {item.title}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <Heart className="h-4 w-4 mr-1" style={{ color: currentTheme.colorPalette.accent }} />
                      <span style={{ color: currentTheme.colorPalette.text }}>{item.likes || 0}</span>
                    </div>
                    <div className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-1" style={{ color: currentTheme.colorPalette.accent }} />
                      <span style={{ color: currentTheme.colorPalette.text }}>{item.comments || 0}</span>
                    </div>
                    <div className="flex items-center">
                      <Share2 className="h-4 w-4 mr-1" style={{ color: currentTheme.colorPalette.accent }} />
                      <span style={{ color: currentTheme.colorPalette.text }}>{item.shares || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: currentTheme.colorPalette.secondary }}
          >
            <p style={{ color: currentTheme.colorPalette.text }}>
              {content.text || "Custom content section"}
            </p>
          </div>
        );
    }
  };

  if (portalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.colorPalette.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: currentTheme.colorPalette.primary }}></div>
      </div>
    );
  }

  if (error || !portalPage) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.colorPalette.background }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: currentTheme.colorPalette.text }}>
            Page Not Found
          </h1>
          <p className="mb-6" style={{ color: currentTheme.colorPalette.text }}>
            This client portal page doesn't exist or has been disabled.
          </p>
          <Button
            onClick={() => setLocation("/")}
            style={{ 
              backgroundColor: currentTheme.colorPalette.primary,
              color: currentTheme.colorPalette.background 
            }}
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: currentTheme.colorPalette.background }}>
      {/* Theme Selector Dialog */}
      <Dialog open={showThemeSelector} onOpenChange={setShowThemeSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2" />
              Choose Your Theme
            </DialogTitle>
            <DialogDescription>
              Select a theme that matches your style. You can change this anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {PORTAL_THEMES.map((theme) => (
              <div
                key={theme.id}
                className={`cursor-pointer border-2 rounded-lg p-4 transition-colors ${
                  selectedTheme === theme.slug 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTheme(theme.slug)}
              >
                <img 
                  src={theme.thumbnailUrl} 
                  alt={theme.name}
                  className="w-full h-16 object-cover rounded mb-2"
                />
                <h3 className="font-medium">{theme.name}</h3>
                <p className="text-sm text-gray-600">{theme.description}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowThemeSelector(false)}
            >
              Skip for now
            </Button>
            <Button
              onClick={() => selectedTheme && handleThemeSelect(selectedTheme)}
              disabled={!selectedTheme || selectThemeMutation.isPending}
            >
              {selectThemeMutation.isPending ? "Applying..." : "Apply Theme"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section Detail Modal */}
      {selectedSection && (
        <Dialog open={!!selectedSection} onOpenChange={() => setSelectedSection(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSection.title}</DialogTitle>
              {selectedSection.selectedItem && (
                <DialogDescription>{selectedSection.selectedItem.title}</DialogDescription>
              )}
            </DialogHeader>
            <div className="mt-4">
              {selectedSection.selectedItem?.type === "image" && (
                <img 
                  src={selectedSection.selectedItem.url} 
                  alt={selectedSection.selectedItem.title}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              )}
              {selectedSection.selectedItem?.type === "video" && (
                <video 
                  src={selectedSection.selectedItem.url}
                  poster={selectedSection.selectedItem.thumbnail}
                  controls
                  className="w-full max-h-96 rounded-lg"
                />
              )}
              {selectedSection.selectedItem?.description && (
                <p className="mt-4 text-gray-600">
                  {selectedSection.selectedItem.description}
                </p>
              )}
              {selectedSection.selectedItem?.link && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.open(selectedSection.selectedItem.link, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          {portalPage.bannerUrl && (
            <div 
              className="w-full h-48 rounded-2xl mb-6 bg-cover bg-center"
              style={{ backgroundImage: `url(${portalPage.bannerUrl})` }}
            />
          )}
          
          <div className="flex items-center justify-center mb-4">
            {portalPage.avatarUrl ? (
              <Avatar className="h-20 w-20 border-4" style={{ borderColor: currentTheme.colorPalette.primary }}>
                <AvatarImage src={portalPage.avatarUrl} />
                <AvatarFallback style={{ backgroundColor: currentTheme.colorPalette.secondary }}>
                  {portalPage.title.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div 
                className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold border-4"
                style={{ 
                  backgroundColor: currentTheme.colorPalette.secondary,
                  borderColor: currentTheme.colorPalette.primary,
                  color: currentTheme.colorPalette.primary
                }}
              >
                {portalPage.title.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <h1 
            className="text-3xl font-bold mb-2"
            style={{ 
              color: currentTheme.colorPalette.text,
              fontFamily: currentTheme.fontSettings.primary
            }}
          >
            {portalPage.title}
          </h1>
          
          {portalPage.description && (
            <p 
              className="text-lg mb-6"
              style={{ color: currentTheme.colorPalette.text }}
            >
              {portalPage.description}
            </p>
          )}

          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div 
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: currentTheme.colorPalette.secondary }}
              >
                <div 
                  className="text-2xl font-bold"
                  style={{ color: currentTheme.colorPalette.primary }}
                >
                  {stats.totalContentPieces || 0}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: currentTheme.colorPalette.text }}
                >
                  Total Content
                </div>
              </div>
              
              <div 
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: currentTheme.colorPalette.secondary }}
              >
                <div 
                  className="text-2xl font-bold"
                  style={{ color: currentTheme.colorPalette.primary }}
                >
                  {Object.keys(stats.platformBreakdown || {}).length}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: currentTheme.colorPalette.text }}
                >
                  Platforms
                </div>
              </div>
              
              <div 
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: currentTheme.colorPalette.secondary }}
              >
                <div 
                  className="text-2xl font-bold"
                  style={{ color: currentTheme.colorPalette.primary }}
                >
                  {portalPage.accessCount || 0}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: currentTheme.colorPalette.text }}
                >
                  Page Views
                </div>
              </div>
              
              <div 
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: currentTheme.colorPalette.secondary }}
              >
                <div 
                  className="text-2xl font-bold"
                  style={{ color: currentTheme.colorPalette.primary }}
                >
                  {portalPage.lastAccessedAt ? format(new Date(portalPage.lastAccessedAt), "MMM d") : "Never"}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: currentTheme.colorPalette.text }}
                >
                  Last Visit
                </div>
              </div>
            </div>
          )}

          {/* Theme Change Button */}
          <Button
            variant="outline"
            onClick={() => setShowThemeSelector(true)}
            className="mb-8"
            style={{ 
              borderColor: currentTheme.colorPalette.primary,
              color: currentTheme.colorPalette.primary
            }}
          >
            <Palette className="h-4 w-4 mr-2" />
            Change Theme
          </Button>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Content Folders Section */}
          <div className="mb-8">
            <ContentFolders
              socialMediaDriveUrl={portalPage.socialMediaDriveUrl}
              onlyfansDriveUrl={portalPage.onlyfansDriveUrl}
              socialMediaDriveType={portalPage.socialMediaDriveType}
              onlyfansDriveType={portalPage.onlyfansDriveType}
              socialMediaDriveDescription={portalPage.socialMediaDriveDescription}
              onlyfansDriveDescription={portalPage.onlyfansDriveDescription}
            />
          </div>

          {/* Creator Calendar Section */}
          <div className="mb-8">
            <CreatorCalendar 
              creatorId={portalPage.creatorId}
              isReadOnly={true}
            />
          </div>

          {/* Dynamic Content Sections */}
          {sections?.filter((section: any) => section.isVisible && section.isEnabled)
            .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
            .map((section: any) => (
              <div key={section.id}>
                <h2 
                  className="text-2xl font-bold mb-4"
                  style={{ 
                    color: currentTheme.colorPalette.text,
                    fontFamily: currentTheme.fontSettings.primary
                  }}
                >
                  {section.title}
                </h2>
                {section.description && (
                  <p 
                    className="mb-4"
                    style={{ color: currentTheme.colorPalette.text }}
                  >
                    {section.description}
                  </p>
                )}
                {renderSection(section)}
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t" style={{ borderColor: currentTheme.colorPalette.secondary }}>
          <p 
            className="text-sm"
            style={{ color: currentTheme.colorPalette.text }}
          >
            Last updated: {format(new Date(portalPage.updatedAt), "MMMM d, yyyy")}
          </p>
        </div>
      </div>
    </div>
  );
}