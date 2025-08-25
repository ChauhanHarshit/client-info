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
  Type,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  FileText,
} from "lucide-react";
import type { Creator, ContentSection, CreatorInspirationItem } from "@shared/schema";

// Content type styling
const typeStyles = {
  text: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  image: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  video: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  link: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export default function ContentInspiration() {
  const [selectedCreators, setSelectedCreators] = useState<Creator[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ContentSection | null>(null);
  const [selectAllCreators, setSelectAllCreators] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch creators
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["/api/creators"],
  });

  // Fetch content categories (renamed from sections)
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/content-sections"],
  });

  // Fetch inspiration items for first selected creator and category
  const { data: inspirationItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/creators", selectedCreators[0]?.id, "inspiration", selectedCategory?.id],
    enabled: selectedCreators.length > 0 && !!selectedCategory,
  });

  // Create inspiration item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create items for all selected creators
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
      toast({
        title: "Success",
        description: `Content added to ${selectedCreators.length} creator(s) successfully!`,
      });
    },
  });

  // Delete items mutation
  const deleteItemsMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      return apiRequest(`/api/creators/${selectedCreators[0]?.id}/inspiration/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
      });
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

  const handleFileUpload = async (file: File, type: "image" | "video") => {
    if (!selectedCreators.length || !selectedCategory) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const response = await fetch("/api/upload/inspiration", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      createItemMutation.mutate({
        title: file.name,
        mediaType: type,
        mediaUrl: result.url,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddItem = (type: "text" | "image" | "video" | "link") => {
    if (!selectedCreators.length || !selectedCategory) {
      toast({
        title: "Selection Required",
        description: "Please select creators and a content category first",
        variant: "destructive",
      });
      return;
    }

    if (type === "image" || type === "video") {
      fileInputRef.current?.click();
      fileInputRef.current!.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleFileUpload(file, type);
      };
    } else {
      setIsCreateDialogOpen(true);
    }
  };

  const filteredItems = (inspirationItems || []).filter((item: any) => {
    const matchesSearch = item?.title?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
                         item?.description?.toLowerCase()?.includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || item?.mediaType === filterType;
    return matchesSearch && matchesFilter;
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
        </CardContent>
      </Card>

      {/* Content Management */}
      {selectedCreators.length > 0 && selectedCategory && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Content for {selectedCategory.name}</CardTitle>
              <div className="flex items-center space-x-2">
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
            {/* Add Content Buttons */}
            <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddItem("text")}
              >
                <Type className="w-4 h-4 mr-1" />
                Add Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddItem("image")}
                disabled={isUploading}
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                {isUploading ? "Uploading..." : "Add Image"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddItem("video")}
                disabled={isUploading}
              >
                <Video className="w-4 h-4 mr-1" />
                {isUploading ? "Uploading..." : "Add Video"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddItem("link")}
              >
                <LinkIcon className="w-4 h-4 mr-1" />
                Add Link
              </Button>
            </div>

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

            {/* Content Grid */}
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
                    className={`border rounded-lg p-4 transition-all ${
                      selectedItems.includes(item.id) ? "ring-2 ring-blue-500" : "hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={typeStyles[item.mediaType as keyof typeof typeStyles]}>
                        {item.mediaType}
                      </Badge>
                      <div className="flex items-center space-x-1">
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Enter title..." />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Enter description..." rows={3} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                const title = (document.getElementById("title") as HTMLInputElement)?.value;
                const description = (document.getElementById("description") as HTMLTextAreaElement)?.value;
                if (title) {
                  createItemMutation.mutate({
                    title,
                    description,
                    mediaType: "text",
                  });
                }
              }}>
                Add Content
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}