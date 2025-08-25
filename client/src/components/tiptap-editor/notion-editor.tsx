import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import CodeBlock from '@tiptap/extension-code-block'
import Blockquote from '@tiptap/extension-blockquote'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import HardBreak from '@tiptap/extension-hard-break'
import History from '@tiptap/extension-history'
import Image from '@tiptap/extension-image'
import YouTube from '@tiptap/extension-youtube'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Focus from '@tiptap/extension-focus'
import Dropcursor from '@tiptap/extension-dropcursor'
import Gapcursor from '@tiptap/extension-gapcursor'
import { useState, useCallback, useEffect } from 'react'
import { useParams, useLocation } from 'wouter'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Save,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  Code as CodeIcon,
  Quote,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  FileText,
  GripVertical,
  Plus
} from 'lucide-react'
// Sub-page extension temporarily disabled to fix imports
import BlockMenu from './block-menu'
import { apiRequest } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'

interface NotionEditorProps {
  pageId?: string
  onBack?: () => void
}

export default function NotionEditor({ pageId, onBack }: NotionEditorProps) {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [pageTitle, setPageTitle] = useState('Untitled')
  const [pageEmoji, setPageEmoji] = useState('📄')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Fetch page data
  const { data: page, isLoading } = useQuery({
    queryKey: ['/api/inspiration-pages', pageId],
    enabled: !!pageId,
  })

  // Save page mutation
  const savePageMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; emoji: string }) => {
      const response = await fetch(`/api/inspiration-pages/${pageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to save page')
      }
      return response.json()
    },
    onSuccess: () => {
      setLastSaved(new Date())
      setIsSaving(false)
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration-pages'] })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save page',
        variant: 'destructive',
      })
      setIsSaving(false)
    },
  })

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Bold,
      Italic,
      Strike,
      Code,
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 dark:bg-gray-800 rounded-md p-4 font-mono text-sm',
        },
      }),
      Blockquote,
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc list-inside',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-inside',
        },
      }),
      ListItem,
      HorizontalRule,
      HardBreak,
      History,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      YouTube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: {
          class: 'w-full max-w-2xl mx-auto my-4',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`
          }
          return "Type '/' for commands or just start writing..."
        },
      }),
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
      Dropcursor,
      Gapcursor,
      // SubPageExtension temporarily removed
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-screen px-8 py-4',
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          // Handle slash commands
          if (event.key === '/') {
            // You can add slash command menu here
            return false
          }
          return false
        },
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save after 2 seconds of inactivity
      if (pageId) {
        clearTimeout(window.autoSaveTimeout)
        window.autoSaveTimeout = setTimeout(() => {
          handleSave(editor.getHTML())
        }, 2000)
      }
    },
  })

  // Initialize page data
  useEffect(() => {
    if (page && editor) {
      const pageData = page as any
      setPageTitle(pageData.title || 'Untitled')
      setPageEmoji(pageData.emoji || '📄')
      
      // Load content from blocks if available
      if (pageData.blocks && Array.isArray(pageData.blocks) && pageData.blocks.length > 0) {
        // Convert blocks to HTML content
        const htmlContent = pageData.blocks
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
          .map((block: any) => {
            const content = block.content || {}
            switch (block.type) {
              case 'paragraph':
                return `<p>${content.text || ''}</p>`
              case 'heading':
                return `<h${content.level || 1}>${content.text || ''}</h${content.level || 1}>`
              case 'image':
                return `<img src="${content.src || ''}" alt="${content.alt || ''}" />`
              case 'video':
                return `<iframe src="${content.src || ''}"></iframe>`
              default:
                return `<p>${content.text || ''}</p>`
            }
          })
          .join('')
        
        editor.commands.setContent(htmlContent || '<p></p>')
      } else {
        editor.commands.setContent('<p></p>')
      }
    }
  }, [page, editor])

  const handleSave = useCallback(async (content?: string) => {
    if (!pageId || !editor) return
    
    setIsSaving(true)
    const editorContent = content || editor.getHTML()
    
    savePageMutation.mutate({
      title: pageTitle,
      content: editorContent,
      emoji: pageEmoji,
    })
  }, [pageId, editor, pageTitle, pageEmoji, savePageMutation])

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      setLocation('/connected-creator-content')
    }
  }

  const addSubPage = useCallback(() => {
    if (!editor) return
    
    const title = window.prompt('Enter sub-page title:') || 'Untitled Page'
    editor.chain().focus().setSubPage({ title }).run()
  }, [editor])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!editor) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div>Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 sticky top-0 z-40">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              
              {/* Page Title Section */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pageEmoji}
                  onChange={(e) => setPageEmoji(e.target.value)}
                  className="text-4xl bg-transparent border-none outline-none w-16 text-center"
                  placeholder="📄"
                />
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="text-4xl font-bold bg-transparent border-none outline-none min-w-0 text-gray-900 dark:text-gray-100"
                  placeholder="Untitled"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Save Status */}
              {isSaving && (
                <span className="text-sm text-gray-500">Saving...</span>
              )}
              {lastSaved && !isSaving && (
                <span className="text-sm text-gray-500">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              
              {/* Manual Save Button */}
              <Button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="w-full relative">
        {/* Bubble Menu for Text Selection */}
        {editor && (
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'bg-gray-100 dark:bg-gray-700' : ''}
              >
                <BoldIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'bg-gray-100 dark:bg-gray-700' : ''}
              >
                <ItalicIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={editor.isActive('strike') ? 'bg-gray-100 dark:bg-gray-700' : ''}
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={editor.isActive('code') ? 'bg-gray-100 dark:bg-gray-700' : ''}
              >
                <CodeIcon className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = window.prompt('Enter URL:')
                  if (url) {
                    editor.chain().focus().setLink({ href: url }).run()
                  }
                }}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </BubbleMenu>
        )}

        {/* Main Editor Content with Block Menus */}
        <div className="relative group">
          <EditorContent 
            editor={editor} 
            className="min-h-screen focus-within:outline-none"
          />
          
          {/* Floating Add Button */}
          <div className="fixed bottom-6 right-6 z-50">
            <BlockMenu editor={editor} onAddSubPage={addSubPage} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Add auto-save timeout to window object
declare global {
  interface Window {
    autoSaveTimeout: NodeJS.Timeout
  }
}