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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Settings, Users, BarChart3, Folder, Calendar, FileText, Upload, Lightbulb, Target, Link, Eye, EyeOff, ExternalLink, Copy, CheckCircle, ArrowLeft } from "lucide-react";
import { Creator, ContentSection, CreatorPage } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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

export default function CreatorContentManager() {
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch content sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["/api/content-sections"],
  });

  // Fetch creators
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["/api/creators"],
  });

  // Fetch creator page data
  const { data: creatorPage, isLoading: pageLoading } = useQuery({
    queryKey: ["/api/creators", selectedCreator?.id, "page"],
    enabled: !!selectedCreator,
  });

  // Fetch creator sections with visibility settings
  const { data: creatorSections = [], isLoading: creatorSectionsLoading } = useQuery({
    queryKey: ["/api/creators", selectedCreator?.id, "sections-visibility"],
    enabled: !!selectedCreator,
  });

  // Toggle section visibility mutation
  const toggleSectionMutation = useMutation({
    mutationFn: async ({ creatorId, sectionId, isEnabled }: { creatorId: number; sectionId: number; isEnabled: boolean }) => {
      return await apiRequest(`/api/creators/${creatorId}/sections/${sectionId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators", selectedCreator?.id, "sections-visibility"] });
      toast({
        title: "Section Updated",
        description: "Section visibility has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update section visibility.",
        variant: "destructive",
      });
    },
  });

  // Toggle page public visibility mutation
  const togglePagePublicMutation = useMutation({
    mutationFn: async ({ pageId, isPublic }: { pageId: number; isPublic: boolean }) => {
      return await apiRequest(`/api/creator-pages/${pageId}/public`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators", selectedCreator?.id, "page"] });
      toast({
        title: "Page Updated",
        description: "Page visibility has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update page visibility.",
        variant: "destructive",
      });
    },
  });

  const handleSectionToggle = (sectionId: number, isEnabled: boolean) => {
    if (!selectedCreator) return;
    
    toggleSectionMutation.mutate({
      creatorId: selectedCreator.id,
      sectionId,
      isEnabled,
    });
  };

  const handlePagePublicToggle = (isPublic: boolean) => {
    if (!creatorPage) return;
    
    togglePagePublicMutation.mutate({
      pageId: creatorPage.id,
      isPublic,
    });
  };

  const copyPublicLink = async (slug: string) => {
    const publicUrl = `${window.location.origin}/public/creator/${slug}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(slug);
      setTimeout(() => setCopiedLink(null), 2000);
      toast({
        title: "Link Copied",
        description: "Public link has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (sectionsLoading || creatorsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Creator Content Manager</h1>
            <p className="text-muted-foreground">Manage individual creator content sections and public pages</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Creator Content Manager</h1>
            <p className="text-muted-foreground">
              Manage individual creator content sections and public pages
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Individual Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overview of all creators and their page status */}
          <Card>
            <CardHeader>
              <CardTitle>Creator Pages Overview</CardTitle>
              <CardDescription>
                Overview of all creator pages and their public availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Page Status</TableHead>
                    <TableHead>Public Link</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creators.map((creator: Creator) => (
                    <TableRow key={creator.id}>
                      <TableCell className="font-medium">
                        {creator.displayName}
                      </TableCell>
                      <TableCell>@{creator.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Team {creator.teamId}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={creator.isActive ? "default" : "secondary"}>
                          {creator.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Available when public
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCreator(creator)}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          {/* Creator Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Creator</CardTitle>
              <CardDescription>
                Choose a creator to manage their content sections and page settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedCreator?.id.toString() || ""}
                onValueChange={(value) => {
                  const creator = creators.find((c: Creator) => c.id.toString() === value);
                  setSelectedCreator(creator || null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a creator..." />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator: Creator) => (
                    <SelectItem key={creator.id} value={creator.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{creator.displayName}</span>
                        <span className="text-muted-foreground">@{creator.username}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Creator Management Interface */}
          {selectedCreator && (
            <>
              {/* Page Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Link className="h-5 w-5" />
                    <span>Page Settings for {selectedCreator.displayName}</span>
                  </CardTitle>
                  <CardDescription>
                    Manage public page visibility and generate shareable links
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pageLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  ) : creatorPage ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">Public Page Access</p>
                          <p className="text-sm text-muted-foreground">
                            Make this creator's page accessible via public link
                          </p>
                        </div>
                        <Switch
                          checked={creatorPage.isPublic || false}
                          onCheckedChange={handlePagePublicToggle}
                          disabled={togglePagePublicMutation.isPending}
                        />
                      </div>
                      
                      {creatorPage.isPublic && (
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">Public Link</p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {window.location.origin}/public/creator/{creatorPage.slug}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyPublicLink(creatorPage.slug)}
                              className="flex items-center space-x-2"
                            >
                              {copiedLink === creatorPage.slug ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                              <span>{copiedLink === creatorPage.slug ? "Copied!" : "Copy"}</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">No page found for this creator.</p>
                  )}
                </CardContent>
              </Card>

              {/* Content Sections Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Sections</CardTitle>
                  <CardDescription>
                    Toggle individual content sections for this creator's page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {creatorSectionsLoading ? (
                    <div className="animate-pulse space-y-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded">
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                          </div>
                          <div className="h-6 w-10 bg-muted rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sections.map((section: ContentSection) => {
                        const IconComponent = sectionTypeIcons[section.type as keyof typeof sectionTypeIcons] || Settings;
                        const colorClass = sectionTypeColors[section.type as keyof typeof sectionTypeColors] || sectionTypeColors.documentation;
                        const creatorSection = creatorSections.find((cs: any) => cs.id === section.id);
                        const isEnabled = creatorSection?.isEnabled ?? true;
                        
                        return (
                          <div
                            key={section.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <IconComponent className="h-5 w-5 text-muted-foreground" />
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium">{section.name}</p>
                                  <Badge className={`${colorClass} text-xs`}>
                                    {section.type}
                                  </Badge>
                                </div>
                                {section.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {section.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {isEnabled ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-red-600" />
                              )}
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleSectionToggle(section.id, checked)}
                                disabled={toggleSectionMutation.isPending}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}