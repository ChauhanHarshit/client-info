import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  FileText, 
  Image, 
  Video,
  ArrowLeft,
  Check,
  X,
  Upload,
  Eye,
  Home,
  Play,
  User,
  Smartphone,
  Search,
  Heart,
  Bookmark,
  Share,
  Info,
  FolderPlus,
  Grid3X3,
  MoreHorizontal,
  RefreshCw
} from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { PageBanner } from "@/components/PageBanner";
import { PageHeaderSkeleton, TabsSkeleton, CardGridSkeleton } from "@/components/ui/skeleton-loader";
import { CreatorAvatar } from "@/components/ui/creator-avatar";

interface InspoPage {
  id: number;
  title: string;
  description: string;
  pageType: 'normal' | 'feed'; // normal = Home tab, feed = Feed tab
  platformType: string; // Required: determines Creator App section placement
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  assignedCreators: number;
  contentCount: number;
  lastUpdated: string | null;
}

interface Creator {
  id: number;
  displayName: string;
  username: string;
  profileImageUrl?: string;
}

interface ContentItem {
  id: number;
  pageId: number;
  title: string;
  description: string;
  instructions: string;
  mediaType: 'image' | 'video';
  fileUrl?: string;        // API returns fileUrl, not imageUrl/videoUrl
  thumbnailUrl?: string;   // API returns thumbnailUrl
  originalPostLink?: string;
  audioLink?: string;
  tags: string[];
  category: string;
}

