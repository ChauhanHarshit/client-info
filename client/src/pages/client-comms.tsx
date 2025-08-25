import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AlertCircle, Check, CheckCircle2, ChevronsUpDown, Clock, Copy, MessageSquare, Plus, RefreshCw, Search, User, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useCrmAuth } from "@/contexts/CrmAuthContext";

interface ClientComms2Task {
  id: number;
  client_name: string;
  message_preview: string;
  full_message: string;
  assigned_to: string;
  assigned_by: string;
  status: 'open' | 'completed';
  priority: 'normal' | 'high' | 'urgent';
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_first_name: string;
  assigned_to_last_name: string;
  assigned_by_first_name: string;
  assigned_by_last_name: string;
}

interface ClientComms2Response {
  id: number;
  title: string;
  response_text: string;
  category: string | null;
  tags: string[] | null;
  created_by: string;
  last_updated: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function ClientComms() {
  const { toast } = useToast();
  const { employee } = useCrmAuth();
  
  // Ensure this page is accessible for authenticated employees
  if (!employee) {
    console.log('Client Communications - No employee authentication found');
    return null;
  }
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<ClientComms2Response | null>(null);
  const [selectedTask, setSelectedTask] = useState<ClientComms2Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [isAddResponseOpen, setIsAddResponseOpen] = useState(false);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeSearchValue, setEmployeeSearchValue] = useState("");
  
