import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Bookmark, ThumbsUp, ThumbsDown, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ContentItem {
  id: number;
  type: string;
  title: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  pageId: number;
  pageTitle: string;
  platformType: string;
}

interface InteractionButtonProps {
  contentId: number;
  creatorId: number;
  interactionType: string;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "outline";
  className?: string;
}

function InteractionButton({ 
  contentId, 
  creatorId, 
  interactionType, 
  icon, 
  label, 
  variant = "outline",
  className = ""
}: InteractionButtonProps) {
  const queryClient = useQueryClient();
  
  const createInteractionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/creator-inspo-interactions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-auth/assigned-content"] });
      toast({
        title: "Interaction recorded",
        description: `Content ${interactionType} successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record interaction",
        variant: "destructive",
      });
    },
  });

  const handleInteraction = () => {
    createInteractionMutation.mutate({
      creatorId,
      contentId,
      interactionType,
      metadata: {
        timestamp: new Date().toISOString(),
        platform: "creator_app"
      }
    });
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleInteraction}
      disabled={createInteractionMutation.isPending}
      className={`flex items-center gap-1 ${className}`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}

interface ContentCardProps {
  content: ContentItem;
  creatorId: number;
}

function ContentCard({ content, creatorId }: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            {content.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {content.pageTitle} • {content.platformType}
          </p>
        </div>
        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
          {content.type}
        </span>
      </div>

      {/* Media */}
      {content.imageUrl && (
        <div className="rounded-lg overflow-hidden">
          <img 
            src={content.imageUrl} 
            alt={content.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {content.videoUrl && (
        <div className="rounded-lg overflow-hidden">
          <video 
            src={content.videoUrl}
            controls
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Description */}
      {content.description && (
        <div>
          <p className={`text-sm text-gray-600 dark:text-gray-300 ${!isExpanded && 'line-clamp-2'}`}>
            {content.description}
          </p>
          {content.description.length > 100 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 dark:text-blue-400 mt-1"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {content.content && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {content.content}
          </p>
        </div>
      )}

      {/* Interaction Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
        <InteractionButton
          contentId={content.id}
          creatorId={creatorId}
          interactionType="liked"
          icon={<Heart className="w-3 h-3" />}
          label="Like"
          variant="outline"
        />
        
        <InteractionButton
          contentId={content.id}
          creatorId={creatorId}
          interactionType="bookmarked"
          icon={<Bookmark className="w-3 h-3" />}
          label="Save"
          variant="outline"
        />
        
        <InteractionButton
          contentId={content.id}
          creatorId={creatorId}
          interactionType="approved"
          icon={<ThumbsUp className="w-3 h-3" />}
          label="Approve"
          variant="outline"
        />
        
        <InteractionButton
          contentId={content.id}
          creatorId={creatorId}
          interactionType="rejected"
          icon={<ThumbsDown className="w-3 h-3" />}
          label="Pass"
          variant="outline"
        />
        
        <InteractionButton
          contentId={content.id}
          creatorId={creatorId}
          interactionType="viewed"
          icon={<Eye className="w-3 h-3" />}
          label="Mark Viewed"
          variant="outline"
        />
      </div>
    </div>
  );
}

interface CreatorContentInteractionsProps {
  creatorId: number;
}

export function CreatorContentInteractions({ creatorId }: CreatorContentInteractionsProps) {
  const [filter, setFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const { data: assignedContent = [], isLoading } = useQuery({
    queryKey: ["/api/creator-auth/assigned-content"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: bookmarkedContent = [] } = useQuery({
    queryKey: [`/api/creator-inspo-interactions/bookmarked/${creatorId}`],
    enabled: !!creatorId,
  });

  // Filter content based on selected filters
  const filteredContent = assignedContent.filter((content: ContentItem) => {
    if (filter === "bookmarked") {
      return bookmarkedContent.some((bookmark: any) => bookmark.content.id === content.id);
    }
    if (filter !== "all" && content.type !== filter) return false;
    if (platformFilter !== "all" && content.platformType !== platformFilter) return false;
    return true;
  });

  // Get unique platforms for filter options
  const availablePlatforms = [...new Set(assignedContent.map((content: ContentItem) => content.platformType))];
  const contentTypes = [...new Set(assignedContent.map((content: ContentItem) => content.type))];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All Content
          </Button>
          <Button
            variant={filter === "bookmarked" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("bookmarked")}
          >
            <Bookmark className="w-3 h-3 mr-1" />
            Saved
          </Button>
          {contentTypes.map((type) => (
            <Button
              key={type}
              variant={filter === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(type)}
            >
              {type}
            </Button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2 ml-auto">
          <Button
            variant={platformFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatformFilter("all")}
          >
            All Platforms
          </Button>
          {availablePlatforms.map((platform) => (
            <Button
              key={platform}
              variant={platformFilter === platform ? "default" : "outline"}
              size="sm"
              onClick={() => setPlatformFilter(platform)}
            >
              {platform}
            </Button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No content found</h3>
            <p className="text-sm">
              {filter === "bookmarked" 
                ? "You haven't saved any content yet." 
                : "No content matches your current filters."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContent.map((content: ContentItem) => (
            <ContentCard
              key={content.id}
              content={content}
              creatorId={creatorId}
            />
          ))}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {assignedContent.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Content</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {bookmarkedContent.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Saved Items</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {availablePlatforms.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Platforms</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {contentTypes.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Content Types</div>
        </div>
      </div>
    </div>
  );
}