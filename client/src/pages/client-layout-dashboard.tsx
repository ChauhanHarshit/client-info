import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Eye, 
  Settings, 
  Plus, 
  Files,
  Layout as LayoutIcon,
  Edit,
  Trash2,
  ArrowLeft
} from "lucide-react";
import type { Creator, LayoutTemplate, CreatorLayoutConfig } from "@shared/schema";

export default function ClientLayoutDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterPod, setFilterPod] = useState<string>("all");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch creators
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["/api/creators"],
  });

  // Fetch layout templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/layout-templates"],
  });

  // Fetch creator layout configs
  const { data: configs = [] } = useQuery({
    queryKey: ["/api/creator-layout-configs"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: { name: string; description: string; layoutConfig: any }) => {
      return await apiRequest("/api/layout-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layout-templates"] });
      setTemplateDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateDescription("");
      toast({
        title: "Template Created",
        description: "Layout template has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create layout template.",
        variant: "destructive",
      });
    },
  });

  // Get creator's assigned template
  const getCreatorTemplate = (creatorId: number) => {
    const config = configs.find((c: CreatorLayoutConfig) => c.creatorId === creatorId);
    if (config?.assignedTemplateId) {
      return templates.find((t: LayoutTemplate) => t.id === config.assignedTemplateId);
    }
    return templates.find((t: LayoutTemplate) => t.isDefault);
  };

  // Filter creators based on search and pod
  const filteredCreators = creators.filter((creator: Creator) => {
    const matchesSearch = creator.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         creator.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPod = filterPod === "all" || creator.teamId?.toString() === filterPod;
    return matchesSearch && matchesPod;
  });

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }

    // Default layout configuration
    const defaultLayoutConfig = {
      sections: [
        { id: "stats", name: "Statistics", position: 1, visible: true, size: "large" },
        { id: "inspiration", name: "Content Inspiration", position: 2, visible: true, size: "large" },
        { id: "growth", name: "Growth Benchmarks", position: 3, visible: true, size: "medium" },
        { id: "calendar", name: "Content Calendar", position: 4, visible: true, size: "medium" },
        { id: "notes", name: "Custom Notes", position: 5, visible: false, size: "small" },
      ]
    };

    createTemplateMutation.mutate({
      name: newTemplateName,
      description: newTemplateDescription,
      layoutConfig: defaultLayoutConfig,
    });
  };

  if (creatorsLoading || templatesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Client Layout Dashboard</h1>
            <p className="text-slate-600 mt-1">Manage and customize each client's shared view layout</p>
          </div>
        </div>
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Layout Template</DialogTitle>
              <DialogDescription>
                Create a new layout template that can be applied to multiple creators.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="template-name" className="text-sm font-medium">Template Name</label>
                <Input
                  id="template-name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Revenue-Focused Dashboard"
                />
              </div>
              <div>
                <label htmlFor="template-description" className="text-sm font-medium">Description</label>
                <Input
                  id="template-description"
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Template description..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate} disabled={createTemplateMutation.isPending}>
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Files className="w-5 h-5 mr-2" />
            Layout Templates
          </CardTitle>
          <CardDescription>
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template: LayoutTemplate) => (
              <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                    {template.isDefault && (
                      <Badge variant="secondary" className="mt-2">Default</Badge>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!template.isDefault && (
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={filterPod} onValueChange={setFilterPod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by pod" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pods</SelectItem>
              <SelectItem value="1">Chatting Team</SelectItem>
              <SelectItem value="2">Creative Team</SelectItem>
              <SelectItem value="3">Management Team</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Creators Grid/List */}
      <div className={viewMode === "grid" 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
        : "space-y-4"
      }>
        {filteredCreators.map((creator: Creator) => {
          const assignedTemplate = getCreatorTemplate(creator.id);
          
          return (
            <Card key={creator.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={creator.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {creator.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{creator.displayName}</h3>
                      <p className="text-sm text-slate-600">@{creator.username}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Current Template:</p>
                    <p className="text-sm text-slate-600">
                      {assignedTemplate?.name || "No template assigned"}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCreators.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <LayoutIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No creators found</h3>
            <p className="text-slate-600">
              {searchTerm || filterPod !== "all" 
                ? "Try adjusting your search or filter criteria."
                : "No creators have been added yet."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}