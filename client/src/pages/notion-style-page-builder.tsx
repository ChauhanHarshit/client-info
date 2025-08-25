import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  const [draggedCanvasBlock, setDraggedCanvasBlock] = useState<CanvasBlock | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });

  // Fetch layout templates from backend
  const { data: layoutTemplates = [], isLoading } = useQuery({
    queryKey: ['/api/layout-templates'],
    queryFn: () => fetch('/api/layout-templates').then(res => res.json())
  });

  // Create layout template mutation
  const createLayoutMutation = useMutation({
    mutationFn: async (layoutData: any) => {
      const response = await apiRequest('POST', '/api/layout-templates', layoutData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-templates'] });
      toast({
        title: "Success",
        description: `Layout "${newLayoutName}" created successfully!`
      });
      setNewLayoutName("");
      setNewLayoutDescription("");
      setCanvasBlocks([]);
      setCurrentView("dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create layout template",
        variant: "destructive"
      });
    }
  });

  // Update layout template mutation
  const updateLayoutMutation = useMutation({
    mutationFn: async ({ id, layoutData }: { id: number; layoutData: any }) => {
      const response = await apiRequest('PUT', `/api/layout-templates/${id}`, layoutData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-templates'] });
      toast({
        title: "Success",
        description: `Layout "${newLayoutName}" updated successfully!`
      });
      setNewLayoutName("");
      setNewLayoutDescription("");
      setCanvasBlocks([]);
      setCurrentView("dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update layout template",
        variant: "destructive"
      });
    }
  });

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
    
    // Set appropriate drop effect based on what's being dragged
    if (draggedCanvasBlock) {
      e.dataTransfer.dropEffect = 'move';
    } else if (draggedBlock) {
      e.dataTransfer.dropEffect = 'copy';
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Adjust for canvas scaling
    const scaleFactor = 0.7;
    const adjustedX = x / scaleFactor;
    const adjustedY = y / scaleFactor;
    
    setDragPreview({ x: adjustedX, y: adjustedY, show: true });
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview({ x: 0, y: 0, show: false });
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Adjust for 30% zoom out on canvas
    const scaleFactor = 0.7;
    const adjustedX = x / scaleFactor;
    const adjustedY = y / scaleFactor;
    
    // Grid snap - adjusted for scaled canvas
    const gridSize = 60; // Each grid cell is 60px at normal scale
    const gridX = Math.floor(adjustedX / gridSize);
    const gridY = Math.floor(adjustedY / gridSize);
    
    // Handle repositioning existing canvas block
    if (draggedCanvasBlock) {
      const updatedBlocks = canvasBlocks.map(block => 
        block.id === draggedCanvasBlock.id 
          ? {
              ...block,
              x: gridX * gridSize,
              y: gridY * gridSize,
              gridX,
              gridY
            }
          : block
      );
      setCanvasBlocks(updatedBlocks);
      setDraggedCanvasBlock(null);
      return;
    }
    
    // Handle adding new block from sidebar
    if (draggedBlock) {
      console.log('Adding new block from sidebar:', draggedBlock.type);
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
    }
  };

  const handleCanvasDragLeave = () => {
    setDragPreview({ x: 0, y: 0, show: false });
  };

  // Handle dragging existing canvas blocks
  const handleCanvasBlockDragStart = (e: React.DragEvent, block: CanvasBlock) => {
    setDraggedCanvasBlock(block);
    setDraggedBlock(null); // Clear any sidebar block being dragged
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
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

  // Save layout (create new or update existing)
  const handleSaveLayout = (isEditMode = false) => {
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

    const layoutData = {
      name: newLayoutName,
      description: newLayoutDescription,
      templateType: "creator_view",
      layoutConfig: layoutBlocks,
      isDefault: false,
      createdBy: "dev-user-123"
    };

    if (isEditMode && selectedLayout) {
      updateLayoutMutation.mutate({ id: selectedLayout.id, layoutData });
    } else {
      createLayoutMutation.mutate(layoutData);
    }
  };

  // Dashboard view with layout templates
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-6 h-6" />
          <h1 className="text-3xl font-bold text-gray-900">Layout Builder</h1>
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
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading layouts...</p>
            </div>
          </div>
        ) : layoutTemplates.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No layouts yet</h3>
              <p className="text-gray-600 mb-4">Create your first custom layout to get started</p>
              <Button onClick={() => setCurrentView("create")} className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create First Layout</span>
              </Button>
            </div>
          </div>
        ) : (
          layoutTemplates.map((layout) => (
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
                  {(layout.layoutConfig || []).slice(0, 3).map((block) => {
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
                  {(layout.layoutConfig || []).length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{(layout.layoutConfig || []).length - 3} more blocks
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
          ))
        )}
      </div>
    </div>
  );

  // Initialize canvas with existing blocks when entering edit mode
  useEffect(() => {
    if (currentView === "edit" && selectedLayout?.layoutConfig) {
      const existingBlocks = selectedLayout.layoutConfig.map((block, index) => ({
        id: `${block.type}-${index}-${Date.now()}`,
        type: block.type,
        title: block.title,
        icon: block.icon,
        description: block.description,
        x: (index % 3) * 200 + 50, // Simple grid positioning
        y: Math.floor(index / 3) * 150 + 50,
        width: 180,
        height: 120,
        gridX: (index % 3) * 4 + 1,
        gridY: Math.floor(index / 3) * 3 + 1,
        gridWidth: 4,
        gridHeight: 2
      }));
      setCanvasBlocks(existingBlocks);
      setNewLayoutName(selectedLayout.name);
      setNewLayoutDescription(selectedLayout.description || "");
    }
  }, [currentView, selectedLayout]);

  // Layout creation view with drag-and-drop canvas
  const renderCreateView = (isEditMode = false) => {
    // Initialize edit mode data
    const editData = isEditMode && selectedLayout ? {
      name: selectedLayout.name,
      description: selectedLayout.description || "",
      blocks: selectedLayout.layoutConfig || []
    } : null;

    return (
    <div className="h-full flex flex-col" style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '142.86%', height: '142.86%' }}>
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
            <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Layout' : 'Create New Layout'}</h1>
            <p className="text-gray-600">{isEditMode ? 'Modify your existing layout' : 'Drag blocks onto the canvas to build your custom layout'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setCanvasBlocks([])}>
            Clear Canvas
          </Button>
          <Button 
            onClick={() => handleSaveLayout(isEditMode)} 
            disabled={!newLayoutName.trim() || canvasBlocks.length === 0 || createLayoutMutation.isPending || updateLayoutMutation.isPending}
          >
            {(createLayoutMutation.isPending || updateLayoutMutation.isPending) ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {isEditMode ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              isEditMode ? 'Update Layout' : 'Save Layout'
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Layout Settings & Content Blocks (60% width) */}
        <div className="w-[60%] border-r border-gray-300 bg-gray-50 flex flex-col">
          <div className="p-6 border-b bg-white">
            <h3 className="font-semibold mb-4 text-lg">Layout Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Layout Name</label>
                <Input
                  placeholder="Enter layout name..."
                  value={newLayoutName}
                  onChange={(e) => setNewLayoutName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <Textarea
                  placeholder="Describe your layout..."
                  value={newLayoutDescription}
                  onChange={(e) => setNewLayoutDescription(e.target.value)}
                  className="resize-none w-full"
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <div className="p-6 border-b bg-white">
            <h4 className="font-medium mb-3 text-gray-900">Content Blocks</h4>
            <p className="text-sm text-gray-600 mb-4">Drag blocks to the canvas to build your layout</p>
          </div>
          
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {availableBlocks.map((block) => {
                const IconComponent = block.icon;
                return (
                  <div
                    key={block.type}
                    draggable
                    onDragStart={(e) => handleCanvasDragStart(e, block)}
                    className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-200"
                    style={{ backgroundColor: block.color }}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-6 h-6 text-gray-700 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {block.title}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
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

        {/* Right Panel - Canvas Area (40% width) */}
        <div className="w-[40%] relative bg-gray-50">
          <div
            className="w-full h-full relative overflow-auto bg-white border border-gray-200"
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            onDragLeave={handleCanvasDragLeave}
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '42px 42px', // Adjusted for 30% zoom out
              backgroundPosition: '0 0',
              maxWidth: '100%',
              maxHeight: '100%'
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
                  {/* Drag Handle */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-8 bg-gray-100 border-b border-gray-200 cursor-move flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleCanvasBlockDragStart(e, block);
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        removeCanvasBlock(block.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>

                  {/* Block content */}
                  <div className="p-4 h-full flex flex-col pt-10">
                    <div className="flex items-center space-x-2 mb-2">
                      <IconComponent className="w-5 h-5 text-gray-700" />
                      <span className="font-medium text-sm truncate">{block.title}</span>
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
  };

  // Edit view function
  const renderEditView = () => {
    if (!selectedLayout) return null;
    
    return renderCreateView(true); // Reuse create view but in edit mode
  };

  return (
    <div className="min-h-screen p-6">
      {/* Back Button - Consistent with Content & Comms layout */}
      <div className="mb-8">
        <Button
          variant="outline"
          size="default"
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </Button>
      </div>

      <div className="w-full">
        <div className="max-w-none">
          {currentView === "dashboard" && renderDashboard()}
          {currentView === "create" && renderCreateView()}
          {currentView === "edit" && renderEditView()}
        </div>
      </div>
    </div>
  );
}

export default NotionStylePageBuilder;