import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, CheckCircle, Clock, Plus, Users, AlertTriangle, Target } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, isBefore, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";

// Form schemas
const newClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  bannerUrl: z.string().url().optional().or(z.literal("")),
  launchDate: z.date({
    required_error: "Launch date is required",
  }),
  prevEarnings: z.number().min(0).default(0),
  guaranteedEarnings: z.number().min(0).optional(),
  revShare: z.number().min(0).max(1).default(0.3),
  referredBy: z.string().optional(),
  onboardingFormLink: z.string().url().optional().or(z.literal("")),
  contractPdfUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

const taskTemplateSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  daysBeforeLaunch: z.number().min(0).default(0),
  sortOrder: z.number().default(0),
});

type NewClientForm = z.infer<typeof newClientSchema>;
type TaskTemplateForm = z.infer<typeof taskTemplateSchema>;

const departments = [
  "content",
  "chatter", 
  "marketing",
  "creative",
  "analytics"
];

const statusColors = {
  prepping: "bg-yellow-100 text-yellow-800",
  active: "bg-blue-100 text-blue-800", 
  delayed: "bg-red-100 text-red-800",
  launched: "bg-green-100 text-green-800"
};

export default function NewClientOnboarding() {
  const { toast } = useToast();
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [showAddTemplateDialog, setShowAddTemplateDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientDetailsDialog, setShowClientDetailsDialog] = useState(false);

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/new-clients"],
    retry: false,
  });

  // Fetch upcoming launches
  const { data: upcomingLaunches = [], isLoading: launchesLoading } = useQuery({
    queryKey: ["/api/upcoming-launches"],
    retry: false,
  });

  // Fetch task templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/onboarding-task-templates"],
    retry: false,
  });

  // Fetch onboarding metrics
  const { data: metrics = {} } = useQuery({
    queryKey: ["/api/onboarding-metrics"],
    retry: false,
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: NewClientForm) => {
      return await apiRequest("/api/new-clients", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/upcoming-launches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-metrics"] });
      setShowAddClientDialog(false);
      toast({
        title: "Success",
        description: "New client created and onboarding tasks generated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create new client",
        variant: "destructive",
      });
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TaskTemplateForm) => {
      return await apiRequest("/api/onboarding-task-templates", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-task-templates"] });
      setShowAddTemplateDialog(false);
      toast({
        title: "Success",
        description: "Task template created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task template",
        variant: "destructive",
      });
    },
  });

  // Forms
  const clientForm = useForm<NewClientForm>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      prevEarnings: 0,
      revShare: 0.3,
    },
  });

  const templateForm = useForm<TaskTemplateForm>({
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      daysBeforeLaunch: 0,
      sortOrder: 0,
    },
  });

  const onSubmitClient = (data: NewClientForm) => {
    createClientMutation.mutate(data);
  };

  const onSubmitTemplate = (data: TaskTemplateForm) => {
    createTemplateMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  const calculateProgress = (tasks: any[]) => {
    if (!tasks?.length) return 0;
    const completed = tasks.filter(task => task.isCompleted).length;
    return Math.round((completed / tasks.length) * 100);
  };

  if (clientsLoading || launchesLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading onboarding dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Client Onboarding"
        description="Manage client launches and onboarding workflows"
        showBackButton={true}
        backTo="/dashboard"
        actions={
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowAddTemplateDialog(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Template</span>
            </Button>
            <Button 
              onClick={() => setShowAddClientDialog(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Client</span>
            </Button>
          </div>
        }
      />
      
      <div className="px-6 pb-6 space-y-6">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">In pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Launches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.upcomingLaunches || 0}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.overdueTasks || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedTasks || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Launches</TabsTrigger>
          <TabsTrigger value="all-clients">All Clients</TabsTrigger>
          <TabsTrigger value="templates">Task Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingLaunches.map((client: any) => (
              <Card key={client.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientDetailsDialog(true);
                    }}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <CardDescription>
                        Launch: {format(new Date(client.launchDate), "MMM dd, yyyy")}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(client.status)}>
                      {client.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.bannerUrl && (
                    <img src={client.bannerUrl} alt={client.name} 
                         className="w-full h-32 object-cover rounded-md" />
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Previous Earnings</p>
                      <p className="font-medium">${client.prevEarnings?.toLocaleString() || 0}</p>
                    </div>
                    {client.guaranteedEarnings && (
                      <div>
                        <p className="text-gray-500">Guaranteed</p>
                        <p className="font-medium">${client.guaranteedEarnings.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Rev Share:</span>
                      <span>{(Number(client.revShare) * 100).toFixed(1)}%</span>
                    </div>
                    {client.referredBy && (
                      <div className="flex justify-between text-sm">
                        <span>Referred by:</span>
                        <span>{client.referredBy}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {upcomingLaunches.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No upcoming launches in the next 30 days
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all-clients" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {clients.map((client: any) => (
              <Card key={client.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientDetailsDialog(true);
                    }}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <CardDescription>
                        Launch: {format(new Date(client.launchDate), "MMM dd, yyyy")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(client.status)}>
                        {client.status}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-medium">${client.prevEarnings?.toLocaleString() || 0}</p>
                        <p className="text-xs text-gray-500">Previous earnings</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
            {clients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No clients added yet
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template: any) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Department:</span>
                    <Badge variant="outline">{template.department}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Due:</span>
                    <span>{template.daysBeforeLaunch} days before launch</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Sort Order:</span>
                    <span>{template.sortOrder}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No task templates created yet
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      </div>

      {/* Add New Client Dialog */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client and automatically generate onboarding tasks
            </DialogDescription>
          </DialogHeader>
          
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-4">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter client name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="bannerUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/banner.jpg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="launchDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Launch Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date: Date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
                  name="prevEarnings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Month's Earnings</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="guaranteedEarnings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guaranteed Earnings (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={clientForm.control}
                name="revShare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue Share (0.0 - 1.0)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        placeholder="0.30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="referredBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral Source</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter referral source" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="onboardingFormLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Onboarding Form Link</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://forms.example.com/onboarding" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="contractPdfUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract PDF URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://drive.google.com/file/..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes about the client..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddClientDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createClientMutation.isPending}>
                  {createClientMutation.isPending ? "Creating..." : "Create Client"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Task Template Dialog */}
      <Dialog open={showAddTemplateDialog} onOpenChange={setShowAddTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task Template</DialogTitle>
            <DialogDescription>
              Create a reusable task template for client onboarding
            </DialogDescription>
          </DialogHeader>
          
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-4">
              <FormField
                control={templateForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter task title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Task description..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept.charAt(0).toUpperCase() + dept.slice(1)}
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
                  control={templateForm.control}
                  name="daysBeforeLaunch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Before Launch</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddTemplateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTemplateMutation.isPending}>
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}