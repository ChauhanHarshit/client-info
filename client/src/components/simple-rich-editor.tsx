import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';

interface SimpleRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SimpleRichEditor({ value, onChange, placeholder = "Enter description..." }: SimpleRichEditorProps) {
  const [content, setContent] = useState(value || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(value || '');
  }, [value]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    onChange(newContent);
  };

  const insertTag = (tagStart: string, tagEnd: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    const newText = beforeText + tagStart + selectedText + tagEnd + afterText;
    handleChange(newText);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + tagStart.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      const linkText = window.prompt('Enter link text:') || url;
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const beforeText = content.substring(0, start);
      const afterText = content.substring(start);
      const linkMarkup = `[${linkText}](${url})`;
      
      handleChange(beforeText + linkMarkup + afterText);
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      const altText = window.prompt('Enter image description:') || 'Image';
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const beforeText = content.substring(0, start);
      const afterText = content.substring(start);
      const imageMarkup = `\n![${altText}](${url})\n`;
      
      handleChange(beforeText + imageMarkup + afterText);
    }
  };

  return (
    <div className="border rounded-md">
      <div className="border-b p-2 flex gap-1 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertTag('**', '**')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertTag('*', '*')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertTag('\n- ', '')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertTag('\n1. ', '')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addLink}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addImage}
          title="Add Image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
      />
      <div className="p-2 text-xs text-gray-500">
        Supports markdown: **bold**, *italic*, [link](url), ![alt](image-url)
      </div>
    </div>
  );
}