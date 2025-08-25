import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar, CheckCircle, DollarSign, Edit, Instagram, Phone, Plus, Trash2, TrendingUp, User, Users, XCircle, Upload, Image, Search, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";

// Form schemas
const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  profileImageUrl: z.string().optional(),
  profileImage: z.instanceof(File).optional(),
  instagram: z.string().optional(),
  phone: z.string().optional(),
  ofEarnings3moAvg: z.number().min(0).default(0),
  currentAgency: z.string().optional(),
  referredBy: z.string().optional(),
  whosTalkingTo: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "signed", "dead"]).default("pending"),
});

const followUpSchema = z.object({
  notes: z.string().min(1, "Follow-up notes are required"),
  followUpDate: z.date(),
  completedBy: z.string().optional(),
});

type Lead = {
  id: number;
  name: string;
  profileImageUrl?: string;
  instagram?: string;
  phone?: string;
  ofEarnings3moAvg: number;
  currentAgency?: string;
  referredBy?: string;
  notes?: string;
  status: "pending" | "signed" | "dead";
  lastFollowUp?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type LeadMetrics = {
  totalPending: number;
  totalSigned: number;
  totalDead: number;
  totalEarnings: number;
  leadsAddedThisWeek: number;
};

export default function LeadManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isLeadProfileModalOpen, setIsLeadProfileModalOpen] = useState(false); // State for the new modal
  const [activeTab, setActiveTab] = useState("pending");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [leadFilter, setLeadFilter] = useState<string>("all"); // New filter state
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rawLeads = [], isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ["/api/potential-leads"],
    queryFn: async () => {
      const response = await fetch("/api/potential-leads", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.status}`);
      }
      const data = await response.json();
      console.log("Raw API response:", data);
      return Array.isArray(data) ? data : [];
    },
  });

  // Convert snake_case from backend to camelCase for frontend  
  const leads: Lead[] = rawLeads.map((lead: any) => ({
    id: lead.id,
    name: lead.name,
    profileImageUrl: lead.profile_image_url || "",
    instagram: lead.instagram || "",
    phone: lead.phone || "",
    ofEarnings3moAvg: lead.of_earnings_3mo_avg || 0,
    currentAgency: lead.current_agency || "",
    referredBy: lead.referred_by || "",
    notes: lead.notes || "",
    status: lead.status || "pending",
    lastFollowUp: lead.last_follow_up || null,
    createdAt: lead.created_at || new Date().toISOString(),
    updatedAt: lead.updated_at || new Date().toISOString(),
  }));

  console.log("Leads count:", leads.length, "Status breakdown:", {
    pending: leads.filter(l => l.status === "pending").length,
    signed: leads.filter(l => l.status === "signed").length,
    dead: leads.filter(l => l.status === "dead").length,
  });

  const { data: metrics } = useQuery<LeadMetrics>({
    queryKey: ["/api/potential-leads/metrics"],
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: z.infer<typeof leadSchema>) => {
      return await apiRequest("POST", "/api/potential-leads", leadData);
    },
    onSuccess: async () => {
      // Ensure cache invalidation completes before showing success
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/potential-leads"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/potential-leads/metrics"] })
      ]);

      // Force refetch to ensure new data is loaded
      await queryClient.refetchQueries({ queryKey: ["/api/potential-leads"] });

      setIsCreateModalOpen(false);
      createForm.reset();
      setProfileImagePreview(null);
      toast({ title: "Success", description: "Lead created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create lead", variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: number }) => {
      return await apiRequest("PATCH", `/api/potential-leads/${id}`, updates);
    },
    onSuccess: async () => {
      // Ensure cache invalidation completes before showing success
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/potential-leads"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/potential-leads/metrics"] })
      ]);

      // Force refetch to ensure new data is loaded
      await queryClient.refetchQueries({ queryKey: ["/api/potential-leads"] });

      setIsEditModalOpen(false);
      toast({ title: "Success", description: "Lead updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lead", variant: "destructive" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/potential-leads/${id}`);
    },
    onSuccess: async () => {
      // Ensure cache invalidation completes before showing success
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/potential-leads"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/potential-leads/metrics"] })
      ]);

      // Force refetch to ensure new data is loaded
      await queryClient.refetchQueries({ queryKey: ["/api/potential-leads"] });

      toast({ title: "Success", description: "Lead deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" });
    },
  });

  const addFollowUpMutation = useMutation({
    mutationFn: async ({ leadId, followUpData }: { leadId: number; followUpData: z.infer<typeof followUpSchema> }) => {
      return await apiRequest("POST", `/api/potential-leads/${leadId}/follow-ups`, {
        ...followUpData,
        followUpDate: followUpData.followUpDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/potential-leads"] });
      setIsFollowUpModalOpen(false);
      toast({ title: "Success", description: "Follow-up added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add follow-up", variant: "destructive" });
    },
  });

  const createForm = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      profileImageUrl: "",
      instagram: "",
      phone: "",
      ofEarnings3moAvg: 0,
      currentAgency: "",
      referredBy: "",
      whosTalkingTo: "",
      notes: "",
      status: "pending",
    },
  });

  const editForm = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
  });

  const followUpForm = useForm<z.infer<typeof followUpSchema>>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      notes: "",
      followUpDate: new Date(),
      completedBy: "",
    },
  });

  const handleFileUpload = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
        createForm.setValue('profileImage', file);
      };
      reader.readAsDataURL(file);
    } else {
      setProfileImagePreview(null);
      createForm.setValue('profileImage', undefined);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleFileUpload(file);
      } else {
        toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleCreateLead = async (data: z.infer<typeof leadSchema>) => {
    // If there's a profile image file, we need to upload it first
    if (data.profileImage) {
      // For now, we'll just use the preview as the URL
      // In a real app, you'd upload to a server/cloud storage
      data.profileImageUrl = profileImagePreview || undefined;
    }

    // Remove the profileImage field before sending to API
    const { profileImage, ...leadData } = data;
    createLeadMutation.mutate(leadData);
  };

  const handleUpdateLead = (data: z.infer<typeof leadSchema>) => {
    if (!selectedLead) return;
    updateLeadMutation.mutate({ id: selectedLead.id, ...data });
  };

  const handleStatusChange = (lead: Lead, newStatus: "pending" | "signed" | "dead") => {
    updateLeadMutation.mutate({ id: lead.id, status: newStatus });
  };

  const handleAddFollowUp = (data: z.infer<typeof followUpSchema>) => {
    if (!selectedLead) return;
    addFollowUpMutation.mutate({ leadId: selectedLead.id, followUpData: data });
  };

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead);
    editForm.reset({
      name: lead.name,
      profileImageUrl: lead.profileImageUrl || "",
      instagram: lead.instagram || "",
      phone: lead.phone || "",
      ofEarnings3moAvg: lead.ofEarnings3moAvg,
      currentAgency: lead.currentAgency || "",
      referredBy: lead.referredBy || "",
      notes: lead.notes || "",
      status: lead.status,
    });
    setIsEditModalOpen(true);
  };

  const openFollowUpModal = (lead: Lead) => {
    setSelectedLead(lead);
    followUpForm.reset({
      notes: "",
      followUpDate: new Date(),
      completedBy: "",
    });
    setIsFollowUpModalOpen(true);
  };

  // New function to open the lead profile modal
  const openLeadProfile = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadProfileModalOpen(true);
  };

  const filterLeadsByStatus = (status: string) => {
    // First apply search filter
    const searchLower = searchTerm.toLowerCase();
    let filtered = leads.filter((lead: Lead) => {
      const matchesSearch = !searchTerm || 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.instagram?.toLowerCase().includes(searchLower) ||
        lead.currentAgency?.toLowerCase().includes(searchLower) ||
        lead.referredBy?.toLowerCase().includes(searchLower);
      
      return matchesSearch && lead.status === status;
    });
    
    // Apply additional filters only for pending tab
    if (status === "pending" && leadFilter !== "all") {
      const now = new Date();
      
      filtered = filtered.filter((lead: Lead) => {
        const lastContactDate = lead.lastFollowUp || lead.createdAt;
        if (!lastContactDate) return true; // Include if no date available
        
        const daysSinceContact = Math.floor((now.getTime() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
        
        switch (leadFilter) {
          case "7days":
            return daysSinceContact >= 7;
          case "14days":
            return daysSinceContact >= 14;
          case "30days":
            return daysSinceContact >= 30;
          case "100k":
            // Convert monthly earnings to 3-month average for comparison
            // $100k/month = $300k/3months
            return lead.ofEarnings3moAvg >= 300000;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  // Helper function to get last interaction time
  const getLastInteractionTime = (lead: Lead) => {
    const lastDate = lead.lastFollowUp || lead.createdAt;
    if (!lastDate) return "Never";
    try {
      return formatDistanceToNow(new Date(lastDate), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };



  if (leadsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Management"
        description="Track and convert prospective creators"
        showBackButton={true}
        backTo="/dashboard"
        actions={
          <Button 
            className="flex items-center space-x-2"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lead</span>
          </Button>
        }
      />

      <div className="px-6 pb-6 space-y-6">
        {/* Add New Lead Dialog */}
        <Dialog 
          open={isCreateModalOpen} 
          onOpenChange={(open) => {
            setIsCreateModalOpen(open);
            if (!open) {
              // Reset form and preview when closing
              createForm.reset();
              setProfileImagePreview(null);
            }
          }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base">Add New Lead</DialogTitle>
              <DialogDescription className="text-sm">
                Enter the details for the new potential creator lead.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateLead)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Instagram Handle</FormLabel>
                        <FormControl>
                          <Input placeholder="@username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={createForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1-555-555-5555" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="ofEarnings3moAvg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">OnlyFans Earnings (3mo avg)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={createForm.control}
                    name="currentAgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Currently Signed To</FormLabel>
                        <FormControl>
                          <Input placeholder="Independent, Agency Name, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="referredBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Referred By</FormLabel>
                        <FormControl>
                          <Input placeholder="Team member, creator, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="whosTalkingTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Who's Talking To</FormLabel>
                      <FormControl>
                        <Input placeholder="Team member handling this lead" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel className="text-sm">Profile Picture</FormLabel>
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                      isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    {profileImagePreview ? (
                      <div className="space-y-2">
                        <img 
                          src={profileImagePreview} 
                          alt="Profile preview" 
                          className="w-20 h-20 rounded-full mx-auto object-cover"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfileImagePreview(null);
                            createForm.setValue('profileImage', undefined);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-gray-400" />
                        <div className="text-sm text-gray-600">
                          <label htmlFor="profile-upload" className="cursor-pointer">
                            <span className="text-blue-600 hover:text-blue-700">Upload a file</span>
                            {' or drag and drop'}
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 10MB</p>
                      </div>
                    )}
                    <input
                      id="profile-upload"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                        }
                      }}
                    />
                  </div>
                </FormItem>

                <FormField
                  control={createForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about this lead..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={createLeadMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalPending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalEarnings)}</div>
              <p className="text-xs text-muted-foreground">From pending leads</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.totalSigned}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dead Leads</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.totalDead}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.leadsAddedThisWeek}</div>
              <p className="text-xs text-muted-foreground">New leads added</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lead Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pending ({filterLeadsByStatus("pending").length})
          </TabsTrigger>
          <TabsTrigger value="signed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Signed ({filterLeadsByStatus("signed").length})
          </TabsTrigger>
          <TabsTrigger value="dead" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Dead ({filterLeadsByStatus("dead").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Filter Dropdown for Pending Leads */}
          <div className="flex items-center justify-between">
            <Select value={leadFilter} onValueChange={setLeadFilter}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Filter leads" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="7days">Haven't been spoken to in 7+ days</SelectItem>
                <SelectItem value="14days">Haven't been spoken to in 14+ days</SelectItem>
                <SelectItem value="30days">Haven't been spoken to in 30+ days</SelectItem>
                <SelectItem value="100k">$100k+/month OnlyFans earnings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Pending Lead Cards Grid */}
          {filterLeadsByStatus("pending").length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No pending leads found matching your search.' : 'No pending leads found.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filterLeadsByStatus("pending").map((lead: Lead) => (
                <Card 
                  key={lead.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 bg-white"
                  onClick={() => openLeadProfile(lead)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Profile Picture */}
                      {lead.profileImageUrl ? (
                        <img
                          src={lead.profileImageUrl}
                          alt={lead.name}
                          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-7 h-7 text-white" />
                        </div>
                      )}

                      {/* Lead Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {lead.name}
                        </h3>

                        {/* OnlyFans Earnings */}
                        <div className="flex items-center gap-1 mt-2">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            {formatCurrency(lead.ofEarnings3moAvg)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">avg/3mo</span>
                        </div>

                        {/* Last Time Spoken To */}
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Last contact: {getLastInteractionTime(lead)}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-3">
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="signed" className="space-y-4">
          {/* Signed Lead Cards Grid */}
          {filterLeadsByStatus("signed").length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No signed leads found matching your search.' : 'No signed leads found.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filterLeadsByStatus("signed").map((lead: Lead) => (
                <Card 
                  key={lead.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 bg-white"
                  onClick={() => openLeadProfile(lead)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Profile Picture */}
                      {lead.profileImageUrl ? (
                        <img
                          src={lead.profileImageUrl}
                          alt={lead.name}
                          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-7 h-7 text-white" />
                        </div>
                      )}

                      {/* Lead Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {lead.name}
                        </h3>

                        {/* OnlyFans Earnings */}
                        <div className="flex items-center gap-1 mt-2">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            {formatCurrency(lead.ofEarnings3moAvg)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">avg/3mo</span>
                        </div>

                        {/* Last Time Spoken To */}
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Last contact: {getLastInteractionTime(lead)}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-3">
                          <Badge className="bg-green-600 text-xs">Signed</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dead" className="space-y-4">
          {/* Dead Lead Cards Grid */}
          {filterLeadsByStatus("dead").length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No dead leads found matching your search.' : 'No dead leads found.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filterLeadsByStatus("dead").map((lead: Lead) => (
                <Card 
                  key={lead.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 bg-white opacity-75"
                  onClick={() => openLeadProfile(lead)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Profile Picture */}
                      {lead.profileImageUrl ? (
                        <img
                          src={lead.profileImageUrl}
                          alt={lead.name}
                          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-7 h-7 text-white" />
                        </div>
                      )}

                      {/* Lead Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {lead.name}
                        </h3>

                        {/* OnlyFans Earnings */}
                        <div className="flex items-center gap-1 mt-2">
                          <DollarSign className="h-3 w-3 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">
                            {formatCurrency(lead.ofEarnings3moAvg)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">avg/3mo</span>
                        </div>

                        {/* Last Time Spoken To */}
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Last contact: {getLastInteractionTime(lead)}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-3">
                          <Badge variant="destructive" className="text-xs">Dead</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Lead Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update the lead information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateLead)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Handle</FormLabel>
                      <FormControl>
                        <Input placeholder="@username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1-555-555-5555" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="ofEarnings3moAvg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OnlyFans Earnings (3mo avg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="currentAgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currently Signed To</FormLabel>
                      <FormControl>
                        <Input placeholder="Independent, Agency Name, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="referredBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referred By</FormLabel>
                      <FormControl>
                        <Input placeholder="Team member, creator, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="signed">Signed</SelectItem>
                        <SelectItem value="dead">Dead</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about this lead..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  disabled={updateLeadMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateLeadMutation.isPending ? "Updating..." : "Update Lead"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Follow-up Modal */}
      <Dialog open={isFollowUpModalOpen} onOpenChange={setIsFollowUpModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
            <DialogDescription>
              Record a follow-up interaction with {selectedLead?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...followUpForm}>
            <form onSubmit={followUpForm.handleSubmit(handleAddFollowUp)} className="space-y-4">
              <FormField
                control={followUpForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up Notes *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What happened during this follow-up?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={followUpForm.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up Date *</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field}
                        value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={followUpForm.control}
                name="completedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completed By</FormLabel>
                    <FormControl>
                      <Input placeholder="Team member name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFollowUpModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addFollowUpMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {addFollowUpMutation.isPending ? "Adding..." : "Add Follow-up"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Lead Profile Modal */}
      <Dialog open={isLeadProfileModalOpen} onOpenChange={setIsLeadProfileModalOpen}>
        <DialogContent 
          className="sm:max-w-[420px] w-[90vw] sm:w-full max-h-[42vh] overflow-y-auto"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 10px 50px rgba(0, 0, 0, 0.3)",
            zIndex: 9999
          }}>
          <DialogHeader>
            <DialogTitle>{selectedLead?.name}</DialogTitle>
            <DialogDescription>Lead Profile Details</DialogDescription>
          </DialogHeader>
          {selectedLead ? (
            <div className="space-y-6">
              {/* Lead Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name:</Label>
                    <p>{selectedLead.name}</p>
                  </div>
                  <div>
                    <Label>Contact Details:</Label>
                    <p>{selectedLead.phone || "N/A"}</p>
                    <p>{selectedLead.instagram || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Current Agency:</Label>
                    <p>{selectedLead.currentAgency || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Referred By:</Label>
                    <p>{selectedLead.referredBy || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Earnings (3mo avg):</Label>
                    <p>{formatCurrency(selectedLead.ofEarnings3moAvg)}</p>
                  </div>
                  <div>
                    <Label>Who's Talking To:</Label>
                    <p>{selectedLead.whosTalkingTo || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Notes:</Label>
                    <p>{selectedLead.notes || "No notes available."}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Last Time Spoken To Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Last Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <p className="text-lg font-medium">
                      {getLastInteractionTime(selectedLead)} ago
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Conversation Timeline Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversation Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Placeholder for actual follow-up data. In a real app, this would come from an API. */}
                  <div className="space-y-4">
                    {/* Example Timeline Entry */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Jan 15, 2024</p>
                        <p className="text-sm text-muted-foreground">Initial outreach</p>
                      </div>
                      <Badge variant="secondary">Interested</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Jan 18, 2024</p>
                        <p className="text-sm text-muted-foreground">Followed up on proposal</p>
                      </div>
                      <Badge variant="outline">Needs Follow-up</Badge>
                    </div>
                    <Separator />
                    {/* Add more timeline entries as needed */}
                  </div>
                </CardContent>
              </Card>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    openEditModal(selectedLead);
                    setIsLeadProfileModalOpen(false);
                  }}
                >
                  Edit
                </Button>
                <Button 
                  variant="outline"
                  className="text-red-600 border-red-400 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    if (selectedLead) {
                      deleteLeadMutation.mutate(selectedLead.id);
                      setIsLeadProfileModalOpen(false);
                    }
                  }}
                >
                  Delete
                </Button>
                <Button
                  onClick={() => openFollowUpModal(selectedLead)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add Follow-up
                </Button>
                <Button
                  onClick={() => handleStatusChange(selectedLead, "signed")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Signed
                </Button>
                <Button
                  onClick={() => handleStatusChange(selectedLead, "dead")}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Dead
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <p>Loading lead details...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}