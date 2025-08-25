import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Table,
  Plus,
  Search,
  Folder,
  Tag,
  Download,
  Eye,
  Edit,
  Trash2,
  Link,
  Video,
  FileSpreadsheet,
  File,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Grid,
  List,
  Star,
  Clock,
  Upload,
  Filter,
  MoreVertical,
  X,
  Image,
  Music,
  Archive,
  ExternalLink,
  Copy,
  Move,
  Share2,
  Lock,
  Users,
  History,
  RefreshCw,
  Trash,
  Info,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { useCrmAuth } from "@/contexts/CrmAuthContext";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// File type definitions
interface FileNode {
  id: string;
  name: string;
  type: "folder" | "doc" | "sheet" | "pdf" | "video" | "image" | "link" | "audio" | "archive" | "other";
  parentId: string | null;
  path: string;
  size?: number;
  mimeType?: string;
  url?: string;
  content?: string;
  tags: string[];
  starred: boolean;
  deleted: boolean;
  deletedAt?: string;
  permissions: {
    visibility: "private" | "team" | "public";
    assignedTo?: string[];
    linkedProjects?: string[];
    linkedTasks?: string[];
  };
  metadata: {
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedBy: string;
    updatedByName: string;
    updatedAt: string;
    lastOpenedAt?: string;
    version: number;
    versionHistory?: Array<{
      version: number;
      updatedBy: string;
      updatedAt: string;
      changes: string;
    }>;
  };
  children?: FileNode[];
}

// Helper function to get file icon
const getFileIcon = (type: FileNode["type"], size: "sm" | "md" | "lg" = "md") => {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6";
  
  switch (type) {
    case "folder":
      return <Folder className={cn(sizeClass, "text-blue-500")} />;
    case "doc":
      return <FileText className={cn(sizeClass, "text-blue-600")} />;
    case "sheet":
      return <FileSpreadsheet className={cn(sizeClass, "text-green-600")} />;
    case "pdf":
      return <File className={cn(sizeClass, "text-red-600")} />;
    case "video":
      return <Video className={cn(sizeClass, "text-purple-600")} />;
    case "image":
      return <Image className={cn(sizeClass, "text-yellow-600")} />;
    case "link":
      return <Link className={cn(sizeClass, "text-cyan-600")} />;
    case "audio":
      return <Music className={cn(sizeClass, "text-pink-600")} />;
    case "archive":
      return <Archive className={cn(sizeClass, "text-gray-600")} />;
    default:
      return <File className={cn(sizeClass, "text-gray-500")} />;
  }
};

