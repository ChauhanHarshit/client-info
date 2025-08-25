import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Upload, Link, Type, Image, Video, Star, Archive, Trash2, ArrowLeft, Grid, List, Filter, Search, Download, Copy } from "lucide-react";
import { Creator, ContentSection, CreatorInspirationItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const mediaTypeIcons = {
  text: Type,
  image: Image,
  video: Video,
  link: Link,
};

const mediaTypeColors = {
  text: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  image: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  video: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  link: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export default function ContentInspiration() {
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [selectedSection, setSelectedSection] = useState<ContentSection | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newPageForm, setNewPageForm] = useState({
    title: '',
    emoji: '',
    description: '',
    contentType: '',
    tags: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch creators
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["/api/creators"],
  });

  // Fetch content sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["/api/content-sections"],
  });

  // Fetch inspiration items for selected creator and section
  const { data: inspirationItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/creators", selectedCreator?.id, "inspiration", selectedSection?.id],
    enabled: !!selectedCreator && !!selectedSection,
  });

  // Create inspiration page mutation
  const createPageMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/inspiration-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          createdById: 'dev-user-123',
          createdByName: 'Team Member',
        }),
      });
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] });
      queryClient.refetchQueries({ queryKey: ['/api/inspiration-pages'] });
      
      toast({
        title: "Page Created",
        description: `${newPage.title} has been created successfully.`,
      });
      
      // Reset form and close dialog
      setNewPageForm({
        title: '',
        emoji: '',
        description: '',
        contentType: '',
        tags: '',
      });
      setIsCreateDialogOpen(false);
      
      // Navigate to the new page's Notion editor
      setLocation(`/notion/${newPage.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create inspiration page.",
        variant: "destructive",
      });
    },
  });

  // Delete inspiration item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest(`/api/creators/${selectedCreator?.id}/inspiration/${itemId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators", selectedCreator?.id, "inspiration"] });
      toast({
        title: "Success",
        description: "Inspiration item deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete inspiration item.",
        variant: "destructive",
      });
    },
  });

  // File upload handler
  const handleFileUpload = async (file: File, type: "image" | "video") => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("creatorId", selectedCreator?.id.toString() || "");
      formData.append("sectionId", selectedSection?.id.toString() || "");

      const response = await fetch("/api/upload/inspiration", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      
      // Create inspiration item with uploaded file
      await createItemMutation.mutateAsync({
        title: file.name,
        description: `Uploaded ${type}`,
        mediaType: type,
        imageUrl: type === "image" ? result.url : undefined,
        videoUrl: type === "video" ? result.url : undefined,
        thumbnailUrl: result.thumbnailUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        sectionId: selectedSection?.id,
      });

      toast({
        title: "Success",
        description: `${type} uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to upload ${type}.`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedItems.map(itemId => 
          deleteItemMutation.mutateAsync(itemId)
        )
      );
      setSelectedItems([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete some items.",
        variant: "destructive",
      });
    }
  };

  // Filter and search items
  const filteredItems = (inspirationItems || []).filter((item: any) => {
    const matchesSearch = item?.title?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
                         item?.description?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
                         item?.tags?.some((tag: string) => tag?.toLowerCase()?.includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterType === "all" || item?.mediaType === filterType;
    
    return matchesSearch && matchesFilter && !item?.isArchived;
  });

  if (creatorsLoading || sectionsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Content Inspiration</h1>
              <p className="text-muted-foreground">Manage content inspiration boards for creators</p>
            </div>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Inspiration</h1>
            <p className="text-muted-foreground">Manage content inspiration boards for creators</p>
          </div>
        </div>
      </div>

      {/* Creator and Section Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Creator</CardTitle>
            <CardDescription>Choose a creator to manage their inspiration content</CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={(value) => {
              const creator = creators.find((c: Creator) => c.id.toString() === value);
              setSelectedCreator(creator || null);
              setSelectedSection(null);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a creator..." />
              </SelectTrigger>
              <SelectContent>
                {creators.map((creator: Creator) => (
                  <SelectItem key={creator.id} value={creator.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{creator.displayName}</span>
                      <span className="text-muted-foreground">@{creator.username}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Content Category</CardTitle>
            <CardDescription>Choose a content category for inspiration items</CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              disabled={!selectedCreator}
              onValueChange={(value) => {
                const section = sections.find((s: ContentSection) => s.id.toString() === value);
                setSelectedSection(section || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a section..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section: ContentSection) => (
                  <SelectItem key={section.id} value={section.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{section.name}</span>
                      <Badge variant="outline">{section.type}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Content Management */}
      {selectedCreator && selectedSection && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">
                {selectedCreator.displayName} - {selectedSection.name}
              </h2>
              <Badge variant="secondary">
                {filteredItems.length} items
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              {selectedItems.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedItems.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Inspiration Items</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedItems.length} selected items? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Inspiration Page
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Inspiration Page</DialogTitle>
                    <DialogDescription>
                      Create a new inspiration page for {selectedCreator?.displayName}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="page-title">Page Title</Label>
                      <Input 
                        value={newPageForm.title} 
                        onChange={(e) => setNewPageForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter page title..." 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="page-emoji">Emoji (optional)</Label>
                      <Input 
                        value={newPageForm.emoji} 
                        onChange={(e) => setNewPageForm(prev => ({ ...prev, emoji: e.target.value }))}
                        placeholder="📝" 
                        maxLength={2} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="page-description">Description</Label>
                      <Textarea 
                        value={newPageForm.description} 
                        onChange={(e) => setNewPageForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter page description..." 
                        rows={3} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="page-content-type">Content Type</Label>
                      <Select 
                        value={newPageForm.contentType} 
                        onValueChange={(value) => setNewPageForm(prev => ({ ...prev, contentType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ppv">PPV (OnlyFans)</SelectItem>
                          <SelectItem value="sexting_sets">Sexting Sets (OnlyFans)</SelectItem>
                          <SelectItem value="fan_gifts">Fan Gifts (OnlyFans)</SelectItem>
                          <SelectItem value="wall_posts">Wall Posts (OnlyFans)</SelectItem>
                          <SelectItem value="instagram">Instagram (Social Media)</SelectItem>
                          <SelectItem value="twitter">Twitter (Social Media)</SelectItem>
                          <SelectItem value="pictures">Pictures (Social Media)</SelectItem>
                          <SelectItem value="videos">Videos (Social Media)</SelectItem>
                          <SelectItem value="ads">Ads (Social Media)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="page-tags">Tags (optional)</Label>
                      <Input 
                        value={newPageForm.tags} 
                        onChange={(e) => setNewPageForm(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="tag1, tag2, tag3..." 
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setNewPageForm({
                          title: '',
                          emoji: '',
                          description: '',
                          contentType: '',
                          tags: '',
                        });
                        setIsCreateDialogOpen(false);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={() => {
                        if (!newPageForm.title || !newPageForm.contentType) {
                          toast({
                            title: "Error",
                            description: "Please fill in the title and content type.",
                            variant: "destructive",
                          });
                          return;
                        }

                        const tags = newPageForm.tags.split(',').map(t => t.trim()).filter(Boolean);

                        createPageMutation.mutate({
                          title: newPageForm.title,
                          emoji: newPageForm.emoji,
                          description: newPageForm.description,
                          contentType: newPageForm.contentType,
                          tags,
                          assignedCreators: selectedCreator ? [selectedCreator.id] : [],
                        });
                      }} disabled={createPageMutation.isPending}>
                        {createPageMutation.isPending ? "Creating..." : "Create Page"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inspiration..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="link">Links</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Grid/List */}
          {itemsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
              {filteredItems.map((item: CreatorInspirationItem) => {
                const IconComponent = mediaTypeIcons[item.mediaType as keyof typeof mediaTypeIcons] || Type;
                const colorClass = mediaTypeColors[item.mediaType as keyof typeof mediaTypeColors] || mediaTypeColors.text;

                return (
                  <Card key={item.id} className={`${viewMode === "list" ? "flex" : ""} hover:shadow-md transition-shadow`}>
                    <div className="flex items-center space-x-2 p-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                        className="rounded"
                      />
                    </div>
                    
                    <CardHeader className={viewMode === "list" ? "flex-1" : ""}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4" />
                          <CardTitle className="text-sm">{item.title}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${colorClass} text-xs`}>
                            {item.mediaType}
                          </Badge>
                          {item.isFeatured && <Star className="h-4 w-4 text-yellow-500" />}
                        </div>
                      </div>
                      {item.description && (
                        <CardDescription className="text-xs">
                          {item.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className={viewMode === "list" ? "flex items-center space-x-4" : ""}>
                      {item.mediaType === "image" && item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className={`rounded object-cover ${viewMode === "list" ? "w-16 h-16" : "w-full h-32"}`}
                        />
                      )}
                      
                      {item.mediaType === "video" && item.videoUrl && (
                        <video
                          src={item.videoUrl}
                          className={`rounded object-cover ${viewMode === "list" ? "w-16 h-16" : "w-full h-32"}`}
                          controls
                        />
                      )}
                      
                      {item.mediaType === "link" && item.linkUrl && (
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {item.linkUrl}
                        </a>
                      )}
                      
                      {item.mediaType === "text" && item.content && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {item.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-wrap gap-1">
                          {item.tags?.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Inspiration Item</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{item.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteItemMutation.mutate(item.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No inspiration content yet</h3>
                  <p className="text-sm">Start building the inspiration board by adding content above.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}