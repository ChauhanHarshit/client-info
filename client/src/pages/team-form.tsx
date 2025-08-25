import { useState, useEffect, useTransition } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, Loader2, Plus, X, Clock, RefreshCw, DollarSign, Calendar, User, MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

const teamFormSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be less than 2000 characters"),
  requestedPrice: z.string().min(1, "Requested price is required"),
  telegramHandle: z.string().min(1, "Telegram handle is required").max(500, "Telegram handle must be less than 500 characters"),
  fanOnlyfansUrl: z.string().min(1, "OnlyFans URL is required"),
  fanOnlyfansUsername: z.string().min(1, "OnlyFans username is required").max(100, "OnlyFans username must be less than 100 characters"),
  extraInstructions: z.string().optional()
});

type TeamFormData = z.infer<typeof teamFormSchema>;

interface TeamInfo {
  creatorName: string;
  creatorUsername: string;
  isActive: boolean;
}

interface CustomContent {
  id: number;
  customId: string; // DAN CUSTOM format
  description: string;
  status: string;
  requestedPrice: string;
  createdAt: string; // Date Submitted
  updatedAt: string;
  telegramHandle?: string;
  rejectionReason?: string;
  creatorResponse?: string;
  creatorResponseDate?: string;
  fanOnlyfansUrl?: string;
  fanOnlyfansUsername?: string;
  extraInstructions?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  customNumber?: number; // Per-creator custom number for approved items
}

