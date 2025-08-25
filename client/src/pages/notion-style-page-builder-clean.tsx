import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Grip, 
  Type, 
  Heading,
  Image, 
  Quote, 
  List,
  CheckSquare,
  Minus,
  Link as LinkIcon,
  Video,
  Trash2,
  Eye,
  Save,
  Globe,
  ArrowLeft,
  Copy,
  Edit,
  LayoutGrid,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Settings,
  Search,
  Filter,
  Star,
  Heart,
  Lightbulb,
  Anchor
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface PageLayout {
  id: number;
  name: string;
  description?: string;
  thumbnail?: string;
  blocks: LayoutBlock[];
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface LayoutBlock {
  id: string;
  type: "priority_content" | "onlyfans_content" | "social_media" | "customs" | "whales" | "calendar" | "stats" | "notes";
  title: string;
  icon: string;
  description: string;
  position: number;
  width: "full" | "half" | "third";
  style: "card" | "list" | "grid" | "minimal";
}

interface ContentBlock {
  type: string;
  title: string;
  icon: any;
  description: string;
  color: string;
  previewContent: string;
}

interface CanvasBlock {
  id: string;
  type: string;
  title: string;
  icon: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

function NotionStylePageBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // State management
  const [currentView, setCurrentView] = useState<"dashboard" | "create" | "edit">("dashboard");
  const [selectedLayout, setSelectedLayout] = useState<PageLayout | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [newLayoutDescription, setNewLayoutDescription] = useState("");
  const [selectedBlocks, setSelectedBlocks] = useState<LayoutBlock[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  
  // Canvas drag and drop state
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [draggedBlock, setDraggedBlock] = useState<ContentBlock | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });

  // Available content blocks
  const availableBlocks: ContentBlock[] = [
    {
      type: "priority_content",
      title: "Priority Content Needs",
      icon: Star,
      description: "High-priority content requests and urgent tasks",
      color: "#FEF2F2",
      previewContent: "• Urgent video request\n• Brand collaboration deadline\n• Content review needed"
    },
    {
      type: "onlyfans_content",
      title: "OnlyFans Content",
      icon: Heart,
      description: "Content planning and management for OnlyFans",
      color: "#FDF2F8",
      previewContent: "• Daily post schedule\n• Custom content requests\n• Subscriber interaction"
    },
    {
      type: "social_media",
      title: "Social Media",
      icon: TrendingUp,
      description: "Social media content and engagement tracking",
      color: "#F0F9FF",
      previewContent: "• Instagram story ideas\n• TikTok trending topics\n• Twitter engagement"
    },
    {
      type: "customs",
      title: "Custom Requests",
      icon: DollarSign,
      description: "Custom content requests and pricing",
      color: "#F0FDF4",
      previewContent: "• Custom video requests\n• Pricing negotiations\n• Special packages"
    },
    {
      type: "whales",
      title: "VIP Clients",
      icon: Anchor,
      description: "High-value client management and special attention",
      color: "#FFFBEB",
      previewContent: "• Top spenders list\n• Special requests\n• Exclusive content"
    },
    {
      type: "calendar",
      title: "Content Calendar",
      icon: Calendar,
      description: "Schedule and planning for content creation",
      color: "#F5F3FF",
      previewContent: "• Shooting schedule\n• Release dates\n• Event planning"
    },
    {
      type: "stats",
      title: "Analytics & Stats",
      icon: LayoutGrid,
      description: "Performance metrics and analytics overview",
      color: "#F8FAFC",
      previewContent: "• Revenue tracking\n• Engagement metrics\n• Growth analytics"
    },
    {
      type: "notes",
      title: "Creative Notes",
      icon: Lightbulb,
      description: "Ideas, inspiration, and creative brainstorming",
      color: "#FEF7CD",
      previewContent: "• Content ideas\n• Inspiration board\n• Creative concepts"
    }
  ];

  // Sample layouts
  const sampleLayouts: PageLayout[] = [
    {
      id: 1,
      name: "Creator Focus",
      description: "Perfect for content creators focusing on priority tasks and content planning",
      thumbnail: "/layouts/creator-focus.png",
      isDefault: true,
      blocks: [
        { id: "1", type: "priority_content", title: "Priority Content", icon: "Star", description: "", position: 0, width: "full", style: "card" },
        { id: "2", type: "onlyfans_content", title: "OnlyFans Content", icon: "Heart", description: "", position: 1, width: "half", style: "card" },
        { id: "3", type: "calendar", title: "Content Calendar", icon: "Calendar", description: "", position: 2, width: "half", style: "card" }
      ],
      createdBy: "dev-user-123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: "Business Dashboard",
      description: "Comprehensive business overview with analytics and revenue tracking",
      thumbnail: "/layouts/business-dashboard.png",
      isDefault: false,
      blocks: [
        { id: "1", type: "stats", title: "Revenue Analytics", icon: "LayoutGrid", description: "", position: 0, width: "third", style: "card" },
        { id: "2", type: "customs", title: "Custom Requests", icon: "DollarSign", description: "", position: 1, width: "third", style: "card" },
        { id: "3", type: "whales", title: "VIP Clients", icon: "Anchor", description: "", position: 2, width: "third", style: "card" },
        { id: "4", type: "social_media", title: "Social Media", icon: "TrendingUp", description: "", position: 3, width: "full", style: "grid" }
      ],
      createdBy: "dev-user-123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Canvas drag and drop handlers
  const handleCanvasDragStart = (e: React.DragEvent, block: ContentBlock) => {
    setDraggedBlock(block);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDragPreview({ x, y, show: true });
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview({ x: 0, y: 0, show: false });
    
    if (!draggedBlock) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Grid snap - 12 column grid
    const gridSize = 60; // Each grid cell is 60px
    const gridX = Math.floor(x / gridSize);
    const gridY = Math.floor(y / gridSize);
    
    const newCanvasBlock: CanvasBlock = {
      id: Date.now().toString(),
      type: draggedBlock.type,
      title: draggedBlock.title,
      icon: draggedBlock.icon.name,
      description: draggedBlock.description,
      x: gridX * gridSize,
      y: gridY * gridSize,
      width: gridSize * 4, // Default 4 grid units wide
      height: gridSize * 2, // Default 2 grid units tall
      gridX,
      gridY,
      gridWidth: 4,
      gridHeight: 2
    };
    
    setCanvasBlocks([...canvasBlocks, newCanvasBlock]);
    setDraggedBlock(null);
  };

  const handleCanvasDragLeave = () => {
    setDragPreview({ x: 0, y: 0, show: false });
  };

  // Remove block from canvas
  const removeCanvasBlock = (blockId: string) => {
    setCanvasBlocks(canvasBlocks.filter(block => block.id !== blockId));
  };

  // Convert canvas blocks to layout blocks for saving
  const convertCanvasToLayout = (): LayoutBlock[] => {
    return canvasBlocks.map((block, index) => ({
      id: block.id,
      type: block.type as any,
      title: block.title,
      icon: block.icon,
      description: block.description,
      position: index,
      width: block.gridWidth >= 8 ? "full" : block.gridWidth >= 4 ? "half" : "third",
      style: "card"
    }));
  };

  // Create new layout
  const handleCreateLayout = () => {
    if (!newLayoutName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a layout name",
        variant: "destructive"
      });
      return;
    }

    const layoutBlocks = convertCanvasToLayout();
    
    if (layoutBlocks.length === 0) {
      toast({
        title: "Error", 
        description: "Please add at least one block to your layout",
        variant: "destructive"
      });
      return;
    }

    const newLayout: PageLayout = {
      id: Date.now(),
      name: newLayoutName,
      description: newLayoutDescription,
      blocks: layoutBlocks,
      isDefault: false,
      createdBy: "dev-user-123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    toast({
      title: "Success",
      description: `Layout "${newLayoutName}" created successfully!`
    });

    // Reset form
    setNewLayoutName("");
    setNewLayoutDescription("");
    setCanvasBlocks([]);
    setCurrentView("dashboard");
  };

  // Dashboard view with layout templates
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Layout Builder</h1>
          <p className="text-gray-600 mt-1">Create and manage custom page layouts for your creator dashboard</p>
        </div>
        <Button onClick={() => setCurrentView("create")} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create New Layout</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search layouts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Layouts</SelectItem>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Layout Grid */}
      <div className="layout-grid">
        {sampleLayouts.map((layout) => (
          <Card key={layout.id} className="layout-card hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200 cursor-pointer group">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg leading-tight">{layout.name}</CardTitle>
                {layout.isDefault && (
                  <Badge variant="secondary" className="flex-shrink-0">Default</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{layout.description}</p>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-4">
              {/* Layout Preview */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 flex-1 min-h-[120px] flex flex-col">
                <div className="space-y-2 flex-1">
                  {layout.blocks.slice(0, 3).map((block) => {
                    const blockInfo = availableBlocks.find(b => b.type === block.type);
                    const IconComponent = blockInfo?.icon || LayoutGrid;
                    return (
                      <div 
                        key={block.id} 
                        className="flex items-center space-x-2 p-2 bg-white rounded border text-xs shadow-sm"
                        style={{ backgroundColor: blockInfo?.color || '#f8fafc' }}
                      >
                        <IconComponent className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium truncate">{block.title}</span>
                      </div>
                    );
                  })}
                  {layout.blocks.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{layout.blocks.length - 3} more blocks
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedLayout(layout);
                    setCurrentView("edit");
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="px-3">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="px-3">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Layout creation view with drag-and-drop canvas
  const renderCreateView = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("dashboard")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Layouts</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Layout</h1>
            <p className="text-gray-600">Drag blocks onto the canvas to build your custom layout</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setCanvasBlocks([])}>
            Clear Canvas
          </Button>
          <Button 
            onClick={handleCreateLayout} 
            disabled={!newLayoutName.trim() || canvasBlocks.length === 0}
          >
            Save Layout
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with content blocks */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b bg-white">
            <h3 className="font-semibold mb-3">Content Blocks</h3>
            <div className="space-y-3">
              <Input
                placeholder="Layout name..."
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
              />
              <Textarea
                placeholder="Layout description..."
                value={newLayoutDescription}
                onChange={(e) => setNewLayoutDescription(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {availableBlocks.map((block) => {
                const IconComponent = block.icon;
                return (
                  <div
                    key={block.type}
                    draggable
                    onDragStart={(e) => handleCanvasDragStart(e, block)}
                    className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
                    style={{ backgroundColor: block.color }}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-5 h-5 text-gray-700 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {block.title}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {block.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative bg-white">
          <div
            className="w-full h-full relative overflow-auto"
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            onDragLeave={handleCanvasDragLeave}
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          >
            {/* Empty state */}
            {canvasBlocks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Drag blocks here to start building</p>
                  <p className="text-sm">Create your custom layout by positioning content blocks anywhere on the canvas</p>
                </div>
              </div>
            )}

            {/* Drag preview */}
            {dragPreview.show && (
              <div
                className="absolute bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg pointer-events-none z-10"
                style={{
                  left: Math.floor(dragPreview.x / 60) * 60,
                  top: Math.floor(dragPreview.y / 60) * 60,
                  width: 240, // 4 grid units
                  height: 120  // 2 grid units
                }}
              />
            )}

            {/* Canvas blocks */}
            {canvasBlocks.map((block) => {
              const blockInfo = availableBlocks.find(b => b.type === block.type);
              const IconComponent = blockInfo?.icon || LayoutGrid;
              
              return (
                <div
                  key={block.id}
                  className="absolute bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
                  style={{
                    left: block.x,
                    top: block.y,
                    width: block.width,
                    height: block.height,
                    backgroundColor: blockInfo?.color || '#f8fafc'
                  }}
                >
                  {/* Block content */}
                  <div className="p-4 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-5 h-5 text-gray-700" />
                        <span className="font-medium text-sm truncate">{block.title}</span>
                      </div>
                      <button
                        onClick={() => removeCanvasBlock(block.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                    
                    <div className="flex-1 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
                      <p className="text-xs text-gray-500 text-center px-2">
                        {block.description}
                      </p>
                    </div>

                    {/* Resize handles */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 py-6">
        <div className="max-w-none">
          {currentView === "dashboard" && renderDashboard()}
          {currentView === "create" && renderCreateView()}
        </div>
      </div>
    </div>
  );
}

export default NotionStylePageBuilder;