  // Admin panel state
  const [adminTaskFilter, setAdminTaskFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [adminEmployeeFilter, setAdminEmployeeFilter] = useState<string>('all');
  const [adminTaskSearch, setAdminTaskSearch] = useState("");
  const [selectedTaskForReassign, setSelectedTaskForReassign] = useState<ClientComms2Task | null>(null);
  const [newAssignee, setNewAssignee] = useState("");
  const [isEditResponseOpen, setIsEditResponseOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<ClientComms2Response | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);


  // New task form state
  const [newTask, setNewTask] = useState({
    clientName: "",
    messagePreview: "",
    fullMessage: "",
    assignedTo: "",
    priority: "normal" as "normal" | "high" | "urgent",
    dueDate: ""
  });

  // New response form state
  const [newResponse, setNewResponse] = useState({
    title: "",
    responseText: "",
    category: "",
    tags: ""
  });

  // Fetch tasks assigned to current user
  const { data: tasksData, isLoading: tasksLoading, error: tasksError, refetch: refetchTasks } = useQuery<ClientComms2Task[]>({
    queryKey: ['/api/client-comms/tasks'],
    queryFn: async () => {
      const response = await fetch('/api/client-comms/tasks', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
    staleTime: 0,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Debug logging for tasks
  console.log('Tasks data:', tasksData);
  console.log('Tasks loading:', tasksLoading);
  console.log('Tasks error:', tasksError);

  // Fetch task count for notification badge
  const { data: taskCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/client-comms/tasks/count'],
    queryFn: async () => {
      const response = await fetch('/api/client-comms/tasks/count', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch task count');
      }
      return response.json();
    },
    staleTime: 0,
    refetchInterval: 30000,
  });

  // Fetch response bank entries
  const { data: responsesData, isLoading: responsesLoading } = useQuery<ClientComms2Response[]>({
    queryKey: ['/api/client-comms/responses'],
    staleTime: 60000,
  });

  // Fetch employees for task assignment
  const { data: employeesData, isLoading: employeesLoading, error: employeesError } = useQuery<Employee[]>({
    queryKey: ['/api/client-comms/employees'],
    queryFn: async () => {
      const response = await fetch('/api/client-comms/employees', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      return response.json();
    },
    staleTime: 300000,
  });
  
  // Debug logging for employees
  console.log('Client Comms - Employees data:', employeesData);
  console.log('Client Comms - Employees loading:', employeesLoading);
  console.log('Client Comms - Employees error:', employeesError);
  
  // Additional debugging
  if (employeesError) {
    console.error('Failed to fetch employees:', employeesError);
  }
  
  if (employeesData) {
    console.log('Employees fetched successfully:', employeesData.length, 'employees');
  }

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => apiRequest('POST', '/api/client-comms/tasks', taskData),
    onSuccess: () => {
      toast({
        title: "Task assigned successfully",
        description: "The task has been assigned to the selected employee.",
      });
      setIsAssignTaskOpen(false);
      setNewTask({
        clientName: "",
        messagePreview: "",
        fullMessage: "",
        assignedTo: "",
        priority: "normal",
        dueDate: ""
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/tasks/count'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign task. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Admin: Fetch ALL tasks (not just assigned to current user)
  const { data: allTasksData, isLoading: allTasksLoading, refetch: refetchAllTasks } = useQuery<ClientComms2Task[]>({
    queryKey: ['/api/client-comms/tasks/all'],
    queryFn: async () => {
      const response = await fetch('/api/client-comms/tasks/all', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch all tasks');
      }
      return response.json();
    },
    enabled: employee?.accessLevel === 'admin',
    refetchInterval: 30000,
  });

  // Admin: Fetch task statistics
  const { data: taskStatsData } = useQuery<{
    totalUncompleted: number;
    tasksByEmployee: Array<{ employeeId: string; employeeName: string; openTasks: number; completedTasks: number; avgCompletionTime: number }>;
  }>({
    queryKey: ['/api/client-comms/tasks/stats'],
    queryFn: async () => {
      const response = await fetch('/api/client-comms/tasks/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch task stats');
      }
      return response.json();
    },
    enabled: employee?.accessLevel === 'admin',
    refetchInterval: 60000,
  });

  // Admin: Fetch all response categories
  const { data: categoriesData, refetch: refetchCategories } = useQuery<string[]>({
    queryKey: ['/api/client-comms/responses/categories'],
    queryFn: async () => {
      const response = await fetch('/api/client-comms/responses/categories', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
    enabled: employee?.accessLevel === 'admin',
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest('PUT', `/api/client-comms/tasks/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Task updated",
        description: "The task has been marked as completed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/tasks/count'] });
    },
  });

  // Copy response mutation
  const copyResponseMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/client-comms/responses/${id}/copy`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/responses'] });
    }
  });

  // Create response mutation (admin only)
  const createResponseMutation = useMutation({
    mutationFn: (responseData: any) => apiRequest('POST', '/api/client-comms/responses', responseData),
    onSuccess: () => {
      toast({
        title: "Response added successfully",
        description: "The new response template has been added to the bank.",
      });
      setIsAddResponseOpen(false);
      setNewResponse({
        title: "",
        responseText: "",
        category: "",
        tags: ""
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/responses'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add response. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Admin: Reassign task mutation
  const reassignTaskMutation = useMutation({
    mutationFn: ({ taskId, newAssignee }: { taskId: number; newAssignee: string }) => 
      apiRequest('PUT', `/api/client-comms/tasks/${taskId}/reassign`, { assignedTo: newAssignee }),
    onSuccess: () => {
      toast({
        title: "Task reassigned successfully",
        description: "The task has been reassigned to the selected employee.",
      });
      setSelectedTaskForReassign(null);
      setNewAssignee("");
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/tasks/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/tasks/stats'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reassign task. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Admin: Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: (category: string) => 
      apiRequest('POST', '/api/client-comms/responses/categories', { category }),
    onSuccess: () => {
      toast({
        title: "Category added successfully",
        description: "The new category has been added to the response bank.",
      });
      setNewCategory("");
      setIsAddCategoryOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/responses/categories'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Admin: Update response mutation
  const updateResponseMutation = useMutation({
    mutationFn: (responseData: any) => 
      apiRequest('PUT', `/api/client-comms/responses/${responseData.id}`, responseData),
    onSuccess: () => {
      toast({
        title: "Response updated successfully",
        description: "The response has been updated.",
      });
      setIsEditResponseOpen(false);
      setEditingResponse(null);
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/responses'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update response. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Admin: Delete response mutation
  const deleteResponseMutation = useMutation({
    mutationFn: (responseId: number) => 
      apiRequest('DELETE', `/api/client-comms/responses/${responseId}`),
    onSuccess: () => {
      toast({
        title: "Response deleted successfully",
        description: "The response has been removed from the bank.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client-comms/responses'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete response. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleAssignTask = () => {
    if (!newTask.clientName || !newTask.messagePreview || !newTask.fullMessage || !newTask.assignedTo) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    console.log('Creating task with assignedTo:', newTask.assignedTo);
    console.log('Full task data:', newTask);
    createTaskMutation.mutate(newTask);
  };

  const handleCompleteTask = (taskId: number) => {
    updateTaskMutation.mutate({ id: taskId, status: 'completed' });
  };

  const handleCopyResponse = async (response: ClientComms2Response) => {
    try {
      await navigator.clipboard.writeText(response.response_text);
      toast({
        title: "Copied to clipboard",
        description: "Response has been copied to your clipboard.",
      });
      copyResponseMutation.mutate(response.id);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddResponse = () => {
    if (!newResponse.title || !newResponse.responseText) {
      toast({
        title: "Missing information",
        description: "Please fill in the title and response text.",
        variant: "destructive"
      });
      return;
    }

    const responseData = {
      ...newResponse,
      tags: newResponse.tags ? newResponse.tags.split(',').map(tag => tag.trim()) : []
    };

    createResponseMutation.mutate(responseData);
  };

  const handleResponseClick = (response: ClientComms2Response) => {
    setSelectedResponse(response);
    setShowResponseDialog(true);
  };



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const tasks: ClientComms2Task[] = tasksData || [];
  const responses: ClientComms2Response[] = responsesData || [];
  const employees: Employee[] = employeesData || [];
  const taskCount = taskCountData?.count || 0;
  
  // Debug logging
  console.log('Raw tasks from API:', tasks);
  console.log('Task count:', taskCount);
  console.log('Task search term:', taskSearch);

  const filteredTasks = tasks.filter((task: ClientComms2Task) => 
    task.client_name.toLowerCase().includes(taskSearch.toLowerCase()) ||
    task.message_preview.toLowerCase().includes(taskSearch.toLowerCase())
  );
  
  console.log('Filtered tasks:', filteredTasks);

  const filteredResponses = responses.filter((response: ClientComms2Response) => {
    const matchesSearch = !searchTerm || 
      response.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (response.category && response.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || response.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });



  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Communications"
        description="Manage client response tasks and response templates"
      />

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className={`grid w-full ${employee?.accessLevel === 'admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="tasks" className="relative">
            My Tasks
            {taskCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {taskCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="responses">Response Bank</TabsTrigger>
          {employee?.accessLevel === 'admin' && (
            <TabsTrigger value="admin">Admin Panel</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search tasks by client or message..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchTasks()}
              className="mr-2"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Dialog open={isAssignTaskOpen} onOpenChange={(open) => {
              setIsAssignTaskOpen(open);
              if (open) {
                // Reset form when opening dialog
                setNewTask({
                  clientName: "",
                  messagePreview: "",
                  fullMessage: "",
                  assignedTo: "",
                  priority: "normal",
                  dueDate: ""
                });
                setEmployeeSearchValue("");
                setEmployeeSearchOpen(false);
              } else {
                setEmployeeSearchValue("");
                setEmployeeSearchOpen(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Response Task</DialogTitle>
                  <DialogDescription>
                    Assign a client message to an employee who can help respond.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Client Name</label>
                    <Input
                      placeholder="Enter client name"
                      value={newTask.clientName}
                      onChange={(e) => setNewTask({ ...newTask, clientName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message Preview</label>
                    <Input
                      placeholder="Brief preview of the message"
                      value={newTask.messagePreview}
                      onChange={(e) => setNewTask({ ...newTask, messagePreview: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Full Message</label>
                    <Textarea
                      placeholder="Paste the full client message here"
                      value={newTask.fullMessage}
                      onChange={(e) => setNewTask({ ...newTask, fullMessage: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assign To</label>
                    <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={employeeSearchOpen}
                          className="w-full justify-between font-normal"
                        >
                          {newTask.assignedTo
                            ? employeesData?.find((emp: Employee) => emp.id === newTask.assignedTo)
                              ? `${employeesData?.find((emp: Employee) => emp.id === newTask.assignedTo)?.first_name} ${employeesData?.find((emp: Employee) => emp.id === newTask.assignedTo)?.last_name}`
                              : "Select an employee"
                            : "Select an employee"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search employees..." 
                          />
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {employeesLoading ? (
                              <div className="p-2 text-center text-sm text-gray-500">Loading employees...</div>
                            ) : employeesData && employeesData.length > 0 ? (
                              employeesData.map((employee: Employee) => (
                                <CommandItem
                                  key={employee.id}
                                  value={`${employee.first_name} ${employee.last_name} ${employee.email}`}
                                  onSelect={() => {
                                    console.log('Employee selected:', employee.first_name, employee.last_name, 'ID:', employee.id);
                                    setNewTask(prev => ({ ...prev, assignedTo: employee.id }));
                                    setEmployeeSearchOpen(false);
                                    console.log('Updated newTask assignedTo:', employee.id);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      newTask.assignedTo === employee.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span>{employee.first_name} {employee.last_name}</span>
                                    <span className="text-xs text-gray-500">{employee.email}</span>
                                  </div>
                                </CommandItem>
                              ))
                            ) : (
                              <div className="p-2 text-center text-sm text-gray-500">No employees available</div>
                            )}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due Date (Optional)</label>
                    <Input
                      type="datetime-local"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignTaskOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignTask} disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? "Assigning..." : "Assign Task"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {tasksLoading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                Loading tasks...
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No tasks assigned to you</p>
                <p className="text-sm text-gray-500 mt-2">
                  Tasks assigned to you will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task: ClientComms2Task) => (
                <Card 
                  key={task.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={(e) => {
                    // Don't open modal if clicking the buttons
                    if (!(e.target as HTMLElement).closest('button')) {
                      setSelectedTask(task);
                      setShowTaskModal(true);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{task.client_name}</CardTitle>
                        <CardDescription>{task.message_preview}</CardDescription>
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <p>Assigned by: {task.assigned_by_first_name} {task.assigned_by_last_name}</p>
                      <p>Created: {formatDate(task.created_at)}</p>
                      {task.due_date && (
                        <p className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due: {formatDate(task.due_date)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                          setShowTaskModal(true);
                        }}
                      >
                        View Full Message
                      </Button>
                      <Button
                        size="sm"
                        className="mark-complete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteTask(task.id);
                        }}
                        disabled={updateTaskMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search responses by title or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="FAQ">FAQ</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="status_update">Status Update</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            {employee?.accessLevel === 'admin' && (
              <Dialog open={isAddResponseOpen} onOpenChange={setIsAddResponseOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Response
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Response Template</DialogTitle>
                    <DialogDescription>
                      Create a new response template for the team to use.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        placeholder="Response title"
                        value={newResponse.title}
                        onChange={(e) => setNewResponse({ ...newResponse, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Response Text</label>
                      <Textarea
                        placeholder="Enter the response template text..."
                        value={newResponse.responseText}
                        onChange={(e) => setNewResponse({ ...newResponse, responseText: e.target.value })}
                        rows={6}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select
                        value={newResponse.category}
                        onValueChange={(value) => setNewResponse({ ...newResponse, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FAQ">FAQ</SelectItem>
                          <SelectItem value="onboarding">Onboarding</SelectItem>
                          <SelectItem value="status_update">Status Update</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tags (comma-separated)</label>
                      <Input
                        placeholder="e.g., greeting, welcome, intro"
                        value={newResponse.tags}
                        onChange={(e) => setNewResponse({ ...newResponse, tags: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddResponseOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddResponse} disabled={createResponseMutation.isPending}>
                      Add Response
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {responsesLoading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                Loading responses...
              </div>
            </div>
          ) : filteredResponses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No response templates found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Response templates will appear here once added
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredResponses.map((response: ClientComms2Response) => (
                <Card 
                  key={response.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleResponseClick(response)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{response.title}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyResponse(response);
                        }}
                        className="ml-2"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    {response.category && (
                      <Badge variant="secondary" className="w-fit">
                        {response.category}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-3">{response.response_text}</p>
                    <div className="mt-3 text-xs text-gray-500 space-y-1">
                      <p>Created by: {response.first_name} {response.last_name}</p>
                      <p>Used {response.usage_count} times</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Admin Panel Tab */}
        {employee?.accessLevel === 'admin' && (
          <TabsContent value="admin" className="space-y-6">
            <div className="space-y-8">
              {/* Task Management Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Management Overview</CardTitle>
                  <CardDescription>Monitor and manage all client communication tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Task Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-red-50">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">
                          {taskStatsData?.totalUncompleted || 0}
                        </div>
                        <p className="text-xs text-red-800 mt-1">Total Uncompleted Tasks</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">
                          {allTasksData?.length || 0}
                        </div>
                        <p className="text-xs text-blue-800 mt-1">Total Tasks</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                          {allTasksData?.filter((t: ClientComms2Task) => t.status === 'completed').length || 0}
                        </div>
                        <p className="text-xs text-green-800 mt-1">Completed Tasks</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Employee Task Statistics */}
                  <div>
                    <h4 className="font-semibold mb-3">Tasks by Employee</h4>
                    <div className="space-y-2">
                      {taskStatsData?.tasksByEmployee?.map((stat) => (
                        <div key={stat.employeeId} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{stat.employeeName}</p>
                              <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                <span>Open: {stat.openTasks}</span>
                                <span>Completed: {stat.completedTasks}</span>
                                <span>Avg Time: {stat.avgCompletionTime ? `${Math.round(stat.avgCompletionTime / 3600000)}h` : 'N/A'}</span>
                              </div>
                            </div>
                            <Badge variant={stat.openTasks > 5 ? 'destructive' : 'secondary'}>
                              {stat.openTasks} open
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* All Tasks List with Filters */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">All Tasks</h4>
                      <div className="flex gap-2">
                        <Select value={adminTaskFilter} onValueChange={(value: any) => setAdminTaskFilter(value)}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Tasks</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={adminEmployeeFilter} onValueChange={setAdminEmployeeFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Employees" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Employees</SelectItem>
                            {employeesData?.map((emp: Employee) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.first_name} {emp.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Search tasks..."
                          value={adminTaskSearch}
                          onChange={(e) => setAdminTaskSearch(e.target.value)}
                          className="w-[200px]"
                        />
                        <Button variant="outline" size="sm" onClick={() => refetchAllTasks()}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {allTasksLoading ? (
                      <div className="text-center py-4">Loading tasks...</div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Message</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Assigned To</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Assigned By</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Priority</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Created</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {allTasksData
                              ?.filter((task: ClientComms2Task) => {
                                const matchesStatus = adminTaskFilter === 'all' || task.status === adminTaskFilter;
                                const matchesEmployee = adminEmployeeFilter === 'all' || task.assigned_to === adminEmployeeFilter;
                                const matchesSearch = !adminTaskSearch || 
                                  task.client_name.toLowerCase().includes(adminTaskSearch.toLowerCase()) ||
                                  task.message_preview.toLowerCase().includes(adminTaskSearch.toLowerCase());
                                return matchesStatus && matchesEmployee && matchesSearch;
                              })
                              .map((task: ClientComms2Task) => (
                                <tr key={task.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm">{task.client_name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    <div className="max-w-xs truncate">{task.message_preview}</div>
                                  </td>
                                  <td className="px-4 py-3 text-sm">{task.assigned_to_first_name} {task.assigned_to_last_name}</td>
                                  <td className="px-4 py-3 text-sm">{task.assigned_by_first_name} {task.assigned_by_last_name}</td>
                                  <td className="px-4 py-3">
                                    <Badge variant={task.status === 'completed' ? 'secondary' : 'default'}>
                                      {task.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge className={getPriorityColor(task.priority)}>
                                      {task.priority}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {formatDate(task.created_at)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {task.status === 'open' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedTaskForReassign(task)}
                                      >
                                        Reassign
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Response Bank Management Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Response Bank Management</CardTitle>
                  <CardDescription>Manage response templates and categories</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Categories Management */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold">Categories</h4>
                      <Button size="sm" onClick={() => setIsAddCategoryOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Category
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categoriesData?.map((category) => (
                        <Badge key={category} variant="secondary" className="py-1 px-3">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Response Templates List */}
                  <div>
                    <h4 className="font-semibold mb-3">All Response Templates</h4>
                    <div className="space-y-2">
                      {responsesData?.map((response: ClientComms2Response) => (
                        <div key={response.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{response.title}</p>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{response.response_text}</p>
                              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                <span>Category: {response.category || 'None'}</span>
                                <span>By: {response.first_name} {response.last_name}</span>
                                <span>Used: {response.usage_count} times</span>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingResponse(response);
                                  setIsEditResponseOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this response?')) {
                                    deleteResponseMutation.mutate(response.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reassign Task Dialog */}
            <Dialog open={!!selectedTaskForReassign} onOpenChange={(open) => !open && setSelectedTaskForReassign(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reassign Task</DialogTitle>
                  <DialogDescription>
                    Reassign task for {selectedTaskForReassign?.client_name} to another employee
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Current Assignee</label>
                    <p className="text-sm text-gray-600">
                      {selectedTaskForReassign?.assigned_to_first_name} {selectedTaskForReassign?.assigned_to_last_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">New Assignee</label>
                    <Select value={newAssignee} onValueChange={setNewAssignee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employeesData
                          ?.filter((emp: Employee) => emp.id !== selectedTaskForReassign?.assigned_to)
                          .map((emp: Employee) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedTaskForReassign(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedTaskForReassign && newAssignee) {
                        reassignTaskMutation.mutate({ 
                          taskId: selectedTaskForReassign.id, 
                          newAssignee 
                        });
                      }
                    }}
                    disabled={!newAssignee || reassignTaskMutation.isPending}
                  >
                    Reassign Task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Category Dialog */}
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>
                    Add a new category for organizing response templates
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <Input
                    placeholder="Enter category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (newCategory) {
                        addCategoryMutation.mutate(newCategory);
                      }
                    }}
                    disabled={!newCategory || addCategoryMutation.isPending}
                  >
                    Add Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Response Dialog */}
            <Dialog open={isEditResponseOpen} onOpenChange={setIsEditResponseOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Response Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={editingResponse?.title || ''}
                      onChange={(e) => setEditingResponse(prev => prev ? {...prev, title: e.target.value} : null)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Response Text</label>
                    <Textarea
                      value={editingResponse?.response_text || ''}
                      onChange={(e) => setEditingResponse(prev => prev ? {...prev, response_text: e.target.value} : null)}
                      rows={6}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={editingResponse?.category || ''}
                      onValueChange={(value) => setEditingResponse(prev => prev ? {...prev, category: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesData?.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditResponseOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingResponse) {
                        updateResponseMutation.mutate(editingResponse);
                      }
                    }}
                    disabled={updateResponseMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedResponse?.title}</DialogTitle>
            {selectedResponse?.category && (
              <Badge variant="secondary" className="w-fit mt-2">
                {selectedResponse.category}
              </Badge>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap">{selectedResponse?.response_text}</p>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Created by: {selectedResponse?.first_name} {selectedResponse?.last_name}</p>
              <p>Used {selectedResponse?.usage_count} times</p>
              <p>Last updated: {selectedResponse?.last_updated ? new Date(selectedResponse.last_updated).toLocaleDateString() : 'N/A'}</p>
              {selectedResponse?.tags && selectedResponse.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span>Tags:</span>
                  {selectedResponse.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedResponse) {
                handleCopyResponse(selectedResponse);
                setShowResponseDialog(false);
              }
            }}>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedTask?.client_name}</span>
              <Badge className={selectedTask ? getPriorityColor(selectedTask.priority) : ''}>
                {selectedTask?.priority}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Full Message:</h4>
              <p className="whitespace-pre-wrap text-sm">{selectedTask?.full_message}</p>
            </div>
            
            {selectedTask?.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Notes:</h4>
                <p className="whitespace-pre-wrap text-sm">{selectedTask.notes}</p>
              </div>
            )}
            
            <div className="text-sm text-gray-600 space-y-1">
              <p>Assigned by: {selectedTask?.assigned_by_first_name} {selectedTask?.assigned_by_last_name}</p>
              <p>Assigned to: {selectedTask?.assigned_to_first_name} {selectedTask?.assigned_to_last_name}</p>
              <p>Created: {selectedTask ? formatDate(selectedTask.created_at) : ''}</p>
              {selectedTask?.due_date && (
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Due: {formatDate(selectedTask.due_date)}
                </p>
              )}
              <p>Status: {selectedTask?.status}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                if (selectedTask) {
                  handleCompleteTask(selectedTask.id);
                  setShowTaskModal(false);
                }
              }}
              disabled={updateTaskMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}