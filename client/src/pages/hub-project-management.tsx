import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SimpleRichEditor } from "@/components/simple-rich-editor";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Users,
  Target,
  TrendingUp,
  MoreVertical,
  Edit,
  Edit2,
  Trash2,
  FolderKanban,
  List,
  Grid3X3,
  CheckSquare,
  Filter,
  UserPlus,
} from "lucide-react";
import { useCrmAuth } from "@/contexts/CrmAuthContext";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "completed";
  assignedTo: string;
  assignedToName: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  source?: string;
  projectId?: number;
  projectName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  category?: string;
  overview?: string;
  status: "planning" | "active" | "on_hold" | "completed";
  dueDate?: string;
  assignedUsers: string[];
  assignedUserNames: string[];
  sections?: Array<{
    title: string;
    content?: string;
    description?: string;
    overview?: string;
    assignedTo?: string;
    dueDate?: string;
  }>;
  tasks: Task[];
  progress: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export default function HubProjectManagement() {
  const { employee } = useCrmAuth();
  const { toast } = useToast();
  const [contentView, setContentView] = useState<"projects" | "tasks">("projects");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [taskViewMode, setTaskViewMode] = useState<"list" | "board" | "calendar">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [taskFilterAssigned, setTaskFilterAssigned] = useState<string>("all");
  const [taskFilterPriority, setTaskFilterPriority] = useState<string>("all");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectDetailOpen, setIsProjectDetailOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    category: "",
    overview: "",
    dueDate: "",
    assignedUsers: [] as string[],
    sections: [] as Array<{
      title: string;
      description: string;
      overview: string;
      assignedTo: string;
      dueDate: string;
    }>,
  });
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    projectId: undefined as string | undefined,
    assignedTo: undefined as string | undefined,
    dueDate: "",
    dueTime: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  // Fetch projects with manual fetch to debug
  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/hub/projects"],
    queryFn: async () => {
      console.log("Fetching hub projects...");
      const response = await fetch("/api/hub/projects", {
        credentials: "include",
        headers: {
          "Accept": "application/json",
        }
      });
      
      console.log("Hub Projects Response Status:", response.status);
      console.log("Hub Projects Response OK:", response.ok);
      
      if (!response.ok) {
        console.error("Hub Projects Response Error:", response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log("Hub Projects Raw Response:", text);
      
      try {
        const data = JSON.parse(text);
        console.log("Hub Projects Parsed Data:", data);
        return data;
      } catch (e) {
        console.error("Failed to parse projects JSON:", e);
        return [];
      }
    },
    enabled: true,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  
  // Debug logging for projects
  console.log("Hub Projects Data:", projects);
  console.log("Hub Projects Loading:", isLoading);
  console.log("Hub Projects Length:", projects.length);
  console.log("Hub Projects Error:", error);

  // Fetch tasks from API for tasks view
  const { data: apiTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["/api/hub/tasks"],
    enabled: contentView === "tasks",
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["/api/employees"],
    enabled: true,
  });

  // Get all tasks from projects and API
  const getAllTasks = (): Task[] => {
    const projectTasks: Task[] = [];
    projects.forEach((project: Project) => {
      project.tasks.forEach((task: Task) => {
        projectTasks.push({
          ...task,
          projectId: project.id,
          projectName: project.title,
        });
      });
    });
    
    // Combine with tasks from API (if available)
    const combinedTasks = [...projectTasks, ...apiTasks];
    
    // Remove duplicates based on task ID
    const uniqueTasks = combinedTasks.filter((task, index, self) =>
      index === self.findIndex((t) => t.id === task.id)
    );
    
    return uniqueTasks;
  };

  // Filter projects
  const filteredProjects = projects.filter((project: Project) => {
    // Filter by status
    if (filterStatus !== "all" && project.status !== filterStatus) return false;

    // Filter by search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower) ||
        project.assignedUserNames.some((name: string) => 
          name.toLowerCase().includes(searchLower)
        )
      );
    }

    return true;
  });

  // Filter tasks
  const allTasks = getAllTasks();
  const filteredTasks = allTasks.filter((task: Task) => {
    // Filter by status
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    
    // Filter by assignment
    if (taskFilterAssigned === "me" && task.assignedTo !== employee?.id) return false;
    if (taskFilterAssigned === "others" && task.assignedTo === employee?.id) return false;
    
    // Filter by priority
    if (taskFilterPriority !== "all" && task.priority !== taskFilterPriority) return false;
    
    // Filter by search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        task.assignedToName.toLowerCase().includes(searchLower) ||
        (task.projectName && task.projectName.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const payload = {
        title: projectData.title,
        description: projectData.description,
        category: projectData.category || null,
        overview: projectData.overview || null,
        dueDate: projectData.dueDate || null,
        assignedUsers: projectData.assignedUsers || [],
        sections: projectData.sections || [],
        status: "planning",
      };

      return apiRequest("POST", "/api/hub/projects", payload);
    },
    onSuccess: () => {
      // Invalidate queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ["/api/hub/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hub/tasks"] });
      
      toast({
        title: "Project Created",
        description: "Your project has been created successfully.",
      });
      
      setIsCreateProjectOpen(false);
      setNewProject({
        title: "",
        description: "",
        category: "",
        overview: "",
        dueDate: "",
        assignedUsers: [],
        sections: [],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = () => {
    if (!newProject.title) {
      toast({
        title: "Validation Error",
        description: "Project title is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate sections if any exist
    for (let i = 0; i < newProject.sections.length; i++) {
      if (!newProject.sections[i].title) {
        toast({
          title: "Validation Error",
          description: `Section ${i + 1} title is required.`,
          variant: "destructive",
        });
        return;
      }
    }

    createProjectMutation.mutate(newProject);
  };

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      // Combine date and time if both are provided
      let dueDatetime = null;
      if (taskData.dueDate) {
        if (taskData.dueTime) {
          dueDatetime = `${taskData.dueDate}T${taskData.dueTime}:00`;
        } else {
          dueDatetime = `${taskData.dueDate}T00:00:00`;
        }
      }

      const payload = {
        title: taskData.title,
        description: taskData.description,
        projectId: taskData.projectId ? parseInt(taskData.projectId) : null,
        assignedTo: taskData.assignedTo,
        dueDate: dueDatetime,
        priority: taskData.priority,
        status: "todo",
        source: "hub",
      };

      return apiRequest("POST", "/api/hub/tasks", payload);
    },
    onSuccess: () => {
      // Invalidate queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ["/api/hub/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hub/projects"] });
      
      toast({
        title: "Task Created",
        description: "Your task has been created successfully.",
      });
      
      setIsCreateTaskOpen(false);
      setNewTask({
        title: "",
        description: "",
        projectId: "",
        assignedTo: "",
        dueDate: "",
        dueTime: "",
        priority: "medium",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = () => {
    if (!newTask.title) {
      toast({
        title: "Validation Error",
        description: "Task name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!newTask.assignedTo) {
      toast({
        title: "Validation Error",
        description: "Please assign the task to someone.",
        variant: "destructive",
      });
      return;
    }

    createTaskMutation.mutate(newTask);
  };

  const handleUpdateProjectStatus = (projectId: number, status: string) => {
    // TODO: Implement status update
    console.log("Updating project status:", projectId, status);
  };

  const handleUpdateTaskStatus = (taskId: number, status: string) => {
    // TODO: Implement task status update
    console.log("Updating task status:", taskId, status);
  };

  const handleBulkTaskUpdate = (action: string) => {
    // TODO: Implement bulk task updates
    console.log("Bulk update:", action, selectedTasks);
    setSelectedTasks([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-gray-100 text-gray-700";
      case "active":
        return "bg-blue-100 text-blue-700";
      case "on_hold":
        return "bg-yellow-100 text-yellow-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "todo":
        return "bg-gray-100 text-gray-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 text-gray-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const projectsByStatus = {
    planning: filteredProjects.filter((p: Project) => p.status === "planning"),
    active: filteredProjects.filter((p: Project) => p.status === "active"),
    on_hold: filteredProjects.filter((p: Project) => p.status === "on_hold"),
    completed: filteredProjects.filter((p: Project) => p.status === "completed"),
  };

  const renderKanbanView = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Object.entries(projectsByStatus).map(([status, statusProjects]) => (
        <div key={status} className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <h3 className="font-medium capitalize">{status.replace("_", " ")}</h3>
            <Badge variant="secondary">{statusProjects.length}</Badge>
          </div>
          <div className="space-y-3">
            {statusProjects.map((project: Project) => (
              <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">{project.title}</h4>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                  <Progress value={project.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project.progress}% complete</span>
                    <span>{project.tasks.length} tasks</span>
                  </div>
                  {project.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(project.dueDate), "MMM d")}</span>
                    </div>
                  )}
                  <div className="flex -space-x-2">
                    {project.assignedUserNames.slice(0, 3).map((name, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-medium"
                      >
                        {name[0]}
                      </div>
                    ))}
                    {project.assignedUserNames.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                        +{project.assignedUserNames.length - 3}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderTasksListView = () => (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkTaskUpdate('complete')}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkTaskUpdate('assign')}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Reassign
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedTasks([])}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 w-10">
                    <Checkbox
                      checked={filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTasks(filteredTasks.map(t => t.id));
                        } else {
                          setSelectedTasks([]);
                        }
                      }}
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-sm">Task</th>
                  <th className="text-left p-4 font-medium text-sm">Project</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                  <th className="text-left p-4 font-medium text-sm">Priority</th>
                  <th className="text-left p-4 font-medium text-sm">Assigned To</th>
                  <th className="text-left p-4 font-medium text-sm">Due Date</th>
                  <th className="text-left p-4 font-medium text-sm w-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task: Task) => (
                  <tr key={task.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTasks([...selectedTasks, task.id]);
                          } else {
                            setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                          }
                        }}
                      />
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {task.projectName ? (
                        <span className="text-sm">{task.projectName}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge className={getTaskStatusColor(task.status)} variant="secondary">
                        {task.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={getPriorityColor(task.priority)} variant="secondary">
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {task.assignedToName[0]}
                        </div>
                        <span className="text-sm">{task.assignedToName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {task.dueDate ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(task.dueDate), "MMM d")}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTasksBoardView = () => {
    const tasksByStatus = {
      todo: filteredTasks.filter(t => t.status === 'todo'),
      in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
      completed: filteredTasks.filter(t => t.status === 'completed'),
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <h3 className="font-medium capitalize">{status.replace("_", " ")}</h3>
              <Badge variant="secondary">{statusTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {statusTasks.map((task: Task) => (
                <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(task.priority)} variant="secondary">
                        {task.priority}
                      </Badge>
                      {task.projectName && (
                        <span className="text-xs text-muted-foreground">{task.projectName}</span>
                      )}
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(task.dueDate), "MMM d")}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {task.assignedToName[0]}
                      </div>
                      <span className="text-xs">{task.assignedToName}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {statusTasks.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTasksCalendarView = () => {
    // Get current month
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    // Group tasks by date
    const tasksByDate: { [key: string]: Task[] } = {};
    filteredTasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(task);
      }
    });

    const calendarDays = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null);
    }
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{format(today, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
              <Button size="sm" variant="outline">
                Today
              </Button>
              <Button size="sm" variant="outline">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-background p-2 text-center text-sm font-medium">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              const dateStr = day ? format(new Date(currentYear, currentMonth, day), 'yyyy-MM-dd') : '';
              const dayTasks = dateStr ? tasksByDate[dateStr] || [] : [];
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              
              return (
                <div
                  key={index}
                  className={`bg-background min-h-[100px] p-2 ${day ? 'hover:bg-muted/50' : ''} ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  {day && (
                    <>
                      <div className="text-sm font-medium mb-1">{day}</div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 3).map((task, i) => (
                          <div
                            key={task.id}
                            className={`text-xs p-1 rounded truncate ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            }`}
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTasksView = () => {
    switch (taskViewMode) {
      case 'board':
        return renderTasksBoardView();
      case 'calendar':
        return renderTasksCalendarView();
      case 'list':
      default:
        return renderTasksListView();
    }
  };

  const renderListView = () => (
    <div className="space-y-4">
      {filteredProjects.map((project: Project) => (
        <Card 
          key={project.id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setSelectedProject(project);
            setIsProjectDetailOpen(true);
          }}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(project.status)} variant="secondary">
                  {project.status}
                </Badge>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Progress value={project.progress} className="w-24 h-2" />
                <span className="text-muted-foreground">{project.progress}%</span>
              </div>
              {project.dueDate && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Due {format(new Date(project.dueDate), "MMM d, yyyy")}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{project.assignedUserNames.length} members</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>
                  {project.tasks.filter((t: Task) => t.status === "completed").length}/{project.tasks.length} tasks
                </span>
              </div>
            </div>

            {/* Task List */}
            {project.tasks.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium mb-2">Tasks</h4>
                {project.tasks.slice(0, 3).map((task: Task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <CheckCircle
                        className={`h-4 w-4 ${
                          task.status === "completed" ? "text-green-600" : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-sm">{task.title}</span>
                      <Badge className={getPriorityColor(task.priority)} variant="secondary">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{task.assignedToName}</span>
                    </div>
                  </div>
                ))}
                {project.tasks.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full">
                    View all {project.tasks.length} tasks
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Project Detail Modal
  const ProjectDetailModal = () => {
    if (!selectedProject) return null;

    return (
      <Dialog open={isProjectDetailOpen} onOpenChange={setIsProjectDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{selectedProject.title}</DialogTitle>
            <DialogDescription>Project Details and Information</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Project Status and Due Date */}
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(selectedProject.status)} variant="secondary">
                {selectedProject.status}
              </Badge>
              {selectedProject.dueDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Due {format(new Date(selectedProject.dueDate), "MMMM d, yyyy")}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Progress value={selectedProject.progress} className="w-24 h-2" />
                <span>{selectedProject.progress}%</span>
              </div>
            </div>

            {/* Project Description */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Project Description</h3>
              <p className="text-muted-foreground">{selectedProject.description || "No description provided"}</p>
            </div>

            {/* Project Category */}
            {selectedProject.category && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Category</h3>
                <Badge variant="outline">{selectedProject.category}</Badge>
              </div>
            )}

            {/* Project Overview */}
            {selectedProject.overview && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Project Overview</h3>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedProject.overview}</p>
                </div>
              </div>
            )}

            {/* Assigned Team Members */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Assigned Team Members</h3>
              <div className="flex flex-wrap gap-2">
                {selectedProject.assignedUserNames.length > 0 ? (
                  selectedProject.assignedUserNames.map((name, index) => (
                    <Badge key={index} variant="secondary">
                      <User className="h-3 w-3 mr-1" />
                      {name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No team members assigned</span>
                )}
              </div>
            </div>

            {/* Project Sections */}
            {selectedProject.sections && selectedProject.sections.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Project Sections</h3>
                <div className="space-y-4">
                  {selectedProject.sections.map((section, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-base">{section.title}</CardTitle>
                        {section.dueDate && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Due {format(new Date(section.dueDate), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {section.description && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Description</h4>
                            <p className="text-sm text-muted-foreground">{section.description}</p>
                          </div>
                        )}
                        {section.overview && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Overview</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.overview}</p>
                          </div>
                        )}
                        {section.content && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Content</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.content}</p>
                          </div>
                        )}
                        {section.assignedTo && (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Assigned to: {section.assignedTo}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            {selectedProject.tasks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Project Tasks</h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      {selectedProject.tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle
                              className={`h-4 w-4 ${
                                task.status === "completed" ? "text-green-600" : "text-muted-foreground"
                              }`}
                            />
                            <span className="text-sm font-medium">{task.title}</span>
                            <Badge className={getPriorityColor(task.priority)} variant="secondary">
                              {task.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{task.assignedToName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">Created by:</span>
                <span>{selectedProject.createdByName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Created on:</span>
                <span>{format(new Date(selectedProject.createdAt), "MMMM d, yyyy 'at' h:mm a")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Last updated:</span>
                <span>{format(new Date(selectedProject.updatedAt), "MMMM d, yyyy 'at' h:mm a")}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsProjectDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <PageHeader
        title="Tasks/Projects"
        description="Manage and track tasks and projects assigned to you or your team"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {projects.filter((p: Project) => p.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.reduce((acc: number, p: Project) => acc + p.tasks.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {projects.reduce((acc: number, p: Project) => 
                acc + p.tasks.filter((t: Task) => t.status === "completed").length, 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* Toggle between Projects and Tasks */}
            <div className="flex items-center gap-2">
              <Button
                variant={contentView === "projects" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setContentView("projects");
                  setFilterStatus("all");
                  setSelectedTasks([]);
                }}
                className="h-9"
              >
                <FolderKanban className="h-4 w-4 mr-2" />
                Projects
              </Button>
              <Button
                variant={contentView === "tasks" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setContentView("tasks");
                  setFilterStatus("all");
                  setSelectedTasks([]);
                  // Manually refetch tasks when switching to Tasks tab
                  setTimeout(() => refetchTasks(), 100);
                }}
                className="h-9"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Tasks
              </Button>
            </div>
            
            <div className="flex gap-2">
              {contentView === "projects" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === "list" ? "kanban" : "list")}
                >
                  {viewMode === "list" ? (
                    <>
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Kanban View
                    </>
                  ) : (
                    <>
                      <List className="h-4 w-4 mr-2" />
                      List View
                    </>
                  )}
                </Button>
              )}
              {contentView === "tasks" && (
                <>
                  {/* View toggle buttons for Tasks */}
                  <div className="flex items-center gap-1 border rounded-lg p-1">
                    <Button
                      variant={taskViewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setTaskViewMode("list")}
                      className="h-8 px-3"
                    >
                      <List className="h-4 w-4 mr-1" />
                      List
                    </Button>
                    <Button
                      variant={taskViewMode === "board" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setTaskViewMode("board")}
                      className="h-8 px-3"
                    >
                      <FolderKanban className="h-4 w-4 mr-1" />
                      Board
                    </Button>
                    <Button
                      variant={taskViewMode === "calendar" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setTaskViewMode("calendar")}
                      className="h-8 px-3"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Calendar
                    </Button>
                  </div>
                  
                  <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        New Task
                      </Button>
                    </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>
                      Add a new task to track work
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-name">Task Name *</Label>
                      <Input
                        id="task-name"
                        placeholder="Enter task name..."
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="task-description">Task Description</Label>
                      <SimpleRichEditor
                        value={newTask.description}
                        onChange={(value) => setNewTask({ ...newTask, description: value })}
                        placeholder="Enter task description (supports text, images, and links)..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority Level</Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(value: "low" | "medium" | "high") => 
                          setNewTask({ ...newTask, priority: value })
                        }
                      >
                        <SelectTrigger id="priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="due-date">Due Date (Optional)</Label>
                        <Input
                          id="due-date"
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="due-time">Due Time (Optional)</Label>
                        <Input
                          id="due-time"
                          type="time"
                          value={newTask.dueTime}
                          onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="assigned-to">Assigned To *</Label>
                      <Select
                        value={newTask.assignedTo || "unassigned"}
                        onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value === "unassigned" ? undefined : value })}
                      >
                        <SelectTrigger id="assigned-to">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Select team member</SelectItem>
                          {teamMembers.map((member: any) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName} ({member.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="project">Project (Optional)</Label>
                      <Select
                        value={newTask.projectId || "no-project"}
                        onValueChange={(value) => setNewTask({ ...newTask, projectId: value === "no-project" ? undefined : value })}
                      >
                        <SelectTrigger id="project">
                          <SelectValue placeholder="Select a project (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-project">No Project</SelectItem>
                          {projects.map((project: Project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateTaskOpen(false);
                        setNewTask({
                          title: "",
                          description: "",
                          projectId: undefined,
                          assignedTo: undefined,
                          dueDate: "",
                          dueTime: "",
                          priority: "medium",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateTask} 
                      disabled={!newTask.title || !newTask.assignedTo || newTask.assignedTo === "unassigned" || createTaskMutation.isPending}
                    >
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </>
              )}
              {contentView === "projects" && (
                <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Start a new project with your team
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Project Level Fields */}
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h3 className="font-medium text-sm text-muted-foreground">PROJECT DETAILS</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="project-title">Project Title *</Label>
                        <Input
                          id="project-title"
                          placeholder="Enter project title..."
                          value={newProject.title}
                          onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="project-description">Project Description</Label>
                        <Textarea
                          id="project-description"
                          placeholder="Enter project description..."
                          value={newProject.description}
                          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="project-category">Project Category</Label>
                        <Select
                          value={newProject.category}
                          onValueChange={(value) => setNewProject({ ...newProject, category: value })}
                        >
                          <SelectTrigger id="project-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="content-creation">Content Creation</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="development">Development</SelectItem>
                            <SelectItem value="design">Design</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="customer-success">Customer Success</SelectItem>
                            <SelectItem value="research">Research</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="project-overview">Project Basic Overview</Label>
                        <SimpleRichEditor
                          value={newProject.overview}
                          onChange={(value) => setNewProject({ ...newProject, overview: value })}
                          placeholder="Enter project overview (supports text formatting, links, images, and PDFs)..."
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="project-due-date">Due Date</Label>
                        <Input
                          id="project-due-date"
                          type="date"
                          value={newProject.dueDate}
                          onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Project Sections */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm text-muted-foreground">PROJECT SECTIONS</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewProject({
                              ...newProject,
                              sections: [
                                ...newProject.sections,
                                {
                                  title: "",
                                  description: "",
                                  overview: "",
                                  assignedTo: "",
                                  dueDate: "",
                                }
                              ]
                            });
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Section
                        </Button>
                      </div>

                      {newProject.sections.map((section, index) => (
                        <div key={index} className="space-y-4 p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Section {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedSections = newProject.sections.filter((_, i) => i !== index);
                                setNewProject({ ...newProject, sections: updatedSections });
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`section-title-${index}`}>Section Title *</Label>
                            <Input
                              id={`section-title-${index}`}
                              placeholder="Enter section title..."
                              value={section.title}
                              onChange={(e) => {
                                const updatedSections = [...newProject.sections];
                                updatedSections[index].title = e.target.value;
                                setNewProject({ ...newProject, sections: updatedSections });
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`section-description-${index}`}>Section Description</Label>
                            <Textarea
                              id={`section-description-${index}`}
                              placeholder="Enter section description..."
                              value={section.description}
                              onChange={(e) => {
                                const updatedSections = [...newProject.sections];
                                updatedSections[index].description = e.target.value;
                                setNewProject({ ...newProject, sections: updatedSections });
                              }}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`section-overview-${index}`}>Section Basic Overview</Label>
                            <SimpleRichEditor
                              value={section.overview}
                              onChange={(value) => {
                                const updatedSections = [...newProject.sections];
                                updatedSections[index].overview = value;
                                setNewProject({ ...newProject, sections: updatedSections });
                              }}
                              placeholder="Enter section overview (supports text formatting, links, images, and PDFs)..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`section-assigned-${index}`}>Team/Employee</Label>
                              <Select
                                value={section.assignedTo}
                                onValueChange={(value) => {
                                  const updatedSections = [...newProject.sections];
                                  updatedSections[index].assignedTo = value;
                                  setNewProject({ ...newProject, sections: updatedSections });
                                }}
                              >
                                <SelectTrigger id={`section-assigned-${index}`}>
                                  <SelectValue placeholder="Select team member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamMembers.map((member: any) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {member.firstName} {member.lastName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`section-due-date-${index}`}>Due Date</Label>
                              <Input
                                id={`section-due-date-${index}`}
                                type="date"
                                value={section.dueDate}
                                onChange={(e) => {
                                  const updatedSections = [...newProject.sections];
                                  updatedSections[index].dueDate = e.target.value;
                                  setNewProject({ ...newProject, sections: updatedSections });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {newProject.sections.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg">
                          <p className="text-sm">No sections added yet.</p>
                          <p className="text-xs mt-1">Click "Add Section" to add project sections.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateProjectOpen(false);
                        setNewProject({
                          title: "",
                          description: "",
                          category: "",
                          overview: "",
                          dueDate: "",
                          assignedUsers: [],
                          sections: [],
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProject} disabled={!newProject.title || createProjectMutation.isPending}>
                      {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={contentView === "projects" ? "Search projects..." : "Search tasks..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {contentView === "projects" ? (
                  <>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {contentView === "tasks" && (
              <>
                <Select value={taskFilterAssigned} onValueChange={setTaskFilterAssigned}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Assigned to" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="me">Assigned to Me</SelectItem>
                    <SelectItem value="others">Assigned to Others</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={taskFilterPriority} onValueChange={setTaskFilterPriority}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content View */}
      <div>
        {contentView === "projects" ? (
          // Projects View
          isLoading ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                Loading projects...
              </CardContent>
            </Card>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                No projects found matching your filters
              </CardContent>
            </Card>
          ) : viewMode === "kanban" ? (
            renderKanbanView()
          ) : (
            renderListView()
          )
        ) : (
          // Tasks View
          tasksLoading ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                Loading tasks...
              </CardContent>
            </Card>
          ) : (
            renderTasksView()
          )
        )}
      </div>

      {/* Project Detail Modal */}
      <ProjectDetailModal />
    </div>
  );
}