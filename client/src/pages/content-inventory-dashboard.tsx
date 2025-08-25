import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  ArrowLeft,
  BarChart3, 
  Target, 
  MessageCircle, 
  Calendar,
  TrendingUp,
  Plus,
  Edit,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { CenteredSectionLoader } from "@/components/ui/loading-animation";

// Platform icons mapping
const platformIcons: Record<string, string> = {
  "OnlyFans": "🔞",
  "Instagram": "📷",
  "Twitter": "🐦",
  "TikTok": "🎵",
  "YouTube": "📺",
  "OFTV": "📹",
  "Snapchat": "👻",
  "Reddit": "🤖"
};

// Form schemas
const contentGoalSchema = z.object({
  creatorId: z.number(),
  goalType: z.enum(["weekly", "monthly"]),
  platform: z.string().optional(),
  targetCount: z.number().min(1),
  startDate: z.string(),
  endDate: z.string(),
});

const contentRequestSchema = z.object({
  creatorId: z.number(),
  contentType: z.string().min(1),
  platform: z.string().min(1),
  description: z.string().min(1),
  exampleLink: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  customSaleReference: z.string().optional(),
  dmCampaignReference: z.string().optional(),
});

type ContentGoalForm = z.infer<typeof contentGoalSchema>;
type ContentRequestForm = z.infer<typeof contentRequestSchema>;

