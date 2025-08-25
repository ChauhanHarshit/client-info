import { NodeViewWrapper } from '@tiptap/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, Edit3, Trash2 } from 'lucide-react'
import { useLocation } from 'wouter'

interface SubPageComponentProps {
  node: {
    attrs: {
      title: string
      pageId: string | null
      emoji: string
    }
  }
  updateAttributes: (attrs: any) => void
  deleteNode: () => void
}

export default function SubPageComponent({ node, updateAttributes, deleteNode }: SubPageComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(node.attrs.title)
  const [emoji, setEmoji] = useState(node.attrs.emoji)
  const [, setLocation] = useLocation()

  const handleSave = () => {
    updateAttributes({ title, emoji })
    setIsEditing(false)
  }

  const handleOpenPage = () => {
    if (node.attrs.pageId) {
      setLocation(`/notion/${node.attrs.pageId}`)
    } else {
      // Create new page and navigate to it
      const newPageId = Date.now().toString()
      updateAttributes({ pageId: newPageId })
      setLocation(`/notion/${newPageId}`)
    }
  }

  return (
    <NodeViewWrapper className="sub-page-block">
      <div className="border border-gray-200 rounded-lg p-4 my-2 hover:border-gray-300 transition-colors bg-white shadow-sm">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-12 text-center text-lg border border-gray-200 rounded px-2 py-1"
              placeholder="📄"
            />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
              placeholder="Page title"
            />
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between group">
            <div 
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={handleOpenPage}
            >
              <span className="text-xl">{emoji}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{title}</div>
                <div className="text-sm text-gray-500">
                  {node.attrs.pageId ? 'Click to open page' : 'Click to create page'}
                </div>
              </div>
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteNode()
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}