import { useState, useCallback, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PaginatedReelsParams {
  creatorUsername: string;
  assignedPages: any[];
  pageSize?: number;
}

interface ReelContent {
  id: number;
  content_url: string;
  content_type: string;
  description: string;
  created_at: string;
  page_id: number;
  sort_order: number;
}

interface PaginatedResponse {
  content: ReelContent[];
  nextCursor: number | null;
  hasMore: boolean;
  total: number;
}

export function usePaginatedReels({ 
  creatorUsername, 
  assignedPages, 
  pageSize = 2 
}: PaginatedReelsParams) {
  const [allLoadedContent, setAllLoadedContent] = useState<ReelContent[]>([]);
  const lastFetchedCursorRef = useRef<number | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['paginated-reels', creatorUsername, assignedPages?.map(p => p.id).sort()],
    queryFn: async ({ pageParam = 0 }): Promise<PaginatedResponse> => {
      if (!assignedPages || assignedPages.length === 0) {
        return { content: [], nextCursor: null, hasMore: false, total: 0 };
      }

      const pageIds = assignedPages.map(p => p.id).join(',');
      const response = await apiRequest('GET', `/api/content/paginated-reels?pageIds=${pageIds}&cursor=${pageParam}&limit=${pageSize}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reels: ${response.status}`);
      }

      const result: PaginatedResponse = await response.json();
      
      // Update the accumulated content
      if (pageParam === 0) {
        // First page - replace all content
        setAllLoadedContent(result.content);
      } else {
        // Subsequent pages - append new content
        setAllLoadedContent(prev => [...prev, ...result.content]);
      }
      
      lastFetchedCursorRef.current = result.nextCursor;
      
      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: PaginatedResponse) => lastPage.nextCursor,
    enabled: !!creatorUsername && !!assignedPages && assignedPages.length > 0,
    staleTime: 30000, // 30 seconds to allow for some caching
    retry: 1, // Only retry once to prevent error accumulation
  });

  const loadMoreReels = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const refreshReels = useCallback(() => {
    setAllLoadedContent([]);
    lastFetchedCursorRef.current = null;
    refetch();
  }, [refetch]);

  // Get total count from the latest page
  const totalCount = data?.pages && data.pages.length > 0 
    ? data.pages[data.pages.length - 1]?.total || 0 
    : 0;
  
  return {
    reels: allLoadedContent,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMoreReels: hasNextPage,
    error,
    loadMoreReels,
    refreshReels,
    totalCount,
    loadedCount: allLoadedContent.length,
  };
}