import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2, GripVertical, Eye, Image, FileText, Minus, Upload, X, RefreshCw, Copy, Check } from 'lucide-react';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDropzone } from 'react-dropzone';

interface HelpSection {
  id: number;
  type: 'title' | 'description' | 'separator' | 'gif';
  title: string | null;
  content: string | null;
  gifUrl: string | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SectionFormData {
  type: 'title' | 'description' | 'separator' | 'gif';
  title: string;
  content: string;
  gifUrl: string;
  orderIndex: number;
  isActive: boolean;
}

function SortableSection({ section, onEdit, onDelete }: { section: HelpSection; onEdit: (section: HelpSection) => void; onDelete: (id: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'title': return <FileText className="h-4 w-4" />;
      case 'description': return <FileText className="h-4 w-4" />;
      case 'separator': return <Minus className="h-4 w-4" />;
      case 'gif': return <Image className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center space-x-2">
              {getSectionIcon(section.type)}
              <Badge variant="outline" className="capitalize">
                {section.type}
              </Badge>
              <span className="text-sm text-gray-500">#{section.orderIndex}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              {section.type === 'title' && (
                <h3 className="font-semibold text-gray-900 truncate">{section.content}</h3>
              )}
              {section.type === 'description' && (
                <div>
                  {section.title && (
                    <h4 className="font-medium text-gray-900 truncate mb-1">{section.title}</h4>
                  )}
                  <p className="text-gray-600 truncate">
                    {section.content && section.content.length > 100 
                      ? `${section.content.substring(0, 100)}...` 
                      : section.content}
                  </p>
                </div>
              )}
              {section.type === 'separator' && (
                <span className="text-gray-500 italic">Separator line</span>
              )}
              {section.type === 'gif' && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">GIF:</span>
                  <a href={section.gifUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                    {section.gifUrl}
                  </a>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch checked={section.isActive} disabled />
              <Badge variant={section.isActive ? "default" : "secondary"}>
                {section.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(section)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(section.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HelpAdmin() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HelpSection | null>(null);
  const [formData, setFormData] = useState<SectionFormData>({
    type: 'description',
    title: '',
    content: '',
    gifUrl: '',
    orderIndex: 1,
    isActive: true,
  });
  
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Drag and drop functionality
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'];
      const maxSize = 500 * 1024 * 1024; // 500MB
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type. Please use images, GIFs, or videos.`,
          variant: "destructive",
        });
        return false;
      }
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Maximum size is 500MB.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function to render media (image or video) based on file extension
  const renderMedia = (gifUrl: string) => {
    const fileExtension = gifUrl.toLowerCase().split('.').pop();
    const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv', 'wmv'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

    if (videoExtensions.includes(fileExtension || '')) {
      return (
        <video 
          src={gifUrl} 
          controls 
          muted 
          className="max-w-full h-auto rounded-lg shadow-sm"
          style={{ maxHeight: '200px' }}
        >
          Your browser does not support the video tag.
        </video>
      );
    } else if (imageExtensions.includes(fileExtension || '')) {
      return (
        <img 
          src={gifUrl} 
          alt="Current GIF" 
          className="max-w-full h-auto rounded-lg shadow-sm"
          style={{ maxHeight: '200px' }}
        />
      );
    } else {
      // Fallback for unknown file types
      return (
        <div className="max-w-full h-auto rounded-lg shadow-sm bg-gray-100 p-4 text-center" style={{ maxHeight: '200px' }}>
          <p className="text-gray-600">Media file: {gifUrl.split('/').pop()}</p>
          <a 
            href={gifUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Open in new tab
          </a>
        </div>
      );
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: sections, isLoading, refetch, error } = useQuery<HelpSection[]>({
    queryKey: ['/api/admin/help-sections'],
    queryFn: async () => {
      const response = await fetch('/api/admin/help-sections', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Debug logging
  console.log('Help Admin Query State:', {
    sections: sections,
    sectionsLength: sections?.length,
    isLoading,
    error,
  });
  
  // Debug GIF sections specifically
  const gifSections = sections?.filter(s => s.type === 'gif');
  console.log('GIF sections found:', gifSections);

  const createSectionMutation = useMutation({
    mutationFn: (data: Omit<SectionFormData, 'orderIndex'> & { orderIndex: number }) => 
      apiRequest('POST', '/api/admin/help-sections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/help-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/help-sections'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'Help section created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create help section',
        variant: 'destructive',
      });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SectionFormData }) => 
      apiRequest('PUT', `/api/admin/help-sections/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/help-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/help-sections'] });
      setIsEditDialogOpen(false);
      setEditingSection(null);
      resetForm();
      toast({
        title: 'Success',
        description: 'Help section updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update help section',
        variant: 'destructive',
      });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/admin/help-sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/help-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/help-sections'] });
      toast({
        title: 'Success',
        description: 'Help section deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete help section',
        variant: 'destructive',
      });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: (sectionIds: number[]) => 
      apiRequest('POST', '/api/admin/help-sections/reorder', { sectionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/help-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/help-sections'] });
      toast({
        title: 'Success',
        description: 'Help sections reordered successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reorder help sections',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      type: 'description',
      title: '',
      content: '',
      gifUrl: '',
      orderIndex: sections ? sections.length + 1 : 1,
      isActive: true,
    });
    setUploadedFiles([]);
  };

  const handleCreate = async () => {
    const nextOrderIndex = sections ? Math.max(...sections.map(s => s.orderIndex)) + 1 : 1;
    
    let finalData = {
      ...formData,
      orderIndex: nextOrderIndex,
    };
    
    // If we have uploaded files, upload them first
    if (uploadedFiles.length > 0) {
      setIsUploading(true);
      try {
        const formDataUpload = new FormData();
        uploadedFiles.forEach(file => {
          formDataUpload.append('files', file);
        });
        
        const response = await apiRequest('POST', '/api/upload-multiple', formDataUpload);
        const responseData = await response.json();
        
        // Use the first uploaded file URL as the gifUrl
        if (responseData.uploadedFiles && responseData.uploadedFiles.length > 0) {
          finalData.gifUrl = responseData.uploadedFiles[0].url;
        }
      } catch (error) {
        setIsUploading(false);
        toast({
          title: 'Upload Error',
          description: 'Failed to upload files. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      setIsUploading(false);
    }
    
    // All sections can now have media files, so no type-specific validation needed
    
    createSectionMutation.mutate(finalData);
  };

  const handleEdit = (section: HelpSection) => {
    setEditingSection(section);
    setFormData({
      type: section.type,
      title: section.title || '',
      content: section.content || '',
      gifUrl: section.gifUrl || '',
      orderIndex: section.orderIndex,
      isActive: section.isActive,
    });
    setUploadedFiles([]); // Clear any previously uploaded files
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingSection) return;

    let finalData = { ...formData };

    // Handle file uploads if new files are selected
    if (uploadedFiles.length > 0) {
      setIsUploading(true);
      
      try {
        const uploadFormData = new FormData();
        uploadedFiles.forEach((file, index) => {
          uploadFormData.append(`files`, file);
        });

        const uploadResponse = await fetch('/api/upload-multiple', {
          method: 'POST',
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          const uploadResults = await uploadResponse.json();
          if (uploadResults.files && uploadResults.files.length > 0) {
            // Use the first uploaded file as the new GIF URL
            finalData.gifUrl = uploadResults.files[0].url;
          }
        }
      } catch (error) {
        console.error('Upload failed:', error);
        toast({
          title: 'Upload Error',
          description: 'Failed to upload files. Please try again.',
          variant: 'destructive',
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    updateSectionMutation.mutate({
      id: editingSection.id,
      data: finalData,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this help section?')) {
      deleteSectionMutation.mutate(id);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id && sections) {
      const oldIndex = sections.findIndex(section => section.id === active.id);
      const newIndex = sections.findIndex(section => section.id === over.id);
      
      const newSections = arrayMove(sections, oldIndex, newIndex);
      const sectionIds = newSections.map(section => section.id);
      
      // Optimistically update the UI
      queryClient.setQueryData(['/api/admin/help-sections'], newSections);
      
      // Update the server
      reorderSectionsMutation.mutate(sectionIds);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const copyHelpLink = async () => {
    try {
      const currentDomain = `${window.location.protocol}//${window.location.host}`;
      const helpUrl = `${currentDomain}/help`;
      await navigator.clipboard.writeText(helpUrl);
      setLinkCopied(true);
      toast({
        title: 'Link Copied',
        description: `${helpUrl} has been copied to your clipboard`,
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy link to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <LoadingAnimation size="lg" />
        <p className="mt-6 text-lg text-muted-foreground">Loading help sections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Help Page Management</h1>
            <p className="text-gray-600">Manage content for the public help page at /help</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Sections
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Error loading help sections: {(error as any)?.message || 'Unknown error'}</p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help Page Management"
        description="Manage content for the public help page at /help"
        showBackButton={true}
        useBrowserBack={true}
        actions={
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Sections
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('/help', '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Help Page
            </Button>
          </div>
        }
      />
      
      {/* Copyable Link Button */}
      <div className="px-4">
        <Button
          variant="outline"
          onClick={copyHelpLink}
          className="mb-4 text-sm"
        >
          {linkCopied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Link Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Share the help link
            </>
          )}
        </Button>
      </div>
      
      <div className="px-4">
        <div className="flex justify-end items-center">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Help Section</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                
                {/* Title Input */}
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter section title"
                  />
                </div>
                
                {/* Content Input */}
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter section content (title, description, etc.)"
                    rows={4}
                  />
                </div>

                {/* Media URL Input */}
                <div>
                  <Label htmlFor="gifUrl">Media URL (optional)</Label>
                  <Input
                    id="gifUrl"
                    value={formData.gifUrl}
                    onChange={(e) => setFormData({ ...formData, gifUrl: e.target.value })}
                    placeholder="Enter media URL (optional)"
                  />
                </div>
                
                <div className="text-center text-sm text-gray-500">
                  OR
                </div>
                
                {/* Drag and Drop Zone for All Sections */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the files here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">
                        Drag & drop videos, GIFs, or images here
                      </p>
                      <p className="text-sm text-gray-500">
                        or click to select files
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Supports: MP4, MOV, AVI, WebM, JPG, PNG, GIF, WebP (max 500MB)
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Uploaded Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Files</Label>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Active</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreate}
                    disabled={createSectionMutation.isPending || isUploading}
                  >
                    {(createSectionMutation.isPending || isUploading) ? (
                      <div className="w-4 h-4 mr-2">
                        <LoadingAnimation size="sm" />
                      </div>
                    ) : null}
                    {isUploading ? 'Uploading...' : 'Create Section'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Help Sections</CardTitle>
        </CardHeader>
        <CardContent>
          {sections && sections.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No help sections created yet</p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Section
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Help Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            
            {/* Title Input */}
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter section title"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-type">Section Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                  <SelectItem value="separator">Separator</SelectItem>
                  <SelectItem value="gif">GIF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.type === 'title' || formData.type === 'description') && (
              <div>
                <Label htmlFor="edit-content">Content</Label>
                {formData.type === 'title' ? (
                  <Input
                    id="edit-content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter title text"
                  />
                ) : (
                  <Textarea
                    id="edit-content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter description text"
                    rows={4}
                  />
                )}
              </div>
            )}

            {/* GIF URL Input - Available for all section types */}
            <div>
              <Label htmlFor="edit-gifUrl">GIF/Media URL (optional)</Label>
              <Input
                id="edit-gifUrl"
                value={formData.gifUrl}
                onChange={(e) => setFormData({ ...formData, gifUrl: e.target.value })}
                placeholder="Enter GIF/media URL or upload below"
              />
            </div>

            <div className="text-center text-sm text-gray-500">
              OR
            </div>

            {/* Current GIF Preview */}
            {formData.gifUrl && (
              <div>
                <Label>Current GIF/Media</Label>
                <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                  {renderMedia(formData.gifUrl)}
                  <p className="text-xs text-gray-500 mt-2">{formData.gifUrl}</p>
                </div>
              </div>
            )}

            {/* Drag and Drop Zone for GIF Upload */}
            <div>
              <Label>Upload New GIF/Media</Label>
              <div
                {...getRootProps()}
                className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                {isDragActive ? (
                  <p className="text-blue-600 text-sm">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 text-sm mb-1">
                      Drag & drop GIF/media or click to select
                    </p>
                    <p className="text-xs text-gray-400">
                      Supports: MP4, MOV, GIF, JPG, PNG, WebP (max 500MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>New Upload</Label>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={updateSectionMutation.isPending || isUploading}
              >
                {(updateSectionMutation.isPending || isUploading) ? (
                  <div className="w-4 h-4 mr-2">
                    <LoadingAnimation size="sm" />
                  </div>
                ) : null}
                {isUploading ? 'Uploading...' : 'Update Section'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}