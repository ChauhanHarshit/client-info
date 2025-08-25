import { getApiUrl } from "@/lib/api-config";

/**
 * Global Creator Avatar Utility
 * 
 * This module provides consistent creator profile picture handling across all components.
 * Every component that displays creator avatars should use these utilities to ensure
 * consistent behavior and fallback handling.
 */

export interface CreatorAvatarData {
  id?: number;
  profileImageUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  // Support for different naming conventions from various APIs
  creator_name?: string | null;
  creator_username?: string | null;
  profile_image_url?: string | null;
  sender_profile_image?: string | null;
  // Additional fields for better data consistency
  email?: string | null;
  isActive?: boolean;
  // Support for message sender data
  sender?: {
    id?: number;
    displayName?: string;
    username?: string;
    profileImageUrl?: string;
  };
}

/**
 * Get the correct profile image URL for a creator
 * Handles different API response formats and ensures proper URL formatting
 */
export function getCreatorAvatarUrl(creator: CreatorAvatarData): string | undefined {
  // Priority order for finding profile image URL
  const possibleUrls = [
    creator.profileImageUrl,
    creator.profile_image_url,
    creator.sender_profile_image,
    creator.sender?.profileImageUrl
  ];
  
  for (const url of possibleUrls) {
    if (url && url.trim()) {
      // If it's already a full URL, use it as-is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      // If it already includes /uploads/, use getApiUrl to get the full URL
      if (url.startsWith('/uploads/')) {
        return getApiUrl(url);
      }
      // If it's just a filename, prepend /uploads/
      if (!url.startsWith('/')) {
        return getApiUrl(`/uploads/${url}`);
      }
      // Otherwise, use getApiUrl to format it properly
      return getApiUrl(url);
    }
  }
  
  return undefined;
}

/**
 * Get the display name for a creator
 * Handles different naming conventions from various APIs
 */
export function getCreatorDisplayName(creator: CreatorAvatarData): string {
  return creator.displayName || 
         creator.creator_name || 
         creator.sender?.displayName ||
         creator.username || 
         creator.creator_username || 
         creator.sender?.username ||
         'Unknown Creator';
}

/**
 * Get the username for a creator
 * Handles different naming conventions from various APIs
 */
export function getCreatorUsername(creator: CreatorAvatarData): string {
  return creator.username || 
         creator.creator_username || 
         creator.sender?.username ||
         'unknown';
}

/**
 * Get fallback initials for a creator
 * Uses display name first, then username
 */
export function getCreatorInitials(creator: CreatorAvatarData): string {
  const displayName = getCreatorDisplayName(creator);
  const username = getCreatorUsername(creator);
  
  // Try to get initials from display name first
  if (displayName && displayName !== 'Unknown Creator') {
    const words = displayName.trim().split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }
  
  // Fall back to username initials
  if (username && username !== 'unknown') {
    return username.substring(0, 2).toUpperCase();
  }
  
  return 'U';
}

/**
 * Normalize creator data for consistent display
 * Ensures all creator objects have consistent field names
 */
export function normalizeCreatorData(creator: any): CreatorAvatarData {
  return {
    id: creator.id,
    profileImageUrl: creator.profileImageUrl || creator.profile_image_url || creator.sender_profile_image,
    displayName: creator.displayName || creator.creator_name || creator.display_name,
    username: creator.username || creator.creator_username,
    email: creator.email,
    isActive: creator.isActive || creator.is_active,
    sender: creator.sender
  };
}

/**
 * Enhanced creator search functionality
 * Searches across multiple fields with normalized data
 */
export function searchCreators(creators: CreatorAvatarData[], query: string): CreatorAvatarData[] {
  if (!query.trim()) return creators;
  
  const searchTerm = query.toLowerCase();
  
  return creators.filter(creator => {
    const displayName = getCreatorDisplayName(creator).toLowerCase();
    const username = getCreatorUsername(creator).toLowerCase();
    
    return displayName.includes(searchTerm) || 
           username.includes(searchTerm) || 
           creator.email?.toLowerCase().includes(searchTerm);
  });
}

/**
 * Sort creators by display name with proper handling
 */
export function sortCreatorsByDisplayName(creators: CreatorAvatarData[]): CreatorAvatarData[] {
  return [...creators].sort((a, b) => {
    const nameA = getCreatorDisplayName(a);
    const nameB = getCreatorDisplayName(b);
    return nameA.localeCompare(nameB);
  });
}

/**
 * Get creator by ID with fallback handling
 */
export function findCreatorById(creators: CreatorAvatarData[], id: number): CreatorAvatarData | undefined {
  return creators.find(creator => creator.id === id);
}

/**
 * Common avatar props for consistent styling
 */
export interface CreatorAvatarProps {
  creator: CreatorAvatarData;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

/**
 * Get consistent avatar styling classes based on size
 */
export function getAvatarSizeClasses(size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };
  
  return sizeClasses[size];
}

/**
 * Get consistent fallback styling with gradient background
 */
export function getAvatarFallbackClasses(size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };
  
  return `bg-gradient-to-r from-blue-500 to-purple-600 text-white ${textSizes[size]} font-semibold`;
}