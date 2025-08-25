import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Search,
  Grid,
  List,
  Upload,
  Trash2,
  Eye,
  MoreHorizontal,
  Filter,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  FileText,
} from "lucide-react";
import type { Creator, ContentSection, CreatorInspirationItem } from "@shared/schema";

const typeIcons = {
  image: ImageIcon,
  video: Video,
  link: LinkIcon,
  text: FileText,
};

const typeColors = {
  image: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  text: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  video: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  link: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export default function ContentInspiration() {
  const [selectedCreators, setSelectedCreators] = useState<Creator[]>([]);
  const [selectAllCreators, setSelectAllCreators] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ContentSection | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form states for content creation
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "image" | "video" | "link">("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkItems, setBulkItems] = useState<Array<{
    title: string;
    description: string;
    content: string;
    file?: File;
  }>>([{ title: "", description: "", content: "" }]);
  
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

  // Fetch inspiration items for selected creators and section
  const { data: inspirationItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/creator-inspiration-items", selectedCreators.map(c => c.id).sort().join(','), selectedSection?.id],
    enabled: selectedCreators.length > 0 && !!selectedSection,
    queryFn: async () => {
      const creatorIds = selectedCreators.map(c => c.id).join(',');
      const sectionId = selectedSection?.id;
      const url = `/api/creator-inspiration-items?creatorIds=${creatorIds}&sectionId=${sectionId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch inspiration items');
      return response.json();
    },
  });

  // Reset form function
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContent("");
    setMediaType("text");
    setMediaUrl("");
    setUploadedFiles([]);
    setBulkMode(false);
    setBulkItems([{ title: "", description: "", content: "" }]);
  };

  // Handle file upload
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo;
    });

    if (validFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please select image or video files only",
        variant: "destructive",
      });
      return;
    }

    setUploadedFiles(validFiles);
    
    // Auto-switch to bulk mode if multiple files
    if (validFiles.length > 1) {
      setBulkMode(true);
      setBulkItems(validFiles.map(file => ({
        title: file.name.split('.')[0],
        description: "",
        content: "",
        file
      })));
    } else {
      // For single file, update the media type and create a preview URL
      const file = validFiles[0];
      setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
      setMediaUrl(URL.createObjectURL(file));
    }
  };

  // Add new bulk item
  const addBulkItem = () => {
    setBulkItems([...bulkItems, { title: "", description: "", content: "" }]);
  };

  // Remove bulk item
  const removeBulkItem = (index: number) => {
    setBulkItems(bulkItems.filter((_, i) => i !== index));
  };

  // Update bulk item
  const updateBulkItem = (index: number, field: string, value: string) => {
    setBulkItems(bulkItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // Create inspiration item mutation for single items
  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const firstCreator = selectedCreators[0];
      return apiRequest(`/api/creators/${firstCreator.id}/inspiration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          sectionId: selectedSection?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/creator-inspiration-items", selectedCreators.map(c => c.id).sort().join(','), selectedSection?.id]
      });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Content added successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add content. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create bulk inspiration items mutation
  const createBulkItemsMutation = useMutation({
    mutationFn: async () => {
      const promises = bulkItems.map(async (item) => {
        const firstCreator = selectedCreators[0];
        const itemData = {
          title: item.title,
          description: item.description,
          content: item.content,
          mediaType: item.file ? (item.file.type.startsWith('image/') ? 'image' : 'video') : 'text',
          sectionId: selectedSection?.id,
        };
        
        // For files, create object URL (in real implementation, you'd upload to cloud storage)
        if (item.file) {
          if (item.file.type.startsWith('image/')) {
            itemData.imageUrl = URL.createObjectURL(item.file);
          } else {
            itemData.videoUrl = URL.createObjectURL(item.file);
          }
        }

        return apiRequest(`/api/creators/${firstCreator.id}/inspiration`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        });
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/creator-inspiration-items", selectedCreators.map(c => c.id).sort().join(','), selectedSection?.id]
      });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: `${bulkItems.length} content items added successfully!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add bulk content. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete items mutation
  const deleteItemsMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      const firstCreator = selectedCreators[0];
      return apiRequest(`/api/creators/${firstCreator.id}/inspiration/bulk-delete`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators", selectedCreators[0]?.id, "inspiration"] });
      setSelectedItems([]);
      toast({
        title: "Success",
        description: "Content deleted successfully!",
      });
    },
  });

  const handleFileUpload = async (file: File, type: "image" | "video") => {
    if (selectedCreators.length === 0 || !selectedSection) {
      toast({
        title: "Error",
        description: "Please select a creator and section first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("title", file.name);
      formData.append("sectionId", selectedSection.id.toString());

      // Mock upload - in real app this would upload to storage
      await createItemMutation.mutateAsync({
        type,
        title: file.name,
        content: file.name, // This would be the actual file URL
        tags: [],
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
    setIsUploading(false);
  };

  // Filter items based on search and type
  const filteredItems = inspirationItems.filter((item: any) => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.tags?.some?.((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "all" || item.mediaType === filterType;
    return matchesSearch && matchesType;
  });

  // Loading state
  if (creatorsLoading || sectionsLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
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
            <CardTitle>Select Creators</CardTitle>
            <CardDescription>Choose creators to manage their inspiration content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectAllCreators}
                onCheckedChange={(checked) => {
                  setSelectAllCreators(!!checked);
                  if (checked) {
                    setSelectedCreators(creators as Creator[]);
                  } else {
                    setSelectedCreators([]);
                  }
                  setSelectedSection(null);
                }}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select All Creators
              </label>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {creators.map((creator: Creator) => (
                <div key={creator.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`creator-${creator.id}`}
                    checked={selectedCreators.some(c => c.id === creator.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCreators([...selectedCreators, creator]);
                      } else {
                        setSelectedCreators(selectedCreators.filter(c => c.id !== creator.id));
                        setSelectAllCreators(false);
                      }
                      setSelectedSection(null);
                    }}
                  />
                  <label htmlFor={`creator-${creator.id}`} className="text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{creator.displayName}</span>
                      <span className="text-muted-foreground">@{creator.username}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            {selectedCreators.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedCreators.length} creator{selectedCreators.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Content Category</CardTitle>
            <CardDescription>Choose a content category for inspiration items</CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              disabled={selectedCreators.length === 0}
              onValueChange={(value) => {
                const section = sections.find((s: ContentSection) => s.id.toString() === value);
                setSelectedSection(section || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
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
      {selectedCreators.length > 0 && selectedSection && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  {selectedSection.name} - {selectedCreators.length > 1 
                    ? `${selectedCreators.length} Creators` 
                    : selectedCreators[0].displayName
                  }
                </CardTitle>
                <CardDescription>
                  Manage inspiration content for selected creator{selectedCreators.length > 1 ? 's' : ''} and category
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                >
                  {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="link">Links</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedItems.length} item(s) selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteItemsMutation.mutate(selectedItems)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}

            {/* Content Grid/List */}
            {itemsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No content found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || filterType !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Get started by adding some inspiration content"
                  }
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                : "space-y-2"
              }>
                {filteredItems.map((item: any) => {
                  const itemType = item.mediaType || 'text';
                  const Icon = typeIcons[itemType] || FileText;
                  return (
                    <Card key={item.id} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedItems([...selectedItems, item.id]);
                                } else {
                                  setSelectedItems(selectedItems.filter(id => id !== item.id));
                                }
                              }}
                            />
                            <Badge className={typeColors[itemType] || typeColors.text}>
                              <Icon className="h-3 w-3 mr-1" />
                              {itemType}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <h4 className="font-medium mb-2 line-clamp-2">{item.title}</h4>
                        
                        {item.content && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                            {item.content}
                          </p>
                        )}
                        
                        {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.tags.slice(0, 3).map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{item.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.createdAt || '').toLocaleDateString()}
                          </span>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Content Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button disabled={selectedCreators.length === 0 || !selectedSection}>
            <Plus className="h-4 w-4 mr-2" />
            Add Content
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Inspiration Content</DialogTitle>
            <DialogDescription>
              Add new inspiration content for {selectedCreators.length > 1 
                ? `${selectedCreators.length} creators` 
                : selectedCreators[0]?.displayName
              } in {selectedSection?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Bulk Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulkMode"
                checked={bulkMode}
                onCheckedChange={(checked) => setBulkMode(checked as boolean)}
              />
              <Label htmlFor="bulkMode">Bulk upload mode</Label>
            </div>

            {!bulkMode ? (
              // Single Item Form
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter content title..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter description..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mediaType">Content Type</Label>
                  <Select value={mediaType} onValueChange={(value: any) => setMediaType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(mediaType === "image" || mediaType === "video") && (
                  <div className="space-y-2">
                    <Label>Upload File or Enter URL</Label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = mediaType === 'image' ? 'image/*' : 'video/*';
                          input.multiple = false;
                          input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
                          input.click();
                        }}
                        className="flex items-center space-x-2"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Choose File</span>
                      </Button>
                      <Input
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder={`Or enter ${mediaType} URL...`}
                        className="flex-1"
                      />
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div className="text-sm text-green-600">
                        File selected: {uploadedFiles[0].name}
                      </div>
                    )}
                  </div>
                )}
                
                {mediaType === "link" && (
                  <div className="space-y-2">
                    <Label htmlFor="mediaUrl">Link URL</Label>
                    <Input
                      id="mediaUrl"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="Enter link URL..."
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter content details..."
                    rows={4}
                  />
                </div>
              </>
            ) : (
              // Bulk Items Form
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Bulk Content Items</Label>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,video/*';
                        input.multiple = true;
                        input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={addBulkItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {bulkItems.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Item {index + 1}</span>
                        {bulkItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBulkItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {item.file && (
                        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          File: {item.file.name}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 gap-3">
                        <Input
                          value={item.title}
                          onChange={(e) => updateBulkItem(index, 'title', e.target.value)}
                          placeholder="Title..."
                        />
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateBulkItem(index, 'description', e.target.value)}
                          placeholder="Description..."
                          rows={2}
                        />
                        <Textarea
                          value={item.content}
                          onChange={(e) => updateBulkItem(index, 'content', e.target.value)}
                          placeholder="Content details..."
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (bulkMode) {
                  // Validate bulk items
                  const validItems = bulkItems.filter(item => item.title.trim());
                  if (validItems.length === 0) {
                    toast({
                      title: "Error",
                      description: "Please add at least one item with a title",
                      variant: "destructive",
                    });
                    return;
                  }
                  createBulkItemsMutation.mutate();
                } else {
                  // Single item validation and submission
                  if (!title.trim()) {
                    toast({
                      title: "Error",
                      description: "Please enter a title",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  const itemData = {
                    title,
                    description,
                    content,
                    mediaType,
                  };

                  // Handle file upload for single item
                  if (uploadedFiles.length > 0) {
                    const file = uploadedFiles[0];
                    if (file.type.startsWith('image/')) {
                      itemData.imageUrl = URL.createObjectURL(file);
                    } else {
                      itemData.videoUrl = URL.createObjectURL(file);
                    }
                  } else {
                    // Use URL if provided
                    if (mediaType === "image" && mediaUrl) {
                      itemData.imageUrl = mediaUrl;
                    } else if (mediaType === "video" && mediaUrl) {
                      itemData.videoUrl = mediaUrl;
                    } else if (mediaType === "link" && mediaUrl) {
                      itemData.linkUrl = mediaUrl;
                    }
                  }

                  createItemMutation.mutate(itemData);
                }
              }}
              disabled={
                (bulkMode ? createBulkItemsMutation.isPending : createItemMutation.isPending) ||
                (bulkMode ? bulkItems.every(item => !item.title.trim()) : !title.trim())
              }
            >
              {bulkMode 
                ? (createBulkItemsMutation.isPending ? "Adding..." : `Add ${bulkItems.filter(item => item.title.trim()).length} Items`)
                : (createItemMutation.isPending ? "Adding..." : "Add Content")
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const type = file.type.startsWith("image/") ? "image" : "video";
            handleFileUpload(file, type);
          }
        }}
      />
    </div>
  );
}