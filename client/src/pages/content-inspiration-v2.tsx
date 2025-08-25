import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Search,
  Grid3X3,
  List,
  Upload,
  Trash2,
  Edit3,
  GripVertical,
  Type,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  FileText,
  ChevronDown,
  ChevronUp,
  Move
} from "lucide-react";
import type { Creator, ContentSection, CreatorInspirationItem } from "@shared/schema";

// Content type styling
const typeStyles = {
  text: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  image: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  video: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  link: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export default function ContentInspirationV2() {
  const [selectedCreators, setSelectedCreators] = useState<Creator[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ContentSection | null>(null);
  const [selectAllCreators, setSelectAllCreators] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [contentType, setContentType] = useState<"text" | "image" | "video" | "link">("text");
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  
  // Form states for content creation
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch creators
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["/api/creators"],
  });

  // Fetch content categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/content-sections"],
  });

  // Fetch inspiration items for selected creators and category
  const { data: inspirationItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/creators", selectedCreators.map(c => c.id).join(','), "inspiration", selectedCategory?.id],
    enabled: selectedCreators.length > 0 && !!selectedCategory,
  });

  // Create inspiration item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const promises = selectedCreators.map(creator =>
        apiRequest(`/api/creators/${creator.id}/inspiration`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            sectionId: selectedCategory?.id,
          }),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: `Content added to ${selectedCreators.length} creator(s) successfully!`,
      });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: number; data: any }) => {
      return apiRequest(`/api/creators/${selectedCreators[0]?.id}/inspiration/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setEditingItemId(null);
      toast({
        title: "Success",
        description: "Content updated successfully!",
      });
    },
  });

  // Delete items mutation
  const deleteItemsMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      const promises = itemIds.map(itemId =>
        apiRequest(`/api/creators/${selectedCreators[0]?.id}/inspiration/${itemId}`, {
          method: "DELETE",
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setSelectedItems([]);
      toast({
        title: "Success",
        description: "Content deleted successfully!",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setMediaUrl("");
    setTags([]);
    setNewTag("");
    setContentType("text");
  };

  const handleCreatorToggle = (creator: Creator) => {
    setSelectedCreators(prev => {
      const isSelected = prev.some(c => c.id === creator.id);
      if (isSelected) {
        const newSelection = prev.filter(c => c.id !== creator.id);
        if (newSelection.length === 0) {
          setSelectAllCreators(false);
        }
        return newSelection;
      } else {
        const newSelection = [...prev, creator];
        if (newSelection.length === creators.length) {
          setSelectAllCreators(true);
        }
        return newSelection;
      }
    });
  };

  const handleSelectAllCreators = () => {
    if (selectAllCreators) {
      setSelectedCreators([]);
      setSelectAllCreators(false);
    } else {
      setSelectedCreators(creators);
      setSelectAllCreators(true);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleCreateContent = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    const contentData = {
      title: title.trim(),
      description: description.trim(),
      mediaType: contentType,
      mediaUrl: mediaUrl.trim(),
      tags,
    };

    createItemMutation.mutate(contentData);
  };

  const handleDragStart = (itemId: number) => {
    setDraggedItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetItemId: number) => {
    if (!draggedItemId || draggedItemId === targetItemId) return;
    
    // Implement reordering logic here
    toast({
      title: "Info",
      description: "Drag and drop reordering will be implemented in the next update",
    });
    
    setDraggedItemId(null);
  };

  const filteredItems = (inspirationItems || []).filter((item: any) => {
    const matchesSearch = item?.title?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
                         item?.description?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
                         item?.tags?.some((tag: string) => tag?.toLowerCase()?.includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterType === "all" || item?.mediaType === filterType;
    
    return matchesSearch && matchesFilter && !item?.isArchived;
  });

  if (creatorsLoading || categoriesLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Content Inspiration</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Content Inspiration</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? (
              <List className="w-4 h-4" />
            ) : (
              <Grid3X3 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Creator Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Creators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectAllCreators}
                onCheckedChange={handleSelectAllCreators}
              />
              <Label htmlFor="select-all" className="font-medium">
                Select All ({creators.length} creators)
              </Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {creators.map((creator: any) => (
                <div
                  key={creator.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCreators.some(c => c.id === creator.id)
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => handleCreatorToggle(creator)}
                >
                  <Checkbox
                    checked={selectedCreators.some(c => c.id === creator.id)}
                    onCheckedChange={() => handleCreatorToggle(creator)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{creator.displayName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">@{creator.username}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedCreators.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {selectedCreators.length} creator(s) selected
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedCreators.map(creator => (
                    <Badge key={creator.id} variant="secondary" className="text-xs">
                      {creator.displayName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Content Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCategory?.id?.toString() || ""} onValueChange={(value) => {
            const category = categories.find((c: any) => c.id.toString() === value);
            setSelectedCategory(category || null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a content category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category: any) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedCategory && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium">{selectedCategory.name}</p>
              {selectedCategory.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedCategory.description}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Management */}
      {selectedCreators.length > 0 && selectedCategory && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Content Items</CardTitle>
              <div className="flex items-center space-x-2">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Content</DialogTitle>
                    </DialogHeader>
                    
                    <Tabs value={contentType} onValueChange={(value) => setContentType(value as any)}>
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="text" className="flex items-center">
                          <Type className="w-4 h-4 mr-1" />
                          Text
                        </TabsTrigger>
                        <TabsTrigger value="image" className="flex items-center">
                          <ImageIcon className="w-4 h-4 mr-1" />
                          Image
                        </TabsTrigger>
                        <TabsTrigger value="video" className="flex items-center">
                          <Video className="w-4 h-4 mr-1" />
                          Video
                        </TabsTrigger>
                        <TabsTrigger value="link" className="flex items-center">
                          <LinkIcon className="w-4 h-4 mr-1" />
                          Link
                        </TabsTrigger>
                      </TabsList>

                      <div className="mt-6 space-y-4">
                        <div>
                          <Label htmlFor="title">Title *</Label>
                          <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter content title..."
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter content description..."
                            rows={3}
                          />
                        </div>

                        {(contentType === "image" || contentType === "video" || contentType === "link") && (
                          <div>
                            <Label htmlFor="url">
                              {contentType === "link" ? "URL" : "Media URL"}
                            </Label>
                            <Input
                              id="url"
                              value={mediaUrl}
                              onChange={(e) => setMediaUrl(e.target.value)}
                              placeholder={`Enter ${contentType} URL...`}
                            />
                          </div>
                        )}

                        <div>
                          <Label>Tags</Label>
                          <div className="flex space-x-2 mt-1">
                            <Input
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              placeholder="Add a tag..."
                              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                            />
                            <Button type="button" onClick={handleAddTag} variant="outline">
                              Add
                            </Button>
                          </div>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tags.map(tag => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="cursor-pointer"
                                  onClick={() => handleRemoveTag(tag)}
                                >
                                  {tag} ×
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreateContent}
                            disabled={createItemMutation.isPending}
                          >
                            {createItemMutation.isPending ? "Adding..." : "Add Content"}
                          </Button>
                        </div>
                      </div>
                    </Tabs>
                  </DialogContent>
                </Dialog>

                {selectedCreators.length === 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/page-editor/new/${selectedCreators[0].id}`)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Create New Page
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Search and Filters */}
            <div className="flex space-x-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading content...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  No content found. Add some content to get started!
                </p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                {filteredItems.map((item: any) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 transition-all cursor-move ${
                      selectedItems.includes(item.id) ? "ring-2 ring-blue-500" : "hover:shadow-md"
                    }`}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(item.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <Badge className={typeStyles[item.mediaType as keyof typeof typeStyles]}>
                          {item.mediaType}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingItemId(item.id)}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedItems([item.id])}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="font-medium mb-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {item.description}
                      </p>
                    )}

                    {item.mediaUrl && (
                      <div className="mb-2">
                        {item.mediaType === "image" && (
                          <img
                            src={item.mediaUrl}
                            alt={item.title}
                            className="w-full h-32 object-cover rounded"
                          />
                        )}
                        {item.mediaType === "video" && (
                          <video
                            src={item.mediaUrl}
                            className="w-full h-32 object-cover rounded"
                            controls
                          />
                        )}
                        {item.mediaType === "link" && (
                          <a
                            href={item.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {item.mediaUrl}
                          </a>
                        )}
                      </div>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {selectedItems.length} item(s) selected
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteItemsMutation.mutate(selectedItems)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedItems([])}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}