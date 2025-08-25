import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Edit, 
  Trash2, 
  Eye, 
  Upload, 
  Download,
  Play,
  Pause,
  Image as ImageIcon,
  Video,
  Sparkles,
  FolderOpen,
  CheckSquare,
  Square,
  MoreHorizontal
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/queryClient';

interface MediaAsset {
  id: number;
  name: string;
  description?: string;
  type: 'banner' | 'animation';
  category: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileFormat: string;
  fileSize?: number;
  dimensions?: string;
  duration?: number;
  isAnimated: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  usedBy?: string[];
}

interface BannerAsset extends MediaAsset {
  type: 'banner';
  bannerType: string;
}

interface AnimationAsset extends MediaAsset {
  type: 'animation';
  animationType: string;
}

export default function ManageMedia() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'banner' | 'animation'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set());
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [bulkAction, setBulkAction] = useState<'delete' | 'activate' | 'deactivate' | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    type: 'banner' as 'banner' | 'animation',
    category: '',
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch banner library
  const { data: banners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ['/api/banner-library'],
  });

  // Fetch animation library
  const { data: animations = [], isLoading: animationsLoading } = useQuery({
    queryKey: ['/api/animation-library'],
  });

  // Combine media assets
  const allAssets: MediaAsset[] = [
    ...(banners || []).map((banner: any) => ({
      id: banner.id,
      name: banner.name || 'Untitled Banner',
      description: banner.description,
      type: 'banner' as const,
      category: banner.bannerType || banner.category || 'general',
      fileUrl: banner.imageUrl || banner.fileUrl,
      thumbnailUrl: banner.thumbnailUrl,
      fileFormat: banner.fileFormat || 'jpg',
      fileSize: banner.fileSize,
      dimensions: banner.dimensions,
      isAnimated: false,
      isActive: banner.isActive !== false,
      createdBy: banner.createdBy || 'Unknown',
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
      usageCount: banner.usageCount,
      usedBy: banner.usedBy,
    })),
    ...(animations || []).map((animation: any) => ({
      id: animation.id,
      name: animation.name || 'Untitled Animation',
      description: animation.description,
      type: 'animation' as const,
      category: animation.animationType || animation.category || 'general',
      fileUrl: animation.fileUrl,
      thumbnailUrl: animation.thumbnailUrl,
      fileFormat: animation.fileFormat || 'gif',
      fileSize: animation.fileSize,
      dimensions: animation.dimensions,
      duration: animation.duration,
      isAnimated: true,
      isActive: animation.isActive !== false,
      createdBy: animation.createdBy || 'Unknown',
      createdAt: animation.createdAt,
      updatedAt: animation.updatedAt,
      usageCount: animation.usageCount,
      usedBy: animation.usedBy,
    }))
  ];

  // Filter assets
  const filteredAssets = allAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || asset.type === filterType;
    const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(allAssets.map(asset => asset.category)));

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (asset: MediaAsset) => {
      const endpoint = asset.type === 'banner' ? '/api/banner-library' : '/api/animation-library';
      return apiRequest(`${endpoint}/${asset.id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banner-library'] });
      queryClient.invalidateQueries({ queryKey: ['/api/animation-library'] });
      toast({
        title: "Success",
        description: "Media asset deleted successfully",
      });
      setShowDeleteDialog(false);
      setEditingAsset(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete media asset",
        variant: "destructive",
      });
    },
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async ({ asset, data }: { asset: MediaAsset; data: any }) => {
      const endpoint = asset.type === 'banner' ? '/api/banner-library' : '/api/animation-library';
      return apiRequest(`${endpoint}/${asset.id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banner-library'] });
      queryClient.invalidateQueries({ queryKey: ['/api/animation-library'] });
      toast({
        title: "Success",
        description: "Media asset updated successfully",
      });
      setShowEditDialog(false);
      setEditingAsset(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update media asset",
        variant: "destructive",
      });
    },
  });

  // Upload asset mutation
  const uploadAssetMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const endpoint = uploadData.type === 'banner' ? '/api/banner-library' : '/api/animation-library';
      return fetch(endpoint, {
        method: 'POST',
        body: formData,
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banner-library'] });
      queryClient.invalidateQueries({ queryKey: ['/api/animation-library'] });
      toast({
        title: "Success",
        description: "Media asset uploaded successfully",
      });
      setShowUploadDialog(false);
      resetUploadForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload media asset",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (assetIds: number[]) => {
      const deletePromises = assetIds.map(id => {
        const asset = allAssets.find(a => a.id === id);
        if (asset) {
          const endpoint = asset.type === 'banner' ? '/api/banner-library' : '/api/animation-library';
          return apiRequest(`${endpoint}/${id}`, 'DELETE');
        }
      });
      return Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banner-library'] });
      queryClient.invalidateQueries({ queryKey: ['/api/animation-library'] });
      toast({
        title: "Success",
        description: `${selectedAssets.size} assets deleted successfully`,
      });
      setSelectedAssets(new Set());
      setBulkAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete some assets",
        variant: "destructive",
      });
    },
  });

  const handleSelectAsset = (assetId: number) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
    }
  };

  const handleEdit = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setShowEditDialog(true);
  };

  const handlePreview = (asset: MediaAsset) => {
    setPreviewAsset(asset);
    setShowPreviewDialog(true);
  };

  const handleDelete = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setShowDeleteDialog(true);
  };

  const handleBulkAction = (action: 'delete' | 'activate' | 'deactivate') => {
    setBulkAction(action);
    if (action === 'delete') {
      bulkDeleteMutation.mutate(Array.from(selectedAssets));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      
      // Auto-detect type and category based on file
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();
      
      let detectedType: 'banner' | 'animation' = 'banner';
      let suggestedCategory = 'general';
      
      // Determine type based on file characteristics
      if (fileType.includes('gif') || fileName.includes('gif') || 
          fileType.includes('video') || fileName.includes('.mp4') || fileName.includes('.webm')) {
        detectedType = 'animation';
        
        // Suggest animation categories
        if (fileName.includes('button') || fileName.includes('btn')) suggestedCategory = 'button';
        else if (fileName.includes('hover')) suggestedCategory = 'hover';
        else if (fileName.includes('loading') || fileName.includes('spinner')) suggestedCategory = 'loading';
        else if (fileName.includes('transition')) suggestedCategory = 'transition';
        else if (fileName.includes('border')) suggestedCategory = 'border';
        else if (fileName.includes('glow')) suggestedCategory = 'glow';
        else if (fileName.includes('particle')) suggestedCategory = 'particle';
        else if (fileName.includes('text')) suggestedCategory = 'text';
        else if (fileName.includes('icon')) suggestedCategory = 'icon';
        else if (fileName.includes('cursor')) suggestedCategory = 'cursor';
        else if (fileName.includes('overlay')) suggestedCategory = 'overlay';
      } else {
        // Suggest banner categories
        if (fileName.includes('header') || fileName.includes('top')) suggestedCategory = 'header';
        else if (fileName.includes('background') || fileName.includes('bg')) suggestedCategory = 'background';
        else if (fileName.includes('profile') || fileName.includes('avatar')) suggestedCategory = 'profile';
        else if (fileName.includes('cover')) suggestedCategory = 'cover';
        else if (fileName.includes('hero')) suggestedCategory = 'hero';
        else if (fileName.includes('footer') || fileName.includes('bottom')) suggestedCategory = 'footer';
        else if (fileName.includes('sidebar') || fileName.includes('side')) suggestedCategory = 'sidebar';
        else if (fileName.includes('section')) suggestedCategory = 'section';
      }
      
      setUploadData(prev => ({
        ...prev,
        type: detectedType,
        category: suggestedCategory,
        name: file.name.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }));

      // Create preview for images and videos
      if (fileType.includes('image') || fileType.includes('video')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For non-visual files, show file info instead
        setUploadPreview(null);
      }
    }
  };

  const handleUpload = () => {
    if (!uploadFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    if (!uploadData.name.trim()) {
      toast({
        title: "Error", 
        description: "Please provide a name for the asset",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadData.name);
    formData.append('description', uploadData.description);
    formData.append('category', uploadData.category);
    formData.append('isActive', uploadData.isActive.toString());

    uploadAssetMutation.mutate(formData);
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadData({
      name: '',
      description: '',
      type: 'banner',
      category: '',
      isActive: true
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTypeIcon = (asset: MediaAsset) => {
    if (asset.type === 'animation') {
      return <Sparkles className="w-4 h-4" />;
    }
    return <ImageIcon className="w-4 h-4" />;
  };

  const isLoading = bannersLoading || animationsLoading;

  return (
    <div className="min-h-screen p-6">
      {/* Back Button - Consistent with Content & Comms layout */}
      <div className="mb-8">
        <Button
          variant="outline"
          size="default"
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </Button>
      </div>

      {/* Title Section - Consistent positioning */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-6 h-6" />
            <h1 className="text-3xl font-bold">Manage Media</h1>
          </div>
          <Button 
            className="flex items-center space-x-2"
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="w-4 h-4" />
            <span>Upload New Asset</span>
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search media assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="banner">Banners</SelectItem>
                <SelectItem value="animation">Animations</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Mode & Bulk Actions */}
          <div className="flex items-center gap-4">
            {selectedAssets.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedAssets.size} selected</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            )}
            
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Selection */}
        {filteredAssets.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-2"
            >
              {selectedAssets.size === filteredAssets.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Select All ({filteredAssets.length})
            </Button>
          </div>
        )}

        {/* Media Grid/List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-32 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No media assets found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload First Asset
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="group hover:shadow-lg transition-shadow relative overflow-hidden">
                <CardContent className="p-4">
                  {/* Selection checkbox */}
                  <div className="flex items-start justify-between mb-3">
                    <Checkbox
                      checked={selectedAssets.has(asset.id)}
                      onCheckedChange={() => handleSelectAsset(asset.id)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(asset)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(asset)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(asset)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Preview */}
                  <div 
                    className="h-32 rounded-lg border bg-gray-50 mb-4 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                    onClick={() => handlePreview(asset)}
                  >
                    {asset.thumbnailUrl ? (
                      <img 
                        src={asset.thumbnailUrl} 
                        alt={asset.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        {getTypeIcon(asset)}
                        <div className="text-xs mt-1">{asset.fileFormat?.toUpperCase() || 'UNKNOWN'}</div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium truncate">{asset.name}</h4>
                      <Badge variant={asset.isActive ? 'default' : 'secondary'} className="text-xs">
                        {asset.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      {getTypeIcon(asset)}
                      <span className="capitalize">{asset.type}</span>
                      <span>•</span>
                      <span>{asset.category}</span>
                    </div>

                    <div className="text-xs text-gray-500">
                      <div>{formatFileSize(asset.fileSize)}</div>
                      {asset.dimensions && <div>{asset.dimensions}</div>}
                      {asset.duration && <div>{asset.duration}ms</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List view */
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <Checkbox
                      checked={selectedAssets.has(asset.id)}
                      onCheckedChange={() => handleSelectAsset(asset.id)}
                    />
                    
                    <div className="w-16 h-16 rounded border bg-gray-50 flex items-center justify-center flex-shrink-0">
                      {asset.thumbnailUrl ? (
                        <img 
                          src={asset.thumbnailUrl} 
                          alt={asset.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        getTypeIcon(asset)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{asset.name}</h4>
                        <Badge variant={asset.isActive ? 'default' : 'secondary'} className="text-xs">
                          {asset.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {asset.description || 'No description'}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="capitalize">{asset.type}</span>
                        <span>{asset.category}</span>
                        <span>{formatFileSize(asset.fileSize)}</span>
                        {asset.dimensions && <span>{asset.dimensions}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handlePreview(asset)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(asset)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(asset)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Media Asset</DialogTitle>
            <DialogDescription>
              Update the details for this media asset.
            </DialogDescription>
          </DialogHeader>
          {editingAsset && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  defaultValue={editingAsset.name}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  defaultValue={editingAsset.description || ''}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input 
                  id="category" 
                  defaultValue={editingAsset.category}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="active" 
                  defaultChecked={editingAsset.isActive}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // Handle update logic here
                    setShowEditDialog(false);
                  }}
                  disabled={updateAssetMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewAsset?.name}</DialogTitle>
            <DialogDescription>
              {previewAsset?.description || 'Media asset preview'}
            </DialogDescription>
          </DialogHeader>
          {previewAsset && (
            <div className="space-y-4">
              <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
                {previewAsset.type === 'animation' ? (
                  <img 
                    src={previewAsset.fileUrl} 
                    alt={previewAsset.name}
                    className="max-h-96 max-w-full object-contain"
                  />
                ) : (
                  <img 
                    src={previewAsset.fileUrl} 
                    alt={previewAsset.name}
                    className="max-h-96 max-w-full object-contain"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Type:</strong> {previewAsset.type}
                </div>
                <div>
                  <strong>Category:</strong> {previewAsset.category}
                </div>
                <div>
                  <strong>Format:</strong> {previewAsset.fileFormat}
                </div>
                <div>
                  <strong>Size:</strong> {formatFileSize(previewAsset.fileSize)}
                </div>
                {previewAsset.dimensions && (
                  <div>
                    <strong>Dimensions:</strong> {previewAsset.dimensions}
                  </div>
                )}
                {previewAsset.duration && (
                  <div>
                    <strong>Duration:</strong> {previewAsset.duration}ms
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{editingAsset?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => editingAsset && deleteAssetMutation.mutate(editingAsset)}
              disabled={deleteAssetMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload New Media Asset</DialogTitle>
            <DialogDescription>
              Upload a new banner or animation to your media library
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              {uploadFile ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    {uploadPreview ? (
                      uploadFile.type.includes('video') ? (
                        <video 
                          src={uploadPreview} 
                          className="max-h-48 max-w-full object-contain rounded"
                          controls
                          muted
                        />
                      ) : (
                        <img 
                          src={uploadPreview} 
                          alt="Upload preview"
                          className="max-h-48 max-w-full object-contain rounded"
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center space-y-2 p-8 border rounded bg-gray-50">
                        {uploadFile.type.includes('audio') ? (
                          <Video className="w-12 h-12 text-gray-400" />
                        ) : uploadFile.type.includes('pdf') ? (
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        )}
                        <div className="text-center">
                          <p className="font-medium">{uploadFile.name}</p>
                          <p className="text-sm text-gray-500">{uploadFile.type || 'Unknown file type'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setUploadFile(null);
                      setUploadPreview(null);
                    }}
                    className="mx-auto block"
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">Drop your file here or browse</p>
                    <p className="text-sm text-gray-500">Supports images (JPG, PNG, GIF), videos (MP4, WebM), audio (MP3, WAV), documents (PDF) up to 50MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="cursor-pointer">
                      Browse Files
                    </Button>
                  </label>
                </div>
              )}
            </div>

            {/* Asset Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="asset-name">Name *</Label>
                <Input 
                  id="asset-name"
                  value={uploadData.name}
                  onChange={(e) => setUploadData(prev => ({...prev, name: e.target.value}))}
                  placeholder="Enter asset name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="asset-type">Type</Label>
                <Select 
                  value={uploadData.type} 
                  onValueChange={(value: 'banner' | 'animation') => 
                    setUploadData(prev => ({...prev, type: value}))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="animation">Animation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="asset-category">Category</Label>
                <Select 
                  value={uploadData.category} 
                  onValueChange={(value) => setUploadData(prev => ({...prev, category: value}))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Header Banner</SelectItem>
                    <SelectItem value="background">Background</SelectItem>
                    <SelectItem value="profile">Profile Banner</SelectItem>
                    <SelectItem value="cover">Cover Image</SelectItem>
                    <SelectItem value="section">Section Banner</SelectItem>
                    <SelectItem value="hero">Hero Banner</SelectItem>
                    <SelectItem value="footer">Footer Banner</SelectItem>
                    <SelectItem value="sidebar">Sidebar Element</SelectItem>
                    <SelectItem value="button">Button Animation</SelectItem>
                    <SelectItem value="hover">Hover Effect</SelectItem>
                    <SelectItem value="loading">Loading Animation</SelectItem>
                    <SelectItem value="transition">Page Transition</SelectItem>
                    <SelectItem value="decoration">Decorative Element</SelectItem>
                    <SelectItem value="border">Border Animation</SelectItem>
                    <SelectItem value="glow">Glow Effect</SelectItem>
                    <SelectItem value="particle">Particle Effect</SelectItem>
                    <SelectItem value="text">Text Animation</SelectItem>
                    <SelectItem value="icon">Animated Icon</SelectItem>
                    <SelectItem value="cursor">Cursor Effect</SelectItem>
                    <SelectItem value="overlay">Overlay Animation</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 mt-6">
                <Checkbox 
                  id="asset-active"
                  checked={uploadData.isActive}
                  onCheckedChange={(checked) => 
                    setUploadData(prev => ({...prev, isActive: !!checked}))
                  }
                />
                <Label htmlFor="asset-active">Set as active</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="asset-description">Description</Label>
              <Textarea 
                id="asset-description"
                value={uploadData.description}
                onChange={(e) => setUploadData(prev => ({...prev, description: e.target.value}))}
                placeholder="Optional description of the asset"
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUploadDialog(false);
                  resetUploadForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!uploadFile || !uploadData.name.trim() || uploadAssetMutation.isPending}
              >
                {uploadAssetMutation.isPending ? "Uploading..." : "Upload Asset"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}