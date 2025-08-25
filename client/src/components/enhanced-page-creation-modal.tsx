import { useState, useEffect, useTransition } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, Smile, X, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface EnhancedPageCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPageCreated: (newPage?: any) => void;
  selectedCreators: number[];
}

export default function EnhancedPageCreationModal({
  isOpen,
  onClose,
  onPageCreated,
  selectedCreators
}: EnhancedPageCreationModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    emoji: "",
    description: "",
    bannerType: "preset" as "preset" | "upload",
    bannerInventoryId: null as number | null,
    bannerUrl: "",
    tags: [] as string[],
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customBannerFile, setCustomBannerFile] = useState<File | null>(null);
  const [newTag, setNewTag] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionStates, setActionStates] = useState({
    creating: false,
    uploading: false,
    validating: false,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch banner inventory
  const { data: bannerInventory = [], isLoading: bannersLoading } = useQuery({
    queryKey: ["/api/banner-inventory"],
    enabled: isOpen,
  });

  // Create page mutation
  const createPageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/inspiration-pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (newPage) => {
      setActionStates(prev => ({ ...prev, creating: false }));
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration-pages"] });
      toast({
        title: "Success",
        description: "Inspiration page created successfully",
      });
      onPageCreated(newPage);
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      setActionStates(prev => ({ ...prev, creating: false }));
      toast({
        title: "Error",
        description: error.message || "Failed to create page",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      emoji: "",
      description: "",
      bannerType: "preset",
      bannerInventoryId: null,
      bannerUrl: "",
      tags: [],
    });
    setCustomBannerFile(null);
    setNewTag("");
    setShowEmojiPicker(false);
    setHasUnsavedChanges(false);
  };

  const hasFormData = () => {
    return formData.title.trim() !== "" ||
           formData.emoji !== "" ||
           formData.description.trim() !== "" ||
           formData.tags.length > 0 ||
           formData.bannerInventoryId !== null ||
           customBannerFile !== null;
  };

  const handleClose = () => {
    if (hasFormData()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
      resetForm();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
    resetForm();
  };

  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  // Handle browser back button using hash-based approach
  useEffect(() => {
    if (isOpen) {
      // Add hash when modal opens
      const currentUrl = window.location.href;
      const hasHash = currentUrl.includes('#');
      if (!hasHash) {
        window.location.hash = 'modal-open';
      }
      
      const handleHashChange = () => {
        // If hash is removed (back button pressed), handle modal close
        if (!window.location.hash) {
          if (hasFormData()) {
            // Restore hash and show confirmation
            window.location.hash = 'modal-open';
            setShowConfirmDialog(true);
          } else {
            // Close the modal
            onClose();
            resetForm();
          }
        }
      };

      window.addEventListener('hashchange', handleHashChange);
      
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    } else {
      // Remove hash when modal closes
      if (window.location.hash === '#modal-open') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [isOpen, onClose]);

  const handleEmojiSelect = (emoji: any) => {
    setFormData(prev => ({ ...prev, emoji: emoji.native }));
    setShowEmojiPicker(false);
  };

  const handleBannerSelect = (bannerId: number) => {
    const selectedBanner = bannerInventory.find((b: BannerInventoryItem) => b.id === bannerId);
    if (selectedBanner) {
      setFormData(prev => ({
        ...prev,
        bannerInventoryId: bannerId,
        bannerUrl: selectedBanner.imageUrl,
      }));
    }
  };

  const handleCustomBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCustomBannerFile(file);
      // In a real implementation, you would upload the file to your storage service
      // For now, we'll create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        bannerUrl: previewUrl,
        bannerInventoryId: null,
      }));
    }
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
    // Instant UI feedback - show validation state
    setActionStates(prev => ({ ...prev, validating: true }));
    
    setTimeout(() => {
      if (!formData.title.trim()) {
        setActionStates(prev => ({ ...prev, validating: false }));
        toast({
          title: "Error",
          description: "Page title is required",
          variant: "destructive",
        });
        return;
      }

      if (!formData.emoji) {
        setActionStates(prev => ({ ...prev, validating: false }));
        toast({
          title: "Error",
          description: "Please select an emoji for the page",
          variant: "destructive",
        });
        return;
      }

      if (!formData.bannerUrl) {
        setActionStates(prev => ({ ...prev, validating: false }));
        toast({
          title: "Error",
          description: "Please select a banner image",
          variant: "destructive",
        });
        return;
      }

      // Validation passed - move to creating state
      setActionStates(prev => ({ ...prev, validating: false, creating: true }));
      
      const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const pageData = {
        title: formData.title,
        emoji: formData.emoji,
        slug,
        description: formData.description,
        bannerUrl: formData.bannerUrl,
        bannerType: formData.bannerType,
        bannerInventoryId: formData.bannerInventoryId,
        tags: formData.tags,
        createdById: "dev-user-123", // This would come from auth context
        createdByName: "Team Member",
      };

      startTransition(() => {
        createPageMutation.mutate(pageData);
      });
    }, 0);
  };

  const bannerCategories = [...new Set(bannerInventory.map((b: BannerInventoryItem) => b.category))];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Inspiration Page</DialogTitle>
          </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Page Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Page Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Weekly Do's – June 3rd"
              />
            </div>

            {/* Emoji Picker */}
            <div className="space-y-2">
              <Label>Page Emoji *</Label>
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-full justify-start"
                >
                  {formData.emoji ? (
                    <span className="text-2xl mr-2">{formData.emoji}</span>
                  ) : (
                    <Smile className="h-4 w-4 mr-2" />
                  )}
                  {formData.emoji ? "Change Emoji" : "Select Emoji"}
                </Button>
                
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 z-50 mt-2">
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="light"
                      previewPosition="none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the content and purpose of this page..."
              rows={3}
            />
          </div>

          {/* Banner Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Banner Image *</Label>
            
            <Tabs 
              value={formData.bannerType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, bannerType: value as "preset" | "upload" }))}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preset">Choose from Inventory</TabsTrigger>
                <TabsTrigger value="upload">Upload Custom Banner</TabsTrigger>
              </TabsList>

              <TabsContent value="preset" className="space-y-4">
                {bannersLoading ? (
                  <div className="text-center py-8">Loading banners...</div>
                ) : (
                  <>
                    {bannerCategories.length > 0 && (
                      <div className="space-y-4">
                        {bannerCategories.map(category => (
                          <div key={category} className="space-y-2">
                            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                              {category}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {bannerInventory
                                .filter((banner: BannerInventoryItem) => banner.category === category)
                                .map((banner: BannerInventoryItem) => (
                                  <Card
                                    key={banner.id}
                                    className={`cursor-pointer transition-all hover:shadow-md ${
                                      formData.bannerInventoryId === banner.id
                                        ? "ring-2 ring-primary"
                                        : ""
                                    }`}
                                    onClick={() => handleBannerSelect(banner.id)}
                                  >
                                    <CardContent className="p-2">
                                      <img
                                        src={banner.imageUrl}
                                        alt={banner.name}
                                        className="w-full h-20 object-cover rounded"
                                      />
                                      <p className="text-xs font-medium mt-1 truncate">
                                        {banner.name}
                                      </p>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Upload a custom banner image
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Recommended size: 1600x400px (JPG, PNG, GIF)
                    </p>
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif"
                      onChange={handleCustomBannerUpload}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                </div>
                
                {formData.bannerUrl && formData.bannerType === "upload" && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <img
                      src={formData.bannerUrl}
                      alt="Banner preview"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === "Enter" && addTag()}
              />
              <Button onClick={addTag} variant="outline">Add</Button>
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

          {/* Preview Section */}
          {(formData.title || formData.emoji || formData.bannerUrl) && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <Card>
                <CardContent className="p-0">
                  {formData.bannerUrl && (
                    <img
                      src={formData.bannerUrl}
                      alt="Banner preview"
                      className="w-full h-24 object-cover rounded-t-lg"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      {formData.emoji && (
                        <span className="text-xl">{formData.emoji}</span>
                      )}
                      <h3 className="font-semibold">
                        {formData.title || "Page Title"}
                      </h3>
                    </div>
                    {formData.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formData.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createPageMutation.isPending || actionStates.creating || actionStates.validating || !formData.title.trim() || !formData.emoji || !formData.bannerUrl}
              className={`${(actionStates.creating || actionStates.validating) ? 'opacity-75' : ''}`}
            >
              {actionStates.validating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionStates.creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionStates.validating ? "Validating..." : 
               actionStates.creating ? "Creating..." : 
               createPageMutation.isPending ? "Saving..." : 
               "Create Page"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog for Unsaved Changes */}
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to close without saving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelClose}>
            Keep Editing
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmClose}>
            Close Without Saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}