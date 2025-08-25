import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronRight, 
  ChevronDown, 
  GripVertical, 
  Plus, 
  Trash2,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  MessageSquare,
  Minus,
  Image,
  Video,
  Code,
  FileText,
  Bold,
  Italic,
  Underline
} from 'lucide-react';
import { Block, BlockType, BlockContent, createEmptyBlock, BLOCK_TYPES } from './block-types';

interface BlockRendererProps {
  block: Block;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onInsertBlock: (type: BlockType, position: number) => void;
  onIndent: () => void;
  onOutdent: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onNavigateToPage?: (pageId?: number) => void;
  pages?: Array<{ id: number; title: string; emoji?: string }>;
}

export default function BlockRenderer({
  block,
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onInsertBlock,
  onIndent,
  onOutdent,
  onDragStart,
  onDragOver,
  onDrop,
  onNavigateToPage,
  pages = []
}: BlockRendererProps) {
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing, block.content.text]);

  // Focus input when editing starts
  useEffect(() => {
    if (inputRef.current && isEditing) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (block.type === 'text' || block.type.startsWith('heading')) {
        onInsertBlock('text', block.position + 1);
      }
      onStopEdit();
    } else if (e.key === 'Escape') {
      onStopEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        onOutdent();
      } else {
        onIndent();
      }
    } else if (e.key === 'Backspace' && !block.content.text && block.type === 'text') {
      e.preventDefault();
      onDelete();
    }
  };

  const handleTypeChange = (newType: BlockType) => {
    const newBlock = createEmptyBlock(newType, block.pageId, block.position);
    onUpdate({
      type: newType,
      content: { ...newBlock.content, text: block.content.text || '' }
    });
    setShowTypeMenu(false);
  };

  const handleToggleCollapse = () => {
    onUpdate({ isCollapsed: !block.isCollapsed });
  };

  const renderBlockContent = () => {
    const indentStyle = { marginLeft: `${block.indentLevel * 24}px` };

    switch (block.type) {
      case 'text':
        return (
          <div style={indentStyle} className="group relative">
            {isEditing ? (
              <Textarea
                ref={textareaRef}
                value={block.content.text || ''}
                onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
                onBlur={onStopEdit}
                onKeyDown={handleKeyDown}
                className="min-h-[40px] resize-none border-none p-0 shadow-none focus:ring-0"
                placeholder="Type '/' for commands..."
              />
            ) : (
              <div
                onClick={onStartEdit}
                className="min-h-[40px] p-2 rounded cursor-text hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {block.content.text || <span className="text-gray-400">Type '/' for commands...</span>}
              </div>
            )}
          </div>
        );

      case 'heading1':
      case 'heading2':
      case 'heading3':
        const HeadingTag = `h${block.content.level || 1}` as keyof JSX.IntrinsicElements;
        const headingClasses: Record<number, string> = {
          1: 'text-3xl font-bold',
          2: 'text-2xl font-semibold',
          3: 'text-xl font-medium'
        };
        
        return (
          <div style={indentStyle} className="group relative">
            {isEditing ? (
              <Input
                ref={inputRef}
                value={block.content.text || ''}
                onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
                onBlur={onStopEdit}
                onKeyDown={handleKeyDown}
                className={`border-none p-0 shadow-none focus:ring-0 ${headingClasses[block.content.level || 1]}`}
                placeholder={`Heading ${block.content.level || 1}`}
              />
            ) : (
              <HeadingTag
                onClick={onStartEdit}
                className={`cursor-text p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 ${headingClasses[block.content.level || 1]}`}
              >
                {block.content.text || `Heading ${block.content.level || 1}`}
              </HeadingTag>
            )}
          </div>
        );

      case 'bullet_list':
        return (
          <div style={indentStyle} className="group relative flex items-start gap-2">
            <span className="mt-2 w-2 h-2 bg-gray-600 rounded-full flex-shrink-0"></span>
            {isEditing ? (
              <Textarea
                ref={textareaRef}
                value={block.content.text || ''}
                onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
                onBlur={onStopEdit}
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-[40px] resize-none border-none p-0 shadow-none focus:ring-0"
                placeholder="List item..."
              />
            ) : (
              <div
                onClick={onStartEdit}
                className="flex-1 min-h-[40px] p-2 rounded cursor-text hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {block.content.text || 'List item...'}
              </div>
            )}
          </div>
        );

      case 'numbered_list':
        return (
          <div style={indentStyle} className="group relative flex items-start gap-2">
            <span className="mt-2 text-sm font-medium flex-shrink-0 w-6">1.</span>
            {isEditing ? (
              <Textarea
                ref={textareaRef}
                value={block.content.text || ''}
                onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
                onBlur={onStopEdit}
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-[40px] resize-none border-none p-0 shadow-none focus:ring-0"
                placeholder="List item..."
              />
            ) : (
              <div
                onClick={onStartEdit}
                className="flex-1 min-h-[40px] p-2 rounded cursor-text hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {block.content.text || 'List item...'}
              </div>
            )}
          </div>
        );

      case 'to_do':
        return (
          <div style={indentStyle} className="group relative flex items-start gap-2">
            <Checkbox
              checked={block.content.checked || false}
              onCheckedChange={(checked) => onUpdate({ content: { ...block.content, checked: !!checked } })}
              className="mt-2 flex-shrink-0"
            />
            {isEditing ? (
              <Textarea
                ref={textareaRef}
                value={block.content.text || ''}
                onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
                onBlur={onStopEdit}
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-[40px] resize-none border-none p-0 shadow-none focus:ring-0"
                placeholder="To-do item..."
              />
            ) : (
              <div
                onClick={onStartEdit}
                className={`flex-1 min-h-[40px] p-2 rounded cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  block.content.checked ? 'line-through text-gray-500' : ''
                }`}
              >
                {block.content.text || 'To-do item...'}
              </div>
            )}
          </div>
        );

      case 'toggle':
      case 'dropdown':
        return (
          <div style={indentStyle} className="group relative">
            <div className="flex items-start gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCollapse}
                className="mt-1 p-1 h-auto flex-shrink-0"
              >
                {block.isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {isEditing ? (
                <Textarea
                  ref={textareaRef}
                  value={block.content.text || ''}
                  onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
                  onBlur={onStopEdit}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-h-[40px] resize-none border-none p-0 shadow-none focus:ring-0"
                  placeholder="Toggle heading..."
                />
              ) : (
                <div
                  onClick={onStartEdit}
                  className="flex-1 min-h-[40px] p-2 rounded cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
                >
                  {block.content.text || 'Toggle heading...'}
                </div>
              )}
            </div>
            {!block.isCollapsed && block.childBlocks && (
              <div className="ml-6 mt-2 space-y-2">
                {block.childBlocks.map((childBlock) => (
                  <BlockRenderer
                    key={childBlock.id}
                    block={childBlock}
                    isSelected={false}
                    isEditing={false}
                    onSelect={() => {}}
                    onStartEdit={() => {}}
                    onStopEdit={() => {}}
                    onUpdate={() => {}}
                    onDelete={() => {}}
                    onInsertBlock={() => {}}
                    onIndent={() => {}}
                    onOutdent={() => {}}
                    onDragStart={() => {}}
                    onDragOver={() => {}}
                    onDrop={() => {}}
                    pages={pages}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'quote':
        return (
          <div style={indentStyle} className="group relative">
            <div className="border-l-4 border-gray-300 pl-4">
              {isEditing ? (
                <Textarea
                  ref={textareaRef}
                  value={block.content.text || ''}
                  onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
                  onBlur={onStopEdit}
                  onKeyDown={handleKeyDown}
                  className="min-h-[40px] resize-none border-none p-0 shadow-none focus:ring-0 italic"
                  placeholder="Quote..."
                />
              ) : (
                <div
                  onClick={onStartEdit}
                  className="min-h-[40px] p-2 rounded cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 italic text-gray-700 dark:text-gray-300"
                >
                  {block.content.text || 'Quote...'}
                </div>
              )}
            </div>
          </div>
        );

      case 'callout':
        return (
          <div style={indentStyle} className="group relative">
            <div 
              className="p-4 rounded-lg border-l-4"
              style={{
                backgroundColor: block.content.backgroundColor || '#f1f3f4',
                borderLeftColor: block.content.color || '#9ca3af'
              }}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">{block.content.icon || '💡'}</span>
                {isEditing ? (
                  <Textarea
                    ref={textareaRef}
                    value={block.content.text || ''}
                    onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
                    onBlur={onStopEdit}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-h-[40px] resize-none border-none p-0 shadow-none focus:ring-0 bg-transparent"
                    placeholder="Callout text..."
                  />
                ) : (
                  <div
                    onClick={onStartEdit}
                    className="flex-1 min-h-[40px] p-2 rounded cursor-text hover:bg-black/5"
                  >
                    {block.content.text || 'Callout text...'}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'divider':
        return (
          <div style={indentStyle} className="group relative py-4">
            <hr className="border-gray-300 dark:border-gray-600" />
          </div>
        );

      case 'image':
        return (
          <div style={indentStyle} className="group relative">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={block.content.url || ''}
                  onChange={(e) => onUpdate({ content: { ...block.content, url: e.target.value } })}
                  placeholder="Image URL..."
                  className="border p-2"
                />
                <Input
                  value={block.content.alt || ''}
                  onChange={(e) => onUpdate({ content: { ...block.content, alt: e.target.value } })}
                  placeholder="Alt text..."
                  className="border p-2"
                />
                <div className="flex gap-2">
                  <Button onClick={onStopEdit} size="sm">Done</Button>
                </div>
              </div>
            ) : (
              <div onClick={onStartEdit} className="cursor-pointer">
                {block.content.url ? (
                  <img 
                    src={block.content.url} 
                    alt={block.content.alt || ''} 
                    className="max-w-full h-auto rounded"
                  />
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400">
                    <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">Click to add image</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'code':
        return (
          <div style={indentStyle} className="group relative">
            {isEditing ? (
              <div className="space-y-2">
                <Select 
                  value={block.content.language || 'javascript'} 
                  onValueChange={(language) => onUpdate({ content: { ...block.content, language } })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="css">CSS</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  ref={textareaRef}
                  value={block.content.text || ''}
                  onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
                  onBlur={onStopEdit}
                  className="font-mono text-sm bg-gray-100 dark:bg-gray-800 min-h-[120px]"
                  placeholder="Code..."
                />
              </div>
            ) : (
              <div onClick={onStartEdit} className="cursor-pointer">
                <div className="bg-gray-100 dark:bg-gray-800 rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500 uppercase">{block.content.language || 'code'}</span>
                  </div>
                  <pre className="font-mono text-sm overflow-x-auto">
                    <code>{block.content.text || 'Click to add code...'}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        );

      case 'page_link':
        return (
          <div style={indentStyle} className="group relative">
            {isEditing ? (
              <div className="space-y-2">
                <Select 
                  value={block.content.pageId?.toString() || ''} 
                  onValueChange={(pageId) => {
                    const selectedPage = pages.find(p => p.id.toString() === pageId);
                    onUpdate({ 
                      content: { 
                        ...block.content, 
                        pageId: parseInt(pageId),
                        pageTitle: selectedPage?.title || ''
                      } 
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id.toString()}>
                        {page.emoji} {page.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={onStopEdit} size="sm">Done</Button>
              </div>
            ) : (
              <div onClick={onStartEdit} className="cursor-pointer">
                <div className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span>{block.content.pageTitle || 'Select a page...'}</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'sub_page':
        return (
          <div style={indentStyle} className="group relative">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  ref={textareaRef}
                  value={block.content.pageTitle || ''}
                  onChange={(e) => onUpdate({ content: { ...block.content, pageTitle: e.target.value } })}
                  onBlur={onStopEdit}
                  placeholder="Page title..."
                  className="border p-2"
                />
                <div className="flex gap-2">
                  <Button onClick={onStopEdit} size="sm">Done</Button>
                  <Button 
                    onClick={() => {
                      if (block.content.pageId) {
                        onNavigateToPage(block.content.pageId);
                      }
                    }}
                    size="sm"
                    variant="outline"
                    disabled={!block.content.pageId}
                  >
                    Open Page
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => {
                  if (block.content.pageId) {
                    onNavigateToPage(block.content.pageId);
                  } else {
                    onStartEdit();
                  }
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <span className="text-lg">{block.content.icon || '📄'}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {block.content.pageTitle || 'Untitled Page'}
                  </span>
                  {!block.content.pageId && (
                    <span className="text-sm text-gray-500 ml-auto">Click to edit</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div>Unknown block type: {block.type}</div>;
    }
  };

  return (
    <div
      className={`relative group ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
      onClick={onSelect}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Block controls */}
      <div className="absolute left-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -ml-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBlockMenu(!showBlockMenu)}
          className="p-1 h-auto"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-auto cursor-grab"
          onMouseDown={onDragStart}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Type selector */}
      {showTypeMenu && (
        <div className="absolute top-0 left-0 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-2 w-64 max-h-80 overflow-y-auto">
          <div className="space-y-1">
            {BLOCK_TYPES.map((blockType) => (
              <Button
                key={blockType.type}
                variant="ghost"
                className="w-full justify-start text-left p-2 h-auto"
                onClick={() => handleTypeChange(blockType.type)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {/* Icon rendering would go here */}
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
      )}

      {/* Block content */}
      {renderBlockContent()}

      {/* Delete button */}
      {isSelected && (
        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity -mr-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="p-1 h-auto text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}