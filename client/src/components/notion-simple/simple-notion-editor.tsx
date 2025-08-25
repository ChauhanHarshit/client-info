import { useState, useRef, useEffect, useCallback, KeyboardEvent, DragEvent, MouseEvent } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Plus, GripVertical, Type, Hash, List, ListOrdered, Quote, Minus, Image, Video, FileText, Table, CheckSquare, Loader2, Crop, Move, ArrowLeft, Trash2, Save, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'

interface Block {
  id: string
  type: string
  content: string
  position: number
  isUploading?: boolean
  fileName?: string
  width?: number
  height?: number
  cropData?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface SimpleNotionEditorProps {
  pageId?: string
  initialTitle?: string
  initialEmoji?: string
}

export default function SimpleNotionEditor({ pageId, initialTitle, initialEmoji }: SimpleNotionEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [pageTitle, setPageTitle] = useState(initialTitle || 'Untitled')
  const [pageIcon, setPageIcon] = useState(initialEmoji || '📄')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  
  // Ref to prevent duplicate block creation with timestamp
  const lastInsertTime = useRef(0)
  const isInsertingBlock = useRef(false)
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  
  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing content from database
  const { data: pageData, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/notion-pages/${pageId}/blocks`],
    enabled: !!pageId,
    queryFn: async () => {
      const response = await fetch(`/api/notion-pages/${pageId}/blocks`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`Failed to load blocks: ${response.status}`)
      }
      const data = await response.json()
      return data
    },
    staleTime: 0,
    refetchOnMount: true
  }) as { data: any, isLoading: boolean, error: any, refetch: any }

  // Force refresh to load the restored content
  useEffect(() => {
    if (pageId && !isLoading) {
      refetch()
    }
  }, [pageId])

  // Save content mutation
  const saveMutation = useMutation({
    mutationFn: async (saveData: { blocks: Block[], title: string, emoji: string }) => {
      if (!pageId) throw new Error('No page ID provided')
      
      const response = await fetch(`/api/notion-pages/${pageId}/blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData),
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    },
    onSuccess: (data) => {
      setHasUnsavedChanges(false)
      setSaveStatus('saved')
      // REMOVED cache invalidation to prevent content from being overwritten after save
    },
    onError: (error) => {
      setSaveStatus('unsaved')
    }
  })

  // Load content from database when pageData is available
  useEffect(() => {
    if (!isLoading && pageData) {
      if (pageData.blocks && Array.isArray(pageData.blocks) && pageData.blocks.length > 0) {
        setBlocks(pageData.blocks)
        if (pageData.title) {
          setPageTitle(pageData.title)
        }
        if (pageData.emoji) {
          setPageIcon(pageData.emoji)
        }
        // Mark as saved when content is loaded from database
        setHasUnsavedChanges(false)
        setSaveStatus('saved')
      } else if (pageData.blocks && pageData.blocks.length === 0) {
        // Initialize with a default text block for new pages
        const defaultBlock = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: 'text',
          content: '',
          position: 0
        }
        setBlocks([defaultBlock])
        setHasUnsavedChanges(false)
        setSaveStatus('saved')
      }
    } else if (!isLoading && !pageData) {
      // Clear blocks if no data is available
      setBlocks([])
      setHasUnsavedChanges(false)
      setSaveStatus('saved')
    }
  }, [pageData, isLoading])

  // Update title when initialTitle prop changes
  useEffect(() => {
    if (initialTitle && initialTitle !== 'Untitled' && initialTitle !== pageTitle) {
      setPageTitle(initialTitle)
    }
  }, [initialTitle, pageTitle])

  // Update emoji when initialEmoji prop changes
  useEffect(() => {
    if (initialEmoji) {
      setPageIcon(initialEmoji)
    }
  }, [initialEmoji])

  // Mark unsaved changes when content changes (but not on initial load)
  useEffect(() => {
    // Only mark as unsaved if we have loaded data from database and user is making changes
    if (pageData && blocks.length > 0 && !isLoading) {
      setHasUnsavedChanges(true)
      setSaveStatus('unsaved')
    }
  }, [blocks, pageTitle, pageIcon, pageData, isLoading])

  // Auto-save functionality - saves after 1 second of inactivity
  useEffect(() => {
    // Only auto-save if we have unsaved changes, pageId exists, and we're not in loading state
    if (hasUnsavedChanges && pageId && !isLoading && !saveMutation.isPending) {
      // Auto-save after 1 second of inactivity to prevent excessive API calls
      const timeoutId = setTimeout(() => {
        setSaveStatus('saving')
        saveMutation.mutate({
          blocks: blocks,
          title: pageTitle,
          emoji: pageIcon
        })
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [hasUnsavedChanges, pageId, blocks, pageTitle, pageIcon, isLoading, saveMutation])

  // Cleanup URL objects on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      blocks.forEach(block => {
        if (block.content && block.content.startsWith('blob:')) {
          URL.revokeObjectURL(block.content)
        }
      })
    }
  }, []) // Empty dependency array for unmount only

  // Handle BeforeUnload to prevent losing unsaved work
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return 'You have unsaved changes. Are you sure you want to leave?'
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])



  const createBlock = (type: string = 'text', content: string = ''): Block => {
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      content,
      position: blocks.length
    }
  }

  const addBlock = (type: string = 'text', afterIndex?: number) => {
    const now = Date.now()
    
    // Prevent duplicate creation using timestamp check
    if (isInsertingBlock.current || (now - lastInsertTime.current) < 200) {
      return
    }
    
    isInsertingBlock.current = true
    lastInsertTime.current = now
    
    const newBlock = createBlock(type)
    
    setBlocks(prevBlocks => {
      const insertIndex = afterIndex !== undefined ? afterIndex + 1 : prevBlocks.length
      const newBlocks = [...prevBlocks]
      newBlocks.splice(insertIndex, 0, newBlock)
      return newBlocks.map((block, index) => ({ ...block, position: index }))
    })
    
    setHasUnsavedChanges(true)
    
    // Reset insertion flag after a short delay
    setTimeout(() => {
      isInsertingBlock.current = false
    }, 200)
  }

  const updateBlock = (id: string, content: string) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === id ? { ...block, content } : block
      )
    )
    setHasUnsavedChanges(true)
  }

  const deleteBlock = (id: string) => {
    setBlocks(prevBlocks => prevBlocks.filter(block => block.id !== id))
    setFocusedBlockId(null)
    setHasUnsavedChanges(true)
  }

  const handleKeyDown = (e: KeyboardEvent, blockId: string, content: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const blockIndex = blocks.findIndex(b => b.id === blockId)
      addBlock('text', blockIndex)
      
      // Focus the new block after a short delay
      setTimeout(() => {
        const nextBlock = document.querySelector(`[data-block-id="${blocks[blockIndex + 1]?.id}"] textarea`)
        if (nextBlock) {
          (nextBlock as HTMLElement).focus()
        }
      }, 50)
    }
  }

  const moveBlock = (dragIndex: number, hoverIndex: number) => {
    const draggedBlock = blocks[dragIndex]
    const newBlocks = [...blocks]
    newBlocks.splice(dragIndex, 1)
    newBlocks.splice(hoverIndex, 0, draggedBlock)
    
    // Update positions
    const updatedBlocks = newBlocks.map((block, index) => ({
      ...block,
      position: index
    }))
    
    setBlocks(updatedBlocks)
    setHasUnsavedChanges(true)
  }

  // File upload handling
  const uploadFile = async (file: File): Promise<string> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed with status:', response.status, 'Error:', errorText)
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // Check for URL in the correct location based on API response structure
      const fileUrl = result.file?.url || result.url
      if (!fileUrl) {
        throw new Error('Upload response missing URL')
      }
      
      return fileUrl
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  const handleFileUpload = async (files: FileList | File[]) => {
    const filesArray = Array.from(files)
    
    for (const file of filesArray) {
      // Client-side validation
      if (file.size === 0) {
        console.warn(`Skipping empty file: ${file.name}`)
        continue
      }
      
      if (file.size > 10 * 1024 * 1024 * 1024) { // 10GB limit
        console.error(`File too large: ${file.name} (${file.size} bytes)`)
        // Could add toast notification here
        continue
      }
      
      // Create a block immediately for each file with loading state
      const fileBlock = createBlock('file', `Uploading ${file.name}...`)
      fileBlock.isUploading = true
      fileBlock.fileName = file.name
      
      setBlocks(prevBlocks => [...prevBlocks, fileBlock])
      setHasUnsavedChanges(true)

      try {
        // Upload the file
        const fileUrl = await uploadFile(file)
        
        // Determine block type based on file type
        let blockType = 'file'
        let blockContent = fileUrl

        if (file.type.startsWith('image/')) {
          blockType = 'image'
        } else if (file.type.startsWith('video/')) {
          blockType = 'video'
        } else if (file.type === 'application/pdf') {
          blockType = 'file'
          blockContent = `📄 ${file.name}\n${fileUrl}`
        } else {
          // Other documents
          const icon = getFileIcon(file.name)
          blockContent = `${icon} ${file.name}\n${fileUrl}`
        }

        // Update the block with the uploaded file
        setBlocks(prevBlocks => 
          prevBlocks.map(block => 
            block.id === fileBlock.id 
              ? { ...block, type: blockType, content: blockContent, isUploading: false, fileName: file.name }
              : block
          )
        )
      } catch (error) {
        console.error('File upload failed:', error)
        
        // Determine error type for better user feedback
        let errorMessage = `❌ Failed to upload ${file.name}`
        if (error instanceof Error) {
          console.error('Error details:', error.message)
          if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = `🌐 Network error uploading ${file.name} - please try again`
          } else if (error.message.includes('size') || error.message.includes('large')) {
            errorMessage = `📏 File ${file.name} is too large (max 10GB)`
          } else if (error.message.includes('Invalid file')) {
            errorMessage = `⚠️ ${file.name} is not a supported file type`
          } else if (error.message.includes('500')) {
            errorMessage = `🔧 Server error uploading ${file.name} - please try again`
          } else {
            // Include part of the error message for debugging
            const errorDetails = error.message.substring(0, 50)
            errorMessage = `❌ Upload failed: ${errorDetails}...`
          }
        }
        
        // Update block to show specific error
        setBlocks(prevBlocks => 
          prevBlocks.map(block => 
            block.id === fileBlock.id 
              ? { ...block, content: errorMessage, isUploading: false }
              : block
          )
        )
      }
    }
  }

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf': return '📄'
      case 'doc':
      case 'docx': return '📝'
      case 'xls':
      case 'xlsx': return '📊'
      case 'ppt':
      case 'pptx': return '📊'
      case 'txt': return '📝'
      case 'csv': return '📊'
      case 'zip': return '📦'
      default: return '📄'
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  // File input handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(blocks)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index
    }))

    setBlocks(updatedItems)
    setHasUnsavedChanges(true)
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading content...</span>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`max-w-4xl mx-auto p-8 relative ${isDragOver ? 'bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center z-10 border-2 border-dashed border-blue-400 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📁</div>
            <div className="text-xl font-semibold text-blue-600">Drop files to upload</div>
            <div className="text-sm text-blue-500">PDF, DOC, XLS, images, videos, and more</div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.avi"
        className="hidden"
      />

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            className="text-2xl hover:bg-gray-100 rounded p-1"
            onClick={() => {
              const newEmoji = prompt('Enter an emoji:', pageIcon)
              if (newEmoji) setPageIcon(newEmoji)
            }}
          >
            {pageIcon}
          </button>
          <input
            type="text" 
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className="text-4xl font-bold bg-transparent border-none outline-none flex-1"
            placeholder="Untitled"
          />
        </div>
        
        {/* Auto-Save Status Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                saveStatus === 'saved' ? 'bg-green-500' : 
                saveStatus === 'saving' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              {saveStatus === 'saved' ? 'All changes saved automatically' : 
               saveStatus === 'saving' ? 'Auto-saving...' : 'Unsaved changes'}
            </div>
          </div>
        </div>
      </div>

      {/* Content Blocks */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {blocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="group relative mb-2"
                      data-block-id={block.id}
                    >
                      {/* Block Controls */}
                      <div className="flex items-start gap-2">
                        <div 
                          {...provided.dragHandleProps}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded cursor-grab"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        
                        {/* Block Content */}
                        <div className="flex-1">
                          {block.isUploading ? (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-gray-600">{block.content}</span>
                            </div>
                          ) : block.type === 'image' ? (
                            <div className="space-y-2">
                              <img 
                                src={block.content} 
                                alt={block.fileName || 'Uploaded image'}
                                className="max-w-full h-auto rounded-lg shadow-sm"
                              />
                              <textarea
                                value={block.content}
                                onChange={(e) => updateBlock(block.id, e.target.value)}
                                className="w-full bg-transparent border-none outline-none resize-none text-gray-500 text-sm"
                                placeholder="Add a caption..."
                                rows={1}
                              />
                            </div>
                          ) : block.type === 'video' ? (
                            <div className="space-y-2">
                              <video 
                                src={block.content} 
                                controls 
                                className="max-w-full h-auto rounded-lg shadow-sm"
                              />
                              <textarea
                                value={block.content}
                                onChange={(e) => updateBlock(block.id, e.target.value)}
                                className="w-full bg-transparent border-none outline-none resize-none text-gray-500 text-sm"
                                placeholder="Add a caption..."
                                rows={1}
                              />
                            </div>
                          ) : block.type === 'file' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <div className="text-2xl">{getFileIcon(block.fileName || '')}</div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{block.fileName}</div>
                                  <div className="flex gap-3 mt-1">
                                    <a 
                                      href={block.content.split('\n')[1] || block.content}
                                      download={block.fileName}
                                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                      onClick={(e) => {
                                        // Force download for all file types
                                        e.preventDefault()
                                        const fileUrl = block.content.split('\n')[1] || block.content
                                        const link = document.createElement('a')
                                        link.href = fileUrl
                                        link.download = block.fileName || 'download'
                                        link.target = '_blank'
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                      }}
                                    >
                                      📥 Download
                                    </a>
                                    {block.fileName?.toLowerCase().endsWith('.pdf') && (
                                      <button
                                        onClick={() => {
                                          const fileUrl = block.content.split('\n')[1] || block.content
                                          window.open(fileUrl, '_blank')
                                        }}
                                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                                      >
                                        👁️ Preview
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <textarea
                                value={block.content.split('\n')[0] || block.content}
                                onChange={(e) => {
                                  const fileUrl = block.content.split('\n')[1] || block.content
                                  updateBlock(block.id, `${e.target.value}\n${fileUrl}`)
                                }}
                                className="w-full bg-transparent border-none outline-none resize-none text-gray-500 text-sm"
                                placeholder="Add notes about this file..."
                                rows={1}
                              />
                            </div>
                          ) : (
                            <textarea
                              value={block.content}
                              onChange={(e) => updateBlock(block.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, block.id, block.content)}
                              onFocus={() => setFocusedBlockId(block.id)}
                              onBlur={() => setFocusedBlockId(null)}
                              className="w-full bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400 leading-relaxed"
                              placeholder="Type '/' for commands..."
                              rows={Math.max(1, Math.ceil(block.content.length / 60))}
                            />
                          )}
                        </div>
                        
                        <button
                          onClick={() => deleteBlock(block.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Block Buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => addBlock('text')}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add a block
        </button>
        <button
          onClick={openFileDialog}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FileText className="w-4 h-4" />
          Upload files
        </button>
      </div>
    </div>
  )
}