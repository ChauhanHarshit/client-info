import { useState, useEffect, useRef, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Plus, GripVertical, MoreHorizontal, Type, Image, FileText, Heading1, Heading2, Heading3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Block {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'image' | 'subpage'
  content: {
    text?: string
    src?: string
    alt?: string
    title?: string
    pageId?: string
  }
  position: number
}

interface NotionBlockEditorProps {
  pageId?: string
  onBack?: () => void
}

export default function NotionBlockEditor({ pageId, onBack }: NotionBlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [pageTitle, setPageTitle] = useState('Untitled')
  const [pageEmoji, setPageEmoji] = useState('📄')
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [showBlockMenu, setShowBlockMenu] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Load page data
  const { data: page, isLoading } = useQuery({
    queryKey: ['/api/inspiration-pages', pageId],
    enabled: !!pageId,
  })

  // Save page mutation
  const savePageMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; emoji: string }) => {
      const response = await fetch(`/api/inspiration-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to save page')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] })
    },
  })

  // Initialize page data
  useEffect(() => {
    if (page) {
      const pageData = page as any
      setPageTitle(pageData.title || 'Untitled')
      setPageEmoji(pageData.emoji || '📄')
      
      if (pageData.blocks && Array.isArray(pageData.blocks)) {
        const convertedBlocks = pageData.blocks.map((block: any, index: number) => ({
          id: `block-${block.id || index}`,
          type: block.type || 'paragraph',
          content: block.content || { text: '' },
          position: block.position || index,
        }))
        setBlocks(convertedBlocks)
      } else {
        // Start with one empty paragraph
        setBlocks([{
          id: 'block-0',
          type: 'paragraph',
          content: { text: '' },
          position: 0,
        }])
      }
    }
  }, [page])

  const createNewBlock = (type: Block['type'], afterBlockId?: string): Block => {
    const newId = `block-${Date.now()}`
    const afterIndex = afterBlockId ? blocks.findIndex(b => b.id === afterBlockId) : -1
    const position = afterIndex >= 0 ? afterIndex + 1 : blocks.length

    return {
      id: newId,
      type,
      content: { text: '' },
      position,
    }
  }

  const addBlock = (type: Block['type'], afterBlockId?: string) => {
    const newBlock = createNewBlock(type, afterBlockId)
    const newBlocks = [...blocks]
    
    if (afterBlockId) {
      const afterIndex = blocks.findIndex(b => b.id === afterBlockId)
      newBlocks.splice(afterIndex + 1, 0, newBlock)
    } else {
      newBlocks.push(newBlock)
    }
    
    // Update positions
    newBlocks.forEach((block, index) => {
      block.position = index
    })
    
    setBlocks(newBlocks)
    setFocusedBlockId(newBlock.id)
    setShowBlockMenu(null)
  }

  const updateBlock = (blockId: string, content: Partial<Block['content']>) => {
    setBlocks(blocks.map(block => 
      block.id === blockId 
        ? { ...block, content: { ...block.content, ...content } }
        : block
    ))
  }

  const deleteBlock = (blockId: string) => {
    if (blocks.length === 1) return // Keep at least one block
    
    const newBlocks = blocks.filter(b => b.id !== blockId)
    newBlocks.forEach((block, index) => {
      block.position = index
    })
    setBlocks(newBlocks)
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(blocks)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update positions
    items.forEach((block, index) => {
      block.position = index
    })

    setBlocks(items)
  }

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addBlock('paragraph', blockId)
    } else if (e.key === 'Backspace') {
      const block = blocks.find(b => b.id === blockId)
      if (block && (!block.content.text || block.content.text === '')) {
        e.preventDefault()
        deleteBlock(blockId)
      }
    }
  }

  const handleSave = () => {
    const content = JSON.stringify(blocks)
    savePageMutation.mutate({
      title: pageTitle,
      content,
      emoji: pageEmoji,
    })
  }

  const BlockComponent = ({ block, index }: { block: Block; index: number }) => {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

    useEffect(() => {
      if (focusedBlockId === block.id && inputRef.current) {
        inputRef.current.focus()
      }
    }, [focusedBlockId, block.id])

    const renderBlockContent = () => {
      switch (block.type) {
        case 'heading1':
          return (
            <Input
              ref={inputRef as any}
              value={block.content.text || ''}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              placeholder="Heading 1"
              className="text-3xl font-bold border-none p-0 h-auto bg-transparent resize-none focus:ring-0 focus:outline-none"
            />
          )
        case 'heading2':
          return (
            <Input
              ref={inputRef as any}
              value={block.content.text || ''}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              placeholder="Heading 2"
              className="text-2xl font-semibold border-none p-0 h-auto bg-transparent resize-none focus:ring-0 focus:outline-none"
            />
          )
        case 'heading3':
          return (
            <Input
              ref={inputRef as any}
              value={block.content.text || ''}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              placeholder="Heading 3"
              className="text-xl font-medium border-none p-0 h-auto bg-transparent resize-none focus:ring-0 focus:outline-none"
            />
          )
        case 'image':
          return (
            <div className="space-y-2">
              <Input
                placeholder="Image URL"
                value={block.content.src || ''}
                onChange={(e) => updateBlock(block.id, { src: e.target.value })}
                className="border-none p-0 bg-transparent"
              />
              {block.content.src && (
                <img
                  src={block.content.src}
                  alt={block.content.alt || ''}
                  className="max-w-full h-auto rounded"
                />
              )}
            </div>
          )
        case 'subpage':
          return (
            <div className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
              <FileText className="w-4 h-4" />
              <Input
                ref={inputRef as any}
                value={block.content.title || ''}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Sub-page title"
                className="border-none p-0 bg-transparent flex-1"
              />
            </div>
          )
        default:
          return (
            <Textarea
              ref={inputRef as any}
              value={block.content.text || ''}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              placeholder="Type '/' for commands"
              className="border-none p-0 min-h-[24px] bg-transparent resize-none focus:ring-0 focus:outline-none"
              rows={1}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = target.scrollHeight + 'px'
              }}
            />
          )
      }
    }

    return (
      <div className="group flex items-start space-x-2 py-1">
        {/* Drag Handle */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-6 w-6 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3" />
          </Button>
          
          {/* Add Block Button */}
          <Popover open={showBlockMenu === block.id} onOpenChange={(open) => setShowBlockMenu(open ? block.id : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6"
                onClick={() => setShowBlockMenu(block.id)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" side="left">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addBlock('paragraph', block.id)}
                >
                  <Type className="w-4 h-4 mr-2" />
                  Text
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addBlock('heading1', block.id)}
                >
                  <Heading1 className="w-4 h-4 mr-2" />
                  Heading 1
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addBlock('heading2', block.id)}
                >
                  <Heading2 className="w-4 h-4 mr-2" />
                  Heading 2
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addBlock('heading3', block.id)}
                >
                  <Heading3 className="w-4 h-4 mr-2" />
                  Heading 3
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addBlock('image', block.id)}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Image
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addBlock('subpage', block.id)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Sub-page
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Block Content */}
        <div className="flex-1 min-w-0" onClick={() => setFocusedBlockId(block.id)}>
          {renderBlockContent()}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full p-8 bg-white min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-4">
            ← Back
          </Button>
        )}
        
        <div className="flex items-center space-x-2 mb-4">
          <Input
            value={pageEmoji}
            onChange={(e) => setPageEmoji(e.target.value)}
            className="w-16 text-4xl border-none p-0 text-center bg-transparent"
            placeholder="📄"
          />
          <Input
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className="text-4xl font-bold border-none p-0 bg-transparent flex-1"
            placeholder="Untitled"
          />
        </div>
      </div>

      {/* Blocks */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-1"
            >
              {blocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${snapshot.isDragging ? 'bg-blue-50 rounded' : ''}`}
                    >
                      <BlockComponent block={block} index={index} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add New Block at End */}
      <div className="mt-8">
        <Button
          variant="ghost"
          onClick={() => addBlock('paragraph')}
          className="text-gray-400 hover:text-gray-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add a block
        </Button>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-8 right-8">
        <Button
          onClick={handleSave}
          disabled={savePageMutation.isPending}
          className="shadow-lg"
        >
          {savePageMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}