import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  Save, 
  Globe, 
  Type, 
  Image, 
  Video, 
  BarChart3, 
  Minus,
  ArrowUp,
  ArrowDown,
  Settings,
  Palette,
  Monitor,
  Smartphone,
  ArrowLeft,
  User,
  FolderOpen,
  ExternalLink
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface CreatorPageTemplate {
  id: number;
  name: string;
  description?: string;
  pageId: string;
  creatorId?: number;
  layout: any;
  themeConfig: any;
  publicUrl: string;
  isTemplate: boolean;
  status: "draft" | "published" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PageBlock {
  id: number;
  templateId: number;
  type: "creator_header" | "content_section" | "text" | "image" | "video" | "stats" | "gallery" | "separator";
  content: any;
  styling: any;
  displayOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Creator {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl?: string;
}

const defaultThemeConfig = {
  colors: {
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    accent: "#10B981",
    background: "#FFFFFF",
    text: "#1F2937",
    muted: "#6B7280"
  },
  fonts: {
    heading: "Inter",
    body: "Inter",
    sizes: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "30px"
    }
  },
  spacing: {
    section: "2rem",
    block: "1.5rem",
    element: "1rem"
  },
  borderRadius: "8px",
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
  }
};

const blockTypes = [
  { type: "creator_header", label: "Creator Header", icon: User, description: "Display creator name and banner image" },
  { type: "content_section", label: "Content Section", icon: FolderOpen, description: "Organized section for content categories" },
  { type: "text", label: "Text Block", icon: Type, description: "Add headings, paragraphs, or rich text content" },
  { type: "image", label: "Image Block", icon: Image, description: "Display images with captions and links" },
  { type: "video", label: "Video Block", icon: Video, description: "Embed videos from YouTube, Vimeo, or direct uploads" },
  { type: "stats", label: "Stats Block", icon: BarChart3, description: "Show metrics, numbers, and performance data" },
  { type: "separator", label: "Separator", icon: Minus, description: "Add visual dividers between sections" },
];

