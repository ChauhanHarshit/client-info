import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Settings, Users, BarChart3, Folder, Calendar, FileText, Upload, Lightbulb, Target, ArrowLeft } from "lucide-react";
import { ContentSection, Creator } from "@shared/schema";
import { PageHeader } from "@/components/page-header";

const contentSectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  description: z.string().optional(),
  defaultContent: z.string().optional(),
});

const sectionTypeIcons = {
  content: Target,
  inspiration: Lightbulb,
  scheduling: Calendar,
  analytics: BarChart3,
  uploads: Upload,
  documentation: FileText,
};

const sectionTypeColors = {
  content: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  inspiration: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  scheduling: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  analytics: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  uploads: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  documentation: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function ContentManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ContentSection | null>(null);
  const [, setLocation] = useLocation();

  // Fetch content sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["/api/content-sections"],
  });

  // Fetch creators for assignment
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["/api/creators"],
  });

  // Create content section mutation
  const createSectionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contentSectionSchema>) => {
      return await apiRequest("/api/content-sections", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-sections"] });
      setIsCreateDialogOpen(false);
    },
  });

  // Update content section mutation
  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ContentSection> }) => {
      return await apiRequest(`/api/content-sections/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-sections"] });
    },
  });

  const form = useForm<z.infer<typeof contentSectionSchema>>({
    resolver: zodResolver(contentSectionSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      defaultContent: "",
    },
  });

  const onSubmit = (data: z.infer<typeof contentSectionSchema>) => {
    createSectionMutation.mutate(data);
  };

  const toggleSectionStatus = async (section: ContentSection) => {
    updateSectionMutation.mutate({
      id: section.id,
      data: { isActive: !section.isActive },
    });
  };

  if (sectionsLoading || creatorsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
            <p className="text-muted-foreground">Manage content sections and creator page assignments</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Management"
        description="Manage content sections and creator page assignments"
        showBackButton={true}
        backTo="/"
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        }
      />
      
      <div className="px-6 pb-6 space-y-6">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Content Section</DialogTitle>
              <DialogDescription>
                Add a new content section for creator pages.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Content section name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select section type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="content">Content</SelectItem>
                          <SelectItem value="inspiration">Inspiration</SelectItem>
                          <SelectItem value="scheduling">Scheduling</SelectItem>
                          <SelectItem value="analytics">Analytics</SelectItem>
                          <SelectItem value="uploads">Uploads</SelectItem>
                          <SelectItem value="documentation">Documentation</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <Textarea 
                          placeholder="Describe what this section is for..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Default content to populate when section is added..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This content will be pre-filled when the section is added to a creator page.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createSectionMutation.isPending}
                  >
                    {createSectionMutation.isPending ? "Creating..." : "Create Section"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Content Sections Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section: ContentSection) => {
          const IconComponent = sectionTypeIcons[section.type as keyof typeof sectionTypeIcons] || Settings;
          const colorClass = sectionTypeColors[section.type as keyof typeof sectionTypeColors] || sectionTypeColors.documentation;
          
          return (
            <Card key={section.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{section.name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={colorClass}>
                      {section.type}
                    </Badge>
                    <Switch
                      checked={section.isActive}
                      onCheckedChange={() => toggleSectionStatus(section)}
                      disabled={updateSectionMutation.isPending}
                    />
                  </div>
                </div>
                {section.description && (
                  <CardDescription className="text-sm">
                    {section.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {section.isSystemSection && (
                    <Badge variant="outline" className="text-xs">
                      System Section
                    </Badge>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Status</span>
                    <span className={section.isActive ? "text-green-600" : "text-red-600"}>
                      {section.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {section.defaultContent && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium">Default Content Preview:</p>
                      <p className="truncate">
                        {section.defaultContent.substring(0, 100)}
                        {section.defaultContent.length > 100 ? "..." : ""}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sections</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections.filter((s: ContentSection) => s.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creators.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Sections</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections.filter((s: ContentSection) => s.isSystemSection).length}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}