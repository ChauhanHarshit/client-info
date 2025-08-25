/**
 * Custom React hook for managing creator profiles
 * 
 * Provides consistent creator profile data management across all components
 * with automatic caching, real-time updates, and error handling.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorProfileService, CreatorAvatarData } from '@/lib/creator-profile-service';
import { useToast } from '@/hooks/use-toast';

export interface UseCreatorProfilesOptions {
  searchQuery?: string;
  activeOnly?: boolean;
  sortByDisplayName?: boolean;
}

export function useCreatorProfiles(options: UseCreatorProfilesOptions = {}) {
  const { searchQuery, activeOnly, sortByDisplayName } = options;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Main query for getting creators
  const query = useQuery({
    queryKey: ['creators', { searchQuery, activeOnly, sortByDisplayName }],
    queryFn: async () => {
      let creators: CreatorAvatarData[];
      
      if (searchQuery) {
        creators = await creatorProfileService.searchCreators(searchQuery);
      } else if (sortByDisplayName) {
        creators = await creatorProfileService.getCreatorsSorted();
      } else {
        creators = await creatorProfileService.getAllCreators();
      }
      
      if (activeOnly) {
        creators = creators.filter(creator => creator.isActive !== false);
      }
      
      return creators;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Mutation for updating profile picture
  const updateProfilePicture = useMutation({
    mutationFn: async ({ creatorId, imageUrl }: { creatorId: number; imageUrl: string }) => {
      await creatorProfileService.updateCreatorProfilePicture(creatorId, imageUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      toast({
        title: "Profile picture updated",
        description: "The creator's profile picture has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error('Profile picture update failed:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile picture. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating display name
  const updateDisplayName = useMutation({
    mutationFn: async ({ creatorId, displayName }: { creatorId: number; displayName: string }) => {
      await creatorProfileService.updateCreatorDisplayName(creatorId, displayName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      toast({
        title: "Display name updated",
        description: "The creator's display name has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error('Display name update failed:', error);
      toast({
        title: "Update failed",
        description: "Failed to update display name. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to get creator by ID
  const getCreatorById = (id: number): CreatorAvatarData | undefined => {
    return query.data?.find(creator => creator.id === id);
  };

  // Helper function to get creators by IDs
  const getCreatorsByIds = (ids: number[]): CreatorAvatarData[] => {
    return query.data?.filter(creator => ids.includes(creator.id || 0)) || [];
  };

  // Helper function to refresh data
  const refreshCreators = () => {
    creatorProfileService.invalidateCache();
    queryClient.invalidateQueries({ queryKey: ['creators'] });
  };

  return {
    // Data
    creators: query.data || [],
    
    // Loading states
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    
    // Mutations
    updateProfilePicture,
    updateDisplayName,
    
    // Helper functions
    getCreatorById,
    getCreatorsByIds,
    refreshCreators,
    
    // Query controls
    refetch: query.refetch,
  };
}

// Specialized hook for creator selection interfaces
export function useCreatorSelection() {
  const { creators, isLoading, getCreatorById, getCreatorsByIds } = useCreatorProfiles({
    activeOnly: true,
    sortByDisplayName: true,
  });

  return {
    creators,
    isLoading,
    getCreatorById,
    getCreatorsByIds,
    // Helper for common selection patterns
    getCreatorOptions: () => creators.map(creator => ({
      value: creator.id?.toString() || '',
      label: creator.displayName || creator.username || 'Unknown',
      creator
    })),
  };
}

// Hook for creator search interfaces
export function useCreatorSearch(initialQuery = '') {
  const { creators, isLoading, refreshCreators } = useCreatorProfiles({
    searchQuery: initialQuery,
    activeOnly: true,
    sortByDisplayName: true,
  });

  return {
    creators,
    isLoading,
    refreshCreators,
  };
}