export default function TeamForm() {
  console.log('TeamForm component - Starting render');
  
  const [match, params] = useRoute("/team-form/:token");
    const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPending, startTransition] = useTransition();
    const queryClient = useQueryClient();

    // Alternative token extraction for production troubleshooting
    const token = params?.token || (window.location.pathname.includes('/team-form/') ? window.location.pathname.split('/team-form/')[1] : null);
    
    console.log('TeamForm component - Token extracted:', token);

  // Enhanced debug logging for production troubleshooting
  console.log("TeamForm component mounted", { 
    match, 
    token, 
    params, 
    location: window.location.href,
    pathname: window.location.pathname,
    pathnameParts: window.location.pathname.split('/'),
    extractedToken: window.location.pathname.split('/team-form/')[1]
  });

  // Show debug info on screen for production troubleshooting
  if (window.location.hostname === 'tastyyyy.com') {
    console.log("PRODUCTION DEBUG - Component state:", { 
      hasMatch: !!match, 
      hasToken: !!token, 
      paramsKeys: params ? Object.keys(params) : 'no params',
      tokenValue: token,
      routePattern: "/team-form/:token",
      actualPath: window.location.pathname
    });
  }
  
  // Early return if no token to prevent blank page
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Team Link</CardTitle>
            <CardDescription>
              No token provided in the URL.
              {window.location.hostname === 'tastyyyy.com' && (
                <div className="mt-4 text-xs text-gray-600">
                  Debug: match={match?.toString()}, params={JSON.stringify(params)}, pathname={window.location.pathname}
                </div>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Fetch team form info
  const { data: teamInfo, isLoading: teamInfoLoading, error: teamInfoError } = useQuery<TeamInfo>({
    queryKey: [`/api/team-form/${token}`],
    queryFn: async () => {
      try {
        console.log("Fetching team info for token:", token);
        const response = await fetch(`/api/team-form/${token}`, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        console.log("Team info response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Team info fetch error:", errorText);
          throw new Error('Team link not found');
        }
        
        const data = await response.json();
        console.log("Team info data:", data);
        return data;
      } catch (error) {
        console.error("Team info fetch exception:", error);
        throw error;
      }
    },
    enabled: !!token,
    retry: 2,
    retryDelay: 1000,
  });

  // Add a helpful message to the page title for easier identification
  useEffect(() => {
    if (token && teamInfo) {
      document.title = `${teamInfo.creatorName} Team Portal - Tasty CRM`;
    }
  }, [token, teamInfo]);

  // Clear old cache and force fresh query execution
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: [`/api/team-form/${token}/contents`] });
    queryClient.removeQueries({ queryKey: [`/api/team-form/${token}/contents`] });
  }, [token, queryClient]);

  // Fetch creator's custom content status with real-time updates
  const { data: customContents = [], isLoading: contentsLoading, error: contentsError, refetch } = useQuery<CustomContent[]>({
    queryKey: [`/api/team-form/${token}/contents-status-fix`], // Completely new query key
    queryFn: async () => {
      console.log("🔥 NEW STATUS MAPPING QUERY EXECUTING");
      const response = await fetch(`/api/team-form/${token}/contents`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contents');
      }
      
      const rawData = await response.json();
      console.log("📋 Raw API response:", rawData);
      
      // Map snake_case API response to camelCase for component
      const mappedData = rawData.map((item: any, index: number) => {
        console.log(`🔍 RAW ITEM ${index}:`, JSON.stringify(item, null, 2));
        console.log(`🔍 custom_number field:`, item.custom_number, typeof item.custom_number);
        
        const mapped = {
          id: item.id,
          customId: item.customid || item.customId,
          description: item.description,
          status: item.status, // Critical field for badge rendering
          requestedPrice: item.requestedprice || item.requestedPrice,
          createdAt: item.createdat || item.createdAt,
          updatedAt: item.updatedat || item.updatedAt,
          telegramHandle: item.telegramhandle || item.telegramHandle,
          rejectionReason: item.rejectionreason || item.rejectionReason,
          creatorResponse: item.creatorresponse || item.creatorResponse,
          creatorResponseDate: item.creatorresponsedate || item.creatorResponseDate,
          fanOnlyfansUrl: item.fanonlyfansurl || item.fanOnlyfansUrl,
          fanOnlyfansUsername: item.fanonlyfansusername || item.fanOnlyfansUsername,
          extraInstructions: item.extrainstructions || item.extraInstructions,
          reviewedBy: item.reviewedby || item.reviewedBy,
          reviewedAt: item.reviewedat || item.reviewedAt,
          customNumber: item.custom_number || item.customNumber || item.customnumber // Per-creator custom number
        };
        console.log(`✅ Mapped order ${index}: ${mapped.customId} → status: "${mapped.status}" → custom_number: ${mapped.customNumber}`);
        return mapped;
      });
      
      return mappedData;
    },
    enabled: !!token && !!teamInfo,
    refetchInterval: 3000 // Refresh every 3 seconds for real-time updates
  });

  // Fetch team link banner
  const { data: bannerData } = useQuery({
    queryKey: [`/api/team-form/${token}/banner`],
    queryFn: async () => {
      const response = await fetch(`/api/team-form/${token}/banner`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No banner set
        }
        throw new Error('Failed to fetch banner');
      }
      
      return response.json();
    },
    enabled: !!token && !!teamInfo,
  });

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      description: "",
      requestedPrice: "",
      telegramHandle: "",
      fanOnlyfansUrl: "",
      fanOnlyfansUsername: "",
      extraInstructions: ""
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      const response = await fetch(`/api/team-form/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit order');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: [`/api/team-form/${token}/contents`] });
    },
    onError: (error) => {
      setIsSubmitting(false);
      setSubmitSuccess(false);
      // Show error feedback
      console.error('Submit error:', error);
    }
  });

  const onSubmit = (data: TeamFormData) => {
    // Provide instant UI feedback
    setIsSubmitting(true);
    setIsNewOrderDialogOpen(false); // Close dialog immediately
    
    // Show instant success message
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3000);
    
    // Start transition for smooth UI updates
    startTransition(() => {
      // Submit in background
      submitMutation.mutate(data);
    });
    
    // Reset form immediately
    form.reset();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_review':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'in_production':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300"><RefreshCw className="h-3 w-3 mr-1" />In Production</Badge>;
      case 'completed':
      case 'complete':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'declined':
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Declined</Badge>;
      case 'more_info_requested':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300"><AlertCircle className="h-3 w-3 mr-1" />More Info Needed</Badge>;
      case 'owed':
        return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-300"><DollarSign className="h-3 w-3 mr-1" />Payment Due</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusDescription = (content: CustomContent) => {
    switch (content.status) {
      case 'pending':
      case 'pending_review':
        return "Your order is waiting for review by the creator's team.";
      case 'approved':
        return "Your order has been approved and is being prepared for production.";
      case 'in_production':
        return "Your custom content is currently being created.";
      case 'completed':
      case 'complete':
        return "Your custom content has been completed and delivered.";
      case 'declined':
      case 'rejected':
        return content.rejectionReason ? `Order declined: ${content.rejectionReason}` : "Your order was declined by the creator's team.";
      case 'more_info_requested':
        return content.creatorResponse ? `More information needed: ${content.creatorResponse}` : "The creator's team needs more information about your request.";
      case 'owed':
        return "Your order is completed and payment is due.";
      default:
        return "Status unknown";
    }
  };

  // Loading states
  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Route Not Matched</CardTitle>
            <CardDescription>
              The team link you're trying to access is not valid.
              {window.location.hostname === 'tastyyyy.com' && (
                <div className="mt-4 text-xs text-gray-600 break-words">
                  URL: {window.location.pathname}<br/>
                  Token: {token || 'none'}<br/>
                  Route Pattern: /team-form/:token
                </div>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (teamInfoLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (teamInfoError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Team Link Not Found</CardTitle>
            <CardDescription>
              This team link is either expired, disabled, or invalid. Please contact the creator for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const typedTeamInfo = teamInfo as TeamInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">{typedTeamInfo.creatorName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{typedTeamInfo.creatorName} Team Portal</h1>
                <p className="text-sm text-gray-500">Custom content management for @{typedTeamInfo.creatorUsername}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Custom
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Submit New Custom Content Order</DialogTitle>
                    <DialogDescription>
                      Fill out all required information for your custom content order. Our team will review and respond within 24-48 hours.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Platform fixed to OnlyFans only */}
                      <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm font-medium text-blue-800">Platform: OnlyFans</span>
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content Description *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the content you need in detail. Include style, themes, any specific requirements..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="requestedPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Requested Price *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., $50, $100-150"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="telegramHandle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telegram @ *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="@your_username"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fanOnlyfansUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>OnlyFans URL *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://onlyfans.com/username"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fanOnlyfansUsername"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>OnlyFans Username *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="your_username"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="extraInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Instructions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any special requirements, deadline details, or additional context..."
                                className="min-h-[80px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsNewOrderDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting || isPending}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
                        >
                          {(isSubmitting || isPending) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Submit Order
                            </>
                          )}
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

      {/* Success Message */}
      {submitSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <p className="text-green-800 font-medium">Order submitted successfully!</p>
              <p className="text-green-600 text-sm">Your custom content order has been sent to {typedTeamInfo.creatorName}'s team for review.</p>
            </div>
          </div>
        </div>
      )}

      {/* Banner Section */}
      {bannerData && (
        <div className="w-full">
          <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
            <img
              src={bannerData.bannerImageUrl}
              alt={bannerData.bannerAltText || `${typedTeamInfo.creatorName} team banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-6">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-white text-2xl sm:text-3xl font-bold">
                  Welcome to {typedTeamInfo.creatorName}'s Team Portal
                </h2>
                <p className="text-white/90 text-lg mt-2">
                  Submit your custom content requests and track their progress
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Current Orders</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Track all your custom content orders for {typedTeamInfo.creatorName}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {customContents.length} total orders
              </div>
            </div>
          </div>

          {contentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : customContents.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-500 mb-6">Get started by submitting your first custom content order.</p>
              <Button
                onClick={() => setIsNewOrderDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Custom
              </Button>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {customContents.map((content) => {
                console.log(`🔍 DISPLAY DEBUG - Content ID ${content.id}: status="${content.status}" customNumber=${content.customNumber} shouldShowNumber=${(content.status === 'approved' || content.status === 'complete' || content.status === 'owed') && content.customNumber}`);
                return (
                <div key={content.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {(content.status === 'approved' || content.status === 'complete' || content.status === 'owed') && content.customNumber ? 
                          `Custom Order #${content.customNumber}` : 
                          'Custom Order'
                        }
                      </h3>
                      <p className="text-sm text-gray-500">
                        Submitted {formatDistanceToNow(new Date(content.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {(() => {
                        console.log(`Status badge for ${content.customId}: status="${content.status}"`);
                        return getStatusBadge(content.status);
                      })()}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description:</h4>
                      <p className="text-gray-700">{content.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Requested Price:</h4>
                        <p className="text-gray-700">${content.requestedPrice}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Contact:</h4>
                        <p className="text-gray-700">{content.telegramHandle}</p>
                      </div>
                    </div>

                    {getStatusDescription(content) && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">{getStatusDescription(content)}</p>
                      </div>
                    )}

                    {(content.creatorResponse || content.rejectionReason) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <h4 className="font-medium text-yellow-800 mb-1">Response:</h4>
                        <p className="text-sm text-yellow-700">
                          {content.creatorResponse || content.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}