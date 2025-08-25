import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Calendar,
  Users,
  Edit,
  Settings,
  Share,
  Play,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Video,
  Link as LinkIcon,
  Heart,
  ThumbsDown,
  Check,
  MoreVertical
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

interface PageViewerProps {
  pageId: string;
}

interface ContentItem {
  id: number;
  type: string;
  title: string;
  description: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  thumbnailUrl?: string;
  sortOrder: number;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Creator {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
}

interface Engagement {
  id: number;
  creatorId: number;
  contentId: number;
  liked: boolean;
  disliked: boolean;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PageData {
  id: number;
  emoji: string;
  name: string;
  description: string;
  bannerUrl: string;
  bannerType: string;
  tags: string[];
  creators: Creator[];
  content: ContentItem[];
  createdAt: string;
  updatedAt: string;
}

function EngagementButtons({ 
  contentId, 
  creatorId, 
  engagement,
  onEngagementUpdate 
}: { 
  contentId: number;
  creatorId: number;
  engagement?: Engagement;
  onEngagementUpdate: () => void;
}) {
  const { toast } = useToast();
  
  const updateEngagement = useMutation({
    mutationFn: async (data: { liked?: boolean; disliked?: boolean; done?: boolean }) => {
      return await apiRequest(`/api/creators/${creatorId}/content/${contentId}/engage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      onEngagementUpdate();
    },
    onError: (error) => {
      console.error("Error updating engagement:", error);
      toast({
        title: "Error",
        description: "Failed to update engagement",
        variant: "destructive"
      });
    }
  });

  const handleLike = () => {
    const newLiked = !engagement?.liked;
    updateEngagement.mutate({
      liked: newLiked,
      disliked: newLiked ? false : engagement?.disliked,
      done: engagement?.done
    });
  };

  const handleDislike = () => {
    const newDisliked = !engagement?.disliked;
    updateEngagement.mutate({
      liked: newDisliked ? false : engagement?.liked,
      disliked: newDisliked,
      done: engagement?.done
    });
  };

  const handleDone = () => {
    const newDone = !engagement?.done;
    updateEngagement.mutate({
      liked: engagement?.liked,
      disliked: engagement?.disliked,
      done: newDone
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={engagement?.liked ? "default" : "outline"}
        size="sm"
        onClick={handleLike}
        disabled={updateEngagement.isPending}
        className={engagement?.liked ? "bg-red-500 hover:bg-red-600 text-white" : ""}
      >
        <Heart className={`w-4 h-4 mr-1 ${engagement?.liked ? "fill-current" : ""}`} />
        Like
      </Button>
      
      <Button
        variant={engagement?.disliked ? "default" : "outline"}
        size="sm"
        onClick={handleDislike}
        disabled={updateEngagement.isPending}
        className={engagement?.disliked ? "bg-gray-500 hover:bg-gray-600 text-white" : ""}
      >
        <ThumbsDown className={`w-4 h-4 mr-1 ${engagement?.disliked ? "fill-current" : ""}`} />
        Pass
      </Button>
      
      <Button
        variant={engagement?.done ? "default" : "outline"}
        size="sm"
        onClick={handleDone}
        disabled={updateEngagement.isPending}
        className={engagement?.done ? "bg-green-500 hover:bg-green-600 text-white" : ""}
      >
        <Check className={`w-4 h-4 mr-1 ${engagement?.done ? "fill-current" : ""}`} />
        Done
      </Button>
    </div>
  );
}

function ContentItemCard({ 
  item, 
  selectedCreator,
  engagement,
  onEngagementUpdate 
}: { 
  item: ContentItem;
  selectedCreator: Creator | null;
  engagement?: Engagement;
  onEngagementUpdate: () => void;
}) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'link': return <LinkIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'video': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'link': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card className="h-full transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge className={getTypeColor(item.type)}>
            {getTypeIcon(item.type)}
            <span className="ml-1 capitalize">{item.type}</span>
          </Badge>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
        <CardTitle className="text-lg">{item.title}</CardTitle>
        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Media Display */}
        {item.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img 
              src={item.imageUrl} 
              alt={item.title}
              className="w-full h-48 object-cover"
            />
          </div>
        )}
        
        {item.videoUrl && (
          <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center justify-center h-48">
              <Button variant="outline" size="lg">
                <Play className="w-6 h-6 mr-2" />
                Play Video
              </Button>
            </div>
          </div>
        )}
        
        {item.linkUrl && (
          <div className="mb-4">
            <Button variant="outline" className="w-full" asChild>
              <a href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Link
              </a>
            </Button>
          </div>
        )}
        
        {/* Content Text */}
        {item.content && (
          <div className="mb-4">
            <p className="text-sm whitespace-pre-wrap">{item.content}</p>
          </div>
        )}
        
        <Separator className="my-4" />
        
        {/* Engagement Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Response:</span>
            {engagement && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {engagement.liked && <Heart className="w-3 h-3 fill-red-500 text-red-500" />}
                {engagement.disliked && <ThumbsDown className="w-3 h-3 fill-gray-500 text-gray-500" />}
                {engagement.done && <Check className="w-3 h-3 fill-green-500 text-green-500" />}
              </div>
            )}
          </div>
          
          {selectedCreator && (
            <EngagementButtons
              contentId={item.id}
              creatorId={selectedCreator.id}
              engagement={engagement}
              onEngagementUpdate={onEngagementUpdate}
            />
          )}
        </div>
        
        {/* Metadata */}
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Added {new Date(item.createdAt).toLocaleDateString()}</span>
            {engagement && (
              <span>Responded {new Date(engagement.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContentInspirationWithEngagement({ pageId }: PageViewerProps) {
  const [, setLocation] = useLocation();
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const queryClient = useQueryClient();

  // Fetch page data
  const { data: page, isLoading: pageLoading } = useQuery<PageData>({
    queryKey: [`/api/content-inspiration-pages/${pageId}`],
  });

  // Fetch engagements for selected creator
  const { data: engagements, refetch: refetchEngagements } = useQuery<Engagement[]>({
    queryKey: [`/api/creators/${selectedCreator?.id}/engagements`],
    enabled: !!selectedCreator
  });

  // Set first creator as default
  useEffect(() => {
    if (page?.creators.length && !selectedCreator) {
      setSelectedCreator(page.creators[0]);
    }
  }, [page, selectedCreator]);

  const handleEngagementUpdate = () => {
    refetchEngagements();
  };

  if (pageLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
          <Button onClick={() => setLocation('/content-inspiration-dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${page.emoji} ${page.name}`}
        description={page.description}
        showBackButton={true}
        backTo="/content-inspiration-dashboard"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Manage
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Banner */}
        {page.bannerUrl && (
          <div className="h-64 bg-cover bg-center relative overflow-hidden rounded-lg">
            <img 
              src={page.bannerUrl} 
              alt={page.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
        )}

        {/* Page Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Updated {new Date(page.updatedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {page.creators.length} creators
            </div>
          </div>
          
          {/* Tags */}
          {page.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {page.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Creator Selection */}
        {page.creators.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">View as Creator:</h3>
            <div className="flex flex-wrap gap-3">
              {page.creators.map((creator) => (
                <Button
                  key={creator.id}
                  variant={selectedCreator?.id === creator.id ? "default" : "outline"}
                  onClick={() => setSelectedCreator(creator)}
                  className="flex items-center gap-2"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={creator.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {creator.displayName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {creator.displayName}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Content Grid */}
        {page.content.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {page.content
              .filter(item => !item.isArchived)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => {
                const engagement = engagements?.find(e => e.contentId === item.id);
                return (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    selectedCreator={selectedCreator}
                    engagement={engagement}
                    onEngagementUpdate={handleEngagementUpdate}
                  />
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Content Yet</h3>
            <p className="text-muted-foreground mb-4">
              This inspiration page doesn't have any content items yet.
            </p>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Add Content
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}