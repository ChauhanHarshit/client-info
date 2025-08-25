import React, { useState, useRef } from 'react'
import { useParams } from 'wouter'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Settings, Save, X, Upload, Image as ImageIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import SimpleNotionEditor from '@/components/notion-simple/simple-notion-editor'

interface InspirationPage {
  id: number
  title: string
  emoji?: string
  description?: string
  slug: string
  createdById: string
  createdByName: string
  isPinned: boolean
  tags: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  bannerUrl?: string
  bannerType?: string
  bannerInventoryId?: number
}

interface BannerInventoryItem {
  id: number
  name: string
  description: string
  imageUrl: string
  category: string
  tags: string[]
  aspectRatio: string
  width: number
  height: number
}

export default function NotionPage() {
  const { pageId } = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State for editing mode
  const [isEditMode, setIsEditMode] = useState(false)
  const [showBannerDialog, setShowBannerDialog] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    emoji: '',
    description: '',
    tags: [] as string[],
    bannerUrl: '',
    bannerType: '',
    bannerInventoryId: null as number | null
  })
  const [newTag, setNewTag] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Fetch page metadata
  const { data: page, isLoading } = useQuery<InspirationPage>({
    queryKey: [`/api/inspiration-pages/${pageId}`],
    enabled: !!pageId,
  })

  // Fetch banner inventory
  const { data: banners = [] } = useQuery<BannerInventoryItem[]>({
    queryKey: ['/api/banner-inventory'],
    enabled: showBannerDialog,
  })

  // Update page mutation
  const updatePageMutation = useMutation({
    mutationFn: async (data: Partial<InspirationPage>) => {
      const response = await fetch(`/api/inspiration-pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update page')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/inspiration-pages/${pageId}`] })
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] })
      toast({ title: 'Success', description: 'Page updated successfully' })
      setIsEditMode(false)
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update page', variant: 'destructive' })
    },
  })

  // Initialize edit form when page data loads
  React.useEffect(() => {
    if (page && !isEditMode) {
      setEditForm({
        title: page.title || '',
        emoji: page.emoji || '',
        description: page.description || '',
        tags: page.tags || [],
        bannerUrl: page.bannerUrl || '',
        bannerType: page.bannerType || '',
        bannerInventoryId: page.bannerInventoryId || null
      })
    }
  }, [page, isEditMode])

  const handleEditToggle = () => {
    if (page) {
      setEditForm({
        title: page.title || '',
        emoji: page.emoji || '',
        description: page.description || '',
        tags: page.tags || [],
        bannerUrl: page.bannerUrl || '',
        bannerType: page.bannerType || '',
        bannerInventoryId: page.bannerInventoryId || null
      })
    }
    setIsEditMode(!isEditMode)
  }

  const handleSave = () => {
    if (!editForm.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' })
      return
    }
    updatePageMutation.mutate(editForm)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !editForm.tags.includes(newTag.trim())) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleBannerSelect = (banner: BannerInventoryItem) => {
    setEditForm(prev => ({
      ...prev,
      bannerUrl: banner.imageUrl,
      bannerType: 'inventory',
      bannerInventoryId: banner.id
    }))
    setShowBannerDialog(false)
  }

  const handleRemoveBanner = () => {
    setEditForm(prev => ({
      ...prev,
      bannerUrl: '',
      bannerType: '',
      bannerInventoryId: null
    }))
  }

  // File upload helpers
  const uploadFile = async (file: File): Promise<string> => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Upload failed')
      
      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Upload error:', error)
      toast({ 
        title: 'Upload Error', 
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive' 
      })
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: 'Invalid File', 
        description: 'Please select an image file.',
        variant: 'destructive' 
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({ 
        title: 'File Too Large', 
        description: 'Please select an image smaller than 10MB.',
        variant: 'destructive' 
      })
      return
    }

    try {
      const imageUrl = await uploadFile(file)
      setEditForm(prev => ({
        ...prev,
        bannerUrl: imageUrl,
        bannerType: 'upload',
        bannerInventoryId: null
      }))
      setShowBannerDialog(false) // Close dialog after successful upload
      toast({ title: 'Success', description: 'Banner uploaded successfully' })
    } catch (error) {
      // Error already handled in uploadFile
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile) {
      handleFileSelect(imageFile)
    } else {
      toast({ 
        title: 'Invalid File', 
        description: 'Please drop an image file.',
        variant: 'destructive' 
      })
    }
  }

  const handleBack = () => {
    // Use browser's native back functionality
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback if there's no history (e.g., direct navigation)
      window.location.href = '/inspiration-dashboard';
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEditToggle}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Edit Page
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleEditToggle}
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={updatePageMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {updatePageMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Page Header with Banner */}
      {page && (
        <div className="px-6 pb-6">
          {/* Banner Section */}
          {(() => {
            const bannerUrl = isEditMode ? editForm.bannerUrl : page.bannerUrl;
            const isDefaultBanner = bannerUrl === '/default-banner.jpg' || bannerUrl?.includes('default-banner');
            
            if (bannerUrl && !isDefaultBanner) {
              return (
                <div className="relative mb-6 rounded-lg overflow-hidden">
                  <img
                    src={bannerUrl}
                    alt="Page banner"
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      // Hide broken image if it fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {isEditMode && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowBannerDialog(true)}
                        className="bg-white/90 hover:bg-white"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Change
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleRemoveBanner}
                        className="bg-red-500/90 hover:bg-red-500"
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              );
            } else if (isDefaultBanner || (isEditMode && !bannerUrl)) {
              return (
                <div className="relative mb-6">
                  <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border border-gray-200 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Default Banner</p>
                    </div>
                  </div>
                  {isEditMode && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowBannerDialog(true)}
                        className="bg-white/90 hover:bg-white"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Change
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleRemoveBanner}
                        className="bg-red-500/90 hover:bg-red-500"
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {/* Add Banner Button (Edit Mode Only) */}
          {isEditMode && !editForm.bannerUrl && (
            <div className="mb-6">
              <div
                className={`relative w-full h-32 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50 border-solid' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <span className="text-sm text-gray-500">Uploading...</span>
                    </>
                  ) : isDragOver ? (
                    <>
                      <Upload className="w-6 h-6 text-blue-500" />
                      <span className="text-sm text-blue-600 font-medium">Drop image here</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-gray-500">Add Banner Image</span>
                      <span className="text-xs text-gray-400">Click to browse or drag & drop</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {/* Action buttons */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </Button>
                <span className="text-gray-400 text-sm">or</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBannerDialog(true)}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Choose from Library
                </Button>
              </div>
            </div>
          )}

          {/* Page Info Section */}
          <div className="space-y-4">
            {/* Title and Emoji */}
            <div className="flex items-center gap-3">
              {isEditMode ? (
                <>
                  <Input
                    value={editForm.emoji}
                    onChange={(e) => setEditForm(prev => ({ ...prev, emoji: e.target.value }))}
                    className="w-16 text-center text-4xl border-none shadow-none p-0 h-auto"
                    placeholder="📄"
                  />
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="text-3xl font-bold border-none shadow-none p-0 h-auto flex-1"
                    placeholder="Page Title"
                  />
                </>
              ) : (
                <>
                  <span className="text-4xl">{page.emoji || '📄'}</span>
                  <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
                </>
              )}
            </div>

            {/* Description */}
            {(isEditMode || page.description) && (
              <div>
                {isEditMode ? (
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Page description..."
                    className="border-none shadow-none p-0 resize-none"
                    rows={2}
                  />
                ) : (
                  page.description && (
                    <p className="text-gray-600">{page.description}</p>
                  )
                )}
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2">
              {isEditMode ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {editForm.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag}
                        <X className="w-3 h-3" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ) : (
                page.tags && page.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {page.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Editor */}
      <div className="px-6">
        <SimpleNotionEditor pageId={pageId} initialTitle={page?.title} initialEmoji={page?.emoji} />
      </div>

      {/* Banner Selection Dialog */}
      <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Choose Banner Image</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Upload New Banner</h3>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50 border-solid' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="text-sm text-gray-500">Uploading...</span>
                    </div>
                  ) : isDragOver ? (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-blue-500" />
                      <span className="text-sm text-blue-600 font-medium">Drop image here</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Click to browse or drag & drop</span>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Choose from Library</h3>
              <div className="flex flex-wrap gap-2">
                {['all', 'nature', 'abstract', 'minimal', 'tech', 'creative'].map(category => (
                  <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    className="capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            {/* Banner Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="relative cursor-pointer group rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors"
                  onClick={() => handleBannerSelect(banner)}
                >
                  <img
                    src={banner.imageUrl}
                    alt={banner.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                    <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="font-medium text-sm">{banner.name}</p>
                      <p className="text-xs text-gray-200">{banner.description}</p>
                    </div>
                  </div>
                  {banner.tags && banner.tags.length > 0 && (
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {banner.tags.slice(0, 2).map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs bg-white/90 text-gray-800"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {banners.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                <p>No banners available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}