// Helper function to format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export default function HubDocsSheets() {
  const { employee } = useCrmAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [isFoldersPanelCollapsed, setIsFoldersPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem("hub-docs-folders-collapsed");
    return saved === "true";
  });
  const [folderSearchTerm, setFolderSearchTerm] = useState("");
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [activeTab, setActiveTab] = useState("documents");
  
  // Admin Panel states
  const [adminSelectedUser, setAdminSelectedUser] = useState<string>("all");
  const [adminSearchTerm, setAdminSearchTerm] = useState("");
  const [adminFilterType, setAdminFilterType] = useState("all");
  const [newCategory, setNewCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([
    "General", "Marketing", "Finance", "HR", "Operations", 
    "Sales", "Product", "Engineering", "Design", "Legal", "Customer Success"
  ]);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState("7days");
  
  // User-specific favorites (stored by file ID)
  const [userFavorites, setUserFavorites] = useState<Set<string>>(() => {
    const userId = employee?.id || 'guest';
    const saved = localStorage.getItem(`hub-favorites-${userId}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  // Folder-specific preferences
  const [folderPreferences, setFolderPreferences] = useState<{
    [folderId: string]: {
      viewMode: 'list' | 'grid';
      sortBy: 'favorites' | 'name-asc' | 'name-desc';
    }
  }>(() => {
    const userId = employee?.id || 'guest';
    const saved = localStorage.getItem(`hub-folder-prefs-${userId}`);
    return saved ? JSON.parse(saved) : {};
  });
  
  // Get current folder's preferences with defaults
  const currentFolderPrefs = useMemo(() => {
    return folderPreferences[currentFolderId] || {
      viewMode: 'list',
      sortBy: 'name-asc'
    };
  }, [folderPreferences, currentFolderId]);
  
  const viewMode = currentFolderPrefs.viewMode;
  const sortBy = currentFolderPrefs.sortBy;
  
  // Toggle folder panel collapsed state
  const toggleFoldersPanel = () => {
    const newState = !isFoldersPanelCollapsed;
    setIsFoldersPanelCollapsed(newState);
    localStorage.setItem("hub-docs-folders-collapsed", newState.toString());
  };
  
  // Toggle favorite status for a file
  const toggleFavorite = (fileId: string) => {
    const userId = employee?.id || 'guest';
    setUserFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(fileId)) {
        newFavorites.delete(fileId);
      } else {
        newFavorites.add(fileId);
      }
      // Save to localStorage
      localStorage.setItem(`hub-favorites-${userId}`, JSON.stringify(Array.from(newFavorites)));
      return newFavorites;
    });
  };
  
  // Update folder-specific preferences
  const updateFolderPreferences = (folderId: string, updates: Partial<{
    viewMode: 'list' | 'grid';
    sortBy: 'favorites' | 'name-asc' | 'name-desc';
  }>) => {
    const userId = employee?.id || 'guest';
    setFolderPreferences(prev => {
      const newPrefs = {
        ...prev,
        [folderId]: {
          ...prev[folderId],
          ...updates
        }
      };
      // Save to localStorage
      localStorage.setItem(`hub-folder-prefs-${userId}`, JSON.stringify(newPrefs));
      return newPrefs;
    });
  };
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"google-doc" | "google-sheet" | "google-drive" | "video-link" | "folder">("google-doc");
  const [newItemName, setNewItemName] = useState("");
  const [newItemUrl, setNewItemUrl] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<string>("general");
  const [newItemPermission, setNewItemPermission] = useState<"private" | "team" | "public">("team");
  const [newItemAssignees, setNewItemAssignees] = useState<string[]>([]);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItems, setDraggedItems] = useState<string[]>([]);

  // Fetch file system data
  const { data: fileSystem = { files: [], folders: [] }, isLoading } = useQuery<{
    files: FileNode[];
    folders: FileNode[];
  }>({
    queryKey: ["/api/hub/filesystem"],
    enabled: true,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Filter folder tree based on search term
  const filterFolderTree = useCallback((nodes: FileNode[], searchTerm: string): FileNode[] => {
    if (!searchTerm) return nodes;
    
    const lowerSearch = searchTerm.toLowerCase();
    
    const filterNode = (node: FileNode): FileNode | null => {
      // Check if current node matches
      const nameMatches = node.name.toLowerCase().includes(lowerSearch);
      
      // Recursively filter children
      const filteredChildren = node.children ? 
        node.children
          .map(child => filterNode(child))
          .filter(child => child !== null) as FileNode[] 
        : [];
      
      // Include node if it matches or has matching children
      if (nameMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      
      return null;
    };
    
    return nodes
      .map(node => filterNode(node))
      .filter(node => node !== null) as FileNode[];
  }, []);

  // Build file tree structure
  const buildFileTree = useCallback((files: FileNode[]): FileNode[] => {
    const fileMap = new Map<string, FileNode>();
    const rootNodes: FileNode[] = [];

    // First pass: create all nodes
    files.forEach(file => {
      fileMap.set(file.id, { ...file, children: [] });
    });

    // Second pass: build tree
    files.forEach(file => {
      const node = fileMap.get(file.id)!;
      if (file.parentId === null || file.parentId === "root") {
        rootNodes.push(node);
      } else {
        const parent = fileMap.get(file.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      }
    });

    return rootNodes;
  }, []);

  const fileTree = useMemo(() => {
    // Use folders from fileSystem.folders, not fileSystem.files
    const folders = buildFileTree(fileSystem.folders || []);
    return filterFolderTree(folders, folderSearchTerm);
  }, [fileSystem, buildFileTree, filterFolderTree, folderSearchTerm]);
  
  // Auto-expand all folders when searching
  useEffect(() => {
    if (folderSearchTerm) {
      // When searching, expand all folders to show results
      const getAllFolderIds = (nodes: FileNode[]): Set<string> => {
        const ids = new Set<string>(["root"]);
        const collectIds = (node: FileNode) => {
          if (node.type === "folder") {
            ids.add(node.id);
            if (node.children) {
              node.children.forEach(collectIds);
            }
          }
        };
        nodes.forEach(collectIds);
        return ids;
      };
      setExpandedFolders(getAllFolderIds(fileTree));
    }
  }, [folderSearchTerm, fileTree]);

  // Get all tags from files - filter out empty/undefined values
  const allTags = Array.from(
    new Set(
      (fileSystem.files || []).flatMap((file: FileNode) => file.tags || [])
    )
  ).filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== "");

  // Get all owners - filter out empty/undefined values
  const allOwners = Array.from(
    new Set(
      (fileSystem.files || []).map((file: FileNode) => file.metadata?.createdByName).filter(Boolean)
    )
  ).filter((owner): owner is string => typeof owner === 'string' && owner.trim() !== "");

  // Filter files based on current view and filters
  const getFilteredFiles = useCallback(() => {
    let files = fileSystem.files || [];

    // Filter by current folder
    if (currentFolderId !== "root") {
      files = files.filter((file: FileNode) => file.parentId === currentFolderId);
    } else {
      files = files.filter((file: FileNode) => !file.parentId || file.parentId === "root");
    }

    // Filter by deleted status
    files = files.filter((file: FileNode) => file.deleted === showDeleted);

    // Filter by type
    if (filterType !== "all") {
      files = files.filter((file: FileNode) => file.type === filterType);
    }

    // Filter by category
    if (filterCategory !== "all") {
      files = files.filter((file: FileNode) => file.category === filterCategory);
    }

    // Filter by owner
    if (filterOwner !== "all") {
      files = files.filter((file: FileNode) => file.metadata.createdByName === filterOwner);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      files = files.filter((file: FileNode) => 
        file.name.toLowerCase().includes(search) ||
        file.tags.some(tag => tag.toLowerCase().includes(search)) ||
        file.content?.toLowerCase().includes(search)
      );
    }

    // Sort files based on folder preference
    files.sort((a: FileNode, b: FileNode) => {
      // First, handle favorites if that's the sort mode
      if (sortBy === 'favorites') {
        const aIsFavorite = userFavorites.has(a.id);
        const bIsFavorite = userFavorites.has(b.id);
        
        // Favorites come first
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        
        // If both are favorites or both are not, sort alphabetically
        return a.name.localeCompare(b.name);
      }
      
      // Alphabetical sorting
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      
      return 0;
    });

    return files;
  }, [fileSystem.files, currentFolderId, showDeleted, filterType, filterCategory, filterOwner, searchTerm, sortBy, userFavorites]);

  const filteredFiles = getFilteredFiles();

  // Get current folder information
  const currentFolder = useMemo(() => {
    if (currentFolderId === "root" || ["starred", "recent"].includes(currentFolderId)) {
      return null;
    }
    // Find the folder in the fileSystem
    const findFolder = (folders: FileNode[]): FileNode | null => {
      for (const folder of folders) {
        if (folder.id === currentFolderId) {
          return folder;
        }
        if (folder.children) {
          const found = findFolder(folder.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFolder(fileSystem.folders || []);
  }, [currentFolderId, fileSystem.folders]);

  // Get recently accessed files
  const recentFiles = (fileSystem.files || [])
    .filter((file: FileNode) => file.metadata.lastOpenedAt && !file.deleted)
    .sort((a: FileNode, b: FileNode) => 
      new Date(b.metadata.lastOpenedAt!).getTime() - new Date(a.metadata.lastOpenedAt!).getTime()
    )
    .slice(0, 5);

  // Get starred files
  const starredFiles = (fileSystem.files || [])
    .filter((file: FileNode) => file.starred && !file.deleted);

  // File operations mutations
  const createFileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/hub/filesystem", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hub/filesystem"] });
      toast({ title: "Success", description: "File created successfully" });
      setIsCreateOpen(false);
      resetCreateForm();
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/hub/filesystem/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hub/filesystem"] });
      toast({ title: "Success", description: "File updated successfully" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (ids: string[]) => 
      apiRequest("DELETE", "/api/hub/filesystem", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hub/filesystem"] });
      toast({ title: "Success", description: "Files deleted successfully" });
      setSelectedFiles(new Set());
    },
  });

  const restoreFileMutation = useMutation({
    mutationFn: (ids: string[]) => 
      apiRequest("POST", "/api/hub/filesystem/restore", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hub/filesystem"] });
      toast({ title: "Success", description: "Files restored successfully" });
      setSelectedFiles(new Set());
    },
  });

  // Handle file operations
  const handleCreateItem = () => {
    // Special folders (starred, recent) should create items at root level
    const isSpecialFolder = ["root", "starred", "recent"].includes(currentFolderId);
    
    const data = {
      name: newItemName,
      type: createType === "google-doc" ? "doc" : 
            createType === "google-sheet" ? "sheet" : 
            createType === "google-drive" ? "link" :
            createType === "video-link" ? "video" : createType,
      parentId: isSpecialFolder ? null : currentFolderId,
      url: ["google-doc", "google-sheet", "google-drive", "video-link"].includes(createType) ? newItemUrl : undefined,
      category: newItemCategory,
      permissions: {
        visibility: newItemPermission,
        assignedTo: newItemAssignees,
      },
    };
    createFileMutation.mutate(data);
  };

  const handleStarToggle = (file: FileNode) => {
    updateFileMutation.mutate({
      id: file.id,
      data: { starred: !file.starred },
    });
  };

  const handleDelete = (permanent: boolean = false) => {
    const ids = Array.from(selectedFiles);
    if (permanent || showDeleted) {
      // Permanent delete
      if (confirm("Are you sure you want to permanently delete these files?")) {
        deleteFileMutation.mutate(ids);
      }
    } else {
      // Move to trash
      updateFileMutation.mutate({
        id: ids[0], // Handle bulk update differently
        data: { deleted: true, deletedAt: new Date().toISOString() },
      });
    }
  };

  const handleRestore = () => {
    const ids = Array.from(selectedFiles);
    restoreFileMutation.mutate(ids);
  };

  // Additional handlers for bulk actions
  const handleMove = () => {
    toast({
      title: "Move Files",
      description: "Moving files to a new folder...",
    });
  };

  const handleRename = () => {
    toast({
      title: "Rename File",
      description: "Renaming file...",
    });
  };

  const handleAddTag = () => {
    toast({
      title: "Add Tag",
      description: "Adding tag to file...",
    });
  };

  const resetCreateForm = () => {
    setNewItemName("");
    setNewItemUrl("");
    setNewItemCategory("general");
    setNewItemPermission("team");
    setNewItemAssignees([]);
  };

  // Handle folder navigation
  const handleFolderClick = (folder: FileNode) => {
    setCurrentFolderId(folder.id);
    if (expandedFolders.has(folder.id)) {
      setExpandedFolders(prev => {
        const next = new Set(prev);
        next.delete(folder.id);
        return next;
      });
    } else {
      setExpandedFolders(prev => new Set(Array.from(prev).concat(folder.id)));
    }
  };

  // Handle file selection
  const handleFileSelect = (file: FileNode, multiSelect: boolean = false) => {
    if (multiSelect) {
      setSelectedFiles(prev => {
        const next = new Set(prev);
        if (next.has(file.id)) {
          next.delete(file.id);
        } else {
          next.add(file.id);
        }
        return next;
      });
    } else {
      setSelectedFile(file);
      setShowRightPanel(true);
    }
  };

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, files: string[]) => {
    setIsDragging(true);
    setDraggedItems(files);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItems([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Move files to target folder
    draggedItems.forEach(fileId => {
      updateFileMutation.mutate({
        id: fileId,
        data: { parentId: targetFolderId },
      });
    });
    
    handleDragEnd();
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Special folders (starred, recent) should create items at root level
    const isSpecialFolder = ["root", "starred", "recent"].includes(currentFolderId);

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = {
          name: file.name,
          type: getFileTypeFromMime(file.type),
          size: file.size,
          mimeType: file.type,
          parentId: isSpecialFolder ? null : currentFolderId,
          content: event.target?.result as string,
        };
        createFileMutation.mutate(data);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload with specific type
  const handleFileUploadWithType = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'pdf' | 'image') => {
    const files = e.target.files;
    if (!files) return;

    // Special folders (starred, recent) should create items at root level
    const isSpecialFolder = ["root", "starred", "recent"].includes(currentFolderId);

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = {
          name: file.name,
          type: fileType,
          size: file.size,
          mimeType: file.type,
          parentId: isSpecialFolder ? null : currentFolderId,
          content: event.target?.result as string,
        };
        createFileMutation.mutate(data);
      };
      reader.readAsDataURL(file);
    });
  };

  const getFileTypeFromMime = (mimeType: string): FileNode["type"] => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.includes("pdf")) return "pdf";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "sheet";
    if (mimeType.includes("document") || mimeType.includes("word")) return "doc";
    if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar")) return "archive";
    return "other";
  };

  // Render folder tree
  const renderFolderTree = (nodes: FileNode[], level: number = 0) => {
    return nodes
      .filter(node => node.type === "folder" && !node.deleted)
      .map(folder => (
        <div key={folder.id}>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer",
              currentFolderId === folder.id && "bg-muted",
              level > 0 && "ml-4"
            )}
            onClick={() => handleFolderClick(folder)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, folder.id)}
          >
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
              {expandedFolders.has(folder.id) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
            {expandedFolders.has(folder.id) ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )}
            <span className="text-sm flex-1">{folder.name}</span>
            <Badge variant="secondary" className="text-xs">
              {folder.children?.length || 0}
            </Badge>
          </div>
          {expandedFolders.has(folder.id) && folder.children && (
            <div>{renderFolderTree(folder.children, level + 1)}</div>
          )}
        </div>
      ));
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Folder Tree */}
      {!isFoldersPanelCollapsed && (
        <div className="w-64 border-r bg-muted/10 flex flex-col">
          <div className="p-4 border-b relative">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Folders</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFoldersPanel}
                className="h-6 w-6 p-0"
                title="Collapse folders panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search folders..."
                value={folderSearchTerm}
                onChange={(e) => setFolderSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setCreateType("folder");
                setIsCreateOpen(true);
              }}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Quick Access */}
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2">QUICK ACCESS</h3>
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer",
                  currentFolderId === "starred" && "bg-muted"
                )}
                onClick={() => setCurrentFolderId("starred")}
              >
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Starred</span>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {starredFiles.length}
                </Badge>
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer",
                  currentFolderId === "recent" && "bg-muted"
                )}
                onClick={() => setCurrentFolderId("recent")}
              >
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Recent</span>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {recentFiles.length}
                </Badge>
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer",
                  showDeleted && "bg-muted"
                )}
                onClick={() => setShowDeleted(!showDeleted)}
              >
                <Trash className="h-4 w-4 text-red-500" />
                <span className="text-sm">Trash</span>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Folder Tree */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2">FOLDERS</h3>
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer",
                  currentFolderId === "root" && "bg-muted"
                )}
                onClick={() => setCurrentFolderId("root")}
              >
                <Folder className="h-4 w-4 text-blue-500" />
                <span className="text-sm">All Files</span>
              </div>
              {renderFolderTree(fileTree)}
            </div>
          </div>
        </ScrollArea>
      </div>
      )}

      {/* Collapsed Panel Button */}
      {isFoldersPanelCollapsed && (
        <div className="border-r bg-muted/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFoldersPanel}
            className="h-full px-1 py-4 rounded-none"
            title="Expand folders panel"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main Panel */}
      <div className="flex-1 flex flex-col">
        {/* Tabs - Only show if admin */}
        {employee?.accessLevel === "admin" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b px-4 pt-4">
              <TabsList className="grid w-fit grid-cols-2 mb-4">
                <TabsTrigger value="documents">Documents & Sheets</TabsTrigger>
                <TabsTrigger value="admin">Admin Panel</TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="documents" className="flex-1 flex flex-col mt-0">
            {/* Header */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between mb-4">
                <PageHeader
                  title={currentFolder ? currentFolder.name : "Documents & Sheets"}
                  description={currentFolder ? `Files in ${currentFolder.name}` : "Centralized document and data management"}
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRightPanel(!showRightPanel)}
                  >
                    {showRightPanel ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="doc">Documents</SelectItem>
                  <SelectItem value="sheet">Sheets</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="link">Links</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="archive">Archives</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="customer-success">Customer Success</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={sortBy} 
                onValueChange={(value) => updateFolderPreferences(currentFolderId, { sortBy: value as any })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="favorites">
                    <div className="flex items-center gap-2">
                      <Star className="h-3 w-3" />
                      Favorites First
                    </div>
                  </SelectItem>
                  <SelectItem value="name-asc">
                    <div className="flex items-center gap-2">
                      Name (A-Z)
                    </div>
                  </SelectItem>
                  <SelectItem value="name-desc">
                    <div className="flex items-center gap-2">
                      Name (Z-A)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => updateFolderPreferences(currentFolderId, { viewMode: "list" })}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => updateFolderPreferences(currentFolderId, { viewMode: "grid" })}
                  className="rounded-l-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>

              {/* Hidden file input for uploads */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Create dropdown with Upload */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    setCreateType("google-doc");
                    setIsCreateOpen(true);
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Google Doc Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setCreateType("google-sheet");
                    setIsCreateOpen(true);
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Google Sheet Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setCreateType("google-drive");
                    setIsCreateOpen(true);
                  }}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Google Drive Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf';
                    input.onchange = (e) => handleFileUploadWithType(e as any, 'pdf');
                    input.click();
                  }}>
                    <FileText className="h-4 w-4 mr-2 text-red-500" />
                    Upload PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => handleFileUploadWithType(e as any, 'image');
                    input.click();
                  }}>
                    <Image className="h-4 w-4 mr-2 text-green-500" />
                    Upload Image
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    setCreateType("video-link");
                    setIsCreateOpen(true);
                  }}>
                    <Video className="h-4 w-4 mr-2 text-blue-500" />
                    Video Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    setCreateType("folder");
                    setIsCreateOpen(true);
                  }}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bulk actions */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2 mt-4 p-2 bg-muted rounded">
              <span className="text-sm text-muted-foreground">
                {selectedFiles.size} selected
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFiles(new Set())}>
                <X className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-4" />
              {showDeleted ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleRestore}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm">
                    <Move className="h-4 w-4 mr-2" />
                    Move
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Tag className="h-4 w-4 mr-2" />
                    Tag
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(false)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* File List/Grid */}
        <ScrollArea className="flex-1">
          <div className={cn(
            "p-4",
            isDragging && "opacity-50"
          )}>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading files...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No files found matching your search" : "No files in this folder"}
              </div>
            ) : viewMode === "list" ? (
              /* List View */
              <div className="space-y-1">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-1">
                    <Checkbox
                      checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFiles(new Set(filteredFiles.map((f: FileNode) => f.id)));
                        } else {
                          setSelectedFiles(new Set());
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">Modified</div>
                  <div className="col-span-1">Size</div>
                  <div className="col-span-2">Tags</div>
                  <div className="col-span-1"></div>
                </div>
                {filteredFiles.map((file: FileNode) => (
                  <div
                    key={file.id}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-4 py-2 hover:bg-muted rounded cursor-pointer items-center",
                      selectedFiles.has(file.id) && "bg-muted"
                    )}
                    onClick={() => handleFileSelect(file)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, [file.id])}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="col-span-1">
                      <Checkbox
                        checked={selectedFiles.has(file.id)}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => handleFileSelect(file, true)}
                      />
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      {getFileIcon(file.type, "sm")}
                      <span className="text-sm truncate">{file.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(file.id);
                        }}
                        className="hover:scale-110 transition-transform"
                      >
                        {userFavorites.has(file.id) ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-500" />
                        )}
                      </button>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {format(new Date(file.metadata.updatedAt), "MMM d, yyyy")}
                    </div>
                    <div className="col-span-1 text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </div>
                    <div className="col-span-2 flex gap-1">
                      {file.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {file.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{file.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStarToggle(file)}>
                            <Star className="h-4 w-4 mr-2" />
                            {file.starred ? "Unstar" : "Star"}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredFiles.map((file: FileNode) => (
                  <div
                    key={file.id}
                    className={cn(
                      "relative group cursor-pointer",
                      selectedFiles.has(file.id) && "ring-2 ring-primary rounded"
                    )}
                    onClick={() => handleFileSelect(file)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, [file.id])}
                    onDragEnd={handleDragEnd}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative">
                            {getFileIcon(file.type, "lg")}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(file.id);
                              }}
                              className="absolute -top-2 -right-2 hover:scale-110 transition-transform"
                            >
                              {userFavorites.has(file.id) ? (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              ) : (
                                <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-500" />
                              )}
                            </button>
                          </div>
                          <span className="text-sm text-center truncate w-full">
                            {file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Checkbox
                            checked={selectedFiles.has(file.id)}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => handleFileSelect(file, true)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* Right Panel - Preview & Details */}
      {showRightPanel && selectedFile && (
        <div className="w-96 border-l bg-muted/10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">File Details</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowRightPanel(false);
                setSelectedFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* File Preview */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    {getFileIcon(selectedFile.type, "lg")}
                    <h4 className="font-medium text-center">{selectedFile.name}</h4>
                    {selectedFile.type === "image" && selectedFile.url && (
                      <img
                        src={selectedFile.url}
                        alt={selectedFile.name}
                        className="w-full rounded border"
                      />
                    )}
                    {selectedFile.type === "video" && selectedFile.url && (
                      <video
                        src={selectedFile.url}
                        controls
                        className="w-full rounded border"
                      />
                    )}
                    {selectedFile.type === "link" && selectedFile.url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedFile.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Link
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* File Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize">{selectedFile.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span>{formatFileSize(selectedFile.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(selectedFile.metadata.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modified</span>
                    <span>{format(new Date(selectedFile.metadata.updatedAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner</span>
                    <span>{selectedFile.metadata.createdByName}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedFile.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tag
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedFile.permissions.visibility === "private" ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : selectedFile.permissions.visibility === "team" ? (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm capitalize">{selectedFile.permissions.visibility}</span>
                  </div>
                  {selectedFile.permissions.assignedTo && selectedFile.permissions.assignedTo.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Assigned to:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedFile.permissions.assignedTo.map(user => (
                          <Badge key={user} variant="secondary" className="text-xs">
                            {user}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Version History */}
              {selectedFile.metadata.versionHistory && selectedFile.metadata.versionHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Version History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedFile.metadata.versionHistory.map(version => (
                        <div key={version.version} className="flex items-center justify-between text-sm">
                          <span>v{version.version}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(version.updatedAt), "MMM d")} by {version.updatedBy}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </Button>
                <Button variant="outline" className="w-full justify-start text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

          {/* Admin Panel Tab Content */}
          {employee?.accessLevel === "admin" && (
            <TabsContent value="admin" className="flex-1 flex flex-col mt-0">
              <div className="p-6">
                <PageHeader
                  title="Admin Panel"
                  description="File management, category controls, and usage analytics"
                />
                
                {/* Admin Sub-tabs */}
                <Tabs defaultValue="file-management" className="mt-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="file-management">File Management</TabsTrigger>
                    <TabsTrigger value="category-management">Category Management</TabsTrigger>
                    <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
                  </TabsList>
                  
                  {/* File Management Tab */}
                  <TabsContent value="file-management" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>All Files Across Accounts</CardTitle>
                        <CardDescription>
                          Manage files from all users and teams
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Search and Filters */}
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search all files..."
                                value={adminSearchTerm}
                                onChange={(e) => setAdminSearchTerm(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                            <Select value={adminSelectedUser} onValueChange={setAdminSelectedUser}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by user" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                <SelectItem value="carter">Carter Jamison</SelectItem>
                                <SelectItem value="team-lead">Team Leads Only</SelectItem>
                                <SelectItem value="admin">Admins Only</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={adminFilterType} onValueChange={setAdminFilterType}>
                              <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="File type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="doc">Documents</SelectItem>
                                <SelectItem value="sheet">Sheets</SelectItem>
                                <SelectItem value="pdf">PDFs</SelectItem>
                                <SelectItem value="video">Videos</SelectItem>
                                <SelectItem value="image">Images</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Files Table */}
                          <div className="border rounded-lg">
                            <table className="w-full">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left p-3 text-sm font-medium">File Name</th>
                                  <th className="text-left p-3 text-sm font-medium">Owner</th>
                                  <th className="text-left p-3 text-sm font-medium">Category</th>
                                  <th className="text-left p-3 text-sm font-medium">Size</th>
                                  <th className="text-left p-3 text-sm font-medium">Last Modified</th>
                                  <th className="text-left p-3 text-sm font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-t">
                                  <td className="p-3 text-sm">Q4 Financial Report.pdf</td>
                                  <td className="p-3 text-sm">Carter Jamison</td>
                                  <td className="p-3 text-sm">
                                    <Badge variant="outline">Finance</Badge>
                                  </td>
                                  <td className="p-3 text-sm">2.4 MB</td>
                                  <td className="p-3 text-sm">Jan 8, 2025</td>
                                  <td className="p-3 text-sm">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit Permissions
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Download className="h-4 w-4 mr-2" />
                                          Download
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                </tr>
                                <tr className="border-t">
                                  <td className="p-3 text-sm">Marketing Strategy 2025.doc</td>
                                  <td className="p-3 text-sm">Marketing Team</td>
                                  <td className="p-3 text-sm">
                                    <Badge variant="outline">Marketing</Badge>
                                  </td>
                                  <td className="p-3 text-sm">1.8 MB</td>
                                  <td className="p-3 text-sm">Jan 7, 2025</td>
                                  <td className="p-3 text-sm">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit Permissions
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Download className="h-4 w-4 mr-2" />
                                          Download
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Bulk Actions */}
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                              Showing 2 of 156 files
                            </p>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export All
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Bulk Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Category Management Tab */}
                  <TabsContent value="category-management" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Category Management</CardTitle>
                        <CardDescription>
                          Add, edit, or remove file categories
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Add New Category */}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter new category name..."
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                            />
                            <Button
                              onClick={() => {
                                if (newCategory && !categories.includes(newCategory)) {
                                  setCategories([...categories, newCategory]);
                                  setNewCategory("");
                                  toast({
                                    title: "Category Added",
                                    description: `"${newCategory}" has been added to the categories.`,
                                  });
                                }
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Category
                            </Button>
                          </div>
                          
                          {/* Categories List */}
                          <div className="border rounded-lg p-4">
                            <h3 className="font-medium mb-3">Current Categories</h3>
                            <div className="grid grid-cols-2 gap-3">
                              {categories.map((category) => (
                                <div
                                  key={category}
                                  className="flex items-center justify-between p-2 border rounded-lg"
                                >
                                  <span className="text-sm">{category}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        const newName = prompt(`Rename "${category}" to:`, category);
                                        if (newName && newName !== category) {
                                          setCategories(categories.map(c => c === category ? newName : c));
                                          toast({
                                            title: "Category Renamed",
                                            description: `"${category}" has been renamed to "${newName}".`,
                                          });
                                        }
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive"
                                      onClick={() => {
                                        if (confirm(`Delete category "${category}"?`)) {
                                          setCategories(categories.filter(c => c !== category));
                                          toast({
                                            title: "Category Deleted",
                                            description: `"${category}" has been removed.`,
                                          });
                                        }
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Category Usage Stats */}
                          <Card className="bg-muted/50">
                            <CardHeader>
                              <CardTitle className="text-sm">Category Usage</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Marketing</span>
                                  <span className="text-muted-foreground">42 files</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Finance</span>
                                  <span className="text-muted-foreground">38 files</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>HR</span>
                                  <span className="text-muted-foreground">27 files</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Operations</span>
                                  <span className="text-muted-foreground">19 files</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Usage Analytics Tab */}
                  <TabsContent value="analytics" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Usage Analytics</CardTitle>
                        <CardDescription>
                          Track file usage and system activity
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Time Range Selector */}
                          <div className="flex gap-2">
                            <Select value={analyticsTimeRange} onValueChange={setAnalyticsTimeRange}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="24hours">Last 24 Hours</SelectItem>
                                <SelectItem value="7days">Last 7 Days</SelectItem>
                                <SelectItem value="30days">Last 30 Days</SelectItem>
                                <SelectItem value="90days">Last 90 Days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Stats Grid */}
                          <div className="grid grid-cols-4 gap-4">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-muted-foreground">Total Files</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-2xl font-bold">1,234</p>
                                <p className="text-xs text-green-600">+12% from last period</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-muted-foreground">Active Users</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-2xl font-bold">89</p>
                                <p className="text-xs text-green-600">+5% from last period</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-muted-foreground">Storage Used</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-2xl font-bold">45.2 GB</p>
                                <p className="text-xs text-muted-foreground">of 100 GB</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-muted-foreground">Downloads</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-2xl font-bold">3,456</p>
                                <p className="text-xs text-green-600">+18% from last period</p>
                              </CardContent>
                            </Card>
                          </div>
                          
                          {/* Most Active Users */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Most Active Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-xs font-medium">CJ</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Carter Jamison</p>
                                      <p className="text-xs text-muted-foreground">234 actions</p>
                                    </div>
                                  </div>
                                  <Badge>Admin</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-xs font-medium">MT</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Marketing Team</p>
                                      <p className="text-xs text-muted-foreground">189 actions</p>
                                    </div>
                                  </div>
                                  <Badge variant="secondary">Team</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-xs font-medium">JD</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">John Doe</p>
                                      <p className="text-xs text-muted-foreground">156 actions</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline">Manager</Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Most Downloaded Files */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Most Downloaded Files</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm">Employee Handbook 2025.pdf</span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">542 downloads</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                    <span className="text-sm">Q4 Sales Report.xlsx</span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">389 downloads</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Video className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm">All Hands Meeting Recording.mp4</span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">287 downloads</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
          )}
        </Tabs>
        ) : (
          /* Non-admin view - just render the documents content without tabs */
          <div className="flex-1 flex flex-col">
            {/* Just copy the exact same content from Documents TabsContent */}
            {/* Header */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between mb-4">
                <PageHeader
                  title={currentFolder ? currentFolder.name : "Documents & Sheets"}
                  description={currentFolder ? `Files in ${currentFolder.name}` : "Centralized document and data management"}
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRightPanel(!showRightPanel)}
                  >
                    {showRightPanel ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Toolbar - matching the existing toolbar exactly */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Filters */}
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="doc">Documents</SelectItem>
                      <SelectItem value="sheet">Sheets</SelectItem>
                      <SelectItem value="pdf">PDFs</SelectItem>
                      <SelectItem value="video">Videos</SelectItem>
                      <SelectItem value="image">Images</SelectItem>
                      <SelectItem value="link">Links</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="archive">Archives</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="customer-success">Customer Success</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterOwner} onValueChange={setFilterOwner}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All owners" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All owners</SelectItem>
                      <SelectItem value="me">My files</SelectItem>
                      <SelectItem value="shared">Shared with me</SelectItem>
                      <SelectItem value="team">Team files</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View controls */}
                <div className="flex items-center gap-2">
                  {/* View mode toggle */}
                  <div className="flex rounded-lg border">
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-r-none"
                      onClick={() => updateFolderPreferences(currentFolderId, { viewMode: "list" })}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => updateFolderPreferences(currentFolderId, { viewMode: "grid" })}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* New button with dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Create or Add</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setCreateType("google-doc");
                        setIsCreateOpen(true);
                      }}>
                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                        Google Doc Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setCreateType("google-sheet");
                        setIsCreateOpen(true);
                      }}>
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        Google Sheet Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setCreateType("google-drive");
                        setIsCreateOpen(true);
                      }}>
                        <Folder className="h-4 w-4 mr-2 text-yellow-600" />
                        Google Drive Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setCreateType("video-link");
                        setIsCreateOpen(true);
                      }}>
                        <Video className="h-4 w-4 mr-2 text-purple-600" />
                        Video Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setCreateType("folder");
                        setIsCreateOpen(true);
                      }}>
                        <FolderPlus className="h-4 w-4 mr-2" />
                        New Folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Bulk actions bar - same as in Documents tab */}
            {selectedFiles.size > 0 && (
              <div className="border-b p-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedFiles.size} file{selectedFiles.size > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleMove}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Move
                    </Button>
                    {selectedFiles.size === 1 && (
                      <>
                        <Button variant="ghost" size="sm" onClick={handleRename}>
                          <Edit className="h-4 w-4 mr-2" />
                          Rename
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleAddTag}>
                          <Tag className="h-4 w-4 mr-2" />
                          Tag
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(false)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* File List/Grid - same as in Documents tab */}
            <ScrollArea className="flex-1">
              <div className={cn(
                "p-4",
                isDragging && "opacity-50"
              )}>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading files...
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No files found matching your search" : "No files in this folder"}
                  </div>
                ) : viewMode === "list" ? (
                  /* List View - same as existing code */
                  <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                      <div className="col-span-1">
                        <Checkbox
                          checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFiles(new Set(filteredFiles.map((f: FileNode) => f.id)));
                            } else {
                              setSelectedFiles(new Set());
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-5">Name</div>
                      <div className="col-span-2">Modified</div>
                      <div className="col-span-1">Size</div>
                      <div className="col-span-2">Tags</div>
                      <div className="col-span-1"></div>
                    </div>
                    {filteredFiles.map((file: FileNode) => (
                      <div
                        key={file.id}
                        className={cn(
                          "grid grid-cols-12 gap-4 px-4 py-2 hover:bg-muted rounded cursor-pointer items-center",
                          selectedFiles.has(file.id) && "bg-muted"
                        )}
                        onClick={() => handleFileSelect(file)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, [file.id])}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="col-span-1">
                          <Checkbox
                            checked={selectedFiles.has(file.id)}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => handleFileSelect(file, true)}
                          />
                        </div>
                        <div className="col-span-5 flex items-center gap-2">
                          {getFileIcon(file.type, "sm")}
                          <span className="text-sm truncate">{file.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(file.id);
                            }}
                            className="hover:scale-110 transition-transform"
                          >
                            {userFavorites.has(file.id) ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-500" />
                            )}
                          </button>
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground">
                          {format(new Date(file.metadata.updatedAt), "MMM d, yyyy")}
                        </div>
                        <div className="col-span-1 text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </div>
                        <div className="col-span-2 flex gap-1">
                          {file.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {file.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{file.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStarToggle(file)}>
                                <Star className="h-4 w-4 mr-2" />
                                {file.starred ? "Unstar" : "Star"}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Grid View - same as existing code */
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredFiles.map((file: FileNode) => (
                      <div
                        key={file.id}
                        className={cn(
                          "relative group cursor-pointer",
                          selectedFiles.has(file.id) && "ring-2 ring-primary rounded"
                        )}
                        onClick={() => handleFileSelect(file)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, [file.id])}
                        onDragEnd={handleDragEnd}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center gap-2">
                              <div className="relative">
                                {getFileIcon(file.type, "lg")}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(file.id);
                                  }}
                                  className="absolute -top-2 -right-2 hover:scale-110 transition-transform"
                                >
                                  {userFavorites.has(file.id) ? (
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  ) : (
                                    <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-500" />
                                  )}
                                </button>
                              </div>
                              <span className="text-sm text-center truncate w-full">
                                {file.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </span>
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Checkbox
                                checked={selectedFiles.has(file.id)}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={() => handleFileSelect(file, true)}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createType === "google-doc" ? "Add Google Doc Link" : 
               createType === "google-sheet" ? "Add Google Sheet Link" : 
               createType === "google-drive" ? "Add Google Drive Link" :
               createType === "video-link" ? "Add Video Link" :
               "Create New Folder"}
            </DialogTitle>
            <DialogDescription>
              {createType === "folder" ? "Create a new folder to organize your files" :
               createType === "video-link" ? "Add a link to a YouTube, Vimeo, or Loom video" :
               "Add a link to your Google document"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder={createType === "folder" ? "Enter folder name..." : "Enter document name..."}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
            </div>
            
            {["google-doc", "google-sheet", "google-drive", "video-link"].includes(createType) && (
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={newItemUrl}
                  onChange={(e) => setNewItemUrl(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="customer-success">Customer Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="permission">Visibility</Label>
              <Select value={newItemPermission} onValueChange={(v: any) => setNewItemPermission(v)}>
                <SelectTrigger id="permission">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="team">Team Only</SelectItem>
                  <SelectItem value="public">Public Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}