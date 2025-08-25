import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  Image, 
  Video,
  Eye,
  Trash2,
  Plus,
  ArrowLeft,
  FolderOpen,
  Heart
} from "lucide-react";

export default function MediaManagementAdmin() {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [assetForm, setAssetForm] = useState({
    category: '',
    tags: '',
    description: ''
  });

  const queryClient = useQueryClient();

  // Fetch media assets (placeholder for now)
  const { data: mediaAssets = [] } = useQuery({
    queryKey: ['/api/media-assets'],
  });

  const uploadAssetMutation = useMutation({
    mutationFn: async (data: { file: File; category: string; tags: string; description: string }) => {
      // TODO: Implement actual file upload
      console.log('Uploading asset:', data);
      return { 
        id: Date.now(), 
        name: data.file.name,
        category: data.category,
        tags: data.tags.split(',').map(t => t.trim()),
        description: data.description,
        url: uploadPreview,
        type: data.file.type.startsWith('image/') ? 'image' : 'video',
        size: data.file.size,
        uploadedAt: new Date().toISOString()
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media-assets'] });
      setUploadFile(null);
      setUploadPreview('');
      setAssetForm({ category: '', tags: '', description: '' });
    },
  });

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('File size must be less than 50MB');
      return;
    }

    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleUploadAsset = () => {
    if (!uploadFile || !assetForm.category) return;
    
    uploadAssetMutation.mutate({
      file: uploadFile,
      category: assetForm.category,
      tags: assetForm.tags,
      description: assetForm.description
    });
  };

  // Sample media assets for demonstration
  const sampleAssets = [
    {
      id: 1,
      name: 'Gradient Background',
      category: 'backgrounds',
      type: 'image',
      tags: ['gradient', 'purple', 'modern'],
      description: 'Purple gradient background for headers'
    },
    {
      id: 2,
      name: 'Ocean Banner',
      category: 'banners',
      type: 'image',
      tags: ['ocean', 'blue', 'nature'],
      description: 'Ocean-themed banner for profiles'
    },
    {
      id: 3,
      name: 'Heart Icon',
      category: 'icons',
      type: 'image',
      tags: ['heart', 'love', 'green'],
      description: 'Animated heart icon for interactions'
    }
  ];

  const filteredAssets = selectedCategory === 'all' 
    ? sampleAssets 
    : sampleAssets.filter(asset => asset.category === selectedCategory);

  return (
    <div className="min-h-screen p-6">
      {/* Back Button */}
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

      {/* Title Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Media Management</h1>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground">
            Manage media assets for aesthetic themes and inspiration content
          </p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Media Assets
            </CardTitle>
            <CardDescription>
              Upload images, videos, and other media for use in aesthetic themes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload Area */}
              <div className="space-y-4">
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Drop files here or click to upload</p>
                    <p className="text-xs text-muted-foreground">
                      Supports images (JPG, PNG, WebP, GIF) and videos (MP4, WebM)
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />

                <div className="space-y-2">
                  <Label>Asset Category</Label>
                  <Select 
                    value={assetForm.category}
                    onValueChange={(value) => setAssetForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backgrounds">Backgrounds</SelectItem>
                      <SelectItem value="banners">Banners</SelectItem>
                      <SelectItem value="icons">Icons</SelectItem>
                      <SelectItem value="animations">Animations</SelectItem>
                      <SelectItem value="textures">Textures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Asset Tags</Label>
                  <Input 
                    placeholder="Add tags (e.g. dark, minimal, elegant)" 
                    value={assetForm.tags}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, tags: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    placeholder="Describe how this asset should be used..." 
                    value={assetForm.description}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleUploadAsset}
                  disabled={!uploadFile || !assetForm.category || uploadAssetMutation.isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadAssetMutation.isPending ? 'Uploading...' : 'Upload Asset'}
                </Button>
              </div>

              {/* Asset Preview */}
              <div className="space-y-4">
                <Label>Preview</Label>
                
                {uploadPreview ? (
                  <div className="border rounded-lg overflow-hidden">
                    {uploadFile?.type.startsWith('image/') ? (
                      <img 
                        src={uploadPreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover"
                      />
                    ) : uploadFile?.type.startsWith('video/') ? (
                      <video 
                        src={uploadPreview} 
                        className="w-full h-48 object-cover"
                        controls
                      />
                    ) : null}
                    <div className="p-3 bg-gray-50">
                      <p className="text-sm font-medium">{uploadFile?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {((uploadFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-8 bg-gray-50">
                    <div className="text-center text-muted-foreground">
                      <Image className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Library */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Media Library</CardTitle>
                <CardDescription>Browse and manage uploaded media assets</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="backgrounds">Backgrounds</SelectItem>
                    <SelectItem value="banners">Banners</SelectItem>
                    <SelectItem value="icons">Icons</SelectItem>
                    <SelectItem value="animations">Animations</SelectItem>
                    <SelectItem value="textures">Textures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Sample Media Items */}
              <div className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-500"></div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button size="sm" variant="secondary">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">Gradient Background</p>
                  <Badge variant="outline" className="text-xs">Background</Badge>
                </div>
              </div>

              <div className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-blue-500 to-cyan-500"></div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button size="sm" variant="secondary">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">Ocean Banner</p>
                  <Badge variant="outline" className="text-xs">Banner</Badge>
                </div>
              </div>

              <div className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button size="sm" variant="secondary">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">Heart Icon</p>
                  <Badge variant="outline" className="text-xs">Icon</Badge>
                </div>
              </div>

              {/* Add more asset button */}
              <div 
                className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <Plus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs text-muted-foreground">Add Asset</p>
                </div>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Showing 1-3 of 3 assets</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}