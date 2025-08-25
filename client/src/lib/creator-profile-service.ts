/**
 * Creator Profile Service
 * 
 * Centralized service for managing creator profile data consistency
 * across all components and interfaces in the application.
 */
import { CreatorAvatarData, normalizeCreatorData, searchCreators, sortCreatorsByDisplayName } from './creator-avatar-utils';
import { apiRequest } from './queryClient';

export interface CreatorProfileCache {
  [key: string]: CreatorAvatarData[];
}

class CreatorProfileService {
  private cache: CreatorProfileCache = {};
  private lastFetch: { [key: string]: number } = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all creators with normalized data
   */
  async getAllCreators(forceRefresh = false): Promise<CreatorAvatarData[]> {
    const cacheKey = 'all_creators';
    
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      return this.cache[cacheKey];
    }

    try {
      console.log('Fetching creators from /api/creators using authenticated request...');
      
      // Use the authenticated apiRequest function to ensure proper authentication
      const response = await apiRequest('GET', '/api/creators');
      const creators = await response.json();
      console.log('Creators data:', creators);
      
      // Ensure creators is an array before mapping
      if (!Array.isArray(creators)) {
        console.error('API returned non-array response:', creators);
        return this.cache[cacheKey] || [];
      }
      
      const normalizedCreators = creators.map(normalizeCreatorData);
      this.updateCache(cacheKey, normalizedCreators);
      
      return normalizedCreators;
    } catch (error) {
      console.error('Failed to fetch creators:', error);
      return this.cache[cacheKey] || [];
    }
  }

  /**
   * Get creators with search and filtering
   */
  async searchCreators(query: string, forceRefresh = false): Promise<CreatorAvatarData[]> {
    const allCreators = await this.getAllCreators(forceRefresh);
    return searchCreators(allCreators, query);
  }

  /**
   * Get creators sorted by display name
   */
  async getCreatorsSorted(forceRefresh = false): Promise<CreatorAvatarData[]> {
    const allCreators = await this.getAllCreators(forceRefresh);
    return sortCreatorsByDisplayName(allCreators);
  }

  /**
   * Get creator by ID with enhanced error handling
   */
  async getCreatorById(id: number, forceRefresh = false): Promise<CreatorAvatarData | null> {
    const allCreators = await this.getAllCreators(forceRefresh);
    return allCreators.find(creator => creator.id === id) || null;
  }

  /**
   * Get creators by IDs in batch
   */
  async getCreatorsByIds(ids: number[], forceRefresh = false): Promise<CreatorAvatarData[]> {
    const allCreators = await this.getAllCreators(forceRefresh);
    return allCreators.filter(creator => ids.includes(creator.id || 0));
  }

  /**
   * Get active creators only
   */
  async getActiveCreators(forceRefresh = false): Promise<CreatorAvatarData[]> {
    const allCreators = await this.getAllCreators(forceRefresh);
    return allCreators.filter(creator => creator.isActive !== false);
  }

  /**
   * Invalidate cache for fresh data
   */
  invalidateCache(key?: string): void {
    if (key) {
      delete this.cache[key];
      delete this.lastFetch[key];
    } else {
      this.cache = {};
      this.lastFetch = {};
    }
  }

  /**
   * Update profile picture for a creator
   */
  async updateCreatorProfilePicture(creatorId: number, imageUrl: string): Promise<void> {
    try {
      await apiRequest('POST', `/api/creators/${creatorId}/profile-picture`, {
        profileImageUrl: imageUrl
      });
      
      // Update cache
      Object.keys(this.cache).forEach(key => {
        const creators = this.cache[key];
        const creatorIndex = creators.findIndex(c => c.id === creatorId);
        if (creatorIndex !== -1) {
          creators[creatorIndex] = {
            ...creators[creatorIndex],
            profileImageUrl: imageUrl
          };
        }
      });
    } catch (error) {
      console.error('Failed to update creator profile picture:', error);
      throw error;
    }
  }

  /**
   * Update creator display name
   */
  async updateCreatorDisplayName(creatorId: number, displayName: string): Promise<void> {
    try {
      await apiRequest('POST', `/api/creators/${creatorId}/display-name`, {
        displayName
      });
      
      // Update cache
      Object.keys(this.cache).forEach(key => {
        const creators = this.cache[key];
        const creatorIndex = creators.findIndex(c => c.id === creatorId);
        if (creatorIndex !== -1) {
          creators[creatorIndex] = {
            ...creators[creatorIndex],
            displayName
          };
        }
      });
    } catch (error) {
      console.error('Failed to update creator display name:', error);
      throw error;
    }
  }

  private isCacheValid(key: string): boolean {
    const lastFetch = this.lastFetch[key];
    const now = Date.now();
    return !!(lastFetch && this.cache[key] && (now - lastFetch) < this.CACHE_DURATION);
  }

  private updateCache(key: string, data: CreatorAvatarData[]): void {
    this.cache[key] = data;
    this.lastFetch[key] = Date.now();
  }
}

// Export singleton instance
export const creatorProfileService = new CreatorProfileService();

// Export types for use in components
export type { CreatorAvatarData };