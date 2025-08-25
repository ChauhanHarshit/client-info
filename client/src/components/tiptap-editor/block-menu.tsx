import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Image,
  Video,
  FileText,
  Minus,
  Plus
} from 'lucide-react'
import { useState } from 'react'

interface BlockMenuProps {
  editor: Editor
  onAddSubPage: () => void
}

export default function BlockMenu({ editor, onAddSubPage }: BlockMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const addImage = () => {
    const url = window.prompt('Enter image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
    setIsOpen(false)
  }

  const addVideo = () => {
    const url = window.prompt('Enter YouTube URL:')
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run()
    }
    setIsOpen(false)
  }

  const handleCommand = (command: () => void) => {
    command()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>
      
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-48 z-50">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCommand(() => editor.chain().focus().setParagraph().run())}
              className="w-full justify-start"
            >
              <Type className="h-4 w-4 mr-2" />
              Text
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
              className="w-full justify-start"
            >
              <Heading1 className="h-4 w-4 mr-2" />
              Heading 1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
              className="w-full justify-start"
            >
              <Heading2 className="h-4 w-4 mr-2" />
              Heading 2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCommand(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
              className="w-full justify-start"
            >
              <Heading3 className="h-4 w-4 mr-2" />
              Heading 3
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCommand(() => editor.chain().focus().toggleBulletList().run())}
              className="w-full justify-start"
            >
              <List className="h-4 w-4 mr-2" />
              Bullet List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCommand(() => editor.chain().focus().toggleOrderedList().run())}
              className="w-full justify-start"
            >
              <ListOrdered className="h-4 w-4 mr-2" />
              Numbered List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCommand(() => editor.chain().focus().toggleBlockquote().run())}
              className="w-full justify-start"
            >
              <Quote className="h-4 w-4 mr-2" />
              Quote
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCommand(() => editor.chain().focus().setHorizontalRule().run())}
              className="w-full justify-start"
            >
              <Minus className="h-4 w-4 mr-2" />
              Divider
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={addImage}
              className="w-full justify-start"
            >
              <Image className="h-4 w-4 mr-2" />
              Image
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={addVideo}
              className="w-full justify-start"
            >
              <Video className="h-4 w-4 mr-2" />
              Video
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onAddSubPage()
                setIsOpen(false)
              }}
              className="w-full justify-start"
            >
              <FileText className="h-4 w-4 mr-2" />
              Sub Page
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}