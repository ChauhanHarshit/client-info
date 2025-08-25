// Block type definitions for the Notion-like editor

export interface BlockContent {
  text?: string;
  url?: string;
  alt?: string;
  title?: string;
  checked?: boolean;
  level?: number;
  language?: string;
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  fontSize?: string;
  items?: string[];
  pageId?: number;
  pageTitle?: string;
  icon?: string;
  children?: BlockContent[];
}

export interface Block {
  id: number;
  pageId: number;
  parentBlockId?: number;
  type: BlockType;
  content: BlockContent;
  position: number;
  indentLevel: number;
  isCollapsed: boolean;
  styles?: any;
  createdAt: Date;
  updatedAt: Date;
  childBlocks?: Block[];
}

export type BlockType = 
  | 'text'
  | 'heading1'
  | 'heading2' 
  | 'heading3'
  | 'bullet_list'
  | 'numbered_list'
  | 'to_do'
  | 'toggle'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'image'
  | 'video'
  | 'code'
  | 'embed'
  | 'page_link'
  | 'dropdown'
  | 'sub_page';

export const BLOCK_TYPES: { type: BlockType; label: string; icon: string; description: string }[] = [
  { type: 'text', label: 'Text', icon: 'Type', description: 'Just start writing with plain text.' },
  { type: 'heading1', label: 'Heading 1', icon: 'Heading1', description: 'Big section heading.' },
  { type: 'heading2', label: 'Heading 2', icon: 'Heading2', description: 'Medium section heading.' },
  { type: 'heading3', label: 'Heading 3', icon: 'Heading3', description: 'Small section heading.' },
  { type: 'bullet_list', label: 'Bulleted list', icon: 'List', description: 'Create a simple bulleted list.' },
  { type: 'numbered_list', label: 'Numbered list', icon: 'ListOrdered', description: 'Create a list with numbering.' },
  { type: 'to_do', label: 'To-do list', icon: 'CheckSquare', description: 'Track tasks with a to-do list.' },
  { type: 'toggle', label: 'Toggle list', icon: 'ChevronRight', description: 'Toggles can hide and show content inside.' },
  { type: 'quote', label: 'Quote', icon: 'Quote', description: 'Capture a quote.' },
  { type: 'callout', label: 'Callout', icon: 'MessageSquare', description: 'Make writing stand out.' },
  { type: 'divider', label: 'Divider', icon: 'Minus', description: 'Visually divide blocks.' },
  { type: 'image', label: 'Image', icon: 'Image', description: 'Upload or embed with a link.' },
  { type: 'video', label: 'Video', icon: 'Video', description: 'Embed a video.' },
  { type: 'code', label: 'Code', icon: 'Code', description: 'Capture a code snippet.' },
  { type: 'page_link', label: 'Page link', icon: 'FileText', description: 'Link to another page.' },
  { type: 'dropdown', label: 'Dropdown', icon: 'ChevronDown', description: 'Create a collapsible dropdown section.' },
  { type: 'sub_page', label: 'Page', icon: 'FileText', description: 'Embed a sub-page inside this page.' },
];

export const createEmptyBlock = (type: BlockType, pageId: number, position: number): Partial<Block> => {
  const baseBlock = {
    pageId,
    type,
    position,
    indentLevel: 0,
    isCollapsed: false,
    content: {},
  };

  switch (type) {
    case 'text':
      return { ...baseBlock, content: { text: '' } };
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return { ...baseBlock, content: { text: '', level: parseInt(type.slice(-1)) } };
    case 'bullet_list':
    case 'numbered_list':
      return { ...baseBlock, content: { text: '' } };
    case 'to_do':
      return { ...baseBlock, content: { text: '', checked: false } };
    case 'toggle':
    case 'dropdown':
      return { ...baseBlock, content: { text: '', children: [] }, isCollapsed: true };
    case 'quote':
      return { ...baseBlock, content: { text: '' } };
    case 'callout':
      return { ...baseBlock, content: { text: '', icon: '💡', color: 'gray', backgroundColor: '#f1f3f4' } };
    case 'divider':
      return { ...baseBlock, content: {} };
    case 'image':
      return { ...baseBlock, content: { url: '', alt: '' } };
    case 'video':
      return { ...baseBlock, content: { url: '', title: '' } };
    case 'code':
      return { ...baseBlock, content: { text: '', language: 'javascript' } };
    case 'page_link':
      return { ...baseBlock, content: { pageId: undefined, pageTitle: '' } };
    case 'sub_page':
      return { ...baseBlock, content: { pageId: undefined, pageTitle: 'Untitled Page', icon: '📄' } };
    default:
      return { ...baseBlock, content: { text: '' } };
  }
};