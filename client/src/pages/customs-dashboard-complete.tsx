import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  MessageSquare,
  Calendar,
  User,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowLeft
} from "lucide-react";

// Status color helpers
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending_review': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'sold': return 'bg-blue-100 text-blue-800';
    case 'owed': return 'bg-purple-100 text-purple-800';
    case 'complete': return 'bg-gray-100 text-gray-800';
    case 'auto_disapproved': return 'bg-orange-100 text-orange-800';
    default: return 'bg-blue-100 text-blue-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low': return 'bg-gray-100 text-gray-800';
    case 'normal': return 'bg-blue-100 text-blue-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'urgent': return 'bg-red-100 text-red-800';
    default: return 'bg-blue-100 text-blue-800';
  }
};

// Form schemas
const customContentSchema = z.object({
  creatorId: z.number().min(1),
  fanUsername: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  priority: z.string().default("normal"),
  tags: z.string().optional(),
  requestedDeliveryDate: z.string().optional()
});

const rejectSchema = z.object({
  reason: z.string().min(5, "Rejection reason must be at least 5 characters")
});

const rebuttalSchema = z.object({
  message: z.string().min(10, "Rebuttal message must be at least 10 characters")
});

export default function CustomsDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRebuttalModalOpen, setIsRebuttalModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch custom content stats
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/custom-contents/stats"],
  });

  // Fetch creators for form
  const { data: creators = [] } = useQuery({
    queryKey: ["/api/creators"],
  });

  // Build filters for API call
  const filters = {
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(platformFilter !== "all" && { platform: platformFilter }),
    ...(categoryFilter !== "all" && { category: categoryFilter })
  };

  // Fetch custom contents with filters
  const { data: customContents = [], isLoading } = useQuery({
    queryKey: ["/api/custom-contents", filters],
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/custom-contents/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error("Failed to approve");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents/stats"] });
      toast({ title: "Custom content approved successfully" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/custom-contents/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error("Failed to reject");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents/stats"] });
      setIsRejectModalOpen(false);
      toast({ title: "Custom content rejected" });
    }
  });

  const soldMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/custom-contents/${id}/sold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error("Failed to mark as sold");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents/stats"] });
      toast({ title: "Custom content marked as sold" });
    }
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/custom-contents/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error("Failed to complete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents/stats"] });
      toast({ title: "Custom content marked as complete" });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const processedData = {
        ...data,
        creatorId: parseInt(data.creatorId),
        requestedDeliveryDate: data.requestedDeliveryDate ? new Date(data.requestedDeliveryDate).toISOString() : null
      };
      
      const response = await fetch("/api/custom-contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData)
      });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents/stats"] });
      setIsCreateModalOpen(false);
      createForm.reset();
      toast({ title: "Custom content request created successfully" });
    }
  });

  const rebuttalMutation = useMutation({
    mutationFn: async ({ id, message }: { id: number; message: string }) => {
      const response = await fetch(`/api/custom-contents/${id}/rebuttal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      if (!response.ok) throw new Error("Failed to submit rebuttal");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-contents"] });
      setIsRebuttalModalOpen(false);
      toast({ title: "Rebuttal message submitted" });
    }
  });

  // Forms
  const createForm = useForm({
    resolver: zodResolver(customContentSchema),
    defaultValues: {
      priority: "normal",
      platform: "OnlyFans",
      category: "Video"
    }
  });

  const rejectForm = useForm({
    resolver: zodResolver(rejectSchema)
  });

  const rebuttalForm = useForm({
    resolver: zodResolver(rebuttalSchema)
  });

  // Filter contents based on search
  const filteredContents = customContents.filter((content: any) =>
    content.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    content.fanUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    content.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group contents by status
  const pendingContents = filteredContents.filter((c: any) => 
    c.status === 'pending_review' || c.status === 'auto_disapproved'
  );
  const approvedContents = filteredContents.filter((c: any) => c.status === 'approved');
  const owedContents = filteredContents.filter((c: any) => c.status === 'owed');
  const completedContents = filteredContents.filter((c: any) => c.status === 'complete');

  // Handle form submissions
  const handleCreateSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const handleRejectSubmit = (data: any) => {
    if (selectedContent) {
      rejectMutation.mutate({ id: selectedContent.id, reason: data.reason });
    }
  };

  const handleRebuttalSubmit = (data: any) => {
    if (selectedContent) {
      rebuttalMutation.mutate({ id: selectedContent.id, message: data.message });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.history.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Custom Content Management</h1>
              <p className="text-gray-600">Manage custom content requests from submission to delivery</p>
            </div>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Custom Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Custom Content Request</DialogTitle>
                <DialogDescription>
                  Submit a new custom content request for review and approval.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
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
                              {creators.map((creator: any) => (
                                <SelectItem key={creator.id} value={creator.id.toString()}>
                                  {creator.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="fanUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fan Username (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter fan username..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ($)</FormLabel>
                          <FormControl>
                            <Input placeholder="100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Video">Video</SelectItem>
                              <SelectItem value="Photo">Photo</SelectItem>
                              <SelectItem value="Audio">Audio</SelectItem>
                              <SelectItem value="Text">Text</SelectItem>
                              <SelectItem value="Sexting">Sexting</SelectItem>
                              <SelectItem value="Dick Rating">Dick Rating</SelectItem>
                              <SelectItem value="Custom Video">Custom Video</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">


                    <FormField
                      control={createForm.control}
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
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the custom content request in detail..."
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Additional tags..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="requestedDeliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Delivery Date & Time (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field} 
                            placeholder="Select delivery date and time..."
                          />
                        </FormControl>
                        <FormDescription>
                          When the fan would like to receive this custom content
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Request"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPending || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApproved || 0}</div>
              <p className="text-xs text-muted-foreground">Ready for sale</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Owed</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOwed || 0}</div>
              <p className="text-xs text-muted-foreground">Needs delivery</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.revenueThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search custom content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_review">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="owed">Owed</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="OnlyFans">OnlyFans</SelectItem>
                    <SelectItem value="Fansly">Fansly</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Photo">Photo</SelectItem>
                    <SelectItem value="Audio">Audio</SelectItem>
                    <SelectItem value="Text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending ({pendingContents.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedContents.length})</TabsTrigger>
            <TabsTrigger value="owed">Owed ({owedContents.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedContents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingContents.map((content: any) => (
              <CustomContentCard
                key={content.id}
                content={content}
                onApprove={() => approveMutation.mutate(content.id)}
                onReject={() => {
                  setSelectedContent(content);
                  setIsRejectModalOpen(true);
                }}
                onRebuttal={() => {
                  setSelectedContent(content);
                  setIsRebuttalModalOpen(true);
                }}
                onView={() => setSelectedContent(content)}
                showActions={true}
              />
            ))}
            {pendingContents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No pending custom content requests
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedContents.map((content: any) => (
              <CustomContentCard
                key={content.id}
                content={content}
                onSold={() => soldMutation.mutate(content.id)}
                onView={() => setSelectedContent(content)}
                showSoldAction={true}
              />
            ))}
            {approvedContents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No approved custom content
              </div>
            )}
          </TabsContent>

          <TabsContent value="owed" className="space-y-4">
            {owedContents.map((content: any) => (
              <CustomContentCard
                key={content.id}
                content={content}
                onComplete={() => completeMutation.mutate(content.id)}
                onView={() => setSelectedContent(content)}
                showCompleteAction={true}
              />
            ))}
            {owedContents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No owed custom content
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedContents.map((content: any) => (
              <CustomContentCard
                key={content.id}
                content={content}
                onView={() => setSelectedContent(content)}
              />
            ))}
            {completedContents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No completed custom content
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Reject Modal */}
        <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Custom Content</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this custom content request.
              </DialogDescription>
            </DialogHeader>
            <Form {...rejectForm}>
              <form onSubmit={rejectForm.handleSubmit(handleRejectSubmit)} className="space-y-4">
                <FormField
                  control={rejectForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rejection Reason</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain why this request is being rejected..."
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRejectModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>
                    {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Rebuttal Modal */}
        <Dialog open={isRebuttalModalOpen} onOpenChange={setIsRebuttalModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Rebuttal</DialogTitle>
              <DialogDescription>
                Challenge the rejection of this custom content request.
              </DialogDescription>
            </DialogHeader>
            <Form {...rebuttalForm}>
              <form onSubmit={rebuttalForm.handleSubmit(handleRebuttalSubmit)} className="space-y-4">
                <FormField
                  control={rebuttalForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rebuttal Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain why this rejection should be reconsidered..."
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRebuttalModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={rebuttalMutation.isPending}>
                    {rebuttalMutation.isPending ? "Submitting..." : "Submit Rebuttal"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Custom Content Card Component
function CustomContentCard({ 
  content, 
  onApprove, 
  onReject, 
  onSold, 
  onComplete, 
  onRebuttal,
  onView,
  showActions = false,
  showSoldAction = false,
  showCompleteAction = false
}: {
  content: any;
  onApprove?: () => void;
  onReject?: () => void;
  onSold?: () => void;
  onComplete?: () => void;
  onRebuttal?: () => void;
  onView?: () => void;
  showActions?: boolean;
  showSoldAction?: boolean;
  showCompleteAction?: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={getStatusColor(content.status)}>
                {content.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(content.priority)}>
                {content.priority.toUpperCase()}
              </Badge>
              <Badge variant="outline">{content.category}</Badge>
              <Badge variant="outline">{content.platform}</Badge>
            </div>
            
            <h3 className="font-medium text-gray-900 mb-2">
              ${content.price} - {content.category} Custom
            </h3>
            
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {content.description}
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {content.fanUsername && (
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{content.fanUsername}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(content.createdAt).toLocaleDateString()}</span>
              </div>
              {content.requestedDeliveryDate && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Due: {new Date(content.requestedDeliveryDate).toLocaleDateString()}</span>
                </div>
              )}
              {content.saleDate && (
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-4 h-4" />
                  <span>Sold {new Date(content.saleDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {onView && (
              <Button variant="ghost" size="sm" onClick={onView}>
                <Eye className="w-4 h-4" />
              </Button>
            )}
            
            {showActions && (
              <>
                {onApprove && (
                  <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                )}
                {onReject && (
                  <Button size="sm" variant="destructive" onClick={onReject}>
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                )}
                {content.status === 'rejected' && onRebuttal && (
                  <Button size="sm" variant="outline" onClick={onRebuttal}>
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Rebuttal
                  </Button>
                )}
              </>
            )}
            
            {showSoldAction && onSold && (
              <Button size="sm" onClick={onSold} className="bg-blue-600 hover:bg-blue-700">
                <DollarSign className="w-4 h-4 mr-1" />
                Mark Sold
              </Button>
            )}
            
            {showCompleteAction && onComplete && (
              <Button size="sm" onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
            )}
          </div>
        </div>
        
        {content.rejectionReason && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>Rejection Reason:</strong> {content.rejectionReason}
            </p>
          </div>
        )}
        
        {content.rebuttalMessage && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Rebuttal:</strong> {content.rebuttalMessage}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}