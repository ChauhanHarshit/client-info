import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/page-header";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Search,
  Eye,
  Settings,
  Calendar,
  Users,
  Filter,
  SortAsc,
  SortDesc,
  Edit,
  Trash2,
  Copy,
  BookOpen,
  MoreHorizontal,
  Upload,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  FileText,
  X,
} from "lucide-react";
import { CreatorAvatar } from '@/components/ui/creator-avatar';
import { CenteredPageLoader } from '@/components/ui/loading-animation';
import type { Creator, ContentSection, CreatorPage } from "@shared/schema";

interface ContentInspirationPage {
  id: number;
  title: string;
  description: string;
  pageType: string;
  platformType: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  assignedCreators: string;
  contentCount: string;
  contentCategories: number[];
  lastUpdated: string | null;
  // Legacy fields for compatibility
  name?: string;
  emoji?: string;
  creatorCount?: number;
  tags?: string[];
  creators?: Creator[];
  bannerUrl?: string;
  bannerType?: "preset" | "uploaded";
  bannerInventoryId?: number;
}

interface BannerInventory {
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

interface ContentItem {
  id: number;
  pageId: number;
  title: string;
  description: string;
  instructions: string;
  mediaType: 'image' | 'video';
  fileUrl?: string;
  thumbnailUrl?: string;
  originalPostLink?: string;
  audioLink?: string;
  tags: string[];
  category: string;
}

export default function ContentInspirationDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "lastUpdated" | "creatorCount">("lastUpdated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [isAddUploadDialogOpen, setIsAddUploadDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<ContentInspirationPage | null>(null);
  
  // Form states for creating/editing pages
  const [pageEmoji, setPageEmoji] = useState("");
  const [pageName, setPageName] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [selectedCreators, setSelectedCreators] = useState<number[]>([]);
  const [pageTags, setPageTags] = useState<string[]>([]);
  
  // Banner states
  const [bannerType, setBannerType] = useState<"preset" | "uploaded">("preset");
  const [selectedBannerId, setSelectedBannerId] = useState<number | null>(null);
  const [uploadedBannerUrl, setUploadedBannerUrl] = useState("");
  const [bannerCategory, setBannerCategory] = useState("all");
  
  // Add Content modal states
  const [selectedContentCreators, setSelectedContentCreators] = useState<Creator[]>([]);
  const [selectedContentSection, setSelectedContentSection] = useState<ContentSection | null>(null);
  const [contentType, setContentType] = useState<"text" | "image" | "video" | "link">("text");
  const [contentTitle, setContentTitle] = useState("");
  const [contentDescription, setContentDescription] = useState("");
  const [contentText, setContentText] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Library popup state
  const [openLibraryPageId, setOpenLibraryPageId] = useState<number | null>(null);

  // Fetch creators data (same method as client-profiles)
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["/api/creators"],
    queryFn: async () => {
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/creators${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch creators');
      }
      
      return await response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch content sections data
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["/api/content-sections"],
    queryFn: async () => {
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/content-sections${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch content sections');
      }
      
      return await response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch content type groups
  const { data: contentTypeGroups = [], isLoading: contentTypeGroupsLoading } = useQuery({
    queryKey: ["/api/content-type-groups"],
    queryFn: async () => {
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/content-type-groups${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch content type groups');
      }
      
      return await response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch content inspiration pages (using correct API endpoint /api/inspo-pages)
  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["/api/inspo-pages"],
    queryFn: async () => {
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/inspo-pages${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch inspiration pages');
      }
      
      return await response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch banner inventory
  const { data: banners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ["/api/banner-inventory", bannerCategory],
    queryFn: async () => {
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/banner-inventory${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch banner inventory');
      }
      
      return await response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch library content for the selected page
  const { data: libraryContent = [], isLoading: isLoadingLibrary } = useQuery({
    queryKey: [`/api/inspo-pages/${openLibraryPageId}/content`],
    queryFn: async () => {
      if (!openLibraryPageId) return [];
      
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/inspo-pages/${openLibraryPageId}/content${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch library content');
      }
      
      return await response.json();
    },
    enabled: !!openLibraryPageId,
    staleTime: 0,
    gcTime: 0,
  });

  // Get all unique platform types as tags (since the API doesn't have tags field)
  const allTags = Array.from(new Set(pages.map((page: ContentInspirationPage) => page.platformType).filter(Boolean)));

  // Filter and sort pages
  const filteredAndSortedPages = pages
    .filter((page: ContentInspirationPage) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === "" || 
                           page.title.toLowerCase().includes(searchLower) ||
                           page.description.toLowerCase().includes(searchLower) ||
                           page.platformType.toLowerCase().includes(searchLower) ||
                           page.pageType.toLowerCase().includes(searchLower);
      const matchesTag = filterTag === "all" || page.platformType === filterTag;
      const matchesGroup = selectedGroupId === "all"; // No creator filtering for now
      return matchesSearch && matchesTag && matchesGroup;
    })
    .sort((a: ContentInspirationPage, b: ContentInspirationPage) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "creatorCount":
          aValue = parseInt(a.assignedCreators) || 0;
          bValue = parseInt(b.assignedCreators) || 0;
          break;
        case "lastUpdated":
        default:
          aValue = new Date(a.lastUpdated || a.createdAt).getTime();
          bValue = new Date(b.lastUpdated || b.createdAt).getTime();
          break;
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Create page mutation (using correct API endpoint)
  const createPageMutation = useMutation({
    mutationFn: async (pageData: any) => {
      const response = await fetch("/api/inspo-pages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(pageData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create page');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspo-pages"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Content inspiration page created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create page. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete page mutation (using correct API endpoint)
  const deletePageMutation = useMutation({
    mutationFn: async (pageId: number) => {
      const response = await fetch(`/api/inspo-pages/${pageId}`, {
        method: "DELETE",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete page');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspo-pages"] });
      setIsManageDialogOpen(false);
      toast({
        title: "Success",
        description: "Page deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete page. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add Content mutation
  const addContentMutation = useMutation({
    mutationFn: async (contentData: any) => {
      const formData = new FormData();
      
      // Add content details
      formData.append("title", contentTitle);
      formData.append("description", contentDescription);
      formData.append("mediaType", contentType);
      formData.append("sectionId", selectedContentSection?.id?.toString() || "");
      
      // Add creator IDs
      selectedContentCreators.forEach((creator, index) => {
        formData.append(`creatorIds[${index}]`, creator.id.toString());
      });
      
      // Add content based on type
      if (contentType === "text") {
        formData.append("content", contentText);
      } else if (contentType === "link") {
        formData.append("content", contentUrl);
      } else if ((contentType === "image" || contentType === "video") && uploadedFiles.length > 0) {
        uploadedFiles.forEach((file, index) => {
          formData.append(`files[${index}]`, file);
        });
      }
      
      return await fetch("/api/creator-inspiration-items", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-inspiration-items"] });
      resetAddContentForm();
      setIsAddContentDialogOpen(false);
      toast({
        title: "Content added",
        description: "Content has been successfully added to creator inspiration boards.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add content",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setPageEmoji("📝");
    setPageName("");
    setPageDescription("");
    setSelectedCreators([]);
    setPageTags([]);
  };

  const resetAddContentForm = () => {
    setSelectedContentCreators([]);
    setSelectedContentSection(null);
    setContentType("text");
    setContentTitle("");
    setContentDescription("");
    setContentText("");
    setContentUrl("");
    setUploadedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(files);
  };

  const handleAddContent = () => {
    if (!contentTitle || selectedContentCreators.length === 0 || !selectedContentSection) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select creators and content section.",
        variant: "destructive",
      });
      return;
    }

    if (contentType === "text" && !contentText) {
      toast({
        title: "Missing content",
        description: "Please enter text content.",
        variant: "destructive",
      });
      return;
    }

    if (contentType === "link" && !contentUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

    if ((contentType === "image" || contentType === "video") && uploadedFiles.length === 0) {
      toast({
        title: "Missing files",
        description: `Please upload ${contentType} files.`,
        variant: "destructive",
      });
      return;
    }

    addContentMutation.mutate({});
  };

  const openManageDialog = (page: ContentInspirationPage) => {
    setSelectedPage(page);
    setPageEmoji(page.emoji || "📝");
    setPageName(page.title);
    setPageDescription(page.description || "");
    setSelectedCreators(page.creators?.map(c => c.id) || []);
    setPageTags(page.tags || [page.platformType]);
    setIsManageDialogOpen(true);
  };

  const duplicatePage = (page: ContentInspirationPage) => {
    setPageEmoji(page.emoji || "📝");
    setPageName(`${page.title} (Copy)`);
    setPageDescription(page.description || "");
    setSelectedCreators([]);
    setPageTags(page.tags || [page.platformType]);
    setIsCreateDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if any critical data is still loading
  const isMainDataLoading = creatorsLoading || sectionsLoading || contentTypeGroupsLoading || pagesLoading || bannersLoading;

  // Show existing tasty loader while main data is loading
  if (isMainDataLoading) {
    return <CenteredPageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Inspiration Dashboard"
        description="Manage all content inspiration pages and creator assignments"
        showBackButton={true}
        backTo="/dashboard"
        actions={
          <Button 
            className="flex items-center space-x-2"
            onClick={() => setIsAddUploadDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Add/Upload</span>
          </Button>
        }
      />
      
      <div className="px-6 pb-6 space-y-6">
        {/* Add/Upload Dialog */}
        <Dialog open={isAddUploadDialogOpen} onOpenChange={setIsAddUploadDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Content</DialogTitle>
              <DialogDescription>
                Choose how you'd like to add content to the dashboard.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-16 flex items-center justify-start gap-4 text-left hover:bg-muted/50"
                onClick={() => {
                  setIsAddUploadDialogOpen(false);
                  setIsAddContentDialogOpen(true);
                }}
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                  <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium">Upload Content</div>
                  <div className="text-sm text-muted-foreground">Add inspiration items to existing pages</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-16 flex items-center justify-start gap-4 text-left hover:bg-muted/50"
                onClick={() => {
                  setIsAddUploadDialogOpen(false);
                  setIsCreateDialogOpen(true);
                }}
              >
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-medium">New Page</div>
                  <div className="text-sm text-muted-foreground">Create a new inspiration page</div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Page Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Content Inspiration Page</DialogTitle>
              <DialogDescription>
                Create a new page to organize and share content inspiration with creators.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emoji">Page Emoji</Label>
                  <Input
                    id="emoji"
                    value={pageEmoji}
                    onChange={(e) => setPageEmoji(e.target.value)}
                    placeholder="📝"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Page Name</Label>
                  <Input
                    id="name"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    placeholder="Enter page name..."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={pageDescription}
                  onChange={(e) => setPageDescription(e.target.value)}
                  placeholder="Describe what this page is for..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Assign to Creators</Label>
                <div className="border rounded-md p-4 max-h-40 overflow-y-auto">
                  {creators?.map((creator: Creator) => (
                    <div key={creator.id} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={`creator-${creator.id}`}
                        checked={selectedCreators.includes(creator.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCreators([...selectedCreators, creator.id]);
                          } else {
                            setSelectedCreators(selectedCreators.filter(id => id !== creator.id));
                          }
                        }}
                      />
                      <Label htmlFor={`creator-${creator.id}`} className="text-sm">
                        {creator.displayName} (@{creator.username})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {pageTags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setPageTags(pageTags.filter((_, i) => i !== index))}
                      />
                    </Badge>
                  ))}
                  <Input
                    placeholder="Add tag..."
                    className="w-32"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const value = e.currentTarget.value.trim();
                        if (value && !pageTags.includes(value)) {
                          setPageTags([...pageTags, value]);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  createPageMutation.mutate({
                    emoji: pageEmoji,
                    name: pageName,
                    description: pageDescription,
                    creatorIds: selectedCreators,
                    tags: pageTags,
                  });
                }}
                disabled={createPageMutation.isPending || !pageName.trim()}
              >
                {createPageMutation.isPending ? "Creating..." : "Create Page"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
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
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select by Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Creators</SelectItem>
              {contentTypeGroups.map((group: any) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.emoji} {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((tag: string) => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastUpdated">Last Updated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="creatorCount">Creator Count</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
          </div>
        </div>
      </div>

      {/* Pages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Inspiration Pages ({filteredAndSortedPages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Creators</TableHead>
                <TableHead className="text-center">Last Updated</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedPages.map((page: ContentInspirationPage) => (
                <TableRow key={page.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {page.title.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{page.title}</div>
                        <div className="text-xs text-muted-foreground">{page.pageType}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs text-sm text-muted-foreground truncate">
                      {page.description || 'No description'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {page.assignedCreators}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {page.lastUpdated ? formatDate(page.lastUpdated) : formatDate(page.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {page.platformType}
                      </Badge>
                      {page.isActive && (
                        <Badge variant="default" className="text-xs bg-green-500">
                          Active
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {page.pageType === 'feed' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOpenLibraryPageId(page.id)}
                        >
                          <Eye className="h-4 w-4" />
                          View Library
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/notion-page-editor/${page.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openManageDialog(page)}
                      >
                        <Settings className="h-4 w-4" />
                        Manage
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicatePage(page)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredAndSortedPages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || filterTag !== "all" 
                ? "No pages match your search criteria"
                : "No content inspiration pages created yet"
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Page Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Page: {selectedPage?.name}</DialogTitle>
            <DialogDescription>
              Edit page settings and manage creator access.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editEmoji">Page Emoji</Label>
                  <Input
                    id="editEmoji"
                    value={pageEmoji}
                    onChange={(e) => setPageEmoji(e.target.value)}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editName">Page Name</Label>
                  <Input
                    id="editName"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={pageDescription}
                  onChange={(e) => setPageDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-between pt-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this page? This action cannot be undone.")) {
                      deletePageMutation.mutate(selectedPage.id);
                    }
                  }}
                  disabled={deletePageMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Page
                </Button>
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Page Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Content Inspiration Page</DialogTitle>
            <DialogDescription>
              Set up a new page with custom banners and creator access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emoji">Page Emoji</Label>
                <Input
                  id="emoji"
                  value={pageEmoji}
                  onChange={(e) => setPageEmoji(e.target.value)}
                  maxLength={2}
                  placeholder="📸"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Page Name</Label>
                <Input
                  id="name"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  placeholder="Photo Inspiration"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={pageDescription}
                onChange={(e) => setPageDescription(e.target.value)}
                rows={3}
                placeholder="Describe what this inspiration page is for..."
              />
            </div>

            {/* Banner Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Page Banner</Label>
              
              {/* Banner Type Selection */}
              <div className="flex space-x-1 p-1 bg-muted rounded-lg">
                <Button
                  variant={bannerType === "preset" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setBannerType("preset")}
                  className="flex-1"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Preset Banners
                </Button>
                <Button
                  variant={bannerType === "uploaded" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setBannerType("uploaded")}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Custom
                </Button>
              </div>

              {bannerType === "preset" && (
                <div className="space-y-4">
                  {/* Category Filter */}
                  <Select
                    value={bannerCategory}
                    onValueChange={setBannerCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Luxury">Luxury</SelectItem>
                      <SelectItem value="Minimal">Minimal</SelectItem>
                      <SelectItem value="Pastel">Pastel</SelectItem>
                      <SelectItem value="Dark Mode">Dark Mode</SelectItem>
                      <SelectItem value="Nature">Nature</SelectItem>
                      <SelectItem value="Abstract">Abstract</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Banner Grid */}
                  <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                    {(banners as BannerInventory[]).map((banner) => (
                      <div
                        key={banner.id}
                        className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                          selectedBannerId === banner.id
                            ? "border-primary shadow-md"
                            : "border-border hover:border-muted-foreground"
                        }`}
                        onClick={() => setSelectedBannerId(banner.id)}
                      >
                        <div className="aspect-[4/1] overflow-hidden rounded-md">
                          <img
                            src={banner.imageUrl}
                            alt={banner.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-sm font-medium">{banner.name}</p>
                          <p className="text-xs text-muted-foreground">{banner.category}</p>
                        </div>
                        {selectedBannerId === banner.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bannerType === "uploaded" && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="mt-4">
                        <label htmlFor="banner-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-primary hover:text-primary/80">
                            Upload a banner image
                          </span>
                          <input
                            id="banner-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // In a real app, you'd upload this to a file storage service
                                const url = URL.createObjectURL(file);
                                setUploadedBannerUrl(url);
                              }
                            }}
                          />
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recommended: 1600x400px (4:1 ratio)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {uploadedBannerUrl && (
                    <div className="relative">
                      <div className="aspect-[4/1] overflow-hidden rounded-md">
                        <img
                          src={uploadedBannerUrl}
                          alt="Uploaded banner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setUploadedBannerUrl("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Creator Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Creator Access</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {(creators as Creator[]).map((creator) => (
                  <div key={creator.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`creator-${creator.id}`}
                      checked={selectedCreators.includes(creator.id)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          setSelectedCreators([...selectedCreators, creator.id]);
                        } else {
                          setSelectedCreators(selectedCreators.filter(id => id !== creator.id));
                        }
                      }}
                    />
                    <Label htmlFor={`creator-${creator.id}`} className="flex items-center gap-2 cursor-pointer">
                      <CreatorAvatar
                        creator={{
                          id: creator.id,
                          username: creator.username,
                          displayName: creator.displayName,
                          profileImageUrl: (creator as any).profileImageUrl || null
                        }}
                        size="sm"
                      />
                      <div>
                        <div>{creator.displayName}</div>
                        <div className="text-sm text-muted-foreground">@{creator.username}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                  setBannerType("preset");
                  setSelectedBannerId(null);
                  setUploadedBannerUrl("");
                  setBannerCategory("all");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!pageEmoji || !pageName || !pageDescription) {
                    toast({
                      title: "Error",
                      description: "Please fill in all required fields.",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (bannerType === "preset" && !selectedBannerId) {
                    toast({
                      title: "Error",
                      description: "Please select a banner from the preset options.",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (bannerType === "uploaded" && !uploadedBannerUrl) {
                    toast({
                      title: "Error",
                      description: "Please upload a custom banner image.",
                      variant: "destructive",
                    });
                    return;
                  }

                  const selectedBanner = (banners as BannerInventory[]).find(b => b.id === selectedBannerId);

                  const pageData = {
                    emoji: pageEmoji,
                    name: pageName,
                    description: pageDescription,
                    creatorIds: selectedCreators,
                    tags: pageTags,
                    bannerType,
                    bannerUrl: bannerType === "preset" ? selectedBanner?.imageUrl : uploadedBannerUrl,
                    bannerInventoryId: bannerType === "preset" ? selectedBannerId : null,
                  };

                  createPageMutation.mutate(pageData);
                }}
                disabled={createPageMutation.isPending}
              >
                {createPageMutation.isPending ? "Creating..." : "Create Page"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Add Content Button */}
      <Button
        onClick={() => setIsAddContentDialogOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Content Modal */}
      <Dialog open={isAddContentDialogOpen} onOpenChange={setIsAddContentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Add Content to Inspiration Boards
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => setIsAddContentDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Creator Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Select Creators</Label>
                <p className="text-sm text-muted-foreground">Choose creators to manage their inspiration content</p>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-creators"
                    checked={selectedContentCreators.length === (creators || []).length}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        setSelectedContentCreators(creators || []);
                      } else {
                        setSelectedContentCreators([]);
                      }
                    }}
                  />
                  <Label htmlFor="select-all-creators" className="font-medium">
                    Select All Creators
                  </Label>
                </div>
                
                {creators?.map((creator: Creator) => (
                  <div key={creator.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`creator-${creator.id}`}
                      checked={selectedContentCreators.some(c => c.id === creator.id)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          setSelectedContentCreators([...selectedContentCreators, creator]);
                        } else {
                          setSelectedContentCreators(selectedContentCreators.filter(c => c.id !== creator.id));
                        }
                      }}
                    />
                    <Label htmlFor={`creator-${creator.id}`} className="flex items-center gap-2">
                      {creator.displayName}
                      <span className="text-sm text-muted-foreground">@{creator.username}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Content Details */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Content Category</Label>
                <Select
                  value={selectedContentSection?.id.toString() || ""}
                  onValueChange={(value) => {
                    const section = sections?.find((s: ContentSection) => s.id.toString() === value);
                    setSelectedContentSection(section || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sections?.map((section: ContentSection) => (
                      <SelectItem key={section.id} value={section.id.toString()}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Type Tabs */}
              <div>
                <Label className="text-base font-medium">Content Type</Label>
                <div className="flex space-x-1 mt-2 p-1 bg-muted rounded-lg">
                  <Button
                    variant={contentType === "text" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setContentType("text")}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Text
                  </Button>
                  <Button
                    variant={contentType === "image" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setContentType("image")}
                    className="flex-1"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Image
                  </Button>
                  <Button
                    variant={contentType === "video" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setContentType("video")}
                    className="flex-1"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                  <Button
                    variant={contentType === "link" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setContentType("link")}
                    className="flex-1"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link
                  </Button>
                </div>
              </div>

              {/* Content Form Fields */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="content-title">Title *</Label>
                  <Input
                    id="content-title"
                    value={contentTitle}
                    onChange={(e) => setContentTitle(e.target.value)}
                    placeholder="Enter content title..."
                  />
                </div>

                <div>
                  <Label htmlFor="content-description">Description</Label>
                  <Textarea
                    id="content-description"
                    value={contentDescription}
                    onChange={(e) => setContentDescription(e.target.value)}
                    placeholder="Enter content description..."
                    rows={2}
                  />
                </div>

                {/* Content Type Specific Fields */}
                {contentType === "text" && (
                  <div>
                    <Label htmlFor="content-text">Text Content *</Label>
                    <Textarea
                      id="content-text"
                      value={contentText}
                      onChange={(e) => setContentText(e.target.value)}
                      placeholder="Enter your text content..."
                      rows={4}
                    />
                  </div>
                )}

                {contentType === "link" && (
                  <div>
                    <Label htmlFor="content-url">URL *</Label>
                    <Input
                      id="content-url"
                      type="url"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                )}

                {(contentType === "image" || contentType === "video") && (
                  <div>
                    <Label htmlFor="content-files">Upload {contentType === "image" ? "Images" : "Videos"} *</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={contentType === "image" ? "image/*" : "video/*"}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="text-center">
                        {uploadedFiles.length > 0 ? (
                          <div>
                            <p className="text-sm font-medium">
                              {uploadedFiles.length} file(s) selected
                            </p>
                            <div className="mt-2 space-y-1">
                              {uploadedFiles.map((file, index) => (
                                <p key={index} className="text-xs text-muted-foreground">
                                  {file.name}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload {contentType === "image" ? "images" : "videos"}
                            </p>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose Files
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetAddContentForm();
                    setIsAddContentDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddContent}
                  disabled={addContentMutation.isPending}
                >
                  {addContentMutation.isPending ? "Adding..." : "Add Content"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Library Popup Dialog */}
      <Dialog open={!!openLibraryPageId} onOpenChange={() => setOpenLibraryPageId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Inspiration Library: {pages.find(p => p.id === openLibraryPageId)?.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => setOpenLibraryPageId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {isLoadingLibrary ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-muted-foreground">Loading library content...</div>
              </div>
            ) : libraryContent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No content in this library yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {libraryContent.map((item: ContentItem) => (
                  <div key={item.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {/* Media Preview */}
                    <div className="aspect-square bg-muted relative">
                      {item.fileUrl ? (
                        item.mediaType === 'video' ? (
                          <video
                            src={item.fileUrl}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                          />
                        ) : (
                          <img
                            src={item.fileUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Media Type Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.mediaType}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Content Info */}
                    <div className="p-3">
                      <h4 className="font-medium text-sm mb-1 line-clamp-1">{item.title}</h4>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                      )}
                      {item.instructions && (
                        <p className="text-xs text-blue-600 mb-2 line-clamp-2">📝 {item.instructions}</p> 
                      )}
                      
                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              +{item.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}