export default function CreatorPageTemplateBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<CreatorPageTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isContentPopupOpen, setIsContentPopupOpen] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState<string>("");
  const [selectedContentType, setSelectedContentType] = useState<string>("");
  const [selectedContentSection, setSelectedContentSection] = useState<PageBlock | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [newTemplateData, setNewTemplateData] = useState({
    name: "",
    description: "",
    creatorId: null as number | null,
  });
  const [newBlockData, setNewBlockData] = useState({
    type: "",
    content: {},
    styling: {}
  });
  
  const [contentFormData, setContentFormData] = useState({
    // Priority Content
    priority: {
      title: "",
      description: "",
      deadline: "",
      urgencyTag: "medium",
      inspirationLink: "",
      uploadedFile: null
    },
    // OnlyFans Content
    onlyfans: {
      caption: "",
      contentFormat: "photo",
      price: "",
      callToAction: "",
      tags: [],
      scheduledDate: "",
      uploadedFile: null
    },
    // Social Media Content
    social: {
      platform: "instagram",
      caption: "",
      postingDate: "",
      uploadedFile: null,
      hashtags: ""
    },
    // Customs
    customs: {
      clientName: "",
      requestId: "",
      description: "",
      script: "",
      price: "",
      deliveryDeadline: ""
    },
    // Whales
    whales: {
      whaleName: "",
      alias: "",
      contentIdea: "",
      budget: "",
      preferredContentType: "photo"
    },
    // Calendar
    calendar: {
      title: "",
      dateTime: "",
      reminder: false,
      teamAssignment: "",
      description: ""
    }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/creator-page-templates"],
  });

  // Fetch creators
  const { data: creators = [] } = useQuery({
    queryKey: ["/api/creators"],
  });

  // Fetch blocks for selected template
  const { data: blocks = [] } = useQuery({
    queryKey: ["/api/creator-page-templates", selectedTemplate?.id, "blocks"],
    enabled: !!selectedTemplate,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const pageId = `template_${Date.now()}`;
      const publicUrl = `/creator-page/${pageId}`;
      
      const response = await apiRequest("POST", "/api/creator-page-templates", {
        ...data,
        pageId,
        publicUrl,
        layout: [],
        themeConfig: defaultThemeConfig,
        isTemplate: true,
        status: "draft",
        createdBy: "admin", // Replace with actual user
      });
      return await response.json();
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-page-templates"] });
      setSelectedTemplate(newTemplate);
      setIsCreateDialogOpen(false);
      setNewTemplateData({ name: "", description: "", creatorId: null });
      toast({
        title: "Success",
        description: "Page template created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create page template",
        variant: "destructive",
      });
    },
  });

  // Add block mutation
  const addBlockMutation = useMutation({
    mutationFn: async (blockData: any) => {
      const nextOrder = blocks.length;
      const response = await apiRequest("POST", `/api/creator-page-templates/${selectedTemplate?.id}/blocks`, {
        ...blockData,
        displayOrder: nextOrder,
        isVisible: true,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/creator-page-templates", selectedTemplate?.id, "blocks"] 
      });
      setIsBlockDialogOpen(false);
      setNewBlockData({ type: "", content: {}, styling: {} });
    },
  });

  // Update block mutation
  const updateBlockMutation = useMutation({
    mutationFn: async ({ id, ...blockData }: { id: number; content?: any; styling?: any }) => {
      return await apiRequest("PUT", `/api/creator-page-templates/blocks/${id}`, blockData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/creator-page-templates", selectedTemplate?.id, "blocks"] 
      });
    },
  });

  // Delete block mutation
  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: number) => {
      return await apiRequest("DELETE", `/api/creator-page-templates/blocks/${blockId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/creator-page-templates", selectedTemplate?.id, "blocks"] 
      });
    },
  });

  // Publish template mutation
  const publishTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return await apiRequest("POST", `/api/creator-page-templates/${templateId}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-page-templates"] });
      toast({
        title: "Success",
        description: "Template published successfully",
      });
    },
  });

  const handleCreateTemplate = () => {
    if (!newTemplateData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }
    createTemplateMutation.mutate({
      ...newTemplateData,
      createDefaultSections: true
    });
  };

  const handleAddBlock = () => {
    if (!selectedBlockType || !selectedTemplate) return;
    
    const defaultContent = getDefaultBlockContent(selectedBlockType);
    const defaultStyling = getDefaultBlockStyling(selectedBlockType);
    
    addBlockMutation.mutate({
      type: selectedBlockType,
      content: defaultContent,
      styling: defaultStyling,
    });
  };

  const handleOpenContentPopup = (contentType: string, section: PageBlock) => {
    setSelectedContentType(contentType);
    setSelectedContentSection(section);
    setIsContentPopupOpen(true);
  };

  const handleAddContentToSection = () => {
    if (!selectedContentType || !selectedContentSection) return;

    const formData = contentFormData[selectedContentType as keyof typeof contentFormData];
    
    // Create content item based on type
    const contentItem = {
      id: Date.now(),
      type: selectedContentType,
      data: formData,
      createdAt: new Date().toISOString()
    };

    // Add to section's content
    const updatedContent = {
      ...selectedContentSection.content,
      items: [...(selectedContentSection.content.items || []), contentItem]
    };

    updateBlockMutation.mutate({
      id: selectedContentSection.id,
      content: updatedContent
    });

    // Reset form and close popup
    setContentFormData(prev => ({
      ...prev,
      [selectedContentType]: getDefaultFormData(selectedContentType)
    }));
    setIsContentPopupOpen(false);
  };

  const getDefaultFormData = (contentType: string) => {
    switch (contentType) {
      case 'priority':
        return { title: "", description: "", deadline: "", urgencyTag: "medium", inspirationLink: "", uploadedFile: null };
      case 'onlyfans':
        return { caption: "", contentFormat: "photo", price: "", callToAction: "", tags: [], scheduledDate: "", uploadedFile: null };
      case 'social':
        return { platform: "instagram", caption: "", postingDate: "", uploadedFile: null, hashtags: "" };
      case 'customs':
        return { clientName: "", requestId: "", description: "", script: "", price: "", deliveryDeadline: "" };
      case 'whales':
        return { whaleName: "", alias: "", contentIdea: "", budget: "", preferredContentType: "photo" };
      case 'calendar':
        return { title: "", dateTime: "", reminder: false, teamAssignment: "", description: "" };
      default:
        return {};
    }
  };

  const getDefaultBlockContent = (type: string) => {
    switch (type) {
      case "creator_header":
        return {
          showName: true,
          showBanner: true,
          bannerHeight: "200px",
          namePosition: "overlay"
        };
      case "content_section":
        return {
          title: "Priority Content Needs",
          category: "priority",
          showInspoPages: true,
          collapsible: false,
          defaultExpanded: true
        };
      case "text":
        return { 
          text: "Enter your text content here...", 
          style: "paragraph",
          alignment: "left" 
        };
      case "image":
        return { 
          url: "", 
          alt: "Image description",
          caption: "",
          link: "" 
        };
      case "video":
        return { 
          url: "", 
          title: "Video Title",
          thumbnail: "",
          autoplay: false 
        };
      case "stats":
        return { 
          metrics: [
            { label: "Total Earnings", value: "$0", format: "currency" },
            { label: "Subscribers", value: "0", format: "number" }
          ]
        };
      case "separator":
        return { style: "line", thickness: "1px" };
      default:
        return {};
    }
  };

  const getDefaultBlockStyling = (type: string) => {
    return {
      margin: { top: "1rem", bottom: "1rem" },
      padding: { top: "0", bottom: "0", left: "0", right: "0" },
      backgroundColor: "transparent",
      borderRadius: "0px",
    };
  };

  const renderBlockPreview = (block: PageBlock) => {
    switch (block.type) {
      case "creator_header":
        return (
          <div className="p-4 border rounded">
            <div className="flex items-center justify-between mb-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Creator Header</span>
            </div>
            <div className="w-full h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center relative">
              <div className="absolute inset-0 bg-black bg-opacity-20 rounded"></div>
              <div className="relative text-white font-bold">Creator Name & Banner</div>
            </div>
          </div>
        );
      case "content_section":
        return (
          <div className="p-4 border rounded">
            <div className="flex items-center justify-between mb-2">
              <FolderOpen className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Content Section</span>
            </div>
            <div className="border-l-4 border-green-500 pl-3">
              <h3 className="font-semibold text-sm">{block.content.title || "Content Section"}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Category: {block.content.category || "priority"}
              </p>
              <div className="mt-2 text-xs text-blue-600">
                Inspiration pages will appear here dynamically
              </div>
            </div>
          </div>
        );
      case "text":
        return (
          <div className="p-4 border rounded">
            <div className="flex items-center justify-between mb-2">
              <Type className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Text Block</span>
            </div>
            <p className="text-sm">{block.content.text || "Empty text block"}</p>
          </div>
        );
      case "image":
        return (
          <div className="p-4 border rounded">
            <div className="flex items-center justify-between mb-2">
              <Image className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Image Block</span>
            </div>
            <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-xs mt-2">{block.content.caption || "No caption"}</p>
          </div>
        );
      case "video":
        return (
          <div className="p-4 border rounded">
            <div className="flex items-center justify-between mb-2">
              <Video className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Video Block</span>
            </div>
            <div className="w-full h-20 bg-gray-900 rounded flex items-center justify-center">
              <Video className="h-8 w-8 text-white" />
            </div>
            <p className="text-xs mt-2">{block.content.title || "Untitled Video"}</p>
          </div>
        );
      case "stats":
        return (
          <div className="p-4 border rounded">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Stats Block</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {block.content.metrics?.slice(0, 2).map((metric: any, index: number) => (
                <div key={index} className="text-center">
                  <div className="font-bold text-sm">{metric.value}</div>
                  <div className="text-xs text-muted-foreground">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "separator":
        return (
          <div className="p-4 border rounded">
            <div className="flex items-center justify-between mb-2">
              <Minus className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-muted-foreground">Separator</span>
            </div>
            <hr className="border-gray-300" />
          </div>
        );
      default:
        return (
          <div className="p-4 border rounded">
            <p className="text-sm text-muted-foreground">Unknown block type</p>
          </div>
        );
    }
  };

  if (templatesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Page Builder</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Page Builder</h1>
            <p className="text-gray-600 mt-1">Create and manage page templates</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Templates</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Page Template</DialogTitle>
              <DialogDescription>
                Build a custom page layout with blocks for text, images, videos, and stats
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplateData.name}
                  onChange={(e) => setNewTemplateData({ ...newTemplateData, name: e.target.value })}
                  placeholder="Weekly Update Template"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTemplateData.description}
                  onChange={(e) => setNewTemplateData({ ...newTemplateData, description: e.target.value })}
                  placeholder="Template for weekly creator updates..."
                />
              </div>
              <div>
                <Label>Test Creator (Optional)</Label>
                <Select
                  value={newTemplateData.creatorId?.toString() || "none"}
                  onValueChange={(value) => setNewTemplateData({ 
                    ...newTemplateData, 
                    creatorId: value === "none" ? null : parseInt(value) 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a creator for testing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific creator</SelectItem>
                    {creators.map((creator: Creator) => (
                      <SelectItem key={creator.id} value={creator.id.toString()}>
                        {creator.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  disabled={createTemplateMutation.isPending || !newTemplateData.name.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template: CreatorPageTemplate) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description || "No description"}
                      </p>
                    </div>
                    <Badge variant={template.status === "published" ? "default" : "secondary"}>
                      {template.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>Created: {new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTemplate(template)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/creator-page/${template.pageId}`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {template.status === "published" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const publicUrl = `${window.location.origin}/creator-page/${template.pageId}`;
                          navigator.clipboard.writeText(publicUrl);
                          toast({
                            title: "Link Copied!",
                            description: "Public page link copied to clipboard",
                          });
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {template.status === "draft" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => publishTemplateMutation.mutate(template.id)}
                        disabled={publishTemplateMutation.isPending}
                      >
                        <Globe className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        {selectedTemplate && (
          <div className="space-y-6 mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex border rounded-lg">
                  <Button
                    variant={previewMode === "desktop" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewMode("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === "mobile" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewMode("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Theme
                </Button>
                <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Block
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Content Block</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-4">
                      {blockTypes.map((blockType) => (
                        <Card 
                          key={blockType.type}
                          className={`cursor-pointer transition-colors ${
                            selectedBlockType === blockType.type 
                              ? "border-blue-500 bg-blue-50" 
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedBlockType(blockType.type)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <blockType.icon className="h-5 w-5 mt-1 text-blue-500" />
                              <div>
                                <h3 className="font-medium">{blockType.label}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {blockType.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddBlock}
                        disabled={!selectedBlockType || addBlockMutation.isPending}
                      >
                        {addBlockMutation.isPending ? "Adding..." : "Add Block"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Builder Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Builder</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {blocks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No content blocks yet</p>
                          <p className="text-sm">Click "Add Block" to get started</p>
                        </div>
                      ) : (
                        blocks.map((block: PageBlock, index: number) => (
                          <div key={block.id} className="relative group">
                            {renderBlockPreview(block)}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => deleteBlockMutation.mutate(block.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Preview Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>Live Preview</span>
                    <Badge variant="outline">{previewMode}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`mx-auto bg-white border rounded-lg shadow-sm ${
                    previewMode === "mobile" ? "max-w-sm" : "max-w-full"
                  }`}>
                    <div className="p-6">
                      <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold">Creator Page Preview</h1>
                        <p className="text-muted-foreground">{selectedTemplate.name}</p>
                      </div>
                      
                      <div className="space-y-4">
                        {blocks.map((block: PageBlock) => (
                          <div key={block.id} className="block-preview">
                            {block.type === "creator_header" && (
                              <div className="creator-header-block">
                                <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center relative mb-4">
                                  <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg"></div>
                                  <div className="relative text-white text-center">
                                    <div className="text-lg font-bold">Creator Name</div>
                                    <div className="text-sm opacity-90">Professional Content Creator</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {block.type === "content_section" && (
                              <div className="content-section-block">
                                <div className="border-l-4 border-blue-500 pl-4 py-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-lg">{block.content.title || "Content Section"}</h3>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenContentPopup(block.content.category || "priority", block)}
                                      className="text-xs"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Content Block
                                    </Button>
                                  </div>
                                  <div className="text-sm text-muted-foreground mb-3">
                                    Category: <span className="capitalize">{block.content.category || "priority"}</span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {block.content.items && block.content.items.length > 0 ? (
                                      block.content.items.map((item: any) => (
                                        <div key={item.id} className="p-3 bg-gray-50 rounded border-l-2 border-green-400">
                                          <div className="text-sm font-medium">{item.data.title || item.data.caption || item.data.clientName || "Content Item"}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {item.type} • {new Date(item.createdAt).toLocaleDateString()}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="p-4 border-2 border-dashed border-gray-300 rounded text-center">
                                        <div className="text-sm text-muted-foreground">No content added yet</div>
                                        <div className="text-xs text-muted-foreground">Click "Add Content Block" to get started</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            {block.type === "text" && (
                              <div className="text-block">
                                <p>{block.content.text}</p>
                              </div>
                            )}
                            {block.type === "image" && (
                              <div className="image-block">
                                <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                                  <Image className="h-8 w-8 text-gray-400" />
                                </div>
                                {block.content.caption && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {block.content.caption}
                                  </p>
                                )}
                              </div>
                            )}
                            {block.type === "video" && (
                              <div className="video-block">
                                <div className="w-full h-32 bg-gray-900 rounded flex items-center justify-center">
                                  <Video className="h-8 w-8 text-white" />
                                </div>
                                <p className="text-sm font-medium mt-2">{block.content.title}</p>
                              </div>
                            )}
                            {block.type === "stats" && (
                              <div className="stats-block">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                                  {block.content.metrics?.map((metric: any, index: number) => (
                                    <div key={index} className="text-center">
                                      <div className="text-2xl font-bold">{metric.value}</div>
                                      <div className="text-sm text-muted-foreground">{metric.label}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {block.type === "separator" && (
                              <div className="separator-block">
                                <hr className="border-gray-300" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {blocks.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Preview will appear here as you add content blocks</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Content Type-Specific Popups */}
      <Dialog open={isContentPopupOpen} onOpenChange={setIsContentPopupOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add {selectedContentType?.charAt(0).toUpperCase() + selectedContentType?.slice(1)} Content
            </DialogTitle>
          </DialogHeader>

          {selectedContentType === "priority" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority-title">Title</Label>
                  <Input
                    id="priority-title"
                    value={contentFormData.priority.title}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      priority: { ...prev.priority, title: e.target.value }
                    }))}
                    placeholder="Priority task title"
                  />
                </div>
                <div>
                  <Label htmlFor="priority-deadline">Deadline</Label>
                  <Input
                    id="priority-deadline"
                    type="date"
                    value={contentFormData.priority.deadline}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      priority: { ...prev.priority, deadline: e.target.value }
                    }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="priority-description">Description</Label>
                <Textarea
                  id="priority-description"
                  value={contentFormData.priority.description}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    priority: { ...prev.priority, description: e.target.value }
                  }))}
                  placeholder="Detailed description of the priority task"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority-urgency">Urgency Level</Label>
                  <Select 
                    value={contentFormData.priority.urgencyTag}
                    onValueChange={(value) => setContentFormData(prev => ({
                      ...prev,
                      priority: { ...prev.priority, urgencyTag: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority-link">Inspiration Link</Label>
                  <Input
                    id="priority-link"
                    value={contentFormData.priority.inspirationLink}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      priority: { ...prev.priority, inspirationLink: e.target.value }
                    }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          )}

          {selectedContentType === "onlyfans" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="onlyfans-caption">Caption</Label>
                <Textarea
                  id="onlyfans-caption"
                  value={contentFormData.onlyfans.caption}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    onlyfans: { ...prev.onlyfans, caption: e.target.value }
                  }))}
                  placeholder="Content caption"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="onlyfans-format">Content Format</Label>
                  <Select 
                    value={contentFormData.onlyfans.contentFormat}
                    onValueChange={(value) => setContentFormData(prev => ({
                      ...prev,
                      onlyfans: { ...prev.onlyfans, contentFormat: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="live">Live Stream</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="onlyfans-price">Price</Label>
                  <Input
                    id="onlyfans-price"
                    value={contentFormData.onlyfans.price}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      onlyfans: { ...prev.onlyfans, price: e.target.value }
                    }))}
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="onlyfans-date">Scheduled Date</Label>
                  <Input
                    id="onlyfans-date"
                    type="datetime-local"
                    value={contentFormData.onlyfans.scheduledDate}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      onlyfans: { ...prev.onlyfans, scheduledDate: e.target.value }
                    }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="onlyfans-cta">Call to Action</Label>
                <Input
                  id="onlyfans-cta"
                  value={contentFormData.onlyfans.callToAction}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    onlyfans: { ...prev.onlyfans, callToAction: e.target.value }
                  }))}
                  placeholder="Check out my latest content!"
                />
              </div>
            </div>
          )}

          {selectedContentType === "social" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="social-platform">Platform</Label>
                  <Select 
                    value={contentFormData.social.platform}
                    onValueChange={(value) => setContentFormData(prev => ({
                      ...prev,
                      social: { ...prev.social, platform: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="snapchat">Snapchat</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="social-date">Posting Date</Label>
                  <Input
                    id="social-date"
                    type="datetime-local"
                    value={contentFormData.social.postingDate}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      social: { ...prev.social, postingDate: e.target.value }
                    }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="social-caption">Caption</Label>
                <Textarea
                  id="social-caption"
                  value={contentFormData.social.caption}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    social: { ...prev.social, caption: e.target.value }
                  }))}
                  placeholder="Social media caption"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="social-hashtags">Hashtags</Label>
                <Input
                  id="social-hashtags"
                  value={contentFormData.social.hashtags}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    social: { ...prev.social, hashtags: e.target.value }
                  }))}
                  placeholder="#content #creator #social"
                />
              </div>
            </div>
          )}

          {selectedContentType === "customs" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customs-client">Client Name</Label>
                  <Input
                    id="customs-client"
                    value={contentFormData.customs.clientName}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      customs: { ...prev.customs, clientName: e.target.value }
                    }))}
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <Label htmlFor="customs-request">Request ID</Label>
                  <Input
                    id="customs-request"
                    value={contentFormData.customs.requestId}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      customs: { ...prev.customs, requestId: e.target.value }
                    }))}
                    placeholder="#REQ-001"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customs-description">Description</Label>
                <Textarea
                  id="customs-description"
                  value={contentFormData.customs.description}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    customs: { ...prev.customs, description: e.target.value }
                  }))}
                  placeholder="Custom content requirements"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="customs-script">Script/Notes</Label>
                <Textarea
                  id="customs-script"
                  value={contentFormData.customs.script}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    customs: { ...prev.customs, script: e.target.value }
                  }))}
                  placeholder="Script or special instructions"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customs-price">Price</Label>
                  <Input
                    id="customs-price"
                    value={contentFormData.customs.price}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      customs: { ...prev.customs, price: e.target.value }
                    }))}
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="customs-deadline">Delivery Deadline</Label>
                  <Input
                    id="customs-deadline"
                    type="date"
                    value={contentFormData.customs.deliveryDeadline}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      customs: { ...prev.customs, deliveryDeadline: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>
          )}

          {selectedContentType === "whales" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="whales-name">Whale Name</Label>
                  <Input
                    id="whales-name"
                    value={contentFormData.whales.whaleName}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      whales: { ...prev.whales, whaleName: e.target.value }
                    }))}
                    placeholder="High-value subscriber name"
                  />
                </div>
                <div>
                  <Label htmlFor="whales-alias">Alias/Nickname</Label>
                  <Input
                    id="whales-alias"
                    value={contentFormData.whales.alias}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      whales: { ...prev.whales, alias: e.target.value }
                    }))}
                    placeholder="Preferred nickname"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="whales-idea">Content Idea</Label>
                <Textarea
                  id="whales-idea"
                  value={contentFormData.whales.contentIdea}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    whales: { ...prev.whales, contentIdea: e.target.value }
                  }))}
                  placeholder="Personalized content concept"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="whales-budget">Budget</Label>
                  <Input
                    id="whales-budget"
                    value={contentFormData.whales.budget}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      whales: { ...prev.whales, budget: e.target.value }
                    }))}
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="whales-type">Preferred Content Type</Label>
                  <Select 
                    value={contentFormData.whales.preferredContentType}
                    onValueChange={(value) => setContentFormData(prev => ({
                      ...prev,
                      whales: { ...prev.whales, preferredContentType: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="live">Live Session</SelectItem>
                      <SelectItem value="custom">Custom Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {selectedContentType === "calendar" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="calendar-title">Event Title</Label>
                <Input
                  id="calendar-title"
                  value={contentFormData.calendar.title}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    calendar: { ...prev.calendar, title: e.target.value }
                  }))}
                  placeholder="Event or task title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="calendar-datetime">Date & Time</Label>
                  <Input
                    id="calendar-datetime"
                    type="datetime-local"
                    value={contentFormData.calendar.dateTime}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      calendar: { ...prev.calendar, dateTime: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="calendar-team">Team Assignment</Label>
                  <Input
                    id="calendar-team"
                    value={contentFormData.calendar.teamAssignment}
                    onChange={(e) => setContentFormData(prev => ({
                      ...prev,
                      calendar: { ...prev.calendar, teamAssignment: e.target.value }
                    }))}
                    placeholder="Assign to team member"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="calendar-description">Description</Label>
                <Textarea
                  id="calendar-description"
                  value={contentFormData.calendar.description}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    calendar: { ...prev.calendar, description: e.target.value }
                  }))}
                  placeholder="Event details"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="calendar-reminder"
                  checked={contentFormData.calendar.reminder}
                  onChange={(e) => setContentFormData(prev => ({
                    ...prev,
                    calendar: { ...prev.calendar, reminder: e.target.checked }
                  }))}
                />
                <Label htmlFor="calendar-reminder">Set reminder notification</Label>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsContentPopupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContentToSection}>
              Add Content Block
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}