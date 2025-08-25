import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Type, 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon,
  GripVertical,
  Trash2,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Edit3,
  Save,
  X,
  Palette,
  Hash,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Minus,
  Eye,
  Share2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InspirationPage {
  id: number;
  emoji?: string;
  name: string;
  description?: string;
  bannerUrl: string;
  bannerType: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ContentItem {
  id: number;
  pageId: number;
  type: "text" | "heading" | "image" | "video" | "link" | "quote" | "list" | "checklist" | "divider";
  title: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  sortOrder: number;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const blockTypeOptions = [
  { value: "text", label: "Text", icon: Type },
  { value: "heading", label: "Heading", icon: Hash },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "video", label: "Video", icon: Video },
  { value: "link", label: "Link", icon: LinkIcon },
  { value: "quote", label: "Quote", icon: Quote },
  { value: "list", label: "Bullet List", icon: List },
  { value: "checklist", label: "Checklist", icon: CheckSquare },
  { value: "divider", label: "Divider", icon: Minus },
];

const colorOptions = [
  { name: "Default", bg: "bg-white", text: "text-gray-900", border: "border-gray-200" },
  { name: "Blue", bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-200" },
  { name: "Green", bg: "bg-green-50", text: "text-green-900", border: "border-green-200" },
  { name: "Yellow", bg: "bg-yellow-50", text: "text-yellow-900", border: "border-yellow-200" },
  { name: "Purple", bg: "bg-purple-50", text: "text-purple-900", border: "border-purple-200" },
  { name: "Pink", bg: "bg-pink-50", text: "text-pink-900", border: "border-pink-200" },
  { name: "Gray", bg: "bg-gray-50", text: "text-gray-900", border: "border-gray-300" },
];

export default function NotionStyleInspirationPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pageId = parseInt(id || "0", 10);

  const [isEditing, setIsEditing] = useState(false);
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBlockType, setNewBlockType] = useState<string>("text");
  const [draggedBlock, setDraggedBlock] = useState<number | null>(null);

  // Page data
  const { data: page, isLoading: pageLoading } = useQuery<InspirationPage>({
    queryKey: [`/api/content-inspiration-pages/${pageId}`],
    enabled: !!pageId,
  });

  // Content items
  const { data: items, isLoading: itemsLoading } = useQuery<ContentItem[]>({
    queryKey: [`/api/content-inspiration-pages/${pageId}/items`],
    enabled: !!pageId,
  });

  // Add new content item
  const addItemMutation = useMutation({
    mutationFn: async (newItem: Partial<ContentItem>) => {
      return apiRequest("POST", `/api/content-inspiration-pages/${pageId}/items`, newItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-inspiration-pages/${pageId}/items`] });
      setShowAddDialog(false);
      toast({ title: "Block added successfully" });
    },
  });

  // Update content item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ContentItem> }) => {
      return apiRequest("PATCH", `/api/content-inspiration-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-inspiration-pages/${pageId}/items`] });
      setEditingBlock(null);
      toast({ title: "Block updated successfully" });
    },
  });

  // Delete content item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest("DELETE", `/api/content-inspiration-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-inspiration-pages/${pageId}/items`] });
      toast({ title: "Block deleted successfully" });
    },
  });

  const sortedItems = items?.filter(item => !item.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder) || [];

  const handleAddBlock = () => {
    const newSortOrder = sortedItems.length > 0 ? Math.max(...sortedItems.map(i => i.sortOrder)) + 1 : 0;
    
    addItemMutation.mutate({
      pageId,
      type: newBlockType as any,
      title: "",
      content: "",
      sortOrder: newSortOrder,
    });
  };

  const handleUpdateBlock = (blockId: number, data: Partial<ContentItem>) => {
    updateItemMutation.mutate({ id: blockId, data });
  };

  const renderEditableBlock = (item: ContentItem) => {
    const isBeingEdited = editingBlock === item.id;
    const colorScheme = colorOptions[0]; // Default color scheme for now

    if (isBeingEdited) {
      return (
        <EditableBlockForm
          item={item}
          onSave={(data) => handleUpdateBlock(item.id, data)}
          onCancel={() => setEditingBlock(null)}
        />
      );
    }

    return (
      <div
        className={`group relative rounded-lg border-2 transition-all duration-200 hover:shadow-md ${colorScheme.bg} ${colorScheme.border}`}
        onDoubleClick={() => setEditingBlock(item.id)}
      >
        {/* Drag handle and controls */}
        <div className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-grab"
            draggable
            onDragStart={() => setDraggedBlock(item.id)}
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setEditingBlock(item.id)}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            onClick={() => deleteItemMutation.mutate(item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div className={`p-6 ${colorScheme.text}`}>
          {renderBlockContent(item)}
        </div>
      </div>
    );
  };

  const renderBlockContent = (item: ContentItem) => {
    switch (item.type) {
      case "heading":
        return (
          <div>
            <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
            {item.description && <p className="text-gray-600">{item.description}</p>}
          </div>
        );
      
      case "text":
        return (
          <div>
            {item.title && <h3 className="font-semibold mb-2">{item.title}</h3>}
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{item.content}</p>
            </div>
          </div>
        );
      
      case "image":
        return (
          <div>
            {item.title && <h3 className="font-semibold mb-3">{item.title}</h3>}
            {item.imageUrl ? (
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                className="max-w-full h-auto rounded-lg mb-2"
              />
            ) : (
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">No image uploaded</p>
              </div>
            )}
            {item.description && <p className="text-sm text-gray-600 italic">{item.description}</p>}
          </div>
        );
      
      case "video":
        return (
          <div>
            {item.title && <h3 className="font-semibold mb-3">{item.title}</h3>}
            {item.videoUrl ? (
              <video controls className="max-w-full h-auto rounded-lg mb-2">
                <source src={item.videoUrl} />
              </video>
            ) : (
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Video className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">No video uploaded</p>
              </div>
            )}
            {item.description && <p className="text-sm text-gray-600 italic">{item.description}</p>}
          </div>
        );
      
      case "link":
        return (
          <div className="border-l-4 border-blue-400 pl-4">
            <h3 className="font-semibold mb-1">{item.title}</h3>
            {item.linkUrl && (
              <a 
                href={item.linkUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
              >
                {item.linkUrl}
              </a>
            )}
            {item.description && <p className="text-gray-600 mt-2">{item.description}</p>}
          </div>
        );
      
      case "quote":
        return (
          <blockquote className="border-l-4 border-gray-400 pl-6 py-2 italic text-lg">
            <p>"{item.content}"</p>
            {item.title && <cite className="text-sm text-gray-600 mt-2 block">— {item.title}</cite>}
          </blockquote>
        );
      
      case "list":
        const listItems = item.content?.split('\n').filter(Boolean) || [];
        return (
          <div>
            {item.title && <h3 className="font-semibold mb-2">{item.title}</h3>}
            <ul className="list-disc list-inside space-y-1">
              {listItems.map((listItem, index) => (
                <li key={index}>{listItem}</li>
              ))}
            </ul>
          </div>
        );
      
      case "checklist":
        const checkItems = item.content?.split('\n').filter(Boolean) || [];
        return (
          <div>
            {item.title && <h3 className="font-semibold mb-2">{item.title}</h3>}
            <div className="space-y-2">
              {checkItems.map((checkItem, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span>{checkItem}</span>
                </label>
              ))}
            </div>
          </div>
        );
      
      case "divider":
        return <hr className="border-gray-300 my-4" />;
      
      default:
        return <p>Unknown block type</p>;
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-6">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
            <p className="text-gray-600">This inspiration page could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div 
        className="h-48 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${page.bannerUrl})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <Button variant="secondary" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button variant="secondary" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            {page.emoji && <span className="text-4xl">{page.emoji}</span>}
            <h1 className="text-4xl font-bold text-gray-900">{page.name}</h1>
          </div>
          
          {page.description && (
            <p className="text-lg text-gray-600 mb-4">{page.description}</p>
          )}
          
          {page.tags && page.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {page.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content Blocks */}
        <div className="space-y-4 relative pl-8">
          {itemsLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <>
              {sortedItems.map((item) => (
                <div key={item.id}>
                  {renderEditableBlock(item)}
                </div>
              ))}
              
              {/* Add new block button */}
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 h-12 text-gray-500 hover:text-gray-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add a block
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Block</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={newBlockType} onValueChange={setNewBlockType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {blockTypeOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center space-x-2">
                                <Icon className="h-4 w-4" />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddBlock} disabled={addItemMutation.isPending}>
                        Add Block
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Editable block form component
function EditableBlockForm({ 
  item, 
  onSave, 
  onCancel 
}: { 
  item: ContentItem; 
  onSave: (data: Partial<ContentItem>) => void; 
  onCancel: () => void; 
}) {
  const [title, setTitle] = useState(item.title || "");
  const [description, setDescription] = useState(item.description || "");
  const [content, setContent] = useState(item.content || "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl || "");
  const [videoUrl, setVideoUrl] = useState(item.videoUrl || "");
  const [linkUrl, setLinkUrl] = useState(item.linkUrl || "");

  const handleSave = () => {
    onSave({
      title,
      description,
      content,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      linkUrl: linkUrl || undefined,
    });
  };

  return (
    <Card className="border-2 border-blue-400">
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold capitalize">{item.type} Block</h3>
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>

        {/* Common fields */}
        {item.type !== "divider" && (
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
            />
          </div>
        )}

        {/* Type-specific fields */}
        {(item.type === "text" || item.type === "quote" || item.type === "list" || item.type === "checklist") && (
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter content..."
              rows={4}
            />
          </div>
        )}

        {item.type === "image" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Caption</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Image caption..."
              />
            </div>
          </>
        )}

        {item.type === "video" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Video URL</label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Caption</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Video caption..."
              />
            </div>
          </>
        )}

        {item.type === "link" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Link description..."
                rows={2}
              />
            </div>
          </>
        )}

        {(item.type === "heading") && (
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}