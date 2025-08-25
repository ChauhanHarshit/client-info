import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, Info, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useCrmAuth } from '@/contexts/CrmAuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PageBannerProps {
  pageId: number;
  pageName: string;
  className?: string;
}

interface PageBanner {
  id: number;
  page_id: number;
  banner_image_url: string;
  banner_alt_text?: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export function PageBanner({ pageId, pageName, className }: PageBannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [altText, setAltText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { employee } = useCrmAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query to fetch page banner
  const { data: banner, isLoading } = useQuery({
    queryKey: ['page-banner', pageId],
    queryFn: async () => {
      const response = await fetch(`/api/page-banners/${pageId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch banner');
      }
      const data = await response.json();
      return data;
    },
    enabled: !!pageId
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Failed to upload file');
      }
      
      const data = await response.json();
      return data.file?.url;
    }
  });

  // Mutation to save banner
  const saveBannerMutation = useMutation({
    mutationFn: async ({ pageId: pid, imageUrl, altText }: { pageId: number; imageUrl: string; altText: string }) => {
      const requestBody = {
        pageId: Number(pid), // Ensure it's a number
        bannerImageUrl: imageUrl,
        bannerAltText: altText
      };
      
      const response = await fetch('/api/page-banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Banner save failed:', response.status, errorData);
        throw new Error('Failed to save banner');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-banner', pageId] });
      setIsEditing(false);
      setSelectedImage(null);
      setImagePreview('');
      setAltText('');
      toast({
        title: "Banner saved",
        description: "Page banner has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save banner. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation to delete banner
  const deleteBannerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/page-banners/${pageId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete banner');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-banner', pageId] });
      setIsEditing(false);
      setSelectedImage(null);
      setImagePreview('');
      setAltText('');
      toast({
        title: "Banner deleted",
        description: "Page banner has been removed.",
      });
    }
  });

  const handleEdit = () => {
    setIsEditing(true);
    setAltText(banner?.banner_alt_text || '');
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSave = async () => {
    if (!selectedImage && !banner) {
      toast({
        title: "No image selected",
        description: "Please select an image for the banner",
        variant: "destructive",
      });
      return;
    }

    try {
      let imageUrl = banner?.banner_image_url || '';
      
      if (selectedImage) {
        // Upload new image
        imageUrl = await uploadFileMutation.mutateAsync(selectedImage);
      }
      
      // Save banner with image URL using mutation
      await saveBannerMutation.mutateAsync({
        pageId,
        imageUrl,
        altText: altText.trim()
      });
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedImage(null);
    setImagePreview('');
    setAltText('');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this banner?')) {
      deleteBannerMutation.mutate();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-32 bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  // No banner and not editing - show admin controls
  if (!banner && !isEditing) {
    return (
      <div className={cn("mb-6", className)}>
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 text-blue-700">
            <ImageIcon className="h-4 w-4" />
            <span className="text-sm font-medium">No banner image set for {pageName}</span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="h-4 w-4 mr-1" />
            Add Banner
          </Button>
        </div>
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className={cn("mb-6", className)}>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-blue-900">
                  {banner ? 'Edit Banner Image' : 'Add Banner Image'} for {pageName}
                </h4>
                <Badge variant="outline" className="text-xs">
                  Admin Only
                </Badge>
              </div>
              
              {/* File Upload Area */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  isDragOver 
                    ? "border-blue-500 bg-blue-100" 
                    : "border-blue-300 bg-white hover:border-blue-400 hover:bg-blue-50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Banner preview"
                      className="max-h-32 mx-auto rounded-lg shadow-sm"
                    />
                    <p className="text-sm text-blue-600">
                      {selectedImage?.name} ({((selectedImage?.size || 0) / (1024 * 1024)).toFixed(1)}MB)
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(null);
                        setImagePreview('');
                      }}
                    >
                      Change Image
                    </Button>
                  </div>
                ) : banner?.banner_image_url ? (
                  <div className="space-y-4">
                    <img
                      src={banner.banner_image_url}
                      alt={banner.banner_alt_text || 'Current banner'}
                      className="max-h-32 mx-auto rounded-lg shadow-sm"
                    />
                    <p className="text-sm text-blue-600">Current banner image</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Replace Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-blue-400" />
                    <div>
                      <p className="text-lg font-medium text-blue-700">
                        Drop image here or click to browse
                      </p>
                      <p className="text-sm text-blue-500 mt-1">
                        Supports PNG, JPG, GIF • Max 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Alt Text Input */}
              <div className="space-y-2">
                <Label htmlFor="altText" className="text-sm font-medium">
                  Alt Text (Optional)
                </Label>
                <Textarea
                  id="altText"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the banner image for accessibility..."
                  className="resize-none"
                  rows={2}
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={(!selectedImage && !banner) || saveBannerMutation.isPending || uploadFileMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saveBannerMutation.isPending || uploadFileMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saveBannerMutation.isPending || uploadFileMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                
                {banner && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteBannerMutation.isPending}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Display mode - show banner image with admin edit option
  if (banner) {
    return (
      <div className={cn("mb-6", className)}>
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="relative">
            <img
              src={banner.banner_image_url}
              alt={banner.banner_alt_text || `Banner for ${pageName}`}
              className="w-full h-32 object-cover"
            />
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-white/90 backdrop-blur-sm">
                Page Banner
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleEdit}
                className="bg-white/90 hover:bg-white backdrop-blur-sm"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {banner.updated_at && (
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(banner.updated_at).toLocaleDateString()}
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return null;
}