import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Users, CheckCircle2, Clock, AlertCircle, Bell, ChevronRight, Edit, Play, CheckCircle, FileText, X, Trash2, Calendar, Search, TrendingUp, Layers } from 'lucide-react';
import type { OnboardingFlow, ClientOnboarding, OnboardingTask, User } from '@shared/schema';
import { useCrmAuth } from '@/contexts/CrmAuthContext';

interface FlowItem {
  title: string;
  assignmentType: 'team' | 'user';
  assignedTo: string;
  description: string;
}

// Extended type for API response
interface OnboardingFlowWithDetails extends OnboardingFlow {
  step_count: string;
  created_by_first_name: string;
  created_by_last_name: string;
}

interface OnboardingTaskWithDetails extends OnboardingTask {
  priority: string;
  client_name: string;
  step_name: string;
  assigned_by_first_name: string;
  assigned_by_last_name: string;
}

export default function ClientOnboardingPage() {
  const { toast } = useToast();
  const { isAuthenticated, employee } = useCrmAuth();
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [showNewFlowDialog, setShowNewFlowDialog] = useState(false);
  const [showStartOnboardingDialog, setShowStartOnboardingDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedOnboardingId, setSelectedOnboardingId] = useState<number | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<OnboardingFlowWithDetails | null>(null);
  const [selectedOnboarding, setSelectedOnboarding] = useState<any>(null);
  const [showOnboardingDetailDialog, setShowOnboardingDetailDialog] = useState(false);
  const [flowItems, setFlowItems] = useState<FlowItem[]>([{
    title: '',
    assignmentType: 'team',
    assignedTo: '',
    description: ''
  }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientData, setSelectedClientData] = useState<any>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  
  // Force refresh data on mount when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/flows'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/tasks'] });
    }
  }, [isAuthenticated]);

  // Fetch onboarding flows
  const { data: flows = [], isLoading: flowsLoading, error: flowsError, refetch: refetchFlows } = useQuery<OnboardingFlowWithDetails[]>({
    queryKey: ['/api/onboarding/flows'],
    queryFn: async () => {
      if (!isAuthenticated) throw new Error('Not authenticated');
      
      const response = await fetch('/api/onboarding/flows', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });
  
  // Debug logging
  console.log('Auth state:', { isAuthenticated, employee: employee?.email });
  console.log('Flows data:', flows);
  console.log('Flows loading:', flowsLoading);
  console.log('Flows error:', flowsError);
  
  // If there's an error, log more details
  if (flowsError) {
    console.error('Flows query error details:', {
      message: (flowsError as any)?.message,
      status: (flowsError as any)?.status,
      stack: (flowsError as any)?.stack,
    });
  }

  // Fetch active onboardings
  const { data: activeOnboardings = [], isLoading: onboardingsLoading, refetch: refetchOnboardings } = useQuery<any[]>({
    queryKey: ['/api/onboarding/active'],
    queryFn: async () => {
      if (!isAuthenticated) throw new Error('Not authenticated');
      
      const response = await fetch('/api/onboarding/active', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  // Fetch onboarding statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/onboarding/stats'],
    queryFn: async () => {
      if (!isAuthenticated) throw new Error('Not authenticated');
      
      const response = await fetch('/api/onboarding/stats', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch upcoming onboardings for calendar
  const { data: upcomingOnboardings = [] } = useQuery<any[]>({
    queryKey: ['/api/onboarding/upcoming'],
    queryFn: async () => {
      if (!isAuthenticated) throw new Error('Not authenticated');
      
      const response = await fetch('/api/onboarding/upcoming', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      return response.json();
    },
    enabled: isAuthenticated && showCalendar,
  });

  // Filter onboardings based on search query
  const filteredOnboardings = useMemo(() => {
    if (!searchQuery) return activeOnboardings;
    return activeOnboardings.filter(onboarding => 
      onboarding.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeOnboardings, searchQuery]);

  // Fetch assigned tasks
  const { data: assignedTasks = [], isLoading: tasksLoading } = useQuery<OnboardingTaskWithDetails[]>({
    queryKey: ['/api/onboarding/tasks'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding/tasks', { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch task count for badge
  const { data: taskCount } = useQuery<{ count: number }>({
    queryKey: ['/api/onboarding/tasks/count'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding/tasks/count', { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch onboarding steps for selected onboarding
  const { data: onboardingSteps = [], isLoading: stepsLoading } = useQuery<any[]>({
    queryKey: selectedOnboarding ? [`/api/onboarding/active/${selectedOnboarding.id}/steps`] : [],
    queryFn: async () => {
      if (!selectedOnboarding) return [];
      const response = await fetch(`/api/onboarding/active/${selectedOnboarding.id}/steps`, { 
        credentials: 'include' 
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: isAuthenticated && !!selectedOnboarding,
  });

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/creators'],
    queryFn: async () => {
      const response = await fetch('/api/creators', { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });
  
  // Admin Panel queries
  const { data: activeOnboardingTimes = [] } = useQuery<any[]>({
    queryKey: ['/api/onboarding/admin/active-times'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding/admin/active-times', { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: isAuthenticated && employee?.accessLevel === 'admin',
  });
  
  const { data: completedOnboardings = [] } = useQuery<any[]>({
    queryKey: ['/api/onboarding/admin/completed'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding/admin/completed', { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: isAuthenticated && employee?.accessLevel === 'admin',
  });

  // Create flow mutation
  const createFlowMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating flow with data:', data);
      try {
        const response = await fetch('/api/onboarding/flows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('Flow creation failed:', response.status, errorData);
          throw new Error(`HTTP ${response.status}: ${errorData}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Network error creating flow:', error);
        throw error;
      }
    },
    onSuccess: (response) => {
      console.log('Flow created successfully:', response);
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/flows'] });
      resetFlowDialog();
      toast({ title: 'Success', description: 'Onboarding flow created successfully' });
    },
    onError: (error: any) => {
      console.error('Failed to create flow:', error);
      const errorMessage = error?.message || 'Failed to create onboarding flow';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  // Start onboarding mutation
  const startOnboardingMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/onboarding/active', data),
    onSuccess: async () => {
      // Force refetch of active onboardings
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/active'] });
      await refetchOnboardings();
      setShowStartOnboardingDialog(false);
      setSelectedFlowId('');
      setSelectedClientId('');
      setSelectedClientData(null);
      toast({ title: 'Success', description: 'Client onboarding started successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to start client onboarding', variant: 'destructive' });
    },
  });

  // Update step status mutation
  const updateStepMutation = useMutation({
    mutationFn: ({ onboardingId, stepId, data }: any) => 
      apiRequest('PUT', `/api/onboarding/active/${onboardingId}/steps/${stepId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/active'] });
      toast({ title: 'Success', description: 'Step status updated' });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/onboarding/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/tasks/count'] });
      setShowTaskDialog(false);
      toast({ title: 'Success', description: 'Task created successfully' });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: any) => 
      apiRequest('PUT', `/api/onboarding/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/tasks/count'] });
      toast({ title: 'Success', description: 'Task updated' });
    },
  });

  // Delete flow mutation
  const deleteFlowMutation = useMutation({
    mutationFn: async (flowId: number) => {
      const response = await fetch(`/api/onboarding/flows/${flowId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/flows'] });
      toast({ title: 'Success', description: 'Onboarding flow deleted successfully' });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Failed to delete onboarding flow';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  // Helper functions for flow items
  const addFlowItem = () => {
    setFlowItems([...flowItems, {
      title: '',
      assignmentType: 'team',
      assignedTo: '',
      description: ''
    }]);
  };

  const removeFlowItem = (index: number) => {
    setFlowItems(flowItems.filter((_, i) => i !== index));
  };

  const updateFlowItem = (index: number, field: keyof FlowItem, value: string) => {
    const updated = [...flowItems];
    updated[index] = { ...updated[index], [field]: value };
    setFlowItems(updated);
  };

  const resetFlowDialog = () => {
    setFlowItems([{
      title: '',
      assignmentType: 'team',
      assignedTo: '',
      description: ''
    }]);
    setShowNewFlowDialog(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Onboarding"
        description="Manage client onboarding flows and track progress"
      />

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Onboardings</TabsTrigger>
          <TabsTrigger value="flows">Onboarding Flows</TabsTrigger>
          <TabsTrigger value="tasks" className="relative">
            My Tasks
            {taskCount && taskCount.count > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {taskCount.count}
              </Badge>
            )}
          </TabsTrigger>
          {employee?.accessLevel === 'admin' && (
            <TabsTrigger value="admin-panel">Admin Panel</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Client Pipeline Total
                </CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.pipelineTotal || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total flows created
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Upcoming Launches
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.upcomingLaunches || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Next 7 days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Uncompleted Onboardings
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.uncompletedOnboardings || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  In progress
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar and Actions */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {showCalendar ? 'Hide Calendar' : 'View Calendar'}
            </Button>
            <Dialog open={showStartOnboardingDialog} onOpenChange={setShowStartOnboardingDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Onboarding
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Start Client Onboarding</DialogTitle>
                  <DialogDescription>
                    Select an onboarding flow and enter client details
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    startOnboardingMutation.mutate({
                      clientName: selectedClientData?.display_name || formData.get('clientName'),
                      clientId: selectedClientId,
                      launchDate: formData.get('launchDate'),
                      previousMonthEarnings: formData.get('previousMonthEarnings'),
                      lastThreeMonthsAverage: formData.get('lastThreeMonthsAverage'),
                      guaranteedEarnings: formData.get('guaranteedEarnings'),
                      revenueShare: formData.get('revenueShare'),
                      referralSource: formData.get('referralSource'),
                      flowId: selectedFlowId,
                      notes: formData.get('notes'),
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="flow">Onboarding Flow</Label>
                    <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a flow" />
                      </SelectTrigger>
                      <SelectContent>
                        {flows.length > 0 ? (
                          flows.map((flow) => (
                            <SelectItem key={flow.id} value={flow.id.toString()}>
                              {flow.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-flows">No flows available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="clientName">Client Name</Label>
                    <Select 
                      value={selectedClientId} 
                      onValueChange={(value) => {
                        setSelectedClientId(value);
                        const client = clients.find(c => c.id === value);
                        setSelectedClientData(client);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client from /clients" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.length > 0 ? (
                          clients.map((client) => 
                            client.id ? (
                              <SelectItem key={client.id} value={client.id}>
                                {client.display_name || client.username}
                              </SelectItem>
                            ) : null
                          )
                        ) : (
                          <SelectItem value="no-clients">No clients available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Profile Picture Preview */}
                  {selectedClientData?.profile_photo && (
                    <div className="flex items-center gap-2">
                      <Label>Profile Picture</Label>
                      <img 
                        src={selectedClientData.profile_photo} 
                        alt={selectedClientData.display_name || 'Profile'} 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="launchDate">Launch Date</Label>
                    <Input name="launchDate" type="date" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="previousMonthEarnings">Previous Month's Earnings</Label>
                      <Input 
                        name="previousMonthEarnings" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lastThreeMonthsAverage">Last 3 Month's Earnings Average</Label>
                      <Input 
                        name="lastThreeMonthsAverage" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="guaranteedEarnings">Guaranteed Earnings</Label>
                      <Input 
                        name="guaranteedEarnings" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="revenueShare">Revenue Share (%)</Label>
                      <Input 
                        name="revenueShare" 
                        type="number" 
                        min="30" 
                        max="50" 
                        step="1" 
                        placeholder="30-50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="referralSource">Referral Source</Label>
                    <Input 
                      name="referralSource" 
                      placeholder="Enter referrer or source"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea 
                      name="notes" 
                      rows={3} 
                      placeholder="Any additional onboarding notes..."
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Start Onboarding
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Calendar View */}
          {showCalendar && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Upcoming Launch Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingOnboardings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No upcoming launches scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingOnboardings.map((onboarding) => (
                      <div 
                        key={onboarding.id}
                        className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedOnboarding(onboarding);
                          setShowOnboardingDetailDialog(true);
                        }}
                      >
                        <div>
                          <p className="font-medium">{onboarding.client_name}</p>
                          <p className="text-sm text-muted-foreground">{onboarding.flow_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(onboarding.launch_date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(onboarding.launch_date).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active Onboardings Grid */}
          {onboardingsLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredOnboardings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchQuery ? `No onboardings found matching "${searchQuery}"` : 'No active onboardings'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOnboardings.map((onboarding) => (
                <Card 
                  key={onboarding.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setSelectedOnboarding(onboarding);
                    setShowOnboardingDetailDialog(true);
                  }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{onboarding.client_name}</CardTitle>
                        <CardDescription>{onboarding.flow_name}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(onboarding.status)}>
                        {onboarding.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Progress</span>
                        <span className="text-sm font-medium">
                          {onboarding.completed_steps}/{onboarding.total_steps} steps
                        </span>
                      </div>
                      <Progress 
                        value={(onboarding.completed_steps / onboarding.total_steps) * 100} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        Started by {onboarding.started_by_first_name} {onboarding.started_by_last_name}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Onboarding Detail Dialog */}
          <Dialog open={showOnboardingDetailDialog} onOpenChange={setShowOnboardingDetailDialog}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedOnboarding?.client_name} - Onboarding Details
                </DialogTitle>
                <DialogDescription>
                  {selectedOnboarding?.flow_name}
                </DialogDescription>
              </DialogHeader>
              
              {selectedOnboarding && (
                <div className="space-y-6">
                  {/* Status and Progress Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(selectedOnboarding.status)}>
                          {selectedOnboarding.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Progress</Label>
                      <div className="mt-1">
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(selectedOnboarding.completed_steps / selectedOnboarding.total_steps) * 100} 
                            className="flex-1 h-2"
                          />
                          <span className="text-sm font-medium">
                            {selectedOnboarding.completed_steps}/{selectedOnboarding.total_steps}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Started By</Label>
                      <p className="text-sm mt-1">
                        {selectedOnboarding.started_by_first_name} {selectedOnboarding.started_by_last_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Started Date</Label>
                      <p className="text-sm mt-1">
                        {new Date(selectedOnboarding.started_at).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedOnboarding.client_email && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Client Email</Label>
                        <p className="text-sm mt-1">{selectedOnboarding.client_email}</p>
                      </div>
                    )}
                    {selectedOnboarding.completed_at && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Completed Date</Label>
                        <p className="text-sm mt-1">
                          {new Date(selectedOnboarding.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notes Section */}
                  {selectedOnboarding.notes && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Notes</Label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                        {selectedOnboarding.notes}
                      </p>
                    </div>
                  )}

                  {/* Steps Section */}
                  <div>
                    <Label className="text-sm text-muted-foreground mb-3 block">Onboarding Steps</Label>
                    {stepsLoading ? (
                      <div className="text-center py-4">Loading steps...</div>
                    ) : onboardingSteps.length > 0 ? (
                      <div className="space-y-2">
                        {onboardingSteps.map((step, index) => (
                          <Card key={step.id} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    Step {index + 1}: {step.step_name}
                                  </span>
                                  <Badge 
                                    variant={step.status === 'completed' ? 'default' : 
                                            step.status === 'in_progress' ? 'default' : 'secondary'}
                                    className={`text-xs ${step.status === 'completed' ? 'bg-green-500 hover:bg-green-500' : ''}`}
                                  >
                                    {step.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                {step.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {step.description}
                                  </p>
                                )}
                                {step.assigned_to_name && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Assigned to: {step.assigned_to_name}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {step.status === 'completed' && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No steps defined for this onboarding.</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowOnboardingDetailDialog(false)}
                    >
                      Close
                    </Button>
                    {selectedOnboarding.status === 'in_progress' && (
                      <Button variant="default">
                        Update Status
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Onboarding Flow Templates</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetchFlows()}>
                Refresh Flows
              </Button>
              <Dialog open={showNewFlowDialog} onOpenChange={setShowNewFlowDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Flow
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Onboarding Flow</DialogTitle>
                  <DialogDescription>
                    Define a reusable onboarding template with multiple steps
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    
                    // Transform flow items to match the API structure
                    const steps = flowItems.map((item, index) => ({
                      name: item.title,
                      description: item.description,
                      assignToTeam: item.assignmentType === 'team' ? item.assignedTo : null,
                      assignToUserId: item.assignmentType === 'user' ? item.assignedTo : null,
                      orderPosition: index,
                      estimatedDays: 1,
                      isRequired: true
                    }));

                    createFlowMutation.mutate({
                      name: formData.get('name'),
                      description: formData.get('description'),
                      steps,
                    });
                  }}
                  className="space-y-6"
                >
                  <div>
                    <Label htmlFor="name">Flow Name</Label>
                    <Input name="name" required placeholder="e.g., Standard Client Onboarding" />
                  </div>
                  <div>
                    <Label htmlFor="description">Flow Description</Label>
                    <Textarea name="description" rows={2} placeholder="Brief description of this onboarding flow" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Flow Steps</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFlowItem}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Step
                      </Button>
                    </div>
                    
                    {flowItems.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Step {index + 1}</Label>
                            {flowItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFlowItem(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div>
                            <Label htmlFor={`title-${index}`}>Step Title</Label>
                            <Input
                              id={`title-${index}`}
                              value={item.title}
                              onChange={(e) => updateFlowItem(index, 'title', e.target.value)}
                              placeholder="e.g., Initial Client Interview"
                              required
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`type-${index}`}>Assign To</Label>
                              <Select
                                value={item.assignmentType}
                                onValueChange={(value) => {
                                  updateFlowItem(index, 'assignmentType', value);
                                  updateFlowItem(index, 'assignedTo', ''); // Reset selection
                                }}
                              >
                                <SelectTrigger id={`type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="team">Team</SelectItem>
                                  <SelectItem value="user">Specific Employee</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor={`assignee-${index}`}>
                                {item.assignmentType === 'team' ? 'Select Team' : 'Select Employee'}
                              </Label>
                              <Select
                                value={item.assignedTo}
                                onValueChange={(value) => updateFlowItem(index, 'assignedTo', value)}
                              >
                                <SelectTrigger id={`assignee-${index}`}>
                                  <SelectValue placeholder={`Choose ${item.assignmentType}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.assignmentType === 'team' ? (
                                    <>
                                      <SelectItem value="Sales">Sales</SelectItem>
                                      <SelectItem value="Success">Success</SelectItem>
                                      <SelectItem value="Finance">Finance</SelectItem>
                                      <SelectItem value="Operations">Operations</SelectItem>
                                      <SelectItem value="Marketing">Marketing</SelectItem>
                                    </>
                                  ) : (
                                    users.length > 0 ? (
                                      users.map((user) => 
                                        user.id ? (
                                          <SelectItem key={user.id} value={user.id}>
                                            {user.email}
                                          </SelectItem>
                                        ) : null
                                      )
                                    ) : (
                                      <SelectItem value="no-users">No employees available</SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor={`desc-${index}`}>Task Description</Label>
                            <Textarea
                              id={`desc-${index}`}
                              value={item.description}
                              onChange={(e) => updateFlowItem(index, 'description', e.target.value)}
                              placeholder="Detailed description of what needs to be done in this step"
                              rows={3}
                              required
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">
                      Create Flow
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetFlowDialog}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {flowsLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : flows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No onboarding flows created yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {flows.map((flow) => (
                <Card key={flow.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{flow.name}</CardTitle>
                        {flow.description && (
                          <CardDescription>{flow.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant="secondary">{flow.step_count} steps</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Created by {flow.created_by_first_name} {flow.created_by_last_name}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Flow
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setFlowToDelete(flow);
                            setShowDeleteConfirmDialog(true);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <h3 className="text-lg font-semibold">My Assigned Tasks</h3>
          
          {tasksLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : assignedTasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No tasks assigned to you</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignedTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {task.client_name} - {task.step_name}
                        </p>
                        {task.description && (
                          <p className="text-sm">{task.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Assigned by {task.assigned_by_first_name} {task.assigned_by_last_name}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateTaskMutation.mutate({
                            taskId: task.id,
                            data: { status: 'completed' },
                          });
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Admin Panel - Admin Only */}
        {employee?.accessLevel === 'admin' && (
          <TabsContent value="admin-panel" className="space-y-4">
            <Tabs defaultValue="active-time" className="space-y-4">
              <TabsList>
                <TabsTrigger value="active-time">Active Onboarding Time</TabsTrigger>
                <TabsTrigger value="completed">Completed Onboardings</TabsTrigger>
              </TabsList>

              {/* Active Onboarding Time Tab */}
              <TabsContent value="active-time" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Onboarding Time Tracking</CardTitle>
                    <CardDescription>
                      Monitor how long each step has been waiting to be completed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activeOnboardingTimes.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No active onboardings to track
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {activeOnboardingTimes.map((onboarding: any) => (
                          <Card key={onboarding.id} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold">{onboarding.flow_name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Client: {onboarding.client_name}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  Started {onboarding.days_since_start} day{onboarding.days_since_start !== 1 ? 's' : ''} ago
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {onboarding.steps?.map((step: any, index: number) => (
                                  <div key={step.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">
                                          Step {index + 1}: {step.step_name}
                                        </span>
                                        {step.status === 'completed' ? (
                                          <Badge variant="secondary" className="text-xs">
                                            Completed
                                          </Badge>
                                        ) : (
                                          <Badge variant="default" className="text-xs">
                                            {step.status || 'Pending'}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {step.assigned_to_type === 'team' 
                                          ? `Team: ${step.assigned_to_name}`
                                          : `User: ${step.assigned_to_name}`}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      {step.status !== 'completed' ? (
                                        <div>
                                          <Clock className="w-4 h-4 inline-block mr-1 text-yellow-600" />
                                          <span className="text-sm font-medium text-yellow-600">
                                            {step.waiting_days} day{step.waiting_days !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                      ) : (
                                        <div>
                                          <CheckCircle className="w-4 h-4 inline-block mr-1 text-green-600" />
                                          <span className="text-sm text-green-600">
                                            Done in {step.completion_days} day{step.completion_days !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Completed Onboardings Tab */}
              <TabsContent value="completed" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Completed Onboardings</CardTitle>
                    <CardDescription>
                      Review completed onboarding flows and their timelines
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Total Count Display */}
                    <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Total Completed Onboardings</span>
                        <span className="text-2xl font-bold">{completedOnboardings.length}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by client name..."
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {completedOnboardings.filter((onboarding: any) => 
                      onboarding.client_name?.toLowerCase().includes(adminSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        {adminSearchQuery ? 'No completed onboardings found matching your search' : 'No completed onboardings yet'}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {completedOnboardings
                          .filter((onboarding: any) => 
                            onboarding.client_name?.toLowerCase().includes(adminSearchQuery.toLowerCase())
                          )
                          .map((onboarding: any) => (
                            <Card key={onboarding.id} className="border-l-4 border-l-green-500">
                              <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold">{onboarding.client_name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {onboarding.flow_name}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="secondary" className="mb-1">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Completed
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(onboarding.completed_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <p className="text-sm font-medium">Total Time</p>
                                    <p className="text-2xl font-bold text-primary">
                                      {onboarding.total_days} day{onboarding.total_days !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Steps Completed</p>
                                    <p className="text-2xl font-bold text-primary">
                                      {onboarding.steps?.length || 0}
                                    </p>
                                  </div>
                                </div>
                                
                                {onboarding.steps && onboarding.steps.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium mb-2">Step Breakdown:</p>
                                    {onboarding.steps.map((step: any, index: number) => (
                                      <div key={step.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                        <div className="flex-1">
                                          <span className="text-sm">
                                            {index + 1}. {step.step_name}
                                          </span>
                                          <span className="text-xs text-muted-foreground ml-2">
                                            ({step.completed_by_type === 'team' ? step.completed_by_team : step.completed_by_name})
                                          </span>
                                        </div>
                                        <span className="text-sm font-medium">
                                          {step.completion_days} day{step.completion_days !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Onboarding Flow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the flow "{flowToDelete?.name}"? 
              This action cannot be undone, but the flow will only be deleted if it's not currently being used in any active onboardings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteConfirmDialog(false);
              setFlowToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (flowToDelete) {
                  deleteFlowMutation.mutate(flowToDelete.id);
                  setShowDeleteConfirmDialog(false);
                  setFlowToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Flow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}