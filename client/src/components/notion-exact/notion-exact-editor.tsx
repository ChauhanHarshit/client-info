import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Plus, GripVertical, Type, Image, Hash, FileText } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Block {
  id: string
  type: 'text' | 'h1' | 'h2' | 'h3' | 'image' | 'page'
  content: string
  position: number
}

interface NotionExactEditorProps {
  pageId?: string
}

export default function NotionExactEditor({ pageId }: NotionExactEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([{ id: '1', type: 'text', content: '', position: 0 }])
  const [pageTitle, setPageTitle] = useState('Untitled')
  const [pageIcon, setPageIcon] = useState('📄')
  const [focusedBlock, setFocusedBlock] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Load page data
  const { data: page } = useQuery({
    queryKey: ['/api/inspiration-pages', pageId],
    enabled: !!pageId,
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; emoji: string }) => {
      const response = await fetch(`/api/inspiration-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] })
    },
  })

  useEffect(() => {
    if (page) {
      const pageData = page as any
      setPageTitle(pageData.title || 'Untitled')
      setPageIcon(pageData.emoji || '📄')
    }
  }, [page])

  const updateBlock = (blockId: string, content: string) => {
    setBlocks(blocks.map(block => 
      block.id === blockId ? { ...block, content } : block
    ))
  }

  const addBlock = (afterId: string, type: Block['type'] = 'text') => {
    const newId = Date.now().toString()
    const afterIndex = blocks.findIndex(b => b.id === afterId)
    const newBlocks = [...blocks]
    newBlocks.splice(afterIndex + 1, 0, {
      id: newId,
      type,
      content: '',
      position: afterIndex + 1
    })
    // Update positions
    newBlocks.forEach((block, index) => block.position = index)
    setBlocks(newBlocks)
    setFocusedBlock(newId)
    setShowMenu(null)
  }

  const deleteBlock = (blockId: string) => {
    if (blocks.length === 1) return
    const newBlocks = blocks.filter(b => b.id !== blockId)
    newBlocks.forEach((block, index) => block.position = index)
    setBlocks(newBlocks)
  }

  const handleKeyDown = (e: KeyboardEvent, blockId: string, content: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addBlock(blockId)
    } else if (e.key === 'Backspace' && content === '') {
      e.preventDefault()
      deleteBlock(blockId)
    } else if (e.key === '/' && content === '') {
      e.preventDefault()
      setShowMenu(blockId)
    }
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    const items = Array.from(blocks)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    items.forEach((block, index) => block.position = index)
    setBlocks(items)
  }

  const changeBlockType = (blockId: string, type: Block['type']) => {
    setBlocks(blocks.map(block => 
      block.id === blockId ? { ...block, type } : block
    ))
    setShowMenu(null)
  }

  const BlockMenu = ({ blockId }: { blockId: string }) => (
    <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg p-1 mt-1">
      <button
        className="flex items-center w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
        onClick={() => changeBlockType(blockId, 'text')}
      >
        <Type className="w-4 h-4 mr-2" />
        Text
      </button>
      <button
        className="flex items-center w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
        onClick={() => changeBlockType(blockId, 'h1')}
      >
        <Hash className="w-4 h-4 mr-2" />
        Heading 1
      </button>
      <button
        className="flex items-center w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
        onClick={() => changeBlockType(blockId, 'h2')}
      >
        <Hash className="w-4 h-4 mr-2" />
        Heading 2
      </button>
      <button
        className="flex items-center w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
        onClick={() => changeBlockType(blockId, 'image')}
      >
        <Image className="w-4 h-4 mr-2" />
        Image
      </button>
      <button
        className="flex items-center w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
        onClick={() => changeBlockType(blockId, 'page')}
      >
        <FileText className="w-4 h-4 mr-2" />
        Page
      </button>
    </div>
  )

  const BlockComponent = ({ block, index }: { block: Block; index: number }) => {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

    useEffect(() => {
      if (focusedBlock === block.id && inputRef.current) {
        inputRef.current.focus()
      }
    }, [focusedBlock, block.id])

    const baseClasses = "w-full border-none outline-none resize-none bg-transparent"
    const placeholder = block.type === 'text' ? "Type '/' for commands" : getPlaceholder(block.type)

    if (block.type === 'h1') {
      return (
        <input
          ref={inputRef as any}
          value={block.content}
          onChange={(e) => updateBlock(block.id, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, block.id, block.content)}
          placeholder={placeholder}
          className={`${baseClasses} text-3xl font-bold py-1`}
        />
      )
    }

    if (block.type === 'h2') {
      return (
        <input
          ref={inputRef as any}
          value={block.content}
          onChange={(e) => updateBlock(block.id, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, block.id, block.content)}
          placeholder={placeholder}
          className={`${baseClasses} text-2xl font-semibold py-1`}
        />
      )
    }

    if (block.type === 'h3') {
      return (
        <input
          ref={inputRef as any}
          value={block.content}
          onChange={(e) => updateBlock(block.id, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, block.id, block.content)}
          placeholder={placeholder}
          className={`${baseClasses} text-xl font-medium py-1`}
        />
      )
    }

    if (block.type === 'image') {
      return block.content ? (
        <img src={block.content} alt="" className="max-w-full h-auto rounded" />
      ) : (
        <input
          ref={inputRef as any}
          value={block.content}
          onChange={(e) => updateBlock(block.id, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, block.id, block.content)}
          placeholder="Paste image URL"
          className={`${baseClasses} py-1`}
        />
      )
    }

    if (block.type === 'page') {
      return (
        <div className="flex items-center px-2 py-1 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
          <FileText className="w-4 h-4 mr-2 text-gray-500" />
          <input
            ref={inputRef as any}
            value={block.content}
            onChange={(e) => updateBlock(block.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, block.id, block.content)}
            placeholder="Untitled"
            className={`${baseClasses} py-0`}
          />
        </div>
      )
    }

    return (
      <textarea
        ref={inputRef as any}
        value={block.content}
        onChange={(e) => updateBlock(block.id, e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, block.id, block.content)}
        placeholder={placeholder}
        className={`${baseClasses} py-1 min-h-[1.5rem]`}
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

  const getPlaceholder = (type: string) => {
    switch (type) {
      case 'h1': return 'Heading 1'
      case 'h2': return 'Heading 2'
      case 'h3': return 'Heading 3'
      case 'image': return 'Image URL'
      case 'page': return 'Page title'
      default: return "Type '/' for commands"
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <input
              value={pageIcon}
              onChange={(e) => setPageIcon(e.target.value)}
              className="w-12 h-12 text-5xl text-center border-none outline-none bg-transparent"
              placeholder="🌟"
            />
          </div>
          <input
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full text-5xl font-bold border-none outline-none bg-transparent py-1"
          />
        </div>

        {/* Blocks */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="blocks">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group relative ${snapshot.isDragging ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start">
                          {/* Drag handle - only visible on hover */}
                          <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 flex items-center">
                            <button
                              {...provided.dragHandleProps}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <GripVertical className="w-3 h-3 text-gray-400" />
                            </button>
                            <button
                              onClick={() => setShowMenu(showMenu === block.id ? null : block.id)}
                              className="p-1 rounded hover:bg-gray-100 ml-1"
                            >
                              <Plus className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>

                          {/* Block content */}
                          <div className="flex-1 min-w-0" onClick={() => setFocusedBlock(block.id)}>
                            <BlockComponent block={block} index={index} />
                          </div>
                        </div>

                        {/* Block menu */}
                        {showMenu === block.id && (
                          <div className="relative">
                            <BlockMenu blockId={block.id} />
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add block button at bottom */}
        <div className="mt-4">
          <button
            onClick={() => addBlock(blocks[blocks.length - 1].id)}
            className="flex items-center text-gray-400 hover:text-gray-600 text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Click to add below
          </button>
        </div>
      </div>
    </div>
  )
}