export default function InspoPagesAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPage, setSelectedPage] = useState<InspoPage | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [contentDialogPageId, setContentDialogPageId] = useState<number | null>(null);
  const [openLibraryPageId, setOpenLibraryPageId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [showPageTypeDialog, setShowPageTypeDialog] = useState(false);
  const [selectedPageType, setSelectedPageType] = useState<'normal' | 'feed'>('feed');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<number[]>([]);
  const [showCreatorSelector, setShowCreatorSelector] = useState(false);
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editUploadedFile, setEditUploadedFile] = useState<File | null>(null);
  const [editUploadPreview, setEditUploadPreview] = useState<string>("");
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  // Engagement stats state
  const [engagementStats, setEngagementStats] = useState<{[key: number]: {likes: number, dislikes: number, total: number}}>({});
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [selectedContentForEngagement, setSelectedContentForEngagement] = useState<{contentId: number, type: 'likes' | 'dislikes'} | null>(null);
  const [engagementDetails, setEngagementDetails] = useState<{likes: any[], dislikes: any[], total: number} | null>(null);
  const [isLoadingEngagement, setIsLoadingEngagement] = useState(false);

  // Multi-content form state
  const [multiContentItems, setMultiContentItems] = useState<Array<{
    id: string;
    title: string;
    description: string;
    instructions: string;
    mediaType: string;
    mediaUrl: string;
    uploadedFile: File | null;
    uploadPreview: string;
    originalPostLink: string;
    audioLink: string;
  }>>([]);
  const [showMultiContentMode, setShowMultiContentMode] = useState(false);
  const [multiContentDragOver, setMultiContentDragOver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('feed-pages');
  

  
  // Check URL parameters to set active tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, []);
  
  // Content Categories state
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<any>(null);
  
  // Page editing state
  const [showEditPageDialog, setShowEditPageDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<InspoPage | null>(null);
  const [editPageForm, setEditPageForm] = useState({
    title: '',
    description: '',
    pageType: 'feed' as 'normal' | 'feed',
    platformType: '',
    contentCategories: [] as number[]
  });
  
  // Page deletion state
  const [showDeletePageDialog, setShowDeletePageDialog] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<InspoPage | null>(null);
  
  // Category deletion state
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [categoriesRefreshKey, setCategoriesRefreshKey] = useState(0);
  
  // Search state for Feed Tab Pages
  const [feedPageSearchTerm, setFeedPageSearchTerm] = useState('');
  
  // Search state for Home Tab Pages
  const [homePageSearchTerm, setHomePageSearchTerm] = useState('');

  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    emoji: '',
    platform: ''
  });
  const queryClient = useQueryClient();
  
  // Page form state
  const [pageForm, setPageForm] = useState({
    title: '',
    description: '',
    pageType: 'feed' as 'normal' | 'feed',
    platformType: ''
  });

  // Unsaved changes detection for create page dialog
  const createPageUnsavedChanges = useUnsavedChanges({
    isOpen: showCreateDialog,
    onClose: () => {
      setShowCreateDialog(false);
      setPageForm({
        title: '',
        description: '',
        pageType: 'feed',
        platformType: ''
      });
    },
    watchFields: pageForm,
    disabled: false
  });

  // Content form state
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    instructions: '',
    mediaType: '',
    category: '',
    tags: '',
    mediaUrl: '',
    originalPostLink: '',
    audioLink: ''
  });

  // Add a refresh counter to force new queries
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Fetch real data from API with performance optimization
  const { data: inspoPages = [], refetch: refetchPages, isLoading: pagesLoading, error: pagesError } = useQuery<InspoPage[]>({
    queryKey: ['/api/inspo-pages', refreshCounter], // Add counter to force new query
    queryFn: async () => {
      console.log('📡 Fetching pages with counter:', refreshCounter);
      // Bypass all caching by using timestamp
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      
      // Add JWT Authorization header if available
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const cacheBuster = `?t=${Date.now()}&counter=${refreshCounter}`;
      const response = await fetch(`/api/inspo-pages${cacheBuster}`, {
        method: 'GET',
        headers,
        credentials: 'include' // CRITICAL: Include cookies for authentication
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📡 Raw API response:', data);
      return Array.isArray(data) ? data : [];
    },
    enabled: true,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache at all
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000
  });



  // Fetch all content for display in Content Library with performance optimization
  const { data: allContent = [] } = useQuery<ContentItem[]>({
    queryKey: ['/api/content/all', inspoPages?.length],
    queryFn: async () => {
      // Fetch content from all pages
      const allPageContent: ContentItem[] = [];
      if (Array.isArray(inspoPages)) {
        for (const page of inspoPages) {
          try {
            const headers: Record<string, string> = {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            };
            
            const jwtToken = localStorage.getItem('creator_jwt_token');
            if (jwtToken) {
              headers['Authorization'] = `Bearer ${jwtToken}`;
            }
            
            const response = await fetch(`/api/inspo-pages/${page.id}/content`, {
              method: 'GET',
              headers,
              credentials: 'include'
            });
            
            if (response.ok) {
              const content = await response.json();
              if (Array.isArray(content)) {
                allPageContent.push(...content);
              }
            }
          } catch (error) {
            console.error(`Failed to fetch content for page ${page.id}:`, error);
          }
        }
      }
      return allPageContent;
    },
    enabled: Array.isArray(inspoPages) && inspoPages.length > 0,
    staleTime: 2 * 60 * 1000, // Fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000
  });



  // Fetch Content Categories with performance optimization
  const { data: contentCategories = [], isLoading: categoriesLoading, refetch: refetchCategories, isFetching: categoriesFetching } = useQuery({
    queryKey: ['/api/content-categories', categoriesRefreshKey],
    queryFn: async () => {
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/content-categories${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch content categories');
      }
      
      const data = await response.json();
      // Ensure we always return an array, even for error responses
      return Array.isArray(data) ? data : [];
    },
    enabled: true,
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 30 * 1000, // Cache for only 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 2,
    retryDelay: 1000
  });

  // Create content category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await fetch('/api/content-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(categoryData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create category');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Force refresh by incrementing the key
      setCategoriesRefreshKey(prev => prev + 1);
      setShowNewCategoryDialog(false);
      setNewCategoryForm({ name: '', emoji: '', platform: '' });
      setSelectedCategoryForEdit(null);
      toast({
        title: "Success",
        description: "Content category created successfully!",
      });
    },
    onError: (error: any) => {
      console.error('Create category error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create content category",
        variant: "destructive",
      });
    }
  });

  // Update content category mutation  
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/content-categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update category');
      }
      
      return response;
    },
    onSuccess: () => {
      // Force refresh by incrementing the key
      setCategoriesRefreshKey(prev => prev + 1);
      setShowNewCategoryDialog(false);
      setNewCategoryForm({ name: '', emoji: '', platform: '' });
      setSelectedCategoryForEdit(null);
      toast({
        title: "Success", 
        description: "Content category updated successfully!",
      });
    },
    onError: (error: any) => {
      console.error('Update category error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update content category",
        variant: "destructive",
      });
    }
  });

  // Delete content category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await fetch(`/api/content-categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete category');
      }
      
      return response;
    },
    onSuccess: async () => {
      // Close dialog
      setShowDeleteCategoryDialog(false);
      setCategoryToDelete(null);
      
      // Force refresh by incrementing the key
      setCategoriesRefreshKey(prev => prev + 1);
      
      toast({
        title: "Success",
        description: "Content category deleted successfully!",
      });
    },
    onError: (error: any) => {
      console.error('Delete category error:', error);
      toast({
        title: "Error", 
        description: error?.message || "Failed to delete content category",
        variant: "destructive",
      });
    }
  });

  // Fetch creators for group assignment
  const { data: creators = [], isLoading: creatorsLoading, error: creatorsError } = useQuery({
    queryKey: ['/api/creators', refreshCounter], // Add counter to bust cache
    queryFn: async () => {
      console.log('📡 Fetching creators with counter:', refreshCounter);
      try {
        // Use direct fetch with cache-busting and proper authentication
        const headers: Record<string, string> = {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
        
        // Add JWT Authorization header if available
        const jwtToken = localStorage.getItem('creator_jwt_token');
        if (jwtToken) {
          headers['Authorization'] = `Bearer ${jwtToken}`;
        }
        
        const cacheBuster = `?t=${Date.now()}&counter=${refreshCounter}`;
        const response = await fetch(`/api/creators${cacheBuster}`, {
          method: 'GET',
          headers,
          credentials: 'include' // CRITICAL: Include cookies for authentication
        });
        
        if (!response.ok) {
          console.error('📡 Creators fetch failed:', response.status, response.statusText);
          throw new Error(`Failed to fetch creators: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📡 Raw creators response:', data);
        // Ensure we always return an array, even for error responses
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('📡 Creators fetch error:', error);
        return []; // Return empty array on error
      }
    },
    enabled: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false
  });
  
  // Log creators query state
  console.log('Creators query state:', { 
    isLoading: creatorsLoading, 
    error: creatorsError,
    data: creators 
  });
  
  // Force creators query to run on mount
  useEffect(() => {
    console.log('📡 Component mounted, triggering creators fetch...');
    // Trigger a refresh to ensure creators are loaded
    setRefreshCounter(prev => prev + 1);
  }, []); // Run only once on mount

  // Library page ID is already declared above

  // Fetch content for selected page (for assign dialog)
  const { data: pageContent = [] } = useQuery<ContentItem[]>({
    queryKey: ['/api/inspo-pages', selectedPage?.id, 'content'],
    enabled: !!selectedPage?.id
  });

  // Fetch content for library popup with explicit queryFn
  const { data: libraryContent = [], isLoading: isLoadingLibrary, refetch: refetchLibraryContent } = useQuery<ContentItem[]>({
    queryKey: [`/api/inspo-pages/${openLibraryPageId}/content`],
    queryFn: async () => {
      if (!openLibraryPageId) return [];
      console.log('Fetching content for page:', openLibraryPageId);
      
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/inspo-pages/${openLibraryPageId}/content`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch library content: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw API response for content:', data);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!openLibraryPageId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: false,
    retry: 1
  });
  
  // Debug logging for content library
  console.log('Library Content Query:', {
    openLibraryPageId,
    isLoadingLibrary,
    libraryContentLength: Array.isArray(libraryContent) ? libraryContent.length : 0,
    libraryContent: libraryContent,
    queryKey: [`/api/inspo-pages/${openLibraryPageId}/content`],
    rawResponse: JSON.stringify(libraryContent)
  });

  // Fetch single content item for editing with fresh data
  const { data: freshEditContent, isLoading: isLoadingEditContent } = useQuery<ContentItem | null>({
    queryKey: [`/api/content/${editingContentId}`],
    queryFn: async () => {
      if (!editingContentId || !openLibraryPageId) return null;
      console.log('Fetching fresh content for editing:', editingContentId);
      
      // Fetch all content for the page
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/inspo-pages/${openLibraryPageId}/content`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }
      
      const allContent = await response.json();
      
      // Find the specific content item
      const content = allContent.find((item: ContentItem) => item.id === editingContentId);
      if (!content) {
        console.error('Content not found:', editingContentId);
        return null;
      }
      
      console.log('Fresh content fetched:', content);
      return content;
    },
    enabled: !!editingContentId && !!openLibraryPageId && showEditDialog,
    staleTime: 0, // Always fetch fresh
    gcTime: 0, // No caching
    refetchOnMount: "always",
    refetchOnWindowFocus: false
  });

  // Load engagement stats for library content
  const { data: libraryEngagementStats, isLoading: isLoadingEngagementStats } = useQuery({
    queryKey: [`/api/admin/library-engagement/${openLibraryPageId}`],
    queryFn: async () => {
      if (!openLibraryPageId) return {};
      console.log('Fetching engagement stats for page:', openLibraryPageId);
      
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/admin/library-engagement/${openLibraryPageId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch engagement stats: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Library engagement stats:', data);
      return data;
    },
    enabled: !!openLibraryPageId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1
  });

  // Load broken video reports for library content error detection
  const { data: libraryErrorReports } = useQuery({
    queryKey: [`/api/broken-video-reports/library/${openLibraryPageId}`],
    queryFn: async () => {
      if (!openLibraryPageId) return [];
      
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch('/api/broken-video-reports', {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video reports: ${response.status}`);
      }
      
      const allReports = await response.json();
      // Filter reports for content in this specific page/library
      return allReports.filter((report: any) => report.pageId === openLibraryPageId);
    },
    enabled: !!openLibraryPageId,
    staleTime: 0,
    refetchOnMount: "always"
  });

  // Create a map of content ID to error report for quick lookup
  const contentErrorMap = (libraryErrorReports || []).reduce((acc: any, report: any) => {
    acc[report.contentId] = report;
    return acc;
  }, {});

  // Update engagement stats when data loads
  useEffect(() => {
    if (libraryEngagementStats && typeof libraryEngagementStats === 'object') {
      setEngagementStats(libraryEngagementStats);
    }
  }, [libraryEngagementStats]);

  // Handle engagement stats click to show creator breakdown
  const handleEngagementClick = async (contentId: number, type: 'likes' | 'dislikes') => {
    setSelectedContentForEngagement({ contentId, type });
    setIsLoadingEngagement(true);
    setShowEngagementModal(true);
    
    try {
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/admin/content-engagement/${contentId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch engagement details: ${response.status}`);
      }
      
      const data = await response.json();
      setEngagementDetails(data);
    } catch (error) {
      console.error('Error fetching engagement details:', error);
      setEngagementDetails(null);
    } finally {
      setIsLoadingEngagement(false);
    }
  };

  // Close engagement modal
  const closeEngagementModal = () => {
    setShowEngagementModal(false);
    setSelectedContentForEngagement(null);
    setEngagementDetails(null);
    setIsLoadingEngagement(false);
  };

  // Removed duplicate creators query - using the cache-busting one above

  // Enhanced debug logging moved to first creators query

  // Use creators data directly - it already has the correct format and includes profileImageUrl
  const availableCreators: Creator[] = Array.isArray(creators) ? creators.filter((creator: any) => creator && creator.id && creator.displayName) : [];

  // Filter creators based on search query  
  const filteredCreators = availableCreators.filter(creator => 
    creator.displayName.toLowerCase().includes(creatorSearchQuery.toLowerCase()) ||
    creator.username.toLowerCase().includes(creatorSearchQuery.toLowerCase())
  );

  // Get selected creators for summary display
  const selectedCreators = availableCreators.filter(creator => 
    selectedCreatorIds.includes(creator.id)
  );

  // Debug logging to troubleshoot creator assignment issue
  console.log('Creator assignment debug:', {
    creatorsDataLength: creators?.length || 0,
    creatorsData: creators,
    availableCreatorsLength: availableCreators?.length || 0,
    availableCreators: availableCreators,
    selectedCreatorIds: selectedCreatorIds,
    showCreateDialog: showCreateDialog
  });

  // Fetch assigned creators for the selected page
  const { data: assignedCreators = [], isLoading: isLoadingAssignments } = useQuery<number[]>({
    queryKey: [`/api/inspo-pages/${selectedPage?.id}/assignments`],
    queryFn: async () => {
      if (!selectedPage?.id) return [];
      console.log(`Fetching assignments for page ${selectedPage.id}`);
      const url = `/api/inspo-pages/${selectedPage.id}/assignments`;
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch assignments: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received assignments data:`, data);
      return data;
    },
    enabled: !!selectedPage?.id,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Sync selected creators when assignments data is loaded
  useEffect(() => {
    if (selectedPage?.id && !isLoadingAssignments && Array.isArray(assignedCreators)) {

      setSelectedCreatorIds([...assignedCreators]);
    }
  }, [selectedPage?.id, assignedCreators, isLoadingAssignments]);

  // Reset creator selection when create dialog opens
  useEffect(() => {
    if (showCreateDialog) {
      setSelectedCreatorIds([]);
    }
  }, [showCreateDialog]);

  // Cleanup URL objects on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (uploadPreview) {
        URL.revokeObjectURL(uploadPreview);
      }
      if (editUploadPreview) {
        URL.revokeObjectURL(editUploadPreview);
      }
      // Clean up any multi-content preview URLs
      multiContentItems.forEach(item => {
        if (item.uploadPreview) {
          URL.revokeObjectURL(item.uploadPreview);
        }
      });
    };
  }, []);  // Empty dependency array for unmount only

  const resetPageForm = () => {
    setPageForm({
      title: '',
      description: '',
      pageType: 'feed',
      platformType: ''
    });
  };

  const createPageMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Mutation function called with data:', data);
      try {
        const response = await fetch('/api/inspo-pages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        
        // Check if response is ok before parsing JSON
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, errorText);
          
          // Handle authentication errors specifically
          if (response.status === 401) {
            throw new Error('Your session has expired. Please refresh the page and log in again.');
          }
          
          throw new Error(errorText || `HTTP ${response.status} error`);
        }
        
        const newPage = await response.json();
        console.log('Page created successfully:', newPage);
        
        return newPage;
      } catch (error) {
        console.error('Create page error:', error);
        throw error;
      }
    },
    onSuccess: async (newPage) => {
      console.log('Create page mutation success - starting cache invalidation...');
      console.log('New page created:', newPage);
      
      // CRITICAL FIX: Force complete cache removal and immediate server refetch
      // 1. Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey: ['/api/inspo-pages'] });
      
      // 2. Set the data to undefined to bypass staleTime
      queryClient.setQueryData(['/api/inspo-pages'], undefined);
      
      // 3. Remove cached data completely - Admin side
      queryClient.removeQueries({ queryKey: ['/api/inspo-pages'] });
      queryClient.removeQueries({ queryKey: ['/api/content/all'] });
      
      // 4. IMPORTANT: Invalidate creator-specific caches for assigned creators
      if (selectedCreatorIds && selectedCreatorIds.length > 0) {
        console.log('Invalidating creator caches for:', selectedCreatorIds);
        
        // Get creator usernames for the selected IDs
        const selectedCreatorsList = availableCreators.filter(c => selectedCreatorIds.includes(c.id));
        
        for (const creator of selectedCreatorsList) {
          // Invalidate assigned pages cache for each creator
          const creatorPagesCacheKey = [`/api/creator/${creator.username}/assigned-pages`];
          console.log('Invalidating creator cache:', creatorPagesCacheKey);
          queryClient.removeQueries({ queryKey: creatorPagesCacheKey });
          queryClient.invalidateQueries({ queryKey: creatorPagesCacheKey });
          
          // Also invalidate feed content cache
          const creatorFeedCacheKey = [`/api/creator/${creator.username}/feed-content`];
          queryClient.removeQueries({ queryKey: creatorFeedCacheKey });
          queryClient.invalidateQueries({ queryKey: creatorFeedCacheKey });
        }
      }
      
      // 5. Use the refetchPages function to force server fetch
      await refetchPages();
      
      console.log('Cache invalidation and refetch completed');
      
      // CRITICAL: Increment refresh counter to force new query
      setRefreshCounter(prev => prev + 1);
      
      // Reset UI state
      setShowCreateDialog(false);
      setShowPageTypeDialog(false);
      setSelectedCreatorIds([]);
      
      // Reset form
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) form.reset();
      
      console.log('UI state reset completed - page should now be visible in table');
      
      toast({
        title: "Success",
        description: `Page "${newPage.title}" created successfully!`,
      });
    },
    onError: (error: any) => {
      console.error('Create page mutation failed:', error);
      
      // Show user-friendly error message
      toast({
        title: "Error",
        description: error.message || "Failed to create page. Please try again.",
        variant: "destructive",
      });
      
      // If authentication error, suggest refresh
      if (error.message?.includes('session has expired')) {
        setTimeout(() => {
          toast({
            title: "Authentication Required",
            description: "Please refresh the page to continue.",
            variant: "destructive",
          });
        }, 100);
      }
    }
  });

  const assignCreatorsMutation = useMutation({
    mutationFn: async ({ pageId, creatorIds }: { pageId: number; creatorIds: number[] }) => {
      console.log('Assignment mutation called with:', { pageId, creatorIds });
      const response = await fetch(`/api/inspo-pages/${pageId}/assignments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({ assignedCreators: creatorIds })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign creators');
      }
      
      return response;
    },
    onSuccess: async (_, { creatorIds }) => {
      console.log('✅ ASSIGN CREATORS: Assignment mutation successful');
      
      // CRITICAL FIX: Force complete cache removal and immediate server refetch
      // 1. Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey: ['/api/inspo-pages'] });
      
      // 2. Set the data to undefined to bypass staleTime
      queryClient.setQueryData(['/api/inspo-pages'], undefined);
      
      // 3. Remove cached data completely
      queryClient.removeQueries({ queryKey: ['/api/inspo-pages'] });
      queryClient.removeQueries({ queryKey: ['/api/content/all'] });
      queryClient.removeQueries({ queryKey: [`/api/inspo-pages/${selectedPage?.id}/assignments`] });
      
      // 4. IMPORTANT: Invalidate creator-specific caches for assigned creators
      if (creatorIds && creatorIds.length > 0) {
        console.log('Invalidating creator caches for assigned creators:', creatorIds);
        
        // Get creator usernames for the selected IDs
        const assignedCreatorsList = availableCreators.filter(c => creatorIds.includes(c.id));
        
        for (const creator of assignedCreatorsList) {
          // Invalidate assigned pages cache for each creator
          const creatorPagesCacheKey = [`/api/creator/${creator.username}/assigned-pages`];
          console.log('Invalidating creator cache:', creatorPagesCacheKey);
          queryClient.removeQueries({ queryKey: creatorPagesCacheKey });
          queryClient.invalidateQueries({ queryKey: creatorPagesCacheKey });
          
          // Also invalidate feed content cache
          const creatorFeedCacheKey = [`/api/creator/${creator.username}/feed-content`];
          queryClient.removeQueries({ queryKey: creatorFeedCacheKey });
          queryClient.invalidateQueries({ queryKey: creatorFeedCacheKey });
        }
      }
      
      // 5. Force immediate refetch to get updated data
      await refetchPages();
      
      console.log('Assignment cache invalidation and refetch completed');
      
      // CRITICAL: Increment refresh counter to force new query
      setRefreshCounter(prev => prev + 1);
      
      // Reset UI state
      setShowAssignDialog(false);
      setSelectedCreatorIds([]);
      
      toast({
        title: "Success",
        description: "Creator assignments updated successfully",
      });
    },
    onError: (error) => {
      console.error('Assignment mutation failed:', error);
      toast({
        title: "Error",
        description: "Failed to update creator assignments. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create Content Group mutation - CRITICAL FIX




  const addContentMutation = useMutation({
    mutationFn: async ({ pageId, content, file }: { pageId: number; content: any; file?: File }) => {
      // VALIDATION: Check if video/image content has proper media
      if ((content.mediaType === 'video' || content.mediaType === 'image') && !file && !content.originalPostLink) {
        throw new Error(`${content.mediaType} content requires either a file upload or external URL`);
      }
      
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add content fields
      Object.keys(content).forEach(key => {
        if (content[key] !== undefined && content[key] !== null) {
          formData.append(key, content[key]);
        }
      });
      
      // Add file if present
      if (file) {
        formData.append('file', file);
      }
      
      console.log('Submitting content with FormData:', {
        contentFields: Object.keys(content),
        hasFile: !!file,
        fileName: file?.name,
        mediaType: content.mediaType
      });
      
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/inspo-pages/${pageId}/content`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add content');
      }
      
      return response;
    },

    onSuccess: async (response, { pageId }) => {
      console.log('Content added successfully, response:', response);
      console.log('Invalidating caches for pageId:', pageId);
      console.log('Current openLibraryPageId:', openLibraryPageId);
      
      // Remove specific cache entries
      queryClient.removeQueries({ queryKey: [`/api/inspo-pages/${pageId}/content`] });
      if (openLibraryPageId === pageId) {
        queryClient.removeQueries({ queryKey: [`/api/inspo-pages/${openLibraryPageId}/content`] });
      }
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['/api/inspo-pages'] });
      await queryClient.refetchQueries({ queryKey: [`/api/inspo-pages/${pageId}/content`] });
      
      // If library is open, force refetch that too
      if (openLibraryPageId === pageId && refetchLibraryContent) {
        await refetchLibraryContent();
      }
      
      setContentDialogPageId(null);
      resetContentForm();
      
      toast({
        title: "Success",
        description: "Content added successfully!",
      });
    },
    onError: (error: any, variables, context: any) => {
      console.error('❌ Add content error:', error);
      
      // Rollback optimistic update
      if (context?.previousContent && context?.pageId) {
        queryClient.setQueryData([`/api/inspo-pages/${context.pageId}/content`], context.previousContent);
      }
      
      // Enhanced error messages for validation failures
      let errorMessage = error?.message || "Failed to add content";
      
      if (errorMessage.includes('requires either a file upload or external URL')) {
        errorMessage = `VALIDATION ERROR: ${error.message}\n\nPlease upload a media file or provide a valid external URL for video/image content.`;
      } else if (errorMessage.includes('Invalid file URL format')) {
        errorMessage = `VALIDATION ERROR: ${error.message}\n\nOnly uploaded files or valid http/https URLs are allowed.`;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const deleteContentMutation = useMutation({
    mutationFn: ({ pageId, contentId }: { pageId: number; contentId: number }) =>
      fetch(`/api/inspo-pages/${pageId}/content/${contentId}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      }).then(response => {
        if (!response.ok) {
          throw new Error(`Failed to delete content: ${response.status}`);
        }
        return response;
      }),
    onSuccess: async (response, { pageId }) => {
      console.log('Content deleted successfully');
      
      // Remove cache and force refetch for both the page and library queries
      queryClient.removeQueries({ queryKey: [`/api/inspo-pages/${pageId}/content`] });
      queryClient.removeQueries({ queryKey: [`/api/inspo-pages/${openLibraryPageId}/content`] });
      await queryClient.refetchQueries({ queryKey: ['/api/inspo-pages'] });
      
      if (refetchLibraryContent) {
        await refetchLibraryContent();
      }
      
      toast({
        title: "Success",
        description: "Content deleted successfully!",
      });
    },
    onError: (error) => {
      console.error('Error deleting content:', error);
      toast({
        title: "Error",
        description: "Failed to delete content. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Edit content mutation with instant feedback
  const editContentMutation = useMutation({
    mutationFn: async ({ pageId, contentId, formData }: { pageId: number; contentId: number; formData: FormData }) => {
      console.log('🔧 EDIT CONTENT: Submitting direct update to backend');
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/inspo-pages/${pageId}/content/${contentId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update content');
      }
      
      const updatedContent = await response.json();
      return { updatedContent, pageId };
    },
    onSuccess: async ({ updatedContent, pageId }) => {
      console.log('✅ EDIT CONTENT: Content updated successfully', updatedContent);
      
      // Update the cache directly with the new data
      queryClient.setQueryData([`/api/inspo-pages/${pageId}/content`], (oldData: ContentItem[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(item => item.id === updatedContent.id ? updatedContent : item);
      });
      
      // Also update the library cache if it's the same page
      if (openLibraryPageId === pageId) {
        queryClient.setQueryData([`/api/inspo-pages/${openLibraryPageId}/content`], (oldData: ContentItem[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(item => item.id === updatedContent.id ? updatedContent : item);
        });
      }
      
      // Invalidate and refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey: [`/api/inspo-pages/${pageId}/content`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/inspo-pages'] });
      
      // Clean up state
      setShowEditDialog(false);
      setEditingContent(null);
      setEditUploadedFile(null);
      setEditUploadPreview('');
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
      
      toast({
        title: "Success",
        description: "Content updated successfully!",
      });
    },
    onError: (error) => {
      console.error('❌ EDIT CONTENT: Update failed:', error);
      toast({
        title: "Error", 
        description: "Failed to update content. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateContentMutation = useMutation({
    mutationFn: ({ pageId, contentId, content }: { pageId: number; contentId: number; content: any }) =>
      fetch(`/api/inspo-pages/${pageId}/content/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(content)
      }).then(response => {
        if (!response.ok) {
          throw new Error(`Failed to update content: ${response.status}`);
        }
        return response;
      }),
    onSuccess: (_, { pageId }) => {
      // Invalidate all related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/inspo-pages'] });
      queryClient.invalidateQueries({ queryKey: [`/api/inspo-pages/${pageId}/content`] });
      queryClient.invalidateQueries({ queryKey: ['/api/inspo-pages', pageId, 'content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content/all'] });
      queryClient.refetchQueries({ queryKey: [`/api/inspo-pages/${openLibraryPageId}/content`] });
      setShowEditDialog(false);
      setEditingContent(null);
      setEditUploadedFile(null);
      setEditUploadPreview("");
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
    },
  });

  // Delete Feed Tab Page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (pageId: number) => {
      console.log('🗑️ DELETE PAGE: Deleting page ID:', pageId);
      const response = await fetch(`/api/inspo-pages/${pageId}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete page: ${response.status}`);
      }
      return pageId; // Return the pageId so we can use it in onSuccess
    },
    onSuccess: async (deletedPageId) => {
      console.log('✅ DELETE PAGE: Page deleted successfully, ID:', deletedPageId);
      
      // Close dialog immediately
      setShowDeletePageDialog(false);
      setPageToDelete(null);
      
      // CRITICAL FIX: Use the same approach as create/update - force complete cache removal
      // 1. Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey: ['/api/inspo-pages'] });
      
      // 2. Set the data to undefined to bypass staleTime completely
      queryClient.setQueryData(['/api/inspo-pages'], undefined);
      
      // 3. Remove cached data completely
      queryClient.removeQueries({ queryKey: ['/api/inspo-pages'] });
      queryClient.removeQueries({ queryKey: ['/api/content/all'] });
      queryClient.removeQueries({ queryKey: [`/api/inspo-pages/${deletedPageId}/content`] });
      
      // 4. Force immediate refetch from server
      await refetchPages();
      
      console.log('Delete cache invalidation and refetch completed');
      
      // CRITICAL: Increment refresh counter to force new query
      setRefreshCounter(prev => prev + 1);
      
      toast({
        title: "Success",
        description: "Feed Tab Page deleted successfully!",
      });
    },
    onError: (error) => {
      console.error('❌ DELETE PAGE: Delete failed:', error);
      toast({
        title: "Error",
        description: "Failed to delete Feed Tab Page. Please try again.",
        variant: "destructive",
      });
    }
  });

  // File upload handlers
  const handleFileSelect = useCallback((file: File) => {
    // Feed Tab content uploads support 500MB in all environments
    const maxSize = 500 * 1024 * 1024; // 500MB for Feed Tab content uploads
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    
    if (file.size > maxSize) {
      alert(`File too large for Feed Tab content upload. File size: ${fileSizeMB}MB, maximum allowed: ${maxSizeMB}MB. Please compress your file or use a smaller file.`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV) file');
      return;
    }

    setUploadedFile(file);
    
    // Clean up existing preview URL before creating new one
    if (uploadPreview) {
      URL.revokeObjectURL(uploadPreview);
    }
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(previewUrl);
    
    // Auto-select media type based on file
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    setContentForm(prev => ({ ...prev, mediaType }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleEditFileSelect = useCallback((file: File) => {
    // Feed Tab content uploads support 500MB in all environments
    const maxSize = 500 * 1024 * 1024; // 500MB for Feed Tab content uploads
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    
    if (file.size > maxSize) {
      alert(`File too large for Feed Tab content upload. File size: ${fileSizeMB}MB, maximum allowed: ${maxSizeMB}MB. Please compress your file or use a smaller file.`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV) file');
      return;
    }

    setEditUploadedFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setEditUploadPreview(previewUrl);
  }, []);

  // Multi-content helper functions
  const addMultiContentItem = () => {
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      description: '',
      instructions: '',
      mediaType: 'image',
      mediaUrl: '',
      uploadedFile: null,
      uploadPreview: '',
      originalPostLink: '',
      audioLink: ''
    };
    setMultiContentItems(prev => [...prev, newItem]);
  };

  const removeMultiContentItem = (id: string) => {
    setMultiContentItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      // Clean up preview URLs for removed items
      const removedItem = prev.find(item => item.id === id);
      if (removedItem?.uploadPreview) {
        URL.revokeObjectURL(removedItem.uploadPreview);
      }
      return updated;
    });
  };

  const updateMultiContentItem = (id: string, updates: Partial<typeof multiContentItems[0]>) => {
    setMultiContentItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const handleMultiContentFileSelect = useCallback((itemId: string, file: File) => {
    // Environment-aware file size limits (same as single content upload)
    // Feed Tab content uploads support 500MB in all environments
    const maxFileSize = 500 * 1024 * 1024; // 500MB for Feed Tab content uploads
    const maxFileSizeLabel = '500MB';
    
    if (file.size > maxFileSize) {
      alert(`File size must be less than ${maxFileSizeLabel} for Feed Tab content upload`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV) file');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Auto-select media type based on file
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    
    updateMultiContentItem(itemId, {
      uploadedFile: file,
      uploadPreview: previewUrl,
      mediaType: mediaType
    });
  }, []);

  const handleMultiContentDrop = useCallback((e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    setMultiContentDragOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleMultiContentFileSelect(itemId, files[0]);
    }
  }, [handleMultiContentFileSelect]);

  const handleMultiContentSubmission = async () => {
    if (!selectedPage || multiContentItems.length === 0) return;

    try {
      // STEP 1: Validate all items first
      for (const item of multiContentItems) {
        if (!item.title.trim()) {
          alert(`Please enter a title for Item ${multiContentItems.indexOf(item) + 1}`);
          return;
        }
        
        if ((item.mediaType === 'video' || item.mediaType === 'image') && !item.uploadedFile && !item.originalPostLink?.trim()) {
          alert(`Item ${multiContentItems.indexOf(item) + 1}: ${item.mediaType} content requires either an uploaded file or a valid external URL`);
          return;
        }
      }

      // STEP 2: Process items for direct upload (FIXED: No pre-upload needed)
      console.log('🔧 MULTI-UPLOAD DEBUG: Processing', multiContentItems.length, 'items for direct upload');

      // STEP 3: Process all content items for direct upload (FIXED)
      const processedItems = [];
      
      for (const item of multiContentItems) {
        // Create individual content data for direct upload to backend
        const contentData = {
          title: item.title,
          description: item.description,
          instructions: item.instructions,
          mediaType: item.mediaType,
          originalPostLink: item.originalPostLink || undefined,
          audioLink: item.audioLink || undefined,
        };
        
        console.log('🔧 MULTI-UPLOAD ITEM:', {
          title: item.title,
          mediaType: item.mediaType,
          hasFile: !!item.uploadedFile,
          fileName: item.uploadedFile?.name
        });
        
        processedItems.push({
          contentData,
          uploadedFile: item.uploadedFile
        });
      }

      // Submit all items in parallel for maximum speed (same as single content upload)
      const uploadPromises = processedItems.map(processedItem => {
        return new Promise<void>((resolve, reject) => {
          addContentMutation.mutate(
            { 
              pageId: selectedPage.id, 
              content: processedItem.contentData,
              file: processedItem.uploadedFile || undefined
            },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      });
      
      // Wait for all uploads to complete simultaneously
      await Promise.all(uploadPromises);

      // Reset form state after successful submission
      setMultiContentItems([]);
      setShowMultiContentMode(false);
      setContentDialogPageId(null);

      console.log(`✅ MULTI-CONTENT SUCCESS: Added ${processedItems.length} content items`);
      console.log('📋 Each item processed using identical single-content workflow:');
      processedItems.forEach((item, index) => {
        const contentData = item.contentData;
        console.log(`  ${index + 1}. Title: "${contentData.title}" | Type: ${contentData.mediaType} | Has File: ${!!item.uploadedFile}`);
      });
      console.log('🔒 Complete individual isolation maintained - no cross-contamination');
      
    } catch (error) {
      console.error('Multi-content submission error:', error);
      alert('Failed to upload one or more content items. Please try again.');
    }
  };

  // REMOVED: uploadFile function - no longer needed as files go directly to content creation endpoint

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Get form values
    const title = (formData.get('title') as string || '').trim();
    const description = (formData.get('description') as string || '').trim();
    const categoryId = pageForm.platformType; // Use state value instead of form data
    
    // Find the selected category to get its platform value
    const selectedCategory = contentCategories.find((cat: any) => cat.platform === categoryId);
    const platformType = selectedCategory?.platform || categoryId;
    
    // Validate required fields
    if (!title) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!description) {
      toast({
        title: "Error", 
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!platformType || platformType.trim() === '') {
      toast({
        title: "Error",
        description: "Please select a content category",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Creating page with data:', {
      title,
      description,
      pageType: selectedPageType,
      platformType,
      assignedCreators: selectedCreatorIds, // Send as array, not length
      selectedCreatorIds: selectedCreatorIds
    });
    
    createPageMutation.mutate({
      title,
      description,
      pageType: selectedPageType,
      platformType,
      assignedCreators: selectedCreatorIds, // FIXED: Send array instead of length
      creatorAssignments: selectedCreatorIds // Include creator assignments
    });
  };

  const handleEditPage = (page: InspoPage) => {
    setEditingPage(page);
    setEditPageForm({
      title: page.title,
      description: page.description,
      pageType: page.pageType,
      platformType: page.platformType || '',
      contentCategories: Array.isArray((page as any).contentCategories) ? (page as any).contentCategories : []
    });
    setShowEditPageDialog(true);
  };

  const handleUpdatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const platformType = formData.get('platformType') as string;
    
    // Validate required platform type
    if (!platformType || platformType.trim() === '') {
      alert('Please select a content platform before saving.');
      return;
    }
    
    console.log('Updating page with data:', {
      id: editingPage.id,
      title,
      description,
      pageType: editPageForm.pageType,
      platformType,
      contentCategories: editPageForm.contentCategories
    });
    
    updatePageMutation.mutate({
      id: editingPage.id,
      title,
      description,
      pageType: editPageForm.pageType,
      platformType,
      contentCategories: editPageForm.contentCategories
    });
  };

  const updatePageMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🔧 UPDATE PAGE: Sending data to backend:', data);
      const response = await fetch(`/api/inspo-pages/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update page');
      }
      console.log('🔧 UPDATE PAGE: Backend response:', response);
      return response;
    },
    onSuccess: async (response, variables) => {
      console.log('✅ UPDATE PAGE: Page updated successfully');
      console.log('Response from backend:', response);
      console.log('Updated page data:', variables);
      
      // NUCLEAR OPTION: Complete cache reset and fresh fetch
      console.log('🚨 NUCLEAR: Starting complete cache reset...');
      
      try {
        // 1. Cancel ALL queries across the entire app
        await queryClient.cancelQueries();
        console.log('🚨 NUCLEAR: Cancelled ALL queries');
        
        // 2. Clear the ENTIRE query cache (nuclear option)
        queryClient.clear();
        console.log('🚨 NUCLEAR: Cleared entire query cache');
        
        // 3. Wait to ensure cache is completely cleared
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 4. Force an immediate fresh fetch with cache bypass
        console.log('🚨 NUCLEAR: Making fresh API request with cache bypass...');
        const freshPages = await queryClient.fetchQuery({
          queryKey: ['/api/inspo-pages'],
          queryFn: async () => {
            const response = await fetch(`/api/inspo-pages?nocache=${Date.now()}`, {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
            if (!response.ok) throw new Error('Failed to fetch fresh pages');
            const result = await response.json();
            console.log('🚨 NUCLEAR: Fresh API response received:', result);
            return result;
          },
          staleTime: 0,
          gcTime: 0
        });
        
        console.log('🚨 NUCLEAR: Fresh pages data:', freshPages);
        console.log('🚨 NUCLEAR: Looking for updated page ID:', variables.id);
        const updatedPage = freshPages.find((p: any) => p.id === variables.id);
        console.log('🚨 NUCLEAR: Updated page data:', updatedPage);
        
        if (updatedPage) {
          console.log('🚨 NUCLEAR: platformType in fresh data:', updatedPage.platformType);
        }
        
        console.log('🚨 NUCLEAR: Cache reset and fresh fetch completed successfully');
        
      } catch (error) {
        console.error('🚨 NUCLEAR: Cache reset failed:', error);
        // Last resort: force page reload
        console.log('🚨 NUCLEAR: FORCING PAGE RELOAD as last resort...');
        window.location.reload();
        return;
      }
      
      // CRITICAL: Increment refresh counter to force new query
      console.log('🚨 NUCLEAR: Incrementing refresh counter to force new query');
      setRefreshCounter(prev => prev + 1);
      
      // Reset UI state
      setShowEditPageDialog(false);
      setEditingPage(null);
      
      toast({
        title: "Success",
        description: "Page updated successfully!",
      });
    },
    onError: (error) => {
      console.error('❌ UPDATE PAGE: Update failed:', error);
      toast({
        title: "Error",
        description: "Failed to update page. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPage) return;
    
    try {
      if (showMultiContentMode) {
        // INSTANT UI UPDATE: Close dialog immediately for multi-content
        setContentDialogPageId(null);
        setMultiContentItems([]);
        setShowMultiContentMode(false);
        
        // Show immediate feedback
        toast({
          title: "Adding content...",
          description: "Processing multiple content items",
        });
        
        // Handle multiple content items in background
        handleMultiContentSubmission();
      } else {
        // CRITICAL VALIDATION: Prevent invalid media content
        if ((contentForm.mediaType === 'video' || contentForm.mediaType === 'image') && !uploadedFile && !contentForm.originalPostLink?.trim()) {
          alert(`${contentForm.mediaType} content requires either an uploaded file or a valid external URL`);
          return;
        }
        
        // CAPTURE FORM DATA BEFORE RESETTING
        const capturedFormData = { ...contentForm };
        const capturedFile = uploadedFile;
        const capturedPageId = selectedPage.id;
        
        // INSTANT UI UPDATE: Close dialog and reset form immediately
        setContentDialogPageId(null);
        resetContentForm();
        
        // Show immediate feedback
        toast({
          title: "Adding content...",
          description: `Adding "${capturedFormData.title}" to page`,
        });
        
        // Handle single content item processing in background
        (async () => {
          try {
            // FIXED: Don't pre-upload file, let the backend handle it directly
            const data = {
              title: capturedFormData.title,
              description: capturedFormData.description,
              instructions: capturedFormData.instructions,
              mediaType: capturedFormData.mediaType,
              originalPostLink: capturedFormData.originalPostLink || undefined,
              audioLink: capturedFormData.audioLink || undefined,
            };
            
            console.log('🔧 UPLOAD DEBUG: Submitting content with file:', {
              title: data.title,
              mediaType: data.mediaType,
              hasFile: !!capturedFile,
              fileName: capturedFile?.name,
              fileSize: capturedFile?.size
            });
            
            // Use mutation with direct file upload - let backend handle everything
            addContentMutation.mutate({ 
              pageId: capturedPageId, 
              content: data,
              file: capturedFile || undefined
            });
          } catch (error) {
            console.error('Background upload error:', error);
            toast({
              title: "Upload failed",
              description: "Failed to upload content. Please try again.",
              variant: "destructive",
            });
          }
        })();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process content. Please try again.",
        variant: "destructive",
      });
      console.error('Upload error:', error);
    }
  };

  const resetContentForm = () => {
    setContentForm({
      title: '',
      description: '',
      instructions: '',
      mediaType: '',
      category: '',
      tags: '',
      mediaUrl: '',
      originalPostLink: '',
      audioLink: ''
    });
    setUploadedFile(null);
    setUploadPreview("");
  };

  // Content Categories handlers

  const handleDeleteCategory = async (categoryId: number) => {
    const category = contentCategories.find((c: any) => c.id === categoryId);
    setCategoryToDelete(category);
    setShowDeleteCategoryDialog(true);
  };



  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryForm.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    
    const categoryData = {
      name: newCategoryForm.name.trim(),
      emoji: newCategoryForm.emoji.trim(),
      platform: newCategoryForm.platform.trim(),
      color: '#3B82F6'
    };
    
    if (selectedCategoryForEdit) {
      updateCategoryMutation.mutate({
        id: selectedCategoryForEdit.id,
        data: categoryData
      });
    } else {
      createCategoryMutation.mutate(categoryData);
    }
  };

  // Show skeleton loading for better perceived performance
  if (pagesLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <TabsSkeleton />
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
          </div>
          <CardGridSkeleton count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspiration Pages"
        description="Manage inspiration pages and content for creators"
        showBackButton={true}
        useBrowserBack={true}
        actions={
          <Button onClick={() => setShowPageTypeDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Page
          </Button>
        }
      />

      {/* Create Page Type Dialog */}
      <Dialog open={showPageTypeDialog} onOpenChange={setShowPageTypeDialog}>
        <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose Page Type</DialogTitle>
                <DialogDescription>
                  Select the type of page you want to create for the creators.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Page Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedPageType === 'normal' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPageType('normal')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Home className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Normal Page</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            Displays on the <strong>Home tab</strong> of the Creator App Layout
                          </p>
                          <div className="text-xs text-gray-500">
                            • Structured content and notes<br />
                            • Business information<br />
                            • Instructions and guidelines
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedPageType === 'feed' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPageType('feed')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Smartphone className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Feed Page</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            Displays on the <strong>Feed tab</strong> with TikTok-style scrolling
                          </p>
                          <div className="text-xs text-gray-500">
                            • Inspirational content feed<br />
                            • Engagement interactions<br />
                            • Video and image content
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowPageTypeDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      setPageForm(prev => ({ ...prev, pageType: selectedPageType }));
                      setShowPageTypeDialog(false);
                      setShowCreateDialog(true);
                    }}
                    className="flex-1"
                  >
                    Continue
                  </Button>
                </div>
              </div>
        </DialogContent>
      </Dialog>

          {/* Create Page Dialog - After Page Type Selection */}
          <Dialog open={showCreateDialog} {...createPageUnsavedChanges.getDialogProps()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Create New {selectedPageType === 'normal' ? 'Normal' : 'Feed'} Page
                </DialogTitle>
                <DialogDescription>
                  {selectedPageType === 'normal' 
                    ? 'This page will appear on the Home tab with structured content and information.'
                    : 'This page will appear on the Feed tab with TikTok-style scrollable content.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePage} className="space-y-4">
                <div>
                  <Label htmlFor="title">Page Title</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder={selectedPageType === 'normal' ? 'Creator Guidelines' : 'Spring Content'} 
                    required 
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    This title will display on the CRM and be shown to assigned creators in their Creator App
                  </p>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder={selectedPageType === 'normal' 
                      ? 'Instructions and guidelines for creators...'
                      : 'Inspirational content for creators to engage with...'
                    }
                    className="min-h-[100px]"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Internal CRM notes for your team (not visible to creators)
                  </p>
                </div>
                
                {/* Content Category Selection */}
                <div>
                  <Label htmlFor="platformType">Select Content Category *</Label>
                  <Select 
                    name="platformType" 
                    value={contentCategories.find((cat: any) => cat.platform === pageForm.platformType)?.id?.toString() || ''}
                    onValueChange={(categoryId) => {
                      const selectedCategory = contentCategories.find((cat: any) => cat.id.toString() === categoryId);
                      if (selectedCategory) {
                        setPageForm(prev => ({ ...prev, platformType: selectedCategory.platform }));
                      }
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a content category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contentCategories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.emoji} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600 mt-1">
                    This determines where the page appears in the Creator App (OnlyFans section vs Social Media section)
                  </p>
                </div>
                
                {/* Advanced Creator Assignment Section */}
                <div>
                  <Label>Assign to Creators</Label>
                  
                  {/* Selected Creators Summary */}
                  {selectedCreators.length > 0 && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">
                          {selectedCreators.length} creator{selectedCreators.length !== 1 ? 's' : ''} selected
                        </span>
                        <button
                          onClick={() => setSelectedCreatorIds([])}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedCreators.map(creator => (
                          <span
                            key={creator.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {creator.displayName}
                            <button
                              onClick={() => setSelectedCreatorIds(prev => prev.filter(id => id !== creator.id))}
                              className="ml-1 hover:text-blue-600"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Creator Selection Button */}
                  <button
                    type="button"
                    onClick={() => setShowCreatorSelector(true)}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200 text-center"
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {selectedCreators.length > 0 ? 'Modify Creator Selection' : 'Select Creators'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Choose which creators will see this page in their Creator App
                      </span>
                    </div>
                  </button>
                </div>

                {/* Page Type Display */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedPageType === 'normal' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      {selectedPageType === 'normal' ? (
                        <Home className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {selectedPageType === 'normal' ? 'Normal Page' : 'Feed Page'}
                      </p>
                      <p className="text-xs text-gray-600">
                        Will display on the {selectedPageType === 'normal' ? 'Home' : 'Feed'} tab
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateDialog(false);
                      setShowPageTypeDialog(true);
                    }} 
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={createPageMutation.isPending} className="flex-1">
                    Create Page
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed-pages">Feed Tab Pages</TabsTrigger>
          <TabsTrigger value="home-pages">Home Tab Pages</TabsTrigger>
          <TabsTrigger value="categories">Content Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="feed-pages" className="space-y-6">
          {/* Search Bar for Feed Tab Pages */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Feed Tab Pages by name..."
              value={feedPageSearchTerm}
              onChange={(e) => setFeedPageSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Feed Tab Pages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(inspoPages) ? inspoPages
              .filter((page: InspoPage) => page.pageType === 'feed')
              .filter((page: InspoPage) => 
                feedPageSearchTerm === '' || 
                page.title.toLowerCase().includes(feedPageSearchTerm.toLowerCase())
              )
              .map((page: InspoPage) => (
              <Card key={page.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{page.title}</CardTitle>
                      
                      {/* Metadata badges row - positioned below title, above description */}
                      <div className="flex items-center gap-2 mb-3">
                        {page.platformType && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-green-50 text-green-700 border-green-200 px-2 py-0.5"
                          >
                            {page.platformType}
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-0.5 ${
                            page.pageType === 'normal' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {page.pageType === 'normal' ? (
                              <Home className="w-3 h-3" />
                            ) : (
                              <Smartphone className="w-3 h-3" />
                            )}
                            {page.pageType === 'normal' ? 'Home Tab' : 'Feed Tab'}
                          </div>
                        </Badge>
                      </div>
                      
                      {/* Last Updated Timestamp for Feed Tab Pages */}
                      <div className="text-xs text-muted-foreground mb-2">
                        {page.lastUpdated ? (
                          `Last updated: ${new Date(page.lastUpdated).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}`
                        ) : (
                          'No content yet'
                        )}
                      </div>
                      
                      <CardDescription className="text-sm leading-relaxed">
                        {page.description}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4">
                      <Badge variant={page.isActive ? "default" : "secondary"}>
                        {page.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{page.assignedCreators} creators</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{page.contentCount} items</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-3 gap-1">
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs px-2 py-1"
                          onClick={() => handleEditPage(page)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs px-2 py-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setPageToDelete(page);
                            setShowDeletePageDialog(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                        
                        <Dialog open={showAssignDialog && selectedPage?.id === page.id} onOpenChange={(open) => {
                          setShowAssignDialog(open);
                          if (!open) {
                            setSelectedPage(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs px-2 py-1"
                              onClick={async () => {
                                console.log("Setting selected page:", page);
                                setSelectedPage(page);
                                // Reset state when opening new page assignment
                                setSelectedCreatorIds([]);
                                // Force refresh the pages data to ensure accurate creator count
                                await refetchPages();
                              }}
                            >
                              <Users className="w-3 h-3 mr-1" />
                              Assign
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Assign Creators & Groups to "{page.title}"</DialogTitle>
                              <DialogDescription>
                                Select creators and content groups for targeted page access and visibility
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                              {/* Creator Selection */}
                              <div>
                                <h3 className="font-medium mb-3">Select Creators</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {availableCreators.map((creator) => (
                                    <div key={creator.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                      <input
                                        type="checkbox"
                                        id={`creator-${creator.id}`}
                                        className="rounded"
                                        checked={selectedCreatorIds.includes(creator.id)}
                                        onChange={(e) => {
                                          e.stopPropagation(); // Prevent event bubbling
                                          const isChecked = e.target.checked;
                                          console.log(`Checkbox ${creator.id} clicked:`, isChecked);
                                          
                                          setSelectedCreatorIds(prev => {
                                            if (isChecked) {
                                              const newIds = [...prev, creator.id];
                                              console.log('Adding creator, new IDs:', newIds);
                                              return newIds;
                                            } else {
                                              const newIds = prev.filter(id => id !== creator.id);
                                              console.log('Removing creator, new IDs:', newIds);
                                              return newIds;
                                            }
                                          });
                                        }}
                                      />
                                      <CreatorAvatar 
                                        creator={creator}
                                        size="sm"
                                      />
                                      <label htmlFor={`creator-${creator.id}`} className="flex-1 cursor-pointer">
                                        <div className="font-medium">{creator.displayName}</div>
                                        <div className="text-sm text-muted-foreground">@{creator.username}</div>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>



                              
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => {
                                    console.log("Assignment button clicked");
                                    console.log("Selected page:", selectedPage);
                                    console.log("Selected creator IDs (raw):", selectedCreatorIds);
                                    
                                    if (selectedPage && selectedCreatorIds.length > 0) {
                                      // Ensure we only send numbers, filter out any non-numeric values
                                      const validCreatorIds = selectedCreatorIds
                                        .filter(id => typeof id === 'number' && !isNaN(id))
                                        .map(id => Number(id));
                                      
                                      console.log("Valid creator IDs to send:", validCreatorIds);
                                      
                                      if (validCreatorIds.length > 0) {
                                        assignCreatorsMutation.mutate({
                                          pageId: selectedPage.id,
                                          creatorIds: validCreatorIds
                                        });
                                      } else {
                                        console.error("No valid creator IDs found");
                                        alert("Please select valid creators");
                                      }
                                    } else {
                                      setShowAssignDialog(false);
                                    }
                                  }}
                                  disabled={assignCreatorsMutation.isPending}
                                >
                                  {assignCreatorsMutation.isPending ? 'Updating...' : 'Update'}
                                </Button>
                                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <Dialog onOpenChange={(open) => {
                        if (open) {
                          setOpenLibraryPageId(page.id);
                        } else {
                          setOpenLibraryPageId(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full text-xs"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Library
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Content Library - {page.title}</DialogTitle>
                            <DialogDescription>
                              View, edit, and manage all content for this page
                            </DialogDescription>
                          </DialogHeader>
                          
                          {isLoadingLibrary ? (
                            <div className="flex justify-center items-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="text-sm text-gray-600">
                                Content items: {Array.isArray(libraryContent) ? libraryContent.length : 0}
                                {process.env.NODE_ENV === 'development' && (
                                  <div className="text-xs mt-1">
                                    Page ID: {openLibraryPageId}, Loading: {isLoadingLibrary ? 'true' : 'false'}
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Array.isArray(libraryContent) && libraryContent.map((content: ContentItem) => (
                                <Card key={content.id} className="hover:shadow-lg transition-shadow">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      {content.mediaType === 'image' ? (
                                        <Image className="w-4 h-4" />
                                      ) : (
                                        <Video className="w-4 h-4" />
                                      )}
                                      {content.title}
                                    </CardTitle>
                                    {/* Error Label Display */}
                                    {contentErrorMap[content.id] && (
                                      <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-red-50 border border-red-200 rounded-md">
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span className="text-xs text-red-600 font-medium">
                                          ⚠️ Playback Error: {contentErrorMap[content.id].errorMessage}
                                        </span>
                                      </div>
                                    )}
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    {content.fileUrl && content.mediaType === 'image' && content.fileUrl !== '[Large Image Content]' && (
                                      <div className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
                                        <img 
                                          src={content.fileUrl} 
                                          alt={content.title}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    {content.fileUrl && content.mediaType === 'video' && content.fileUrl !== '[Large Video Content]' && (
                                      <div className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
                                        <video 
                                          src={content.fileUrl} 
                                          className="w-full h-full object-cover"
                                          controls={false}
                                          muted
                                          onError={(e) => {
                                            const target = e.target as HTMLVideoElement;
                                            const container = target.parentElement;
                                            if (container) {
                                              container.innerHTML = `
                                                <div class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                                                  <div class="text-center">
                                                    <svg class="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                                    </svg>
                                                    <div class="text-xs">Video Preview</div>
                                                  </div>
                                                </div>
                                              `;
                                            }
                                          }}
                                        >
                                          <source src="${content.fileUrl}" type="video/mp4" />
                                          <source src="${content.fileUrl}" type="video/webm" />
                                          <source src="${content.fileUrl}" type="video/ogg" />
                                        </video>
                                      </div>
                                    )}
                                    <p className="text-xs text-muted-foreground truncate">
                                      {content.description}
                                    </p>
                                    <div className="flex gap-1 mb-2">
                                      <Badge variant="outline" className="text-xs">{content.category}</Badge>
                                      <Badge variant="secondary" className="text-xs">{content.mediaType}</Badge>
                                    </div>
                                    
                                    {/* Engagement Stats */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <button
                                        onClick={() => handleEngagementClick(content.id, 'likes')}
                                        className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-xs"
                                      >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                        </svg>
                                        <span>{engagementStats[content.id]?.likes || 0}</span>
                                      </button>
                                      
                                      <button
                                        onClick={() => handleEngagementClick(content.id, 'dislikes')}
                                        className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors text-xs"
                                      >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                        </svg>
                                        <span>{engagementStats[content.id]?.dislikes || 0}</span>
                                      </button>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="flex-1"
                                        onClick={() => {
                                          // Aggressively clear any previous upload state when opening edit modal
                                          if (editUploadPreview) {
                                            URL.revokeObjectURL(editUploadPreview);
                                          }
                                          setEditUploadedFile(null);
                                          setEditUploadPreview('');
                                          if (editFileInputRef.current) {
                                            editFileInputRef.current.value = '';
                                          }
                                          
                                          setEditingContent(content);
                                          setEditingContentId(content.id);
                                          setShowEditDialog(true);
                                        }}
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Edit
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="flex-1 text-destructive"
                                        onClick={() => {
                                          if (openLibraryPageId && content.id) {
                                            deleteContentMutation.mutate({ 
                                              pageId: openLibraryPageId, 
                                              contentId: content.id 
                                            });
                                          }
                                        }}
                                        disabled={deleteContentMutation.isPending}
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        {deleteContentMutation.isPending ? 'Deleting...' : 'Delete'}
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                              </div>
                              {(!libraryContent || (Array.isArray(libraryContent) && libraryContent.length === 0)) && !isLoadingLibrary && (
                                <div className="col-span-full text-center py-8">
                                  <div className="text-muted-foreground">No content available for this page</div>
                                  <Button 
                                    className="mt-4"
                                    onClick={() => {
                                      setSelectedPage(page);
                                      setContentDialogPageId(page.id);
                                      setOpenLibraryPageId(null);
                                    }}
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add First Content
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setSelectedPage(page);
                          setContentDialogPageId(page.id);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Content
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : null}
          </div>
        </TabsContent>

        <TabsContent value="home-pages" className="space-y-6">
          {/* Search Bar for Home Tab Pages */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Home Tab Pages by name..."
              value={homePageSearchTerm}
              onChange={(e) => setHomePageSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Home Tab Pages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(inspoPages) ? inspoPages
              .filter((page: InspoPage) => page.pageType === 'normal')
              .filter((page: InspoPage) => 
                homePageSearchTerm === '' || 
                page.title.toLowerCase().includes(homePageSearchTerm.toLowerCase())
              )
              .map((page: InspoPage) => (
              <Card key={page.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{page.title}</CardTitle>
                      
                      {/* Metadata badges row - positioned below title, above description */}
                      <div className="flex items-center gap-2 mb-3">
                        {page.platformType && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-green-50 text-green-700 border-green-200 px-2 py-0.5"
                          >
                            {page.platformType}
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-0.5 ${
                            page.pageType === 'normal' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {page.pageType === 'normal' ? (
                              <Home className="w-3 h-3" />
                            ) : (
                              <Smartphone className="w-3 h-3" />
                            )}
                            {page.pageType === 'normal' ? 'Home Tab' : 'Feed Tab'}
                          </div>
                        </Badge>
                      </div>
                      
                      {/* Last Updated Timestamp for Home Tab Pages */}
                      <div className="text-xs text-muted-foreground mb-2">
                        {page.lastUpdated ? (
                          `Last edited: ${new Date(page.lastUpdated).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}`
                        ) : (
                          'Never edited'
                        )}
                      </div>
                      
                      <CardDescription className="text-sm leading-relaxed">
                        {page.description}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4">
                      <Badge variant={page.isActive ? "default" : "secondary"}>
                        {page.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{page.assignedCreators} creators</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{page.contentCount} items</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs px-2 py-1 flex-1"
                          onClick={() => {
                            if (page.pageType === 'feed') {
                              setLocation(`/feed-page-viewer/${page.id}`);
                            } else {
                              setLocation(`/notion-page-editor/${page.id}`);
                            }
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs px-2 py-1 flex-1"
                          onClick={() => handleEditPage(page)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs px-2 py-1 flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setPageToDelete(page);
                            setShowDeletePageDialog(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                        
                        <Dialog open={showAssignDialog && selectedPage?.id === page.id} onOpenChange={(open) => {
                          setShowAssignDialog(open);
                          if (!open) {
                            setSelectedPage(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs px-2 py-1 flex-1"
                              onClick={async () => {
                                console.log("Setting selected page:", page);
                                setSelectedPage(page);
                                // Reset state when opening new page assignment
                                setSelectedCreatorIds([]);
                                // Force refresh the pages data to ensure accurate creator count
                                await refetchPages();
                              }}
                            >
                              <User className="w-3 h-3 mr-1" />
                              Assign
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                            <DialogHeader>
                              <DialogTitle>Assign Creators to "{page.title}"</DialogTitle>
                              <DialogDescription>
                                Select which creators should have access to this inspiration page in their Creator App.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 flex-1 overflow-hidden">
                              {/* Creator Selection */}
                              <div className="flex flex-col h-full">
                                <h3 className="font-medium mb-3">Select Creators</h3>
                                <div className="max-h-[400px] overflow-y-auto border rounded-lg p-2 flex-1">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {availableCreators.map((creator) => (
                                      <div key={creator.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                                        <Checkbox
                                          id={`creator-${creator.id}`}
                                          checked={selectedCreatorIds.includes(creator.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedCreatorIds(prev => [...prev, creator.id]);
                                            } else {
                                              setSelectedCreatorIds(prev => prev.filter(id => id !== creator.id));
                                            }
                                          }}
                                        />
                                        <CreatorAvatar 
                                          creator={creator}
                                          size="sm"
                                        />
                                        <div className="flex-1">
                                          <p className="font-medium text-sm">{creator.displayName}</p>
                                          <p className="text-xs text-gray-500">@{creator.username}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => {
                                    if (selectedPage && selectedCreatorIds.length > 0) {
                                      const validCreatorIds = selectedCreatorIds
                                        .filter(id => typeof id === 'number' && !isNaN(id))
                                        .map(id => Number(id));
                                      
                                      if (validCreatorIds.length > 0) {
                                        assignCreatorsMutation.mutate({
                                          pageId: selectedPage.id,
                                          creatorIds: validCreatorIds
                                        });
                                      }
                                    } else {
                                      setShowAssignDialog(false);
                                    }
                                  }}
                                  disabled={assignCreatorsMutation.isPending}
                                >
                                  {assignCreatorsMutation.isPending ? 'Updating...' : 'Update'}
                                </Button>
                                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      

                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setLocation(`/notion-page-editor/${page.id}`);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit Page
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : null}
          </div>
        </TabsContent>

        {/* Content Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {categoriesLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading content categories...</div>
            </div>
          ) : !contentCategories || !Array.isArray(contentCategories) || contentCategories.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Categories Yet</h3>
              <p className="text-gray-600 mb-4">Create content categories to classify your inspiration pages by platform or type.</p>
              <Button onClick={() => {
                setSelectedCategoryForEdit(null);
                setNewCategoryForm({ name: '', emoji: '', platform: '' });
                setShowNewCategoryDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Content Category
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Content Categories ({Array.isArray(contentCategories) ? contentCategories.length : 0})</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      // Force refresh by incrementing the key
                      setCategoriesRefreshKey(prev => prev + 1);
                    }}
                    title="Refresh categories"
                    disabled={categoriesFetching}
                  >
                    <RefreshCw className={`h-4 w-4 ${categoriesFetching ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button onClick={() => setShowNewCategoryDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Category
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.isArray(contentCategories) && contentCategories.map((category: any) => (
                  <div key={category.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {category.emoji && <span className="text-lg">{category.emoji}</span>}
                        <h4 className="font-medium">{category.name}</h4>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setNewCategoryForm({
                                name: category.name,
                                emoji: category.emoji || '',
                                platform: category.platform || '',
                              });
                              setSelectedCategoryForEdit(category);
                              setShowNewCategoryDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Category
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {category.platform && (
                      <div className="flex items-center space-x-1 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {category.platform}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Created {new Date(category.createdAt).toLocaleDateString()}</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>


      </Tabs>

      {/* Add Content Dialog */}
      <Dialog open={contentDialogPageId !== null} onOpenChange={(open) => {
        if (!open) {
          setContentDialogPageId(null);
          setSelectedPage(null);
        }
      }}>
        <DialogContent className="max-w-xl max-h-[75vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Add Content to "{selectedPage?.title}"</DialogTitle>
            <DialogDescription className="text-sm">
              Create new content for creators to interact with
              {selectedPage && (
                <span className="block mt-1 text-xs text-gray-500">
                  Page Type: {selectedPage.pageType || 'undefined'} | ID: {selectedPage.id}
                </span>
              )}
            </DialogDescription>
            {/* Content Mode Toggle */}
            {selectedPage?.pageType === 'feed' && (
              <div className="flex items-center gap-3 mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium">Content Mode:</div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!showMultiContentMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMultiContentMode(false)}
                  >
                    Single Content
                  </Button>
                  <Button
                    type="button"
                    variant={showMultiContentMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowMultiContentMode(true);
                      if (multiContentItems.length === 0) {
                        addMultiContentItem();
                      }
                    }}
                  >
                    Multiple Content
                  </Button>
                </div>
              </div>
            )}
          </DialogHeader>
          <form onSubmit={handleAddContent} className="space-y-4">
            {selectedPage?.pageType === 'normal' ? (
              /* Normal Page - Use Notion-style Editor */
              <div className="text-center py-8">
                <div className="text-sm text-gray-600 mb-4">
                  Normal Pages use the rich text block editor. Close this dialog and navigate to the page to edit its content.
                </div>
                <Button 
                  type="button"
                  onClick={() => {
                    setContentDialogPageId(null);
                    // Navigate to the page editor for this normal page
                    setLocation(`/notion-page-editor/${selectedPage.id}`);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Open Page Editor
                </Button>
              </div>
            ) : (
              /* Feed Page Content Form - Hide when multi-content mode is active */
              !showMultiContentMode && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="content-title" className="text-sm">
                        Title <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="content-title"
                        value={contentForm.title}
                        onChange={(e) => setContentForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter title"
                        required
                        className="h-8"
                      />
                    </div>

                  </div>
                  <div>
                    <Label htmlFor="content-description" className="text-sm">Description</Label>
                    <Textarea 
                      id="content-description"
                      value={contentForm.description}
                      onChange={(e) => setContentForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                  <div>
                    <Label htmlFor="content-instructions" className="text-sm">Instructions</Label>
                    <Textarea 
                      id="content-instructions"
                      value={contentForm.instructions}
                      onChange={(e) => setContentForm(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder="Optional instructions"
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                  
                  {/* Flashcard Metadata Fields for Feed Pages */}
                  <div className="space-y-3 border-t pt-3">
                    <div className="text-sm font-medium text-muted-foreground">Flashcard Info (Optional)</div>
                    <div>
                      <Label htmlFor="original-post-link" className="text-sm">Original Post Link</Label>
                      <Input 
                        id="original-post-link"
                        value={contentForm.originalPostLink || ''}
                        onChange={(e) => setContentForm(prev => ({ ...prev, originalPostLink: e.target.value }))}
                        placeholder="https://instagram.com/example"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="audio-link" className="text-sm">Audio Link</Label>
                      <Input 
                        id="audio-link"
                        value={contentForm.audioLink || ''}
                        onChange={(e) => setContentForm(prev => ({ ...prev, audioLink: e.target.value }))}
                        placeholder="https://soundcloud.com/example"
                        className="h-8"
                      />
                    </div>

                  </div>
                </>
              )
            )}
            
            {/* Only show media upload for Feed Pages and when NOT in multi-content mode */}
            {selectedPage?.pageType === 'feed' && !showMultiContentMode && (
              <>

                <div>
                  <Label className="text-sm">Media Type</Label>
                  <div className="flex gap-3 mt-1">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio"
                        checked={contentForm.mediaType === 'image'}
                        onChange={() => setContentForm(prev => ({ ...prev, mediaType: 'image' }))}
                        value="image" 
                      />
                      <span className="text-sm">Image</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        checked={contentForm.mediaType === 'video'}
                        onChange={() => setContentForm(prev => ({ ...prev, mediaType: 'video' }))}
                        value="video" 
                      />
                      <span className="text-sm">Video</span>
                    </label>
                  </div>
                  
                  {/* CRITICAL WARNING for video/image content */}
                  {(contentForm.mediaType === 'video' || contentForm.mediaType === 'image') && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center mt-0.5">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800">
                            {contentForm.mediaType} Content Requires Media
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            You must either upload a {contentForm.mediaType} file OR provide a valid external URL. 
                            Content without proper media will not display correctly in Creator Apps.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm">Upload Media</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                    }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      accept="image/*,video/mp4,video/webm,video/ogg"
                      className="hidden"
                    />
                    {uploadedFile ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-green-600">
                          ✓ {uploadedFile.name}
                        </div>
                        {uploadPreview && (
                          <div className="mt-2">
                            {uploadedFile.type.startsWith('image/') ? (
                              <img 
                                src={uploadPreview} 
                                alt="Preview" 
                                className="max-h-32 mx-auto rounded"
                              />
                            ) : (
                              <video 
                                src={uploadPreview} 
                                className="max-h-32 mx-auto rounded"
                                controls
                                onError={(e) => {
                                  const target = e.target as HTMLVideoElement;
                                  const container = target.parentElement;
                                  if (container) {
                                    container.innerHTML = `
                                      <div class="max-h-32 mx-auto rounded bg-gray-200 text-gray-500 flex items-center justify-center">
                                        <div class="text-center p-4">
                                          <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                          </svg>
                                          <div class="text-sm">Video Upload Preview</div>
                                        </div>
                                      </div>
                                    `;
                                  }
                                }}
                              >
                                <source src="${uploadPreview}" type="video/mp4" />
                                <source src="${uploadPreview}" type="video/webm" />
                                <source src="${uploadPreview}" type="video/ogg" />
                              </video>
                            )}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                            setUploadPreview("");
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Drop files here or click to upload</div>
                          <div className="text-xs text-gray-500">Images (JPG, PNG, WebP) and videos (MP4, WebM, OGG)</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content-url" className="text-sm">Or enter media URL</Label>
                  <Input 
                    id="content-url"
                    value={contentForm.mediaUrl}
                    onChange={(e) => setContentForm(prev => ({ ...prev, mediaUrl: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    disabled={!!uploadedFile}
                    className="h-8"
                  />
                </div>
              </>
            )}

            {/* Multi-Content Mode Interface */}
            {selectedPage?.pageType === 'feed' && showMultiContentMode && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Content Items ({multiContentItems.length})</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMultiContentItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {multiContentItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-sm font-medium">Item {index + 1}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMultiContentItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Title */}
                        <div>
                          <Label className="text-xs">
                            Title <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={item.title}
                            onChange={(e) => updateMultiContentItem(item.id, { title: e.target.value })}
                            className="h-8"
                            placeholder="Enter title"
                            required
                          />
                        </div>
                        
                        {/* Description */}
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={item.description}
                            onChange={(e) => updateMultiContentItem(item.id, { description: e.target.value })}
                            className="min-h-[50px] resize-none"
                            placeholder="Optional description"
                          />
                        </div>
                        
                        {/* Instructions */}
                        <div>
                          <Label className="text-xs">Instructions</Label>
                          <Textarea
                            value={item.instructions}
                            onChange={(e) => updateMultiContentItem(item.id, { instructions: e.target.value })}
                            className="min-h-[50px] resize-none"
                            placeholder="Optional instructions"
                          />
                        </div>
                        
                        {/* Original Post Link */}
                        <div>
                          <Label className="text-xs">Original Post Link</Label>
                          <Input
                            value={item.originalPostLink}
                            onChange={(e) => updateMultiContentItem(item.id, { originalPostLink: e.target.value })}
                            className="h-8"
                            placeholder="https://instagram.com/example"
                          />
                        </div>
                        
                        {/* Audio Link */}
                        <div>
                          <Label className="text-xs">Audio Link</Label>
                          <Input
                            value={item.audioLink}
                            onChange={(e) => updateMultiContentItem(item.id, { audioLink: e.target.value })}
                            className="h-8"
                            placeholder="https://soundcloud.com/example"
                          />
                        </div>
                        
                        {/* Media Type */}
                        <div>
                          <Label className="text-xs">Media Type</Label>
                          <div className="flex gap-2 mt-1">
                            <label className="flex items-center gap-1">
                              <input
                                type="radio"
                                checked={item.mediaType === 'image'}
                                onChange={() => updateMultiContentItem(item.id, { mediaType: 'image' })}
                                value="image"
                              />
                              <span className="text-xs">Image</span>
                            </label>
                            <label className="flex items-center gap-1">
                              <input
                                type="radio"
                                checked={item.mediaType === 'video'}
                                onChange={() => updateMultiContentItem(item.id, { mediaType: 'video' })}
                                value="video"
                              />
                              <span className="text-xs">Video</span>
                            </label>
                          </div>
                          
                          {/* CRITICAL WARNING for video/image content */}
                          {(item.mediaType === 'video' || item.mediaType === 'image') && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                              <div className="flex items-start gap-1">
                                <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center mt-0.5">
                                  <span className="text-white text-xs font-bold">!</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-amber-800">
                                    {item.mediaType} requires file or URL
                                  </p>
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    Upload a file OR provide external URL
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* File Upload */}
                        <div>
                          <Label className="text-xs">Upload Media</Label>
                          <div
                            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                              multiContentDragOver === item.id ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setMultiContentDragOver(item.id);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              setMultiContentDragOver(null);
                            }}
                            onDrop={(e) => handleMultiContentDrop(e, item.id)}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*,video/mp4,video/webm,video/ogg';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleMultiContentFileSelect(item.id, file);
                              };
                              input.click();
                            }}
                          >
                            {item.uploadedFile ? (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-green-600">
                                  ✓ {item.uploadedFile.name}
                                </div>
                                {item.uploadPreview && (
                                  <div className="mt-1">
                                    {item.uploadedFile.type.startsWith('image/') ? (
                                      <img
                                        src={item.uploadPreview}
                                        alt="Preview"
                                        className="max-h-20 mx-auto rounded"
                                      />
                                    ) : (
                                      <video
                                        src={item.uploadPreview}
                                        className="max-h-20 mx-auto rounded"
                                        controls
                                      />
                                    )}
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.uploadPreview) {
                                      URL.revokeObjectURL(item.uploadPreview);
                                    }
                                    updateMultiContentItem(item.id, {
                                      uploadedFile: null,
                                      uploadPreview: ''
                                    });
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Upload className="w-6 h-6 mx-auto text-gray-400" />
                                <div>
                                  <div className="text-xs font-medium">Drop files here or click</div>
                                  <div className="text-xs text-gray-500">Images & videos</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Media URL Alternative */}
                        <div>
                          <Label className="text-xs">Or enter media URL</Label>
                          <Input
                            value={item.mediaUrl}
                            onChange={(e) => updateMultiContentItem(item.id, { mediaUrl: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                            disabled={!!item.uploadedFile}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={addContentMutation.isPending}
              >
                {showMultiContentMode ? `Add ${multiContentItems.length} Items` : 'Add Content'}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setContentDialogPageId(null);
                setShowMultiContentMode(false);
                setMultiContentItems([]);
              }}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Content Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!open) {
          // Aggressively clear upload state when closing dialog
          if (editUploadPreview) {
            URL.revokeObjectURL(editUploadPreview);
          }
          setEditUploadedFile(null);
          setEditUploadPreview('');
          if (editFileInputRef.current) {
            editFileInputRef.current.value = '';
          }
          // Clear editing content ID to ensure fresh data on next open
          setEditingContentId(null);
        }
        setShowEditDialog(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
          </DialogHeader>
          
          {isLoadingEditContent ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : freshEditContent ? (
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                
                // INSTANT FEEDBACK: Close dialog immediately
                setShowEditDialog(false);
                
                // Show instant updating toast
                toast({
                  title: "Updating Content",
                  description: "Processing your changes...",
                });
                
                if (editingContent && openLibraryPageId) {
                  const formElement = e.currentTarget;
                  
                  // Create FormData for direct upload (same as single/multi content upload)
                  const formData = new FormData();
                  
                  // Get form values using FormData
                  const formDataForValues = new FormData(formElement);
                  const title = formDataForValues.get('title')?.toString() || '';
                  const description = formDataForValues.get('description')?.toString() || '';
                  const instructions = formDataForValues.get('instructions')?.toString() || '';
                  const originalPostLink = formDataForValues.get('originalPostLink')?.toString() || '';
                  const audioLink = formDataForValues.get('audioLink')?.toString() || '';
                  
                  // Add form fields (excluding instructions since database doesn't have this column)
                  formData.append('title', title);
                  formData.append('description', description);
                  // Note: instructions field removed due to database schema compatibility
                  formData.append('originalPostLink', originalPostLink);
                  formData.append('audioLink', audioLink);
                  formData.append('contentType', editingContent.contentType || 'video');
                  
                  // Add existing file URL if no new file uploaded (backend expects 'fileUrl' field)
                  if (!editUploadedFile && editingContent.fileUrl) {
                    formData.append('fileUrl', editingContent.fileUrl);
                  }
                  
                  // Add new file if uploaded
                  if (editUploadedFile) {
                    formData.append('file', editUploadedFile);
                    const mediaType = editUploadedFile.type.startsWith('image/') ? 'image' : 'video';
                    formData.append('contentType', mediaType);
                  }
                  
                  console.log('🔧 EDIT CONTENT: Submitting FormData with fields:', {
                    title,
                    description,
                    instructions,
                    originalPostLink,
                    audioLink,
                    hasNewFile: !!editUploadedFile,
                    fileName: editUploadedFile?.name,
                    existingFileUrl: editingContent.fileUrl
                  });
                  
                  // Submit using direct upload approach
                  editContentMutation.mutate({
                    pageId: openLibraryPageId,
                    contentId: editingContent.id,
                    formData: formData
                  });
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-sm">Title</Label>
                <Input 
                  id="edit-title"
                  name="title"
                  defaultValue={freshEditContent.title}
                  placeholder="Content title"
                  className="h-8"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm">Description</Label>
                <Textarea 
                  id="edit-description"
                  name="description"
                  defaultValue={freshEditContent.description}
                  placeholder="Content description"
                  className="min-h-[60px]"
                />
              </div>

              {/* Instructions Field */}
              <div className="space-y-2">
                <Label htmlFor="edit-instructions" className="text-sm">Instructions</Label>
                <Textarea 
                  id="edit-instructions"
                  name="instructions"
                  defaultValue={freshEditContent.instructions}
                  placeholder="Optional instructions for creators"
                  className="min-h-[60px]"
                />
              </div>

              {/* Original Post Link Field */}
              <div className="space-y-2">
                <Label htmlFor="edit-original-post-link" className="text-sm">Original Post Link</Label>
                <Input 
                  id="edit-original-post-link"
                  name="originalPostLink"
                  defaultValue={freshEditContent.originalPostLink}
                  placeholder="https://instagram.com/p/example"
                  className="h-8"
                />
              </div>

              {/* Audio Link Field */}
              <div className="space-y-2">
                <Label htmlFor="edit-audio-link" className="text-sm">Audio Link</Label>
                <Input 
                  id="edit-audio-link"
                  name="audioLink"
                  defaultValue={freshEditContent.audioLink}
                  placeholder="https://soundcloud.com/example"
                  className="h-8"
                />
              </div>

              {/* Current Media Preview */}
              {freshEditContent.fileUrl && (
                <div className="space-y-2">
                  <Label className="text-sm">Current Media</Label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    {(() => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(freshEditContent.fileUrl);
                      return isImage ? (
                        <img 
                          src={freshEditContent.fileUrl} 
                          alt="Current content"
                          className="max-w-32 max-h-32 object-cover rounded"
                        />
                      ) : (
                        <video 
                          src={freshEditContent.fileUrl} 
                          className="max-w-32 max-h-32 object-cover rounded"
                          controls
                        />
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Upload New Media */}
              <div className="space-y-2">
                <Label className="text-sm">Replace Media (Optional)</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
                    isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const file = files[0];
                      setEditUploadedFile(file);
                      const previewUrl = URL.createObjectURL(file);
                      setEditUploadPreview(previewUrl);
                    }
                  }}
                  onClick={() => document.getElementById('edit-file-input')?.click()}
                >
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Click to select new file</p>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      id="edit-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditUploadedFile(file);
                          const previewUrl = URL.createObjectURL(file);
                          setEditUploadPreview(previewUrl);
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('edit-file-input')?.click();
                      }}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>
                {editUploadPreview && (
                  <div className="mt-4">
                    <Label className="text-sm">New Media Preview</Label>
                    <div className="mt-2">
                      {editUploadedFile?.type.startsWith('image/') ? (
                        <img 
                          src={editUploadPreview} 
                          alt="New upload preview"
                          className="max-w-32 max-h-32 object-cover rounded border"
                        />
                      ) : (
                        <video 
                          src={editUploadPreview} 
                          className="max-w-32 max-h-32 object-cover rounded border"
                          controls
                        />
                      )}
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          if (editUploadPreview) {
                            URL.revokeObjectURL(editUploadPreview);
                          }
                          setEditUploadedFile(null);
                          setEditUploadPreview('');
                          if (editFileInputRef.current) {
                            editFileInputRef.current.value = '';
                          }
                        }}
                      >
                        Remove New File
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={editContentMutation.isPending}>
                  {editContentMutation.isPending ? 'Updating...' : 'Update Content'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Creator Selector Dialog */}
      <Dialog open={showCreatorSelector} onOpenChange={setShowCreatorSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Creators</DialogTitle>
            <DialogDescription>
              Choose which creators will see this page in their Creator App
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search creators..."
                value={creatorSearchQuery}
                onChange={(e) => setCreatorSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Creator list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredCreators.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {creators.length === 0 ? 'No creators available' : 'No creators match your search'}
                </div>
              ) : (
                filteredCreators.map((creator) => (
                  <div key={creator.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={`creator-select-${creator.id}`}
                      checked={selectedCreatorIds.includes(creator.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCreatorIds(prev => [...prev, creator.id]);
                        } else {
                          setSelectedCreatorIds(prev => prev.filter(id => id !== creator.id));
                        }
                      }}
                    />
                    <Label htmlFor={`creator-select-${creator.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">{creator.displayName}</div>
                      <div className="text-sm text-gray-500">@{creator.username}</div>
                    </Label>
                  </div>
                ))
              )}
            </div>

            {/* Selected count */}
            {selectedCreatorIds.length > 0 && (
              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                {selectedCreatorIds.length} creator{selectedCreatorIds.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={() => {
                setShowCreatorSelector(false);
                setCreatorSearchQuery('');
              }}
              className="flex-1"
            >
              Done
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedCreatorIds([]);
                setShowCreatorSelector(false);
                setCreatorSearchQuery('');
              }}
              className="flex-1"
            >
              Clear & Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Page Dialog */}
      <Dialog open={showEditPageDialog} onOpenChange={setShowEditPageDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Inspiration Page</DialogTitle>
            <DialogDescription>
              Update the title, description, and platform settings for this page.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePage} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-page-title">Page Title *</Label>
              <Input
                id="edit-page-title"
                name="title"
                value={editPageForm.title}
                onChange={(e) => setEditPageForm({ ...editPageForm, title: e.target.value })}
                placeholder="e.g. Instagram Reels, OnlyFans Content"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-page-description">Description</Label>
              <Textarea
                id="edit-page-description"
                name="description"
                value={editPageForm.description}
                onChange={(e) => setEditPageForm({ ...editPageForm, description: e.target.value })}
                placeholder="Describe what this page is for..."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-page-type">Page Type</Label>
              <Select 
                value={editPageForm.pageType} 
                onValueChange={(value: 'normal' | 'feed') => setEditPageForm({ ...editPageForm, pageType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select page type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed Page</SelectItem>
                  <SelectItem value="normal">Normal Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-platform-type">Select Content Category *</Label>
              <Select 
                value={contentCategories.find((cat: any) => cat.platform === editPageForm.platformType)?.id?.toString() || ''}
                onValueChange={(categoryId) => {
                  const selectedCategory = contentCategories.find((cat: any) => cat.id.toString() === categoryId);
                  if (selectedCategory) {
                    setEditPageForm({ ...editPageForm, platformType: selectedCategory.platform });
                  }
                }}
                name="platformType"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a content category..." />
                </SelectTrigger>
                <SelectContent>
                  {contentCategories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.emoji} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600 mt-1">
                This determines where the page appears in the Creator App (OnlyFans section vs Social Media section)
              </p>
            </div>

            {/* Banner Management - Only for Normal/Home Tab Pages */}
            {editPageForm.pageType === 'normal' && (
              <div className="space-y-2 border-t pt-4">
                <Label className="text-sm font-medium">Page Banner (Home Tab Only)</Label>
                <PageBanner 
                  pageId={editingPage?.id || 0} 
                  pageName={editPageForm.title || 'Page'}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">
                  This banner will appear at the top of the page when creators view it.
                </p>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowEditPageDialog(false);
                  setEditingPage(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1"
                disabled={updatePageMutation.isPending}
              >
                {updatePageMutation.isPending ? 'Updating...' : 'Update Page'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCategoryForEdit ? 'Edit Content Category' : 'Create New Content Category'}
            </DialogTitle>
            <DialogDescription>
              {selectedCategoryForEdit 
                ? 'Update the content category details below.' 
                : 'Create a new category to organize your inspiration pages by platform or content type.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={newCategoryForm.name}
                onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                placeholder="e.g. Instagram Posts, OnlyFans Content, TikTok Videos"
              />
            </div>
            <div>
              <Label htmlFor="category-emoji">Emoji/Icon</Label>
              <Input
                id="category-emoji"
                value={newCategoryForm.emoji}
                onChange={(e) => setNewCategoryForm({ ...newCategoryForm, emoji: e.target.value })}
                placeholder="📷 💎 🎬"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="category-platform">Platform Type *</Label>
              <Select 
                value={newCategoryForm.platform} 
                onValueChange={(value) => setNewCategoryForm({...newCategoryForm, platform: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OnlyFans">OnlyFans (OnlyFans Content Tab)</SelectItem>
                  <SelectItem value="Instagram">Instagram (Social Media Content Tab)</SelectItem>
                  <SelectItem value="TikTok">TikTok (Social Media Content Tab)</SelectItem>
                  <SelectItem value="Twitter">Twitter (Social Media Content Tab)</SelectItem>
                  <SelectItem value="YouTube">YouTube (Social Media Content Tab)</SelectItem>
                  <SelectItem value="Snapchat">Snapchat (Social Media Content Tab)</SelectItem>
                  <SelectItem value="OFTV">OFTV (OnlyFans Content Tab)</SelectItem>
                  <SelectItem value="General">General (Social Media Content Tab)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                This determines which tab the category appears in on /creator-app-layout
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setShowNewCategoryDialog(false);
                setSelectedCategoryForEdit(null);
                setNewCategoryForm({ name: '', emoji: '', platform: '' });
              }}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                if (!newCategoryForm.name.trim()) return;
                
                if (selectedCategoryForEdit) {
                  updateCategoryMutation.mutate({
                    id: selectedCategoryForEdit.id,
                    data: {
                      name: newCategoryForm.name,
                      emoji: newCategoryForm.emoji,
                      platform: newCategoryForm.platform,
                    }
                  });
                } else {
                  createCategoryMutation.mutate({
                    name: newCategoryForm.name,
                    emoji: newCategoryForm.emoji,
                    platform: newCategoryForm.platform,
                  });
                }
              }}
              disabled={!newCategoryForm.name.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending || updateCategoryMutation.isPending 
                ? 'Saving...' 
                : selectedCategoryForEdit 
                  ? 'Update Category' 
                  : 'Create Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setShowDeleteCategoryDialog(false);
                setCategoryToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (categoryToDelete) {
                  deleteCategoryMutation.mutate(categoryToDelete.id);
                }
              }}
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending ? 'Deleting...' : 'Delete Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add confirmation dialog for delete actions */}
      <Dialog open={false}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1">Cancel</Button>
            <Button variant="destructive" className="flex-1">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Engagement Breakdown Modal */}
      <Dialog open={showEngagementModal} onOpenChange={closeEngagementModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Creator Engagement Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingEngagement ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              engagementDetails && (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-lg font-semibold">
                      {selectedContentForEngagement?.type === 'likes' ? 'Likes' : 'Dislikes'}
                    </h3>
                    <span className="text-sm text-gray-600">
                      Total engagements: {engagementDetails.total}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedContentForEngagement?.type === 'likes' ? (
                      engagementDetails.likes.length > 0 ? (
                        engagementDetails.likes.map((creator, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center overflow-hidden">
                              {creator.creatorProfileImage ? (
                                <img src={creator.creatorProfileImage} alt={creator.creatorName} className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{creator.creatorName}</span>
                                <span className="text-sm text-gray-600">@{creator.creatorUsername}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>Interaction: {creator.interactionType}</span>
                                <span>•</span>
                                <span>{new Date(creator.timestamp).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No likes yet</p>
                      )
                    ) : (
                      engagementDetails.dislikes.length > 0 ? (
                        engagementDetails.dislikes.map((creator, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center overflow-hidden">
                              {creator.creatorProfileImage ? (
                                <img src={creator.creatorProfileImage} alt={creator.creatorName} className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{creator.creatorName}</span>
                                <span className="text-sm text-gray-600">@{creator.creatorUsername}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>Interaction: {creator.interactionType}</span>
                                <span>•</span>
                                <span>{new Date(creator.timestamp).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No dislikes yet</p>
                      )
                    )}
                  </div>
                </>
              )
            )}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={closeEngagementModal} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Page Confirmation Dialog */}
      <Dialog open={showDeletePageDialog} onOpenChange={setShowDeletePageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete {pageToDelete?.pageType === 'feed' ? 'Feed Tab' : 'Home Tab'} Page
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{pageToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">What will happen:</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Page will be removed from the admin dashboard</li>
                <li>• All assigned creators will lose access to this page</li>
                <li>• Page content will be permanently deleted</li>
                <li>• Page will disappear from all creator {pageToDelete?.pageType === 'feed' ? 'feeds' : 'home tabs'} immediately</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeletePageDialog(false);
                setPageToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (pageToDelete) {
                  deletePageMutation.mutate(pageToDelete.id);
                }
              }}
              disabled={deletePageMutation.isPending}
            >
              {deletePageMutation.isPending ? 'Deleting...' : 'Delete Page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog for Create Page Form */}
      <UnsavedChangesDialog
        open={createPageUnsavedChanges.showDiscardDialog}
        onConfirmDiscard={createPageUnsavedChanges.handleConfirmDiscard}
        onCancel={createPageUnsavedChanges.handleCancelDiscard}
      />
    </div>
  );
}
