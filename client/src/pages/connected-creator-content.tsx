import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Plus, Users, FileText, Calendar, Eye, Copy, Edit, Pin, PinOff, Trash2, ChevronDown, FolderPlus, Grid3X3, BookOpen, Upload, Image, Settings, ArrowUpDown, UserPlus, X, Search, MoreHorizontal
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CenteredSectionLoader } from '@/components/ui/loading-animation';

interface InspirationPage {
  id: number;
  title: string;
  slug: string;
  description?: string;
  createdById: string;
  createdByName: string;
  isPinned: boolean;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  emoji?: string;
  bannerUrl?: string;
  assignedCreators?: Creator[];
}

interface Creator {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl?: string;
}

interface ContentGroup {
  id: number;
  name: string;
  emoji?: string;
  description?: string;
  assignedCreators?: Creator[];
  createdAt: string;
  updatedAt: string;
}

interface ContentCategory {
  id: number;
  name: string;
  emoji?: string;
  platform?: string;
  createdAt: string;
  updatedAt: string;
}

interface BannerInventoryItem {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  tags: string[];
  aspectRatio: string;
  width: number;
  height: number;
}

export default function ConnectedCreatorContent() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [showAccessManagementDialog, setShowAccessManagementDialog] = useState(false);
  const [showGroupManagementDialog, setShowGroupManagementDialog] = useState(false);
  const [selectedPageForAccess, setSelectedPageForAccess] = useState<InspirationPage | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ContentGroup | null>(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<ContentCategory | null>(null);
  const [bannerTab, setBannerTab] = useState('inventory');
  
  // Form states
  const [newPageForm, setNewPageForm] = useState({
    title: '',
    emoji: '',
    description: '',
    bannerUrl: '',
    selectedBannerId: null as number | null,
    assignedCreators: [] as number[],
    assignedContentGroups: [] as number[],
    contentType: '' as string,
    tags: [] as string[],
  });
  const [assignmentMode, setAssignmentMode] = useState<'creators' | 'groups'>('creators');
  const [newGroupForm, setNewGroupForm] = useState({
    name: '',
    emoji: '',
    description: '',
    assignedCreators: [] as number[],
  });
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    emoji: '',
    platform: '',
  });
  
  // View states
  const [currentView, setCurrentView] = useState<'pages' | 'groups' | 'categories'>('pages');
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'updatedAt' | 'creatorCount'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');

  // Fetch data
  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['/api/inspiration-pages'],
  });

  // Fetch creators
  const { data: creators, isLoading: creatorsLoading } = useQuery({
    queryKey: ['/api/creators'],
  });

  // Fetch banner inventory
  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ['/api/banner-inventory'],
  });

  // Fetch content groups
  const { data: contentGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/content-type-groups'],
  });

  // Fetch content categories
  const { data: contentCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/content-categories'],
  });

  // Create page mutation
  const createPageMutation = useMutation({
    mutationFn: async (pageData: any) => {
      const response = await fetch('/api/inspiration-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData),
      });
      if (!response.ok) throw new Error('Failed to create page');
      return response.json();
    },
    onSuccess: (newPage) => {
      // Force refresh of inspiration pages data
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] });
      queryClient.refetchQueries({ queryKey: ['/api/inspiration-pages'] });
      
      toast({
        title: "Page Created",
        description: `${newPage.title} has been created successfully.`,
      });
      setNewPageForm({
        title: '',
        emoji: '',
        description: '',
        bannerUrl: '',
        selectedBannerId: null,
        assignedCreators: [],
        contentType: '',
        tags: [],
      });
      setShowNewPageDialog(false);
      // Navigate to the new page's Notion editor
      setLocation(`/notion/${newPage.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create page. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      const response = await fetch('/api/content-type-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupData.name,
          emoji: groupData.emoji,
          description: groupData.description,
          assignedCreators: groupData.assignedCreators,
        }),
      });
      if (!response.ok) throw new Error('Failed to create content group');
      return response.json();
    },
    onSuccess: (newGroup) => {
      // Invalidate and refetch content groups to show the new group
      queryClient.invalidateQueries({ queryKey: ['/api/content-type-groups'] });
      queryClient.refetchQueries({ queryKey: ['/api/content-type-groups'] });
      
      toast({
        title: "Content Group Created",
        description: `${newGroup.name} has been created successfully.`,
      });
      setNewGroupForm({
        name: '',
        emoji: '',
        description: '',
        assignedCreators: [],
      });
      setShowNewGroupDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create content group. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add creator to group mutation
  const addCreatorToGroupMutation = useMutation({
    mutationFn: async ({ creatorId, groupId }: { creatorId: number; groupId: number }) => {
      const response = await fetch(`/api/content-type-groups/${groupId}/creators/${creatorId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to add creator to group');
      return response.json();
    },
    onMutate: async ({ creatorId, groupId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/content-type-groups', groupId, 'creators'] });
      
      // Snapshot previous value
      const previousCreators = queryClient.getQueryData(['/api/content-type-groups', groupId, 'creators']);
      
      // Optimistically update to new value
      queryClient.setQueryData(['/api/content-type-groups', groupId, 'creators'], (old: any) => {
        const creator = creators?.find((c: any) => c.id === creatorId);
        if (!creator) return old;
        return Array.isArray(old) ? [...old, creator] : [creator];
      });
      
      // Return a context object with the snapshotted value
      return { previousCreators, groupId };
    },
    onError: (err, { groupId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCreators) {
        queryClient.setQueryData(['/api/content-type-groups', groupId, 'creators'], context.previousCreators);
      }
      toast({
        title: "Error",
        description: "Failed to add creator to group",
        variant: "destructive",
      });
    },
    onSuccess: async (_, { groupId }) => {
      // Invalidate all related queries for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['/api/content-type-groups'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/content-type-groups', groupId, 'creators'] });
      
      toast({
        title: "Success",
        description: "Creator added to group successfully",
      });
    },
  });

  // Remove creator from group mutation
  const removeCreatorFromGroupMutation = useMutation({
    mutationFn: async ({ creatorId, groupId }: { creatorId: number; groupId: number }) => {
      const response = await fetch(`/api/content-type-groups/${groupId}/creators/${creatorId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove creator from group');
      return response.json();
    },
    onMutate: async ({ creatorId, groupId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/content-type-groups', groupId, 'creators'] });
      
      // Snapshot previous value
      const previousCreators = queryClient.getQueryData(['/api/content-type-groups', groupId, 'creators']);
      
      // Optimistically update to new value
      queryClient.setQueryData(['/api/content-type-groups', groupId, 'creators'], (old: any) => {
        return Array.isArray(old) ? old.filter((c: any) => c.id !== creatorId) : [];
      });
      
      // Return a context object with the snapshotted value
      return { previousCreators, groupId };
    },
    onError: (err, { groupId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCreators) {
        queryClient.setQueryData(['/api/content-type-groups', groupId, 'creators'], context.previousCreators);
      }
      toast({
        title: "Error",
        description: "Failed to remove creator from group",
        variant: "destructive",
      });
    },
    onSuccess: async (_, { groupId }) => {
      // Invalidate all related queries for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['/api/content-type-groups'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/content-type-groups', groupId, 'creators'] });
      
      toast({
        title: "Success",
        description: "Creator removed from group successfully",
      });
    },
  });

  // Create content category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await fetch('/api/content-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-categories'] });
      toast({
        title: "Category Created",
        description: `${newCategory.name} has been created successfully.`,
      });
      setNewCategoryForm({
        name: '',
        emoji: '',
        platform: '',
      });
      setShowNewCategoryDialog(false);
      setSelectedCategoryForEdit(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create content category",
        variant: "destructive",
      });
    },
  });

  // Update content category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...categoryData }: any) => {
      const response = await fetch(`/api/content-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-categories'] });
      toast({
        title: "Category Updated",
        description: `${updatedCategory.name} has been updated successfully.`,
      });
      setNewCategoryForm({
        name: '',
        emoji: '',
        platform: '',
      });
      setShowNewCategoryDialog(false);
      setSelectedCategoryForEdit(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update content category",
        variant: "destructive",
      });
    },
  });

  // Delete content category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await fetch(`/api/content-categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-categories'] });
      toast({
        title: "Category Deleted",
        description: "Content category has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete content category",
        variant: "destructive",
      });
    },
  });

  // Update page access mutation
  const updatePageAccessMutation = useMutation({
    mutationFn: async ({ pageId, creatorIds }: { pageId: number; creatorIds: number[] }) => {
      const response = await fetch(`/api/inspiration-pages/${pageId}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorIds }),
      });
      if (!response.ok) throw new Error('Failed to update page access');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] });
      toast({
        title: "Access Updated",
        description: "Page access has been updated successfully.",
      });
      setShowAccessManagementDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update page access. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopyURL = (pageId: number) => {
    const url = `${window.location.origin}/notion/${pageId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Page URL has been copied to your clipboard.",
    });
  };

  const handleSubmitPageCreation = () => {
    if (!newPageForm.title.trim()) {
      toast({
        title: "Error",
        description: "Page title is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate content type selection
    if (!newPageForm.contentType) {
      toast({
        title: "Error",
        description: "Content type classification is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate banner selection
    if (!newPageForm.bannerUrl && !newPageForm.selectedBannerId) {
      toast({
        title: "Error",
        description: "Please select a banner from inventory or provide a custom banner URL.",
        variant: "destructive",
      });
      return;
    }

    // Use selected banner from inventory if available, otherwise use custom URL
    const finalBannerUrl = newPageForm.selectedBannerId 
      ? (banners as BannerInventoryItem[])?.find(b => b.id === newPageForm.selectedBannerId)?.imageUrl 
      : newPageForm.bannerUrl;

    createPageMutation.mutate({
      title: newPageForm.title,
      slug: newPageForm.title.toLowerCase().replace(/\s+/g, '-'),
      description: newPageForm.description,
      emoji: newPageForm.emoji,
      bannerUrl: finalBannerUrl,
      contentType: newPageForm.contentType,
      tags: newPageForm.tags,
      assignedCreators: assignmentMode === 'creators' ? newPageForm.assignedCreators : [],
      assignedContentGroups: assignmentMode === 'groups' ? newPageForm.assignedContentGroups : [],
      isActive: true,
      isPinned: false,
    });
  };

  const handleCreateGroup = () => {
    if (!newGroupForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name.",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate({
      name: newGroupForm.name,
      emoji: newGroupForm.emoji,
      description: newGroupForm.description,
    });
  };





  const handleOpenAccessManagement = (page: InspirationPage) => {
    setSelectedPageForAccess(page);
    setShowAccessManagementDialog(true);
  };

  const handleDeleteCategory = (categoryId: number) => {
    if (confirm('Are you sure you want to delete this content category? This action cannot be undone.')) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const handleCreateOrUpdateCategory = () => {
    if (selectedCategoryForEdit) {
      updateCategoryMutation.mutate({
        id: selectedCategoryForEdit.id,
        ...newCategoryForm,
      });
    } else {
      createCategoryMutation.mutate(newCategoryForm);
    }
  };

  const handleUpdatePageAccess = (creatorIds: number[]) => {
    if (selectedPageForAccess) {
      updatePageAccessMutation.mutate({
        pageId: selectedPageForAccess.id,
        creatorIds,
      });
    }
  };

  const handleSort = (column: 'title' | 'createdAt' | 'updatedAt' | 'creatorCount') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Get all unique tags for filtering
  const allTags = React.useMemo(() => {
    if (!pages) return [];
    const pageList = Array.isArray(pages) ? pages : [];
    const tagSet = new Set<string>();
    pageList.forEach((page: InspirationPage) => {
      page.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [pages]);

  const filteredAndSortedPages = React.useMemo(() => {
    if (!pages) return [];
    const pageList = Array.isArray(pages) ? pages : [];
    
    // Apply search and tag filters
    let filtered = pageList.filter((page: InspirationPage) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          page.title.toLowerCase().includes(searchLower) ||
          page.description?.toLowerCase().includes(searchLower) ||
          page.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
          page.createdByName?.toLowerCase().includes(searchLower) ||
          page.assignedCreators?.some(creator => 
            creator.displayName.toLowerCase().includes(searchLower) ||
            creator.username.toLowerCase().includes(searchLower)
          );
        
        if (!matchesSearch) return false;
      }
      
      // Tag filter
      if (filterTag !== 'all') {
        if (!page.tags?.includes(filterTag)) return false;
      }
      
      return true;
    });
    
    // Apply sorting
    return filtered.sort((a: InspirationPage, b: InspirationPage) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'creatorCount':
          aValue = a.assignedCreators?.length || 0;
          bValue = b.assignedCreators?.length || 0;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [pages, sortBy, sortOrder, searchQuery, filterTag]);

  const renderPageTable = () => {
    if (pagesLoading) {
      return <CenteredSectionLoader message="Loading inspiration pages..." />;
    }

    if (!filteredAndSortedPages.length) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Inspiration Pages Yet</h3>
          <p className="text-gray-600 mb-4">Create your first inspiration page to get started.</p>
          <Button onClick={() => setShowNewPageDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Inspiration Page
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Responsive Table Container with Independent Scrolling */}
        <div className="border rounded-lg overflow-hidden">
          <div className="w-full">
            {/* Fixed Table Header */}
            <div className="grid grid-cols-[60px_1fr_2fr_120px_140px_100px] gap-2 md:gap-4 px-2 md:px-4 py-3 bg-gray-50 text-sm font-medium text-gray-600 border-b sticky top-0 z-10">
              <div className="flex items-center justify-center">Emoji</div>
              <div>
                <button 
                  onClick={() => handleSort('title')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>Page Name</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </div>
              <div className="hidden md:block">Description</div>
              <div>
                <button 
                  onClick={() => handleSort('creatorCount')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>Creators</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </div>
              <div>
                <button 
                  onClick={() => handleSort('updatedAt')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>Last Updated</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center justify-center">Actions</div>
            </div>

            {/* Scrollable Table Rows Container */}
            <div className="max-h-96 overflow-y-auto">
              {filteredAndSortedPages.map((page: InspirationPage) => (
                <div key={page.id} className="grid grid-cols-[60px_1fr_2fr_120px_140px_100px] gap-2 md:gap-4 p-2 md:p-4 border-b hover:bg-gray-50 transition-colors">
                  {/* Page Emoji */}
                  <div className="flex items-center justify-center">
                    {page.emoji ? (
                      <span className="text-2xl">{page.emoji}</span>
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Page Name */}
                  <div className="min-w-0">
                    <h3 
                      className="font-medium hover:text-blue-600 cursor-pointer truncate"
                      onClick={() => setLocation(`/notion/${page.id}`)}
                      title={page.title}
                    >
                      {page.title}
                    </h3>
                    {page.tags && page.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {page.tags.slice(0, 1).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {page.tags.length > 1 && (
                          <Badge variant="outline" className="text-xs">
                            +{page.tags.length - 1}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="min-w-0 hidden md:block">
                    <p className="text-sm text-gray-600 line-clamp-2" title={page.description || "No description provided"}>
                      {page.description || "No description provided"}
                    </p>
                  </div>

                  {/* Creator Count */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {page.assignedCreators?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="text-center">
                    <div className="text-sm text-gray-600">
                      <div className="hidden sm:block">{new Date(page.updatedAt).toLocaleDateString()}</div>
                      <div className="sm:hidden">{new Date(page.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div className="text-xs text-gray-400 hidden sm:block">
                        {new Date(page.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocation(`/notion/${page.id}`)}
                      className="p-1 h-8 w-8"
                      title="View Page"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-8 w-8" title="Manage Page">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/notion/${page.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Page
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenAccessManagement(page)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Access Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyURL(page.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          {page.isPinned ? (
                            <>
                              <PinOff className="h-4 w-4 mr-2" />
                              Unpin Page
                            </>
                          ) : (
                            <>
                              <Pin className="h-4 w-4 mr-2" />
                              Pin Page
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Page
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="px-6 pb-6 pt-8 space-y-6">
      {/* Proportionally Scaled Content Container */}
      <div className="transform scale-90 origin-top-left w-[111.11%] space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspo Pages</h1>
            <p className="text-gray-600">Manage inspiration pages, content groups, and categories</p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>New</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setShowNewPageDialog(true)}>
              <BookOpen className="h-4 w-4 mr-2" />
              New Inspo Page
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowNewGroupDialog(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Content Group
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowNewCategoryDialog(true)}>
              <Grid3X3 className="h-4 w-4 mr-2" />
              New Content Category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* View Tabs */}
      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
        <TabsList>
          <TabsTrigger value="pages">Inspiration Pages</TabsTrigger>
          <TabsTrigger value="groups">Content Groups</TabsTrigger>
          <TabsTrigger value="categories">Content Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="mt-6">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search pages by name, description, tags, or creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(searchQuery || filterTag !== 'all') && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing {filteredAndSortedPages.length} of {Array.isArray(pages) ? pages.length : 0} pages</span>
                {(searchQuery || filterTag !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterTag('all');
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {renderPageTable()}
        </TabsContent>

        <TabsContent value="groups" className="mt-6">
          {groupsLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading content groups...</div>
            </div>
          ) : !contentGroups || contentGroups.length === 0 ? (
            <div className="text-center py-12">
              <FolderPlus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Groups Yet</h3>
              <p className="text-gray-600 mb-4">Create your first content group to organize your inspiration pages.</p>
              <Button onClick={() => setShowNewGroupDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Content Group
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Content Groups ({contentGroups.length})</h3>
                <Button onClick={() => setShowNewGroupDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Group
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentGroups.map((group: ContentGroup) => (
                  <div key={group.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {group.emoji && <span className="text-lg">{group.emoji}</span>}
                        <h4 className="font-medium">{group.name}</h4>
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
                              setSelectedGroup(group);
                              setShowGroupManagementDialog(true);
                            }}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Manage Creators
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                      {group.assignedCreators && (
                        <span>{group.assignedCreators.length} creators</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          {categoriesLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading content categories...</div>
            </div>
          ) : !contentCategories || contentCategories.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Categories Yet</h3>
              <p className="text-gray-600 mb-4">Create content categories to classify your inspiration pages by platform or type.</p>
              <Button onClick={() => setShowNewCategoryDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Content Category
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Content Categories ({contentCategories.length})</h3>
                <Button onClick={() => setShowNewCategoryDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentCategories.map((category: ContentCategory) => (
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

      {/* New Content Group Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Content Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                value={newGroupForm.name}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, name: e.target.value })}
                placeholder="e.g. Fashion Inspiration, Travel Content"
              />
            </div>
            <div>
              <Label htmlFor="group-emoji">Emoji/Icon</Label>
              <Input
                id="group-emoji"
                value={newGroupForm.emoji}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, emoji: e.target.value })}
                placeholder="👗"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={newGroupForm.description}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, description: e.target.value })}
                placeholder="Brief description of this content group"
              />
            </div>
            
            {/* Creator Assignment */}
            <div>
              <Label>Assigned Creators</Label>
              <div className="mt-2 space-y-2">
                {creators && creators.map((creator: Creator) => (
                  <div key={creator.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`creator-${creator.id}`}
                      checked={newGroupForm.assignedCreators.includes(creator.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewGroupForm({
                            ...newGroupForm,
                            assignedCreators: [...newGroupForm.assignedCreators, creator.id]
                          });
                        } else {
                          setNewGroupForm({
                            ...newGroupForm,
                            assignedCreators: newGroupForm.assignedCreators.filter(id => id !== creator.id)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`creator-${creator.id}`} className="text-sm font-normal">
                      {creator.displayName} (@{creator.username})
                    </Label>
                  </div>
                ))}
              </div>
              {newGroupForm.assignedCreators.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {newGroupForm.assignedCreators.length} creator(s) selected
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGroup}
              disabled={!newGroupForm.name.trim()}
            >
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Content Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Content Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={newCategoryForm.name}
                onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                placeholder="e.g. Instagram, OFTV, Reddit"
              />
            </div>
            <div>
              <Label htmlFor="category-emoji">Emoji/Icon</Label>
              <Input
                id="category-emoji"
                value={newCategoryForm.emoji}
                onChange={(e) => setNewCategoryForm({ ...newCategoryForm, emoji: e.target.value })}
                placeholder="📷"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="category-platform">Platform Type</Label>
              <Select 
                value={newCategoryForm.platform} 
                onValueChange={(value) => setNewCategoryForm({...newCategoryForm, platform: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OnlyFans">OnlyFans</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Twitter">Twitter</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Reddit">Reddit</SelectItem>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="OFTV">OFTV</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="Snapchat">Snapchat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrUpdateCategory}
              disabled={!newCategoryForm.name.trim()}
            >
              Create Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Inspiration Page Dialog */}
      <Dialog open={showNewPageDialog} onOpenChange={setShowNewPageDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Inspiration Page</DialogTitle>
            <DialogDescription>
              Set up your page details, select a banner, and assign creators before launching the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Page Title */}
            <div>
              <Label htmlFor="page-title">Page Title *</Label>
              <Input
                id="page-title"
                value={newPageForm.title}
                onChange={(e) => setNewPageForm({ ...newPageForm, title: e.target.value })}
                placeholder="Enter page title"
                className="mt-1"
              />
            </div>

            {/* Emoji Selection */}
            <div>
              <Label htmlFor="page-emoji">Page Emoji</Label>
              <Input
                id="page-emoji"
                value={newPageForm.emoji}
                onChange={(e) => setNewPageForm({ ...newPageForm, emoji: e.target.value })}
                placeholder="🎨"
                maxLength={2}
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="page-description">Description</Label>
              <Textarea
                id="page-description"
                value={newPageForm.description}
                onChange={(e) => setNewPageForm({ ...newPageForm, description: e.target.value })}
                placeholder="Brief description of this inspiration page"
                className="mt-1"
              />
            </div>

            {/* Banner Selection - Enhanced with Tabs */}
            <div>
              <Label className="text-base font-medium">Banner Selection *</Label>
              <p className="text-sm text-gray-600 mb-3">Choose a banner from our inventory or upload a custom one.</p>
              
              <Tabs value={bannerTab} onValueChange={setBannerTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="inventory" className="flex items-center space-x-2">
                    <Image className="h-4 w-4" />
                    <span>Select from Inventory</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload Custom</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="inventory" className="mt-4">
                  {bannersLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-20 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                      {(banners as BannerInventoryItem[])?.map((banner) => (
                        <Card 
                          key={banner.id} 
                          className={`cursor-pointer transition-all ${
                            newPageForm.selectedBannerId === banner.id 
                              ? 'ring-2 ring-blue-500 bg-blue-50' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => {
                            setNewPageForm({ 
                              ...newPageForm, 
                              selectedBannerId: banner.id,
                              bannerUrl: '' // Clear custom URL when selecting from inventory
                            });
                          }}
                        >
                          <div className="h-20 overflow-hidden rounded-t">
                            <img 
                              src={banner.imageUrl} 
                              alt={banner.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardContent className="p-2">
                            <p className="text-xs font-medium truncate">{banner.name}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {banner.category}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="upload" className="mt-4">
                  <div>
                    <Label htmlFor="page-banner">Custom Banner Image URL</Label>
                    <Input
                      id="page-banner"
                      value={newPageForm.bannerUrl}
                      onChange={(e) => {
                        setNewPageForm({ 
                          ...newPageForm, 
                          bannerUrl: e.target.value,
                          selectedBannerId: null // Clear inventory selection when using custom URL
                        });
                      }}
                      placeholder="https://example.com/banner.jpg"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended size: 1600x400px (4:1 aspect ratio)
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Assignment Mode Selection */}
            <div>
              <Label className="text-base font-medium">Page Assignment</Label>
              <p className="text-sm text-gray-600 mb-3">Choose how to assign access to this page.</p>
              
              <Tabs value={assignmentMode} onValueChange={(value) => setAssignmentMode(value as 'creators' | 'groups')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="creators" className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Individual Creators</span>
                  </TabsTrigger>
                  <TabsTrigger value="groups" className="flex items-center space-x-2">
                    <FolderPlus className="h-4 w-4" />
                    <span>Content Groups</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="creators" className="mt-4">
                  <div className="space-y-3">
                    <Label>Select Individual Creators</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2">
                      {Array.isArray(creators) && creators.map((creator: any) => (
                        <div key={creator.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`creator-${creator.id}`}
                            checked={newPageForm.assignedCreators.includes(creator.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewPageForm({
                                  ...newPageForm,
                                  assignedCreators: [...newPageForm.assignedCreators, creator.id]
                                });
                              } else {
                                setNewPageForm({
                                  ...newPageForm,
                                  assignedCreators: newPageForm.assignedCreators.filter(id => id !== creator.id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`creator-${creator.id}`} className="text-sm font-normal">
                            {creator.displayName} (@{creator.username})
                          </Label>
                        </div>
                      ))}
                    </div>
                    {newPageForm.assignedCreators.length > 0 && (
                      <p className="text-sm text-gray-600">
                        {newPageForm.assignedCreators.length} creator(s) selected
                      </p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="groups" className="mt-4">
                  <div className="space-y-3">
                    <Label>Select Content Groups</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2">
                      {Array.isArray(contentGroups) && contentGroups.map((group: ContentGroup) => (
                        <div key={group.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={newPageForm.assignedContentGroups.includes(group.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewPageForm({
                                  ...newPageForm,
                                  assignedContentGroups: [...newPageForm.assignedContentGroups, group.id]
                                });
                              } else {
                                setNewPageForm({
                                  ...newPageForm,
                                  assignedContentGroups: newPageForm.assignedContentGroups.filter(id => id !== group.id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`group-${group.id}`} className="text-sm font-normal flex items-center space-x-1">
                            {group.emoji && <span>{group.emoji}</span>}
                            <span>{group.name}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                    {newPageForm.assignedContentGroups.length > 0 && (
                      <p className="text-sm text-gray-600">
                        {newPageForm.assignedContentGroups.length} content group(s) selected
                      </p>
                    )}
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      Note: All creators within selected groups will automatically have access to this page.
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Content Type Classification */}
            <div>
              <Label htmlFor="content-type">Content Type Classification *</Label>
              <p className="text-sm text-gray-600 mb-3">Select the specific content type for this inspiration page.</p>
              <Select 
                value={newPageForm.contentType} 
                onValueChange={(value) => setNewPageForm({ ...newPageForm, contentType: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(contentCategories) && contentCategories.map((category: ContentCategory) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.emoji && `${category.emoji} `}{category.name}
                      {category.platform && ` (${category.platform})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="page-tags">Tags (comma-separated)</Label>
              <Input
                id="page-tags"
                value={newPageForm.tags.join(', ')}
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                  setNewPageForm({ ...newPageForm, tags });
                }}
                placeholder="content, inspiration, creative"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowNewPageDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitPageCreation}
              disabled={!newPageForm.title.trim() || (!newPageForm.bannerUrl && !newPageForm.selectedBannerId) || createPageMutation.isPending}
            >
              {createPageMutation.isPending ? 'Creating...' : 'Create Page & Launch Editor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Access Management Dialog */}
      <Dialog open={showAccessManagementDialog} onOpenChange={setShowAccessManagementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Page Access Settings
              {selectedPageForAccess && (
                <span className="text-base font-normal text-gray-600 ml-2">
                  for "{selectedPageForAccess.title}"
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPageForAccess && (
            <AccessManagementContent
              page={selectedPageForAccess}
              creators={creators}
              onUpdateAccess={handleUpdatePageAccess}
              isUpdating={updatePageAccessMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Group Management Dialog */}
      <Dialog open={showGroupManagementDialog} onOpenChange={setShowGroupManagementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Group Creators
              {selectedGroup && (
                <span className="text-base font-normal text-gray-600 ml-2">
                  for "{selectedGroup.name}"
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedGroup && (
            <GroupManagementContent
              group={selectedGroup}
              creators={creators}
              onAddCreator={(creatorId) => addCreatorToGroupMutation.mutate({ creatorId, groupId: selectedGroup.id })}
              onRemoveCreator={(creatorId) => removeCreatorFromGroupMutation.mutate({ creatorId, groupId: selectedGroup.id })}
              isUpdating={addCreatorToGroupMutation.isPending || removeCreatorFromGroupMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// Access Management Component
function AccessManagementContent({ 
  page, 
  creators, 
  onUpdateAccess, 
  isUpdating 
}: { 
  page: InspirationPage; 
  creators: any; 
  onUpdateAccess: (creatorIds: number[]) => void;
  isUpdating: boolean;
}) {
  const [selectedCreators, setSelectedCreators] = useState<number[]>(
    page.assignedCreators?.map(c => c.id) || []
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCreators = Array.isArray(creators) 
    ? creators.filter((creator: any) => 
        creator.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleToggleCreator = (creatorId: number) => {
    setSelectedCreators(prev => 
      prev.includes(creatorId) 
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    );
  };

  const handleSelectAll = () => {
    const allCreatorIds = filteredCreators.map((creator: any) => creator.id);
    setSelectedCreators(allCreatorIds);
  };

  const handleClearAll = () => {
    setSelectedCreators([]);
  };

  const handleSave = () => {
    onUpdateAccess(selectedCreators);
  };

  return (
    <div className="space-y-6">
      {/* Current Access Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Current Access</h3>
        <div className="flex flex-wrap gap-2">
          {page.assignedCreators && page.assignedCreators.length > 0 ? (
            page.assignedCreators.map((creator) => (
              <div key={creator.id} className="flex items-center space-x-2 bg-white rounded-md px-3 py-1 text-sm border">
                <span>{creator.displayName || creator.username}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-500 text-sm">No creators assigned</span>
          )}
        </div>
      </div>

      {/* Search and Actions */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>
      </div>

      {/* Creator List */}
      <div className="border rounded-lg max-h-64 overflow-y-auto">
        <div className="p-3 space-y-2">
          {filteredCreators.length > 0 ? (
            filteredCreators.map((creator: any) => (
              <div key={creator.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`access-creator-${creator.id}`}
                    checked={selectedCreators.includes(creator.id)}
                    onCheckedChange={() => handleToggleCreator(creator.id)}
                  />
                  <div className="flex items-center space-x-2">
                    {creator.profileImageUrl && (
                      <img 
                        src={creator.profileImageUrl} 
                        alt={creator.displayName || creator.username}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{creator.displayName || creator.username}</p>
                      {creator.displayName && (
                        <p className="text-xs text-gray-500">@{creator.username}</p>
                      )}
                    </div>
                  </div>
                </div>
                {selectedCreators.includes(creator.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleCreator(creator.id)}
                    className="p-1 h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No creators found matching your search' : 'No creators available'}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          {selectedCreators.length} creator{selectedCreators.length !== 1 ? 's' : ''} will have access to this page
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button 
          variant="outline" 
          onClick={() => setSelectedCreators(page.assignedCreators?.map(c => c.id) || [])}
        >
          Reset
        </Button>
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? 'Updating...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

// Group Management Component
function GroupManagementContent({ 
  group, 
  creators, 
  onAddCreator, 
  onRemoveCreator, 
  isUpdating 
}: { 
  group: ContentGroup; 
  creators: any; 
  onAddCreator: (creatorId: number) => void;
  onRemoveCreator: (creatorId: number) => void;
  isUpdating: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch creators currently in this group
  const { data: groupCreators, isLoading } = useQuery({
    queryKey: ['/api/content-type-groups', group.id, 'creators'],
    queryFn: async () => {
      const response = await fetch(`/api/content-type-groups/${group.id}/creators`);
      if (!response.ok) throw new Error('Failed to fetch group creators');
      return response.json();
    },
  });

  const filteredCreators = Array.isArray(creators) 
    ? creators.filter((creator: any) => 
        creator.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const isCreatorInGroup = (creatorId: number) => {
    return Array.isArray(groupCreators) && groupCreators.some((c: any) => c.id === creatorId);
  };

  return (
    <div className="space-y-4">
      {/* Group Info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-2">
          {group.emoji && <span className="text-lg">{group.emoji}</span>}
          <h4 className="font-medium">{group.name}</h4>
        </div>
        {group.description && (
          <p className="text-sm text-gray-600">{group.description}</p>
        )}
        <div className="text-xs text-gray-500 mt-2">
          Currently has {Array.isArray(groupCreators) ? groupCreators.length : 0} creator(s)
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search creators..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Creator List */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="text-gray-600">Loading group creators...</div>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-3">
          {filteredCreators.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {searchQuery ? 'No creators found matching your search.' : 'No creators available.'}
            </p>
          ) : (
            filteredCreators.map((creator: any) => {
              const inGroup = isCreatorInGroup(creator.id);
              return (
                <div key={creator.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center space-x-2 flex-1">
                    {creator.profileImageUrl && (
                      <img 
                        src={creator.profileImageUrl} 
                        alt={creator.displayName || creator.username}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium text-sm">{creator.displayName}</div>
                      <div className="text-xs text-gray-500">@{creator.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {inGroup && (
                      <Badge variant="secondary" className="text-xs">In Group</Badge>
                    )}
                    <Button
                      variant={inGroup ? "destructive" : "default"}
                      size="sm"
                      onClick={() => inGroup ? onRemoveCreator(creator.id) : onAddCreator(creator.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? '...' : (inGroup ? 'Remove' : 'Add')}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-600">
          {Array.isArray(groupCreators) ? groupCreators.length : 0} creator(s) in group
        </div>
        {isUpdating && (
          <div className="text-sm text-blue-600">Updating...</div>
        )}
      </div>
    </div>
  );
}

