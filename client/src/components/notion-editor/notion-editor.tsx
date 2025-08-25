import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Plus, 
  Settings, 
  ArrowLeft, 
  Save,
  Eye,
  EyeOff,
  FileText,
  Smile
} from 'lucide-react';
import BlockRenderer from './block-renderer';
import { Block, BlockType, createEmptyBlock, BLOCK_TYPES } from './block-types';

interface NotionEditorProps {
  pageId?: string;
  creatorId?: string;
  onBack?: () => void;
}

interface PageData {
  page: {
    id: number;
    title: string;
    emoji?: string;
    description?: string;
    tags?: string[];
    isPublic: boolean;
    slug: string;
    creatorId: number;
  };
  blocks: Block[];
}

export default function NotionEditor({ pageId, creatorId, onBack }: NotionEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(pageId);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; title: string }>>([]);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
  const [showCreatePage, setShowCreatePage] = useState(!pageId);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<number | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({ x: 0, y: 0 });

  // New page form state
  const [newPageForm, setNewPageForm] = useState({
    title: '',
    emoji: '📄',
    description: '',
    tags: [] as string[],
    isPublic: false
  });

  // Fetch page data
  const { data: pageData, isLoading: pageLoading } = useQuery<PageData>({
    queryKey: ['/api/inspiration-pages', currentPageId],
    enabled: !!currentPageId,
  });

  // Fetch creators for page assignment
  const { data: creators = [] } = useQuery({
    queryKey: ['/api/creators'],
    enabled: !creatorId,
  });

  // Fetch all pages for page links
  const { data: allPages = [] } = useQuery({
    queryKey: ['/api/inspiration-pages'],
  });

  const page = pageData?.page;
  const blocks = pageData?.blocks || [];

  // Navigation functions
  const handleNavigateToPage = useCallback(async (targetPageId?: number) => {
    if (targetPageId) {
      // Navigate to existing page
      if (pageData?.page) {
        setBreadcrumbs(prev => [...prev, { id: currentPageId!, title: pageData.page.title }]);
      }
      setCurrentPageId(targetPageId.toString());
    } else {
      // Create new sub-page
      const newPage = await createPageMutation.mutateAsync({
        title: 'Untitled Page',
        emoji: '📄',
        description: '',
        tags: [],
        isPublic: false,
        parentPageId: currentPageId ? parseInt(currentPageId) : undefined,
      });
      
      if (pageData?.page) {
        setBreadcrumbs(prev => [...prev, { id: currentPageId!, title: pageData.page.title }]);
      }
      setCurrentPageId(newPage.id.toString());
    }
  }, [currentPageId, pageData]);

  const handleNavigateBack = useCallback((targetPageId?: string) => {
    if (targetPageId) {
      const targetIndex = breadcrumbs.findIndex(b => b.id === targetPageId);
      setBreadcrumbs(prev => prev.slice(0, targetIndex));
      setCurrentPageId(targetPageId);
    } else if (breadcrumbs.length > 0) {
      const parentPage = breadcrumbs[breadcrumbs.length - 1];
      setBreadcrumbs(prev => prev.slice(0, -1));
      setCurrentPageId(parentPage.id);
    } else if (onBack) {
      onBack();
    }
  }, [breadcrumbs, onBack]);

  // Create page mutation
  const createPageMutation = useMutation({
    mutationFn: async (data: { 
      title: string; 
      emoji: string; 
      description: string; 
      tags: string[]; 
      isPublic: boolean; 
      parentPageId?: number 
    }) => {
      const response = await apiRequest('POST', '/api/inspiration-pages', {
        title: data.title,
        emoji: data.emoji,
        description: data.description,
        tags: data.tags,
        isPublic: data.isPublic,
        parentPageId: data.parentPageId,
        isPinned: false,
        isActive: true
      });
      return await response.json();
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] });
      setShowCreatePage(false);
      
      toast({
        title: 'Success',
        description: 'Page created successfully!',
      });
      
      // Navigate to the new page or simply refresh the page list
      // Skip initial block creation for now to avoid the error
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create page.',
        variant: 'destructive',
      });
    },
  });

  // Update page mutation
  const updatePageMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest('PATCH', `/api/inspiration-pages/${pageId}`, updates);
      return await response.json();
    },
    onSuccess: async () => {
      // Aggressive cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages', pageId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/creator-feed-content'] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['/api/inspiration-pages', pageId] });
      
      toast({
        title: 'Success',
        description: 'Page updated successfully!',
      });
    },
  });

  // Add block mutation
  const addBlockMutation = useMutation({
    mutationFn: async (blockData: any) => {
      const response = await apiRequest('POST', `/api/inspiration-pages/${pageId || blockData.pageId}/blocks`, blockData);
      return await response.json();
    },
    onSuccess: async () => {
      // Aggressive cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages', pageId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/creator-feed-content'] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['/api/inspiration-pages', pageId] });
    },
  });

  // Update block mutation
  const updateBlockMutation = useMutation({
    mutationFn: async ({ blockId, updates }: { blockId: number; updates: any }) => {
      const response = await apiRequest('PATCH', `/api/inspiration-pages/blocks/${blockId}`, updates);
      return await response.json();
    },
    onSuccess: async () => {
      // Aggressive cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages', pageId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/creator-feed-content'] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['/api/inspiration-pages', pageId] });
    },
  });

  // Delete block mutation
  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: number) => {
      const response = await apiRequest('DELETE', `/api/inspiration-pages/blocks/${blockId}`);
      return response.ok;
    },
    onSuccess: async () => {
      // Aggressive cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages', pageId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/creator-feed-content'] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['/api/inspiration-pages', pageId] });
    },
  });

  // Reorder blocks mutation
  const reorderBlocksMutation = useMutation({
    mutationFn: async (blocks: { id: number; position: number }[]) => {
      const response = await apiRequest('POST', `/api/inspiration-pages/${pageId}/blocks/reorder`, { blocks });
      return response.ok;
    },
    onSuccess: async () => {
      // Aggressive cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages', pageId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/creator-feed-content'] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['/api/inspiration-pages', pageId] });
    },
  });

  // Handle block operations
  const handleAddBlock = useCallback((type: BlockType, position: number) => {
    if (!pageId) return;
    
    const newBlock = createEmptyBlock(type, parseInt(pageId), position);
    addBlockMutation.mutate(newBlock);
    setShowBlockMenu(false);
  }, [pageId, addBlockMutation]);

  const handleUpdateBlock = useCallback((blockId: number, updates: Partial<Block>) => {
    updateBlockMutation.mutate({ blockId, updates });
  }, [updateBlockMutation]);

  const handleDeleteBlock = useCallback((blockId: number) => {
    deleteBlockMutation.mutate(blockId);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    if (editingBlockId === blockId) {
      setEditingBlockId(null);
    }
  }, [deleteBlockMutation, selectedBlockId, editingBlockId]);

  const handleIndentBlock = useCallback((blockId: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (block && block.indentLevel < 3) {
      handleUpdateBlock(blockId, { indentLevel: block.indentLevel + 1 });
    }
  }, [blocks, handleUpdateBlock]);

  const handleOutdentBlock = useCallback((blockId: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (block && block.indentLevel > 0) {
      handleUpdateBlock(blockId, { indentLevel: block.indentLevel - 1 });
    }
  }, [blocks, handleUpdateBlock]);

  // Handle drag and drop
  const handleDragStart = useCallback((blockId: number) => {
    setDraggedBlockId(blockId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((targetBlockId: number) => {
    if (!draggedBlockId || draggedBlockId === targetBlockId) return;

    const draggedBlock = blocks.find(b => b.id === draggedBlockId);
    const targetBlock = blocks.find(b => b.id === targetBlockId);
    
    if (!draggedBlock || !targetBlock) return;

    const reorderedBlocks = blocks.map((block, index) => ({
      id: block.id,
      position: block.id === draggedBlockId ? targetBlock.position : 
                block.id === targetBlockId ? draggedBlock.position : 
                block.position
    }));

    reorderBlocksMutation.mutate(reorderedBlocks);
    setDraggedBlockId(null);
  }, [draggedBlockId, blocks, reorderBlocksMutation]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            // Auto-save is handled by mutations
            toast({
              title: 'Saved',
              description: 'All changes are automatically saved.',
            });
            break;
          case '/':
            e.preventDefault();
            setShowBlockMenu(true);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  // Create page form
  if (showCreatePage) {
    return (
      <div className="w-full p-6 space-y-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-2xl font-bold">Create New Page</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  const emojis = ['📄', '📝', '📋', '📊', '🎯', '💡', '🔥', '⭐', '🚀', '💼'];
                  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                  setNewPageForm(prev => ({ ...prev, emoji: randomEmoji }));
                }}
                className="text-2xl"
              >
                {newPageForm.emoji}
              </Button>
              <div className="flex-1">
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  value={newPageForm.title}
                  onChange={(e) => setNewPageForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Page title..."
                  className="text-lg"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={newPageForm.description}
                onChange={(e) => setNewPageForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this page..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newPageForm.isPublic}
                  onCheckedChange={(checked) => setNewPageForm(prev => ({ ...prev, isPublic: checked }))}
                />
                <Label>Public Access</Label>
              </div>
              <span className="text-sm text-gray-500">
                {newPageForm.isPublic ? 'Anyone with the link can view' : 'Only team members can access'}
              </span>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => createPageMutation.mutate(newPageForm)}
                disabled={!newPageForm.title.trim() || createPageMutation.isPending}
                className="flex-1"
              >
                {createPageMutation.isPending ? 'Creating...' : 'Create Page'}
              </Button>
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading page...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center p-8">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-semibold mb-2">Page not found</h2>
        <p className="text-gray-500 mb-4">The page you're looking for doesn't exist.</p>
        {onBack && (
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 sticky top-0 z-40">
        <div className="w-full px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(onBack || breadcrumbs.length > 0) && (
              <Button variant="ghost" size="sm" onClick={() => handleNavigateBack()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleNavigateBack(crumb.id)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                  >
                    {crumb.title}
                  </Button>
                  <span className="text-gray-400">/</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{page.emoji}</span>
                <h1 className="text-xl font-semibold truncate max-w-md">{page.title}</h1>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updatePageMutation.mutate({ isPublic: !page.isPublic })}
            >
              {page.isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {page.isPublic ? 'Public' : 'Private'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="w-full p-6">
        {/* Page Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-4xl">{page.emoji}</span>
            <Input
              value={page.title}
              onChange={(e) => updatePageMutation.mutate({ title: e.target.value })}
              className="text-3xl font-bold border-none p-0 shadow-none focus:ring-0 bg-transparent"
              placeholder="Untitled"
            />
          </div>
          
          {page.description && (
            <Input
              value={page.description}
              onChange={(e) => updatePageMutation.mutate({ description: e.target.value })}
              className="text-lg text-gray-600 dark:text-gray-400 border-none p-0 shadow-none focus:ring-0 bg-transparent"
              placeholder="Add a description..."
            />
          )}
          
          {page.tags && page.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {page.tags.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content Blocks */}
        <div className="space-y-2">
          {blocks.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              isEditing={editingBlockId === block.id}
              onSelect={() => setSelectedBlockId(block.id)}
              onStartEdit={() => setEditingBlockId(block.id)}
              onStopEdit={() => setEditingBlockId(null)}
              onUpdate={(updates) => handleUpdateBlock(block.id, updates)}
              onDelete={() => handleDeleteBlock(block.id)}
              onInsertBlock={handleAddBlock}
              onIndent={() => handleIndentBlock(block.id)}
              onOutdent={() => handleOutdentBlock(block.id)}
              onDragStart={() => handleDragStart(block.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(block.id)}
              onNavigateToPage={handleNavigateToPage}
              pages={allPages}
            />
          ))}
          
          {/* Add block button */}
          <div className="flex items-center gap-2 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddBlock('text', blocks.length)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add a block
            </Button>
          </div>
        </div>
      </div>

      {/* Block Type Menu */}
      {showBlockMenu && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setShowBlockMenu(false)}>
          <div className="absolute bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-2 w-80 max-h-96 overflow-y-auto"
               style={{ left: blockMenuPosition.x, top: blockMenuPosition.y }}>
            <div className="space-y-1">
              {BLOCK_TYPES.map((blockType) => (
                <Button
                  key={blockType.type}
                  variant="ghost"
                  className="w-full justify-start text-left p-3 h-auto"
                  onClick={() => handleAddBlock(blockType.type, blocks.length)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                      <span className="text-sm">{blockType.icon}</span>
                    </div>
                    <div>
                      <div className="font-medium">{blockType.label}</div>
                      <div className="text-xs text-gray-500">{blockType.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Page Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Page Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Page Title</Label>
              <Input
                value={page.title}
                onChange={(e) => updatePageMutation.mutate({ title: e.target.value })}
              />
            </div>
            <div>
              <Label>Emoji</Label>
              <div className="flex gap-2">
                <Input
                  value={page.emoji}
                  onChange={(e) => updatePageMutation.mutate({ emoji: e.target.value })}
                  className="w-20"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const emojis = ['📄', '📝', '📋', '📊', '🎯', '💡', '🔥', '⭐', '🚀', '💼'];
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    updatePageMutation.mutate({ emoji: randomEmoji });
                  }}
                >
                  <Smile className="h-4 w-4" />
                  Random
                </Button>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={page.description || ''}
                onChange={(e) => updatePageMutation.mutate({ description: e.target.value })}
                placeholder="Page description..."
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Public Access</Label>
              <Switch
                checked={page.isPublic}
                onCheckedChange={(checked) => updatePageMutation.mutate({ isPublic: checked })}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}