import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Grid, 
  List, 
  Eye, 
  Plus, 
  ArrowLeft,
  MoreHorizontal,
  Copy,
  ExternalLink,
  UserX,
  RefreshCw,
  Edit,
  Settings,
  ImageIcon
} from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import type { Creator } from "@shared/schema";

interface CreatorPage {
  pageId: string;
  creatorName: string;
  slug: string;
  currentUrl: string;
  status: "active" | "dropped";
  token: string;
  bannerImage?: string;
  layoutTemplateId?: string;
}

export default function CreatorsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "dropped">("all");
  const [editNameDialog, setEditNameDialog] = useState<{ open: boolean; creator: Creator | null }>({ open: false, creator: null });
  const [newName, setNewName] = useState("");
  const [assignTemplateDialog, setAssignTemplateDialog] = useState<{ open: boolean; creator: Creator | null }>({ open: false, creator: null });
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [addCreatorDialog, setAddCreatorDialog] = useState(false);
  const [editCreatorDialog, setEditCreatorDialog] = useState<{ open: boolean; creator: Creator | null }>({ open: false, creator: null });
  const [editCreatorData, setEditCreatorData] = useState({
    username: "",
    displayName: "",
    profileImageUrl: "",
    bannerImageUrl: "",
  });
  const [newCreatorData, setNewCreatorData] = useState({
    username: "",
    displayName: "",
    teamId: 1,
    profileImageUrl: "",
    bannerImageUrl: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Creators query with complete cache bypass
  const [creatorsCacheKey] = useState(() => `creators_${Date.now()}_${Math.random()}`);
  const { data: creators = [], isLoading: creatorsLoading, error: creatorsError } = useQuery({
    queryKey: [creatorsCacheKey],
    queryFn: async () => {
      console.log('🔄 Fetching creators with cache bypass - key:', creatorsCacheKey);
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
      
      const data = await response.json();
      const arrayData = Array.isArray(data) ? data : [];
      console.log(`✅ Fresh creators data from database (${arrayData.length} creators):`, arrayData.map(c => `${c.displayName} (${c.id})`));
      
      return arrayData;
    },
    // Disable all caching to ensure fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 1
  });

  // Fetch creator pages (this would be from a new API endpoint)
  const { data: creatorPages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["/api/creator-pages"],
  });

  // Fetch layout templates
  const { data: layoutTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/layout-templates"],
  });

  // Fetch creator layout configs to see assigned templates
  const { data: creatorLayoutConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ["/api/creator-layout-configs"],
  });

  // Create new creator mutation
  const createCreatorMutation = useMutation({
    mutationFn: async (creatorData: any) => {
      const response = await apiRequest('POST', '/api/creators', creatorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setAddCreatorDialog(false);
      setNewCreatorData({
        username: "",
        displayName: "",
        teamId: 1,
        profileImageUrl: "",
        bannerImageUrl: "",
      });
      toast({
        title: "Success",
        description: "New creator added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add creator: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update creator images mutation
  const updateCreatorImagesMutation = useMutation({
    mutationFn: async ({ creatorId, data }: { creatorId: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/creators/${creatorId}/images`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setEditCreatorDialog({ open: false, creator: null });
      setEditCreatorData({
        profileImageUrl: "",
        bannerImageUrl: "",
      });
      toast({
        title: "Success",
        description: "Creator images updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update creator images: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Create new page mutation
  const createPageMutation = useMutation({
    mutationFn: async (creatorId: number) => {
      const response = await apiRequest('POST', `/api/creator-pages`, { creatorId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-pages"] });
      toast({
        title: "Success",
        description: "New creator page created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create page: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Get or create creator page
  const getOrCreateCreatorPage = useMutation({
    mutationFn: async (creatorId: number) => {
      const response = await apiRequest('GET', `/api/creators/${creatorId}/page`);
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to get creator page: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // View creator page function
  const viewCreatorPage = async (creator: Creator) => {
    try {
      const page = await getOrCreateCreatorPage.mutateAsync(creator.id);
      if (page && page.slug) {
        // Navigate to internal creator page view
        setLocation(`/creator-page/${creator.id}?from=admin`);
      } else {
        toast({
          title: "Error",
          description: "Creator page not found or invalid slug",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open creator page",
        variant: "destructive",
      });
    }
  };

  // Copy link function - navigate to public creator page
  const copyCreatorLink = async (creator: Creator) => {
    try {
      // Fetch the creator's public token
      const response = await fetch(`/api/creators/${creator.id}/public-token`);
      const { publicToken } = await response.json();
      
      // Copy public creator page URL using completely random token format
      const publicUrl = `${window.location.origin}/${publicToken}`;
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link Copied",
        description: "Secure creator page link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to copy creator page link",
        variant: "destructive",
      });
    }
  };

  // Drop creator mutation
  const dropCreatorMutation = useMutation({
    mutationFn: async (creatorId: number) => {
      const response = await apiRequest('PATCH', `/api/creator-pages/${creatorId}/drop`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-pages"] });
      toast({
        title: "Success",
        description: "Creator dropped successfully",
      });
    },
  });

  // Reset URL mutation
  const resetUrlMutation = useMutation({
    mutationFn: async (creatorId: number) => {
      const response = await apiRequest('PATCH', `/api/creator-pages/${creatorId}/reset-url`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-pages"] });
      toast({
        title: "Success",
        description: "URL reset successfully",
      });
    },
  });

  // Edit name mutation
  const editNameMutation = useMutation({
    mutationFn: async ({ creatorId, name }: { creatorId: number; name: string }) => {
      const response = await apiRequest('PATCH', `/api/creator-pages/${creatorId}/edit-name`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-pages"] });
      setEditNameDialog({ open: false, creator: null });
      setNewName("");
      toast({
        title: "Success",
        description: "Creator name updated successfully",
      });
    },
  });

  // Assign template mutation
  const assignTemplateMutation = useMutation({
    mutationFn: async ({ creatorId, templateId }: { creatorId: number; templateId: number }) => {
      const response = await apiRequest('POST', '/api/creator-layout-configs/assign-template', {
        creatorId,
        templateId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-layout-configs"] });
      setAssignTemplateDialog({ open: false, creator: null });
      setSelectedTemplateId(null);
      toast({
        title: "Success",
        description: "Template assigned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign template",
        variant: "destructive",
      });
    },
  });

  const handleEditCreator = (creator: Creator) => {
    setEditCreatorData({
      username: creator.username,
      displayName: creator.displayName,
      profileImageUrl: creator.profileImageUrl || "",
      bannerImageUrl: creator.bannerImageUrl || "",
    });
    setEditCreatorDialog({ open: true, creator });
  };

  const handleEditName = (creator: Creator) => {
    setEditNameDialog({ open: true, creator });
    setNewName(creator.displayName);
  };

  if (creatorsLoading || pagesLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading creators...</p>
        </div>
      </div>
    );
  }

  // Create a map of creator pages by creator ID
  const pagesByCreator = new Map(creatorPages.map((page: any) => [page.creatorId, page]));

  // Filter creators based on search and status
  const filteredCreators = creators.filter((creator: Creator) => {
    const matchesSearch = creator.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         creator.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    
    const creatorPage = pagesByCreator.get(creator.id);
    const status = creatorPage?.status || "active";
    
    return matchesSearch && status === filterStatus;
  });

  return (
    <div className="px-6 pb-6 pt-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Creators</h1>
            <p className="text-slate-600 mt-1">Manage creator pages and settings</p>
          </div>
        </div>
        <Button onClick={() => setAddCreatorDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Creator
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex justify-between items-center space-x-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All
            </Button>
            <Button
              variant={filterStatus === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("active")}
            >
              Active
            </Button>
            <Button
              variant={filterStatus === "dropped" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("dropped")}
            >
              Dropped
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Creators Grid/List */}
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
        {filteredCreators.map((creator: Creator) => {
          const creatorPage = pagesByCreator.get(creator.id);
          const status = creatorPage?.status || "active";

          return (
            <Card key={creator.id} className={`relative overflow-hidden ${viewMode === "list" ? "flex items-center" : ""}`}>
              <CardHeader className={viewMode === "list" ? "flex-row items-center space-y-0 pb-2" : ""}>
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={creator.profileImageUrl || undefined} alt={creator.displayName} />
                      <AvatarFallback>{creator.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{creator.displayName}</CardTitle>
                      <CardDescription className="truncate">@{creator.username}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Badge variant={status === "active" ? "default" : "secondary"} className="whitespace-nowrap">
                      {status === "active" ? "Active" : "Dropped"}
                    </Badge>
                    {/* Settings Dropdown with proper positioning */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleEditName(creator)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Name
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditCreator(creator)}>
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Edit Images
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssignTemplateDialog({ open: true, creator })}>
                          <Settings className="w-4 h-4 mr-2" />
                          Assign Template
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => resetUrlMutation.mutate(creator.id)}
                          disabled={resetUrlMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reset URL
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => dropCreatorMutation.mutate(creator.id)}
                          disabled={dropCreatorMutation.isPending}
                          className="text-red-600"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Drop Creator
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className={viewMode === "list" ? "flex-1" : ""}>
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => viewCreatorPage(creator)}
                    disabled={getOrCreateCreatorPage.isPending}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => copyCreatorLink(creator)}
                    disabled={getOrCreateCreatorPage.isPending}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCreators.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <Settings className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No creators found</h3>
          <p className="text-slate-600">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Edit Name Dialog */}
      <Dialog open={editNameDialog.open} onOpenChange={(open) => setEditNameDialog({ open, creator: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Creator Name</DialogTitle>
            <DialogDescription>
              Update the display name for this creator's page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Creator name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditNameDialog({ open: false, creator: null })}>
                Cancel
              </Button>
              <Button 
                onClick={() => editNameDialog.creator && editNameMutation.mutate({ 
                  creatorId: editNameDialog.creator.id, 
                  name: newName 
                })}
                disabled={editNameMutation.isPending || !newName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Template Dialog */}
      <Dialog open={assignTemplateDialog.open} onOpenChange={(open) => setAssignTemplateDialog({ open, creator: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Layout Template</DialogTitle>
            <DialogDescription>
              Choose a layout template for {assignTemplateDialog.creator?.displayName}'s page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {Array.isArray(layoutTemplates) && layoutTemplates.map((template: any) => (
                <div 
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedTemplateId === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-gray-600">{template.description}</p>
                      )}
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedTemplateId === template.id ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setAssignTemplateDialog({ open: false, creator: null })}>
                Cancel
              </Button>
              <Button 
                onClick={() => assignTemplateDialog.creator && selectedTemplateId && assignTemplateMutation.mutate({ 
                  creatorId: assignTemplateDialog.creator.id, 
                  templateId: selectedTemplateId 
                })}
                disabled={assignTemplateMutation.isPending || !selectedTemplateId}
              >
                Assign Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Creator Dialog */}
      <Dialog open={addCreatorDialog} onOpenChange={setAddCreatorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Creator</DialogTitle>
            <DialogDescription>
              Create a new creator profile to manage their content and pages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Username</label>
              <Input
                placeholder="Enter username (e.g., sophia_rose)"
                value={newCreatorData.username}
                onChange={(e) => setNewCreatorData(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Display Name</label>
              <Input
                placeholder="Enter display name (e.g., Sophia Rose)"
                value={newCreatorData.displayName}
                onChange={(e) => setNewCreatorData(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Profile Picture</label>
              <ImageUpload
                type="profile"
                value={newCreatorData.profileImageUrl}
                onChange={(url) => setNewCreatorData(prev => ({ ...prev, profileImageUrl: url }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Banner Image</label>
              <ImageUpload
                type="banner"
                value={newCreatorData.bannerImageUrl}
                onChange={(url) => setNewCreatorData(prev => ({ ...prev, bannerImageUrl: url }))}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setAddCreatorDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!newCreatorData.username || !newCreatorData.displayName) {
                    toast({
                      title: "Error",
                      description: "Please fill in username and display name",
                      variant: "destructive",
                    });
                    return;
                  }
                  createCreatorMutation.mutate(newCreatorData);
                }}
                disabled={createCreatorMutation.isPending}
              >
                {createCreatorMutation.isPending ? "Creating..." : "Add Creator"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Creator Dialog */}
      <Dialog open={editCreatorDialog.open} onOpenChange={(open) => setEditCreatorDialog({ open, creator: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Creator Images</DialogTitle>
            <DialogDescription>
              Update profile picture and banner image for {editCreatorDialog.creator?.displayName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Profile Picture</label>
              <ImageUpload
                type="profile"
                value={editCreatorData.profileImageUrl}
                onChange={(url) => setEditCreatorData(prev => ({ ...prev, profileImageUrl: url }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Banner Image</label>
              <ImageUpload
                type="banner"
                value={editCreatorData.bannerImageUrl}
                onChange={(url) => setEditCreatorData(prev => ({ ...prev, bannerImageUrl: url }))}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setEditCreatorDialog({ open: false, creator: null })}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editCreatorDialog.creator) {
                    updateCreatorImagesMutation.mutate({
                      creatorId: editCreatorDialog.creator.id,
                      data: {
                        profileImageUrl: editCreatorData.profileImageUrl,
                        bannerImageUrl: editCreatorData.bannerImageUrl,
                      }
                    });
                  }
                }}
                disabled={updateCreatorImagesMutation.isPending}
              >
                {updateCreatorImagesMutation.isPending ? "Updating..." : "Update Images"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}