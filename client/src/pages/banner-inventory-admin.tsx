import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, Tag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function BannerInventoryAdmin() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerInventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    category: "",
    tags: [] as string[],
    aspectRatio: "4:1",
    width: 1600,
    height: 400,
  });
  const [newTag, setNewTag] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch banner inventory
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["/api/banner-inventory"],
  });

  // Create banner mutation
  const createBannerMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/banner-inventory", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: async () => {
      // Aggressive cache invalidation
      await queryClient.invalidateQueries({ queryKey: ["/api/banner-inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/inspiration-pages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/page-templates"] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ["/api/banner-inventory"] });
      
      toast({
        title: "Success",
        description: "Banner created successfully",
      });
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create banner",
        variant: "destructive",
      });
    },
  });

  // Update banner mutation
  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/banner-inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: async () => {
      // Aggressive cache invalidation
      await queryClient.invalidateQueries({ queryKey: ["/api/banner-inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/inspiration-pages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/page-templates"] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ["/api/banner-inventory"] });
      
      toast({
        title: "Success",
        description: "Banner updated successfully",
      });
      resetForm();
      setEditingBanner(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update banner",
        variant: "destructive",
      });
    },
  });

  // Delete banner mutation
  const deleteBannerMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/banner-inventory/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      // Aggressive cache invalidation
      await queryClient.invalidateQueries({ queryKey: ["/api/banner-inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/inspiration-pages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/page-templates"] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ["/api/banner-inventory"] });
      
      toast({
        title: "Success",
        description: "Banner deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete banner",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      imageUrl: "",
      category: "",
      tags: [],
      aspectRatio: "4:1",
      width: 1600,
      height: 400,
    });
    setNewTag("");
  };

  const handleEdit = (banner: BannerInventoryItem) => {
    setEditingBanner(banner);
    setFormData({
      name: banner.name,
      description: banner.description || "",
      imageUrl: banner.imageUrl,
      category: banner.category,
      tags: banner.tags || [],
      aspectRatio: banner.aspectRatio,
      width: banner.width,
      height: banner.height,
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.imageUrl.trim() || !formData.category.trim()) {
      toast({
        title: "Error",
        description: "Name, image URL, and category are required",
        variant: "destructive",
      });
      return;
    }

    const bannerData = {
      ...formData,
      createdBy: "dev-user-123", // This would come from auth context
    };

    if (editingBanner) {
      updateBannerMutation.mutate({ id: editingBanner.id, data: bannerData });
    } else {
      createBannerMutation.mutate(bannerData);
    }
  };

  const categories = [...new Set(banners.map((b: BannerInventoryItem) => b.category))];
  const filteredBanners = selectedCategory === "all" 
    ? banners 
    : banners.filter((b: BannerInventoryItem) => b.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Banner Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage preset banner images for creator pages
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "Edit Banner" : "Add New Banner"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Banner Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Modern Gradient"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Luxury, Pastel, Minimal, etc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL *</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/banner.jpg"
                />
              </div>

              {formData.imageUrl && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <img
                    src={formData.imageUrl}
                    alt="Banner preview"
                    className="w-full h-24 object-cover rounded-lg border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description of the banner style..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                  <Select 
                    value={formData.aspectRatio} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, aspectRatio: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4:1">4:1 (Banner)</SelectItem>
                      <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                      <SelectItem value="3:1">3:1 (Ultra-wide)</SelectItem>
                      <SelectItem value="2:1">2:1 (Landscape)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="width">Width (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={formData.width}
                    onChange={(e) => setFormData(prev => ({ ...prev, width: parseInt(e.target.value) || 1600 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData(prev => ({ ...prev, height: parseInt(e.target.value) || 400 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                  />
                  <Button onClick={addTag} variant="outline">
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setEditingBanner(null);
                    setIsCreateDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createBannerMutation.isPending || updateBannerMutation.isPending}
                >
                  {editingBanner ? "Update Banner" : "Create Banner"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          onClick={() => setSelectedCategory("all")}
          size="sm"
        >
          All ({banners.length})
        </Button>
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            size="sm"
          >
            {category} ({banners.filter((b: BannerInventoryItem) => b.category === category).length})
          </Button>
        ))}
      </div>

      {/* Banner Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading banners...</div>
      ) : filteredBanners.length === 0 ? (
        <div className="text-center py-8">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No banners found</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === "all" 
              ? "Start by adding your first banner to the inventory."
              : `No banners found in the "${selectedCategory}" category.`
            }
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Banner
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanners.map((banner: BannerInventoryItem) => (
            <Card key={banner.id} className="overflow-hidden">
              <CardContent className="p-0">
                <img
                  src={banner.imageUrl}
                  alt={banner.name}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/api/placeholder/400/200";
                  }}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{banner.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {banner.category}
                      </Badge>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleEdit(banner);
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBannerMutation.mutate(banner.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {banner.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {banner.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{banner.width}×{banner.height}</span>
                    <span>{banner.aspectRatio}</span>
                  </div>
                  
                  {banner.tags && banner.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {banner.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {banner.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{banner.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}