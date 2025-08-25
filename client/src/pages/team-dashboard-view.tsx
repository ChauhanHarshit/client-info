import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  DollarSign,
  User,
  Plus,
  RefreshCw
} from "lucide-react";
// Status color mapping - exact same as customs dashboard
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending_review': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'auto_disapproved': return 'bg-orange-100 text-orange-800';
    case 'owed': return 'bg-blue-100 text-blue-800';
    case 'complete': return 'bg-emerald-100 text-emerald-800';
    case 'sold': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Status display mapping
const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'pending_review': return 'Pending Review';
    case 'approved': return 'Approved';
    case 'rejected': return 'Declined';
    case 'auto_disapproved': return 'Auto Declined';
    case 'owed': return 'Owed';
    case 'complete': return 'Completed';
    case 'sold': return 'Sold';
    default: return status;
  }
};

// Priority color mapping - exact same as customs dashboard
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'normal': return 'bg-blue-100 text-blue-800';
    case 'low': return 'bg-gray-100 text-gray-800';
    default: return 'bg-blue-100 text-blue-800';
  }
};

export default function TeamDashboardView() {
  // Extract token from URL path
  const token = window.location.pathname.split('/team-form/')[1];
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [creatorInfo, setCreatorInfo] = useState<any>(null);

  // Fetch creator info
  const { data: creatorData } = useQuery({
    queryKey: [`/api/team-form/${token}`],
    enabled: !!token,
    queryFn: async () => {
      console.log('🔍 Fetching creator info for token:', token);
      const response = await fetch(`/api/team-form/${token}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('❌ Failed to fetch creator info:', response.status, response.statusText);
        throw new Error('Failed to fetch creator info');
      }
      
      const data = await response.json();
      console.log('✅ Successfully fetched creator info:', data);
      return data;
    }
  });

  // Fetch custom contents for this creator
  const { data: rawCustomContents = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/team-form/${token}/contents`],
    enabled: !!token,
    queryFn: async () => {
      console.log('🚀 Fetching custom contents for token:', token);
      const response = await fetch(`/api/team-form/${token}/contents`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('❌ Failed to fetch contents:', response.status, response.statusText);
        throw new Error('Failed to fetch contents');
      }
      
      const data = await response.json();
      console.log('✅ Successfully fetched contents:', data.length, 'items');
      console.log('📋 Raw data sample:', data.slice(0, 2));
      return data;
    }
  });

  // Transform snake_case API response to camelCase for component
  const customContents = Array.isArray(rawCustomContents) ? rawCustomContents.map((item: any) => ({
    id: item.id,
    customId: item.customid || item.customId || item.custom_id,
    description: item.description,
    status: item.status,
    requestedPrice: item.requestedprice || item.requestedPrice || item.requested_price,
    platform: item.platform,
    createdAt: item.createdat || item.createdAt || item.created_at,
    updatedAt: item.updatedat || item.updatedAt || item.updated_at,
    telegramHandle: item.telegramhandle || item.telegramHandle || item.contact_info,
    rejectionReason: item.rejectionreason || item.rejectionReason || item.rejection_reason,
    creatorResponse: item.creatorresponse || item.creatorResponse || item.creator_response,
    creatorResponseDate: item.creatorresponsedate || item.creatorResponseDate || item.creator_response_date,
    fanOnlyfansUrl: item.fanonlyfansurl || item.fanOnlyfansUrl || item.fan_onlyfans_url,
    fanOnlyfansUsername: item.fanonlyfansusername || item.fanOnlyfansUsername || item.fan_onlyfans_username,
    extraInstructions: item.extrainstructions || item.extraInstructions || item.extra_instructions,
    reviewedBy: item.reviewedby || item.reviewedBy || item.reviewed_by,
    reviewedAt: item.reviewedat || item.reviewedAt || item.reviewed_at,
    priority: item.priority || 'normal',
    customNumber: item.custom_number || item.customNumber || item.customnumber // Per-creator custom number
  })) : [];

  useEffect(() => {
    if (creatorData) {
      console.log('✅ Creator data loaded:', creatorData);
      setCreatorInfo(creatorData);
    }
  }, [creatorData]);

  // Filter contents based on search - exact same logic as customs dashboard
  const filteredContents = Array.isArray(customContents) ? customContents.filter((content: any) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      // Basic content fields
      content.description?.toLowerCase().includes(searchLower) ||
      content.fan_username?.toLowerCase().includes(searchLower) ||
      content.fanUsername?.toLowerCase().includes(searchLower) ||
      content.category?.toLowerCase().includes(searchLower) ||
      content.platform?.toLowerCase().includes(searchLower) ||
      content.status?.toLowerCase().includes(searchLower) ||
      content.custom_id?.toLowerCase().includes(searchLower) ||
      content.customid?.toLowerCase().includes(searchLower) ||
      content.customId?.toLowerCase().includes(searchLower) ||
      content.requested_price?.toString().includes(searchLower) ||
      content.requestedprice?.toString().includes(searchLower) ||
      content.price?.toString().includes(searchLower) ||
      content.telegram_handle?.toLowerCase().includes(searchLower) ||
      content.telegramhandle?.toLowerCase().includes(searchLower) ||
      content.creator_name?.toLowerCase().includes(searchLower) ||
      content.creator_username?.toLowerCase().includes(searchLower) ||
      content.priority?.toLowerCase().includes(searchLower)
    );
  }) : [];

  // Group contents by status - exact same logic as customs dashboard
  const pendingContents = filteredContents.filter((c: any) => 
    c.status === 'pending' || c.status === 'pending_review' || c.status === 'auto_disapproved'
  );
  const approvedContents = filteredContents.filter((c: any) => c.status === 'approved');
  const owedContents = filteredContents.filter((c: any) => c.status === 'owed' || c.status === 'sold');
  const completedContents = filteredContents.filter((c: any) => c.status === 'complete');
  const rejectedContents = filteredContents.filter((c: any) => 
    c.status === 'rejected' || c.status === 'declined'
  );

  // Update creator info when query data is available
  useEffect(() => {
    if (creatorData) {
      console.log('📝 Setting creator info from query data:', creatorData);
      setCreatorInfo(creatorData);
    }
  }, [creatorData]);

  useEffect(() => {
    console.log('📊 Raw custom contents from API:', rawCustomContents);
    console.log('🔄 Transformed custom contents:', customContents);
    if (customContents.length > 0) {
      console.log('📈 Pending contents:', pendingContents.length);
      console.log('📈 Approved contents:', approvedContents.length);
      console.log('📈 Total filtered contents:', filteredContents.length);
      console.log('🔍 First few custom contents:', customContents.slice(0, 3));
    }
  }, [rawCustomContents, customContents.length]);

  // Calculate stats - exact same logic as customs dashboard
  const stats = {
    totalPending: pendingContents.length,
    totalApproved: approvedContents.length,
    totalOwed: owedContents.length,
    totalCompleted: completedContents.length,
    totalRejected: rejectedContents.length,
    totalRevenue: completedContents.reduce((sum: number, content: any) => {
      const price = parseFloat(content.requestedprice || content.requested_price || content.price || '0');
      return sum + price;
    }, 0)
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-500">Loading your customs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {creatorInfo?.creatorName?.charAt(0)?.toUpperCase() || 'T'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {creatorInfo?.creatorName || creatorInfo?.creatorUsername || 'Creator'} Team Portal
              </h1>
              <p className="text-gray-600">
                Custom content management for @{creatorInfo?.creatorUsername || 'creator'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={handleRefresh} variant="outline" className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stats Overview - exact same as customs dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPending}</div>
              <p className="text-xs text-muted-foreground">Awaiting team review</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved for Sale</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApproved}</div>
              <p className="text-xs text-muted-foreground">Ready to sell</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Owed Content</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOwed}</div>
              <p className="text-xs text-muted-foreground">Sold but not delivered</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue (Total)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From completed customs</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search customs by description, price, contact, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content Tabs - exact same structure as customs dashboard */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({stats.totalPending})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved ({stats.totalApproved})
            </TabsTrigger>
            <TabsTrigger value="owed" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Owed ({stats.totalOwed})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({stats.totalCompleted})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Declined ({stats.totalRejected})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingContents.map((content: any) => (
              <TeamCustomContentCard
                key={content.id}
                content={content}
                onView={() => setSelectedContent(content)}
              />
            ))}
            {pendingContents.length === 0 && (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending customs</h3>
                <p className="text-gray-500">All customs have been reviewed.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedContents.map((content: any) => (
              <TeamCustomContentCard
                key={content.id}
                content={content}
                onView={() => setSelectedContent(content)}
              />
            ))}
            {approvedContents.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No approved customs</h3>
                <p className="text-gray-500">No customs are currently approved for sale.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="owed" className="space-y-4">
            {owedContents.map((content: any) => (
              <TeamCustomContentCard
                key={content.id}
                content={content}
                onView={() => setSelectedContent(content)}
              />
            ))}
            {owedContents.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No owed content</h3>
                <p className="text-gray-500">All sold content has been delivered.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedContents.map((content: any) => (
              <TeamCustomContentCard
                key={content.id}
                content={content}
                onView={() => setSelectedContent(content)}
              />
            ))}
            {completedContents.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No completed customs</h3>
                <p className="text-gray-500">No customs have been completed yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedContents.map((content: any) => (
              <TeamCustomContentCard
                key={content.id}
                content={content}
                onView={() => setSelectedContent(content)}
              />
            ))}
            {rejectedContents.length === 0 && (
              <div className="text-center py-12">
                <XCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No declined customs</h3>
                <p className="text-gray-500">No customs have been declined.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Content Detail Modal */}
        <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Custom Content Details</DialogTitle>
              <DialogDescription>
                View details for this custom content request.
              </DialogDescription>
            </DialogHeader>
            {selectedContent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Custom ID</label>
                    <p className="text-gray-900">
                      {selectedContent.customid || selectedContent.custom_id || 'N/A'}
                      {selectedContent.custom_number && (
                        <span className="ml-2 font-bold text-blue-900">#{selectedContent.custom_number}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Badge className={getStatusColor(selectedContent.status)}>
                      {getStatusDisplay(selectedContent.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-gray-900">{selectedContent.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Requested Price</label>
                    <p className="text-gray-900">
                      ${parseFloat(selectedContent.requestedprice || selectedContent.requested_price || selectedContent.price || '0').toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Contact</label>
                    <p className="text-gray-900">{selectedContent.telegramhandle || selectedContent.telegram_handle || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Submitted Date</label>
                  <p className="text-gray-900">
                    {new Date(selectedContent.createdat || selectedContent.created_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedContent.rejectionreason && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Rejection Reason</label>
                    <p className="text-gray-900">{selectedContent.rejectionreason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Custom Content Card Component - simplified without action buttons
function TeamCustomContentCard({ 
  content, 
  onView
}: {
  content: any;
  onView?: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              {/* Custom ID Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {(content.status === 'approved' || content.status === 'complete' || content.status === 'owed') && content.customNumber && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 border border-blue-300 rounded-md text-blue-800 font-bold text-sm">
                      #{content.customNumber}
                    </span>
                  )}
                  <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      {content.customid || content.custom_id || `Custom Order`}
                    </span>
                  </div>
                </div>
                <Badge className={getStatusColor(content.status)}>
                  {getStatusDisplay(content.status)}
                </Badge>
              </div>

              {/* Content Description */}
              <div className="space-y-2 mb-4">
                <p className="text-gray-900 font-medium">Description:</p>
                <p className="text-gray-700 leading-relaxed">{content.description}</p>
              </div>

              {/* Content Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Requested Price:</span>
                  <p className="text-gray-900">
                    ${parseFloat(content.requestedPrice || content.requestedprice || content.requested_price || content.price || '0').toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Contact:</span>
                  <p className="text-gray-900">{content.telegramHandle || content.telegramhandle || content.telegram_handle || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Submitted:</span>
                  <p className="text-gray-900">
                    {new Date(content.createdAt || content.createdat || content.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Platform and Category */}
              {(content.platform || content.category) && (
                <div className="flex items-center space-x-4 mt-3 text-sm">
                  {content.platform && (
                    <div className="flex items-center space-x-1">
                      <span className="font-medium text-gray-700">Platform:</span>
                      <Badge variant="outline">{content.platform}</Badge>
                    </div>
                  )}
                  {content.category && (
                    <div className="flex items-center space-x-1">
                      <span className="font-medium text-gray-700">Category:</span>
                      <Badge variant="outline">{content.category}</Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Reason */}
              {content.rejectionreason && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{content.rejectionreason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Section - Only View button */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="flex items-center space-x-1"
            >
              <Eye className="w-4 h-4" />
              <span>View Details</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}