export default function ContentInventoryDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCreator, setSelectedCreator] = useState<number | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  // Queries
  const { data: creators, isLoading: creatorsLoading } = useQuery({
    queryKey: ["/api/creators"],
  });

  const { data: contentInventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/content-inventory"],
  });

  const { data: contentGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/content-goals"],
  });

  const { data: activeGoals, isLoading: activeGoalsLoading } = useQuery({
    queryKey: ["/api/content-goals/active"],
  });

  const { data: contentRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/content-requests"],
  });

  // Forms
  const goalForm = useForm<ContentGoalForm>({
    resolver: zodResolver(contentGoalSchema),
    defaultValues: {
      goalType: "weekly",
      priority: "medium",
    },
  });

  const requestForm = useForm<ContentRequestForm>({
    resolver: zodResolver(contentRequestSchema),
    defaultValues: {
      priority: "medium",
    },
  });

  // Mutations
  const createGoalMutation = useMutation({
    mutationFn: async (data: ContentGoalForm) => {
      return await apiRequest("/api/content-goals", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-goals/active"] });
      setGoalDialogOpen(false);
      goalForm.reset();
      toast({
        title: "Success",
        description: "Content goal created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create content goal",
        variant: "destructive",
      });
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: ContentRequestForm) => {
      return await apiRequest("/api/content-requests", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-requests"] });
      setRequestDialogOpen(false);
      requestForm.reset();
      toast({
        title: "Success",
        description: "Content request submitted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit content request",
        variant: "destructive",
      });
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/content-requests/${id}/approve`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-requests"] });
      toast({
        title: "Success",
        description: "Content request approved",
      });
    },
  });

  const disapproveRequestMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return await apiRequest(`/api/content-requests/${id}/disapprove`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-requests"] });
      toast({
        title: "Success",
        description: "Content request disapproved",
      });
    },
  });

  // Helper functions
  const getCreatorName = (creatorId: number) => {
    const creator = creators?.find((c: any) => c.id === creatorId);
    return creator?.displayName || creator?.username || "Unknown Creator";
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressStatus = (percentage: number) => {
    if (percentage >= 100) return "complete";
    if (percentage >= 75) return "on-track";
    if (percentage >= 50) return "behind";
    return "critical";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete": return "bg-green-500";
      case "on-track": return "bg-blue-500";
      case "behind": return "bg-yellow-500";
      case "critical": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "disapproved": return "bg-red-100 text-red-800";
      case "fulfilled": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Group inventory by creator
  const inventoryByCreator = contentInventory?.reduce((acc: any, item: any) => {
    if (!acc[item.creatorId]) {
      acc[item.creatorId] = [];
    }
    acc[item.creatorId].push(item);
    return acc;
  }, {}) || {};

  if (creatorsLoading || inventoryLoading || goalsLoading || requestsLoading) {
    return <CenteredSectionLoader message="Loading content inventory..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Content Inventory + Production Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Target className="h-4 w-4 mr-2" />
                    Set Goal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Content Goal</DialogTitle>
                    <DialogDescription>
                      Set production goals for creators to track progress.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...goalForm}>
                    <form onSubmit={goalForm.handleSubmit((data) => createGoalMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={goalForm.control}
                        name="creatorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Creator</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select creator" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {creators?.map((creator: any) => (
                                  <SelectItem key={creator.id} value={creator.id.toString()}>
                                    {creator.displayName || creator.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={goalForm.control}
                        name="goalType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Goal Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={goalForm.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform (Optional)</FormLabel>
                            <Select onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="All platforms" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">All platforms</SelectItem>
                                {Object.keys(platformIcons).map((platform) => (
                                  <SelectItem key={platform} value={platform}>
                                    {platformIcons[platform]} {platform}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={goalForm.control}
                        name="targetCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Content Count</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={goalForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={goalForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setGoalDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createGoalMutation.isPending}
                        >
                          {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Request Content
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Submit Content Request</DialogTitle>
                    <DialogDescription>
                      Request specific content from creators for campaigns or sales.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...requestForm}>
                    <form onSubmit={requestForm.handleSubmit((data) => createRequestMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={requestForm.control}
                        name="creatorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Creator</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select creator" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {creators?.map((creator: any) => (
                                  <SelectItem key={creator.id} value={creator.id.toString()}>
                                    {creator.displayName || creator.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={requestForm.control}
                          name="contentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., video, selfie, themed set" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={requestForm.control}
                          name="platform"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Platform</FormLabel>
                              <Select onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select platform" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.keys(platformIcons).map((platform) => (
                                    <SelectItem key={platform} value={platform}>
                                      {platformIcons[platform]} {platform}
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
                        control={requestForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the content request in detail..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={requestForm.control}
                        name="exampleLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Example/Reference Link (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={requestForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={requestForm.control}
                          name="customSaleReference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Custom Sale Ref (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Sale ID..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={requestForm.control}
                          name="dmCampaignReference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>DM Campaign Ref (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Campaign ID..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setRequestDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createRequestMutation.isPending}
                        >
                          {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Content Inventory
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Production Goals
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Content Requests
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Logs
            </TabsTrigger>
          </TabsList>

          {/* Content Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Total Content Inventory
                  </CardTitle>
                  <CardDescription>
                    Track content pieces across all platforms for each creator
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(inventoryByCreator).map(([creatorId, inventory]: [string, any]) => {
                      const totalContent = inventory.reduce((sum: number, item: any) => sum + item.contentCount, 0);
                      return (
                        <div key={creatorId} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">
                              {getCreatorName(parseInt(creatorId))}
                            </h3>
                            <Badge variant="outline" className="text-sm">
                              {totalContent} total content pieces
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                            {inventory.map((item: any) => (
                              <div key={item.id} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="text-2xl mb-1">{platformIcons[item.platform] || "📱"}</div>
                                <div className="text-sm font-medium">{item.platform}</div>
                                <div className="text-lg font-bold text-blue-600">{item.contentCount}</div>
                                {item.lastSyncDate && (
                                  <div className="text-xs text-gray-500">
                                    {format(new Date(item.lastSyncDate), "MMM d")}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Production Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Active Production Goals
                </CardTitle>
                <CardDescription>
                  Track weekly and monthly content production goals with progress indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeGoals?.map((goal: any) => {
                    const progress = getProgressPercentage(goal.currentCount, goal.targetCount);
                    const status = getProgressStatus(progress);
                    
                    return (
                      <div key={goal.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-medium">
                              {getCreatorName(goal.creatorId)} - {goal.goalType} Goal
                            </h3>
                            <p className="text-sm text-gray-500">
                              {goal.platform || "All platforms"} • {format(new Date(goal.startDate), "MMM d")} - {format(new Date(goal.endDate), "MMM d")}
                            </p>
                          </div>
                          <Badge className={getStatusColor(status)}>
                            {status === "complete" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {status === "on-track" && <TrendingUp className="h-3 w-3 mr-1" />}
                            {status === "behind" && <Clock className="h-3 w-3 mr-1" />}
                            {status === "critical" && <AlertCircle className="h-3 w-3 mr-1" />}
                            {status.replace("-", " ")}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress: {goal.currentCount} / {goal.targetCount}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                    );
                  })}
                  {!activeGoals?.length && (
                    <div className="text-center py-8 text-gray-500">
                      No active goals set. Create goals to track production progress.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Content Requests
                </CardTitle>
                <CardDescription>
                  Internal team requests for specific content from creators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Content Type</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contentRequests?.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {getCreatorName(request.creatorId)}
                        </TableCell>
                        <TableCell>{request.contentType}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="mr-2">{platformIcons[request.platform] || "📱"}</span>
                            {request.platform}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(request.priority)}>
                            {request.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRequestStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {request.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveRequestMutation.mutate(request.id)}
                                  disabled={approveRequestMutation.isPending}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const reason = prompt("Reason for disapproval:");
                                    if (reason) {
                                      disapproveRequestMutation.mutate({ id: request.id, reason });
                                    }
                                  }}
                                  disabled={disapproveRequestMutation.isPending}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {request.exampleLink && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(request.exampleLink, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!contentRequests?.length && (
                  <div className="text-center py-8 text-gray-500">
                    No content requests yet. Submit requests to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Logs Tab */}
          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Google Sheets Sync Logs
                </CardTitle>
                <CardDescription>
                  Track synchronization status with external Google Sheets data sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Google Sheets integration coming soon. This will track automatic syncing of content counts from external spreadsheets.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}