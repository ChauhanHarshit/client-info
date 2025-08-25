import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ArrowLeft, BookOpen, Edit, Eye, Play, Plus, Search, Settings, Trash2, Users, Video, Upload, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";

// Form schemas
const guideContentSchema = z.object({
  text: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  steps: z.array(z.object({
    title: z.string(),
    content: z.string(),
    imageUrl: z.string().url().optional().or(z.literal(""))
  })).optional()
});

const guideFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  section: z.string().optional(),
  audience: z.enum(["client", "internal", "all"]),
  triggerType: z.enum(["first-visit", "on-demand", "always"]),
  content: guideContentSchema,
  showAgainAfterDays: z.number().min(0).optional(),
  isActive: z.boolean().default(true)
});

type GuideFormData = z.infer<typeof guideFormSchema>;

interface CrmGuide {
  id: number;
  title: string;
  description?: string;
  section: string;
  audience: string;
  triggerType: string;
  content: any;
  showAgainAfterDays?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const sectionOptions = [
  "Custom Content",
  "Content Inspiration", 
  "Billing",
  "Invoice Management",
  "Weekly Reports",
  "Client Portal",
  "Calendar",
  "Content Trips",
  "Growth Metrics",
  "Dashboard",
  "Settings"
];

export default function CrmGuideAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedGuide, setSelectedGuide] = useState<CrmGuide | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSection, setFilterSection] = useState("all");
  const [filterAudience, setFilterAudience] = useState("all");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["/api/crm-guides"],
  });

  const createGuideMutation = useMutation({
    mutationFn: async (data: GuideFormData) => {
      return apiRequest("/api/crm-guides", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-guides"] });
      setIsCreateModalOpen(false);
      toast({
        title: "Success",
        description: "Guide created successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create guide",
        variant: "destructive"
      });
    }
  });

  const updateGuideMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<GuideFormData> }) => {
      return apiRequest(`/api/crm-guides/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-guides"] });
      setIsEditModalOpen(false);
      setSelectedGuide(null);
      toast({
        title: "Success",
        description: "Guide updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update guide",
        variant: "destructive"
      });
    }
  });

  const deleteGuideMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/crm-guides/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-guides"] });
      toast({
        title: "Success",
        description: "Guide deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete guide",
        variant: "destructive"
      });
    }
  });

  const toggleGuideMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest(`/api/crm-guides/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-guides"] });
      toast({
        title: "Success",
        description: "Guide status updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update guide status",
        variant: "destructive"
      });
    }
  });

  const form = useForm<GuideFormData>({
    resolver: zodResolver(guideFormSchema),
    defaultValues: {
      title: "",
      description: "",
      section: "CRM Guide", // Default section since field is removed from form
      audience: "client",
      triggerType: "first-visit",
      content: {
        text: "",
        videoUrl: "",
        imageUrl: "",
        steps: []
      },
      showAgainAfterDays: 0,
      isActive: true
    }
  });

  const editForm = useForm<GuideFormData>({
    resolver: zodResolver(guideFormSchema)
  });

  // Drag and drop functionality
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'];
      const maxSize = 500 * 1024 * 1024; // 500MB
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type. Please use images, GIFs, or videos.`,
          variant: "destructive",
        });
        return false;
      }
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Maximum size is 500MB.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const filteredGuides = guides.filter((guide: CrmGuide) => {
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.section.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = filterSection === "all" || guide.section === filterSection;
    const matchesAudience = filterAudience === "all" || guide.audience === filterAudience;
    
    return matchesSearch && matchesSection && matchesAudience;
  });

  const handleCreateGuide = (data: GuideFormData) => {
    createGuideMutation.mutate(data);
  };

  const handleEditGuide = (data: GuideFormData) => {
    if (selectedGuide) {
      updateGuideMutation.mutate({
        id: selectedGuide.id,
        data
      });
    }
  };

  const handleDeleteGuide = (id: number) => {
    if (confirm("Are you sure you want to delete this guide?")) {
      deleteGuideMutation.mutate(id);
    }
  };

  const handleToggleGuide = (id: number, isActive: boolean) => {
    toggleGuideMutation.mutate({ id, isActive });
  };

  const openEditModal = (guide: CrmGuide) => {
    setSelectedGuide(guide);
    editForm.reset({
      title: guide.title,
      description: guide.description || "",
      section: guide.section,
      audience: guide.audience as any,
      triggerType: guide.triggerType as any,
      content: guide.content || {
        text: "",
        videoUrl: "",
        imageUrl: "",
        steps: []
      },
      showAgainAfterDays: guide.showAgainAfterDays || 0,
      isActive: guide.isActive
    });
    setIsEditModalOpen(true);
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case "client": return <Users className="h-4 w-4" />;
      case "internal": return <Settings className="h-4 w-4" />;
      case "all": return <BookOpen className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case "first-visit": return <Eye className="h-4 w-4" />;
      case "on-demand": return <Play className="h-4 w-4" />;
      case "always": return <AlertCircle className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CRM Guide System</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage interactive guides and help content</p>
          </div>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Guide
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Guide</DialogTitle>
              <DialogDescription>
                Create an interactive guide for users in the CRM system
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateGuide)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Guide title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief description of the guide" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="audience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Audience</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="all">All Users</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="triggerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trigger Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="first-visit">First Visit</SelectItem>
                            <SelectItem value="on-demand">On Demand</SelectItem>
                            <SelectItem value="always">Always Show</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="showAgainAfterDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Show Again After (Days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Guide Content</h3>
                  
                  <FormField
                    control={form.control}
                    name="content.text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Guide text content..."
                            className="min-h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="content.videoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="content.imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="text-center text-sm text-gray-500">
                    OR
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    {isDragActive ? (
                      <p className="text-blue-600">Drop the files here...</p>
                    ) : (
                      <div>
                        <p className="text-gray-600 mb-2">
                          Drag & drop videos, GIFs, or images here
                        </p>
                        <p className="text-sm text-gray-500">
                          or click to select files
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Supports: MP4, MOV, AVI, WebM, JPG, PNG, GIF, WebP (max 500MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Files Preview */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Files</Label>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Enable this guide to show to users
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createGuideMutation.isPending}
                  >
                    {createGuideMutation.isPending ? "Creating..." : "Create Guide"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search Guides</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by title or section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="section-filter">Section</Label>
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sectionOptions.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audience-filter">Audience</Label>
              <Select value={filterAudience} onValueChange={setFilterAudience}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuides.map((guide: CrmGuide) => (
          <Card key={guide.id} className={`relative ${!guide.isActive ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{guide.title}</CardTitle>
                  <CardDescription className="mt-1">{guide.description}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(guide)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGuide(guide.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{guide.section}</Badge>
                  <Switch
                    checked={guide.isActive}
                    onCheckedChange={(checked) => handleToggleGuide(guide.id, checked)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {getAudienceIcon(guide.audience)}
                    {guide.audience}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getTriggerIcon(guide.triggerType)}
                    {guide.triggerType}
                  </Badge>
                </div>

                {guide.content?.videoUrl && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Video className="h-4 w-4" />
                    <span>Has video content</span>
                  </div>
                )}

                {guide.showAgainAfterDays > 0 && (
                  <div className="text-sm text-gray-600">
                    Shows again after {guide.showAgainAfterDays} days
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGuides.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No guides found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              {searchTerm || filterSection !== "all" || filterAudience !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first guide to get started"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guide</DialogTitle>
            <DialogDescription>
              Update the guide information and content
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditGuide)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Guide title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sectionOptions.map((section) => (
                            <SelectItem key={section} value={section}>
                              {section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of the guide" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="all">All Users</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="triggerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="first-visit">First Visit</SelectItem>
                          <SelectItem value="on-demand">On Demand</SelectItem>
                          <SelectItem value="always">Always Show</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="showAgainAfterDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Show Again After (Days)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Guide Content</h3>
                
                <FormField
                  control={editForm.control}
                  name="content.text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Guide text content..."
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="content.videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="content.imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable this guide to show to users
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateGuideMutation.isPending}
                >
                  {updateGuideMutation.isPending ? "Updating..." : "Update Guide"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}