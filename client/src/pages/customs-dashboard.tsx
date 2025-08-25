import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageHeader } from "@/components/page-header";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { 
  Search, 
  Filter, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  Eye,
  MessageSquare,
  Calendar,
  User,
  TrendingUp,
  Check,
  ChevronsUpDown,
  ArrowLeft,
  Upload,
  FileText,
  Image,
  Video,
  X,
  Share,
  Copy,
  Users
} from "lucide-react";
import { CreatorAvatar } from '@/components/ui/creator-avatar';
import { useLocation } from "wouter";
import { StatsSkeleton, TabsSkeleton, TableSkeleton } from "@/components/ui/skeleton-loader";
import { useCreatorProfiles } from "@/hooks/useCreatorProfiles";
import { useCrmAuth } from "@/contexts/CrmAuthContext";

// Status color mapping
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

// Priority color mapping
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'normal': return 'bg-blue-100 text-blue-800';
    case 'low': return 'bg-gray-100 text-gray-800';
    default: return 'bg-blue-100 text-blue-800';
  }
};

// Form schemas
const customContentSchema = z.object({
  creatorIds: z.array(z.number()).min(1, "At least one creator must be selected"),
  requestedBy: z.string().min(1, "Requested by is required"),
  fanOnlyFansUrl: z.string().optional().refine((val) => !val || val === "" || z.string().url().safeParse(val).success, {
    message: "Please enter a valid URL",
  }),
  price: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Content type is required"),
  priority: z.string().default("normal"),
  additionalNotes: z.string().optional(),
  tags: z.string().optional(),
  requestedDeliveryDate: z.string().optional()
});

// File upload component interface
interface FileUploadComponentProps {
  onFilesChange: (files: File[]) => void;
  uploadedFiles: Array<{name: string; url: string; type: string; size: number}>;
  onRemoveFile: (index: number) => void;
}

// File upload component with drag and drop
const FileUploadComponent: React.FC<FileUploadComponentProps> = ({ 
  onFilesChange, 
  uploadedFiles, 
  onRemoveFile 
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt'],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    onDrop: (acceptedFiles) => {
      onFilesChange(acceptedFiles);
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Images, Videos, PDFs, Text files (max 50MB each)
            </p>
          </div>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Attached Files:</h4>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getFileIcon(file.type)}
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const rejectSchema = z.object({
  reason: z.string().min(5, "Rejection reason must be at least 5 characters")
});

const rebuttalSchema = z.object({
  message: z.string().min(10, "Rebuttal message must be at least 10 characters")
});

function CustomsDashboard() {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [teamLinksOnlyFilter, setTeamLinksOnlyFilter] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRebuttalModalOpen, setIsRebuttalModalOpen] = useState(false);
  const [creatorSearchOpen, setCreatorSearchOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryValue, setCustomCategoryValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string; url: string; type: string; size: number}>>([]);
  const [actualFiles, setActualFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const [actionStates, setActionStates] = useState({
    creating: false,
    approving: false,
    rejecting: false,
    markingSold: false,
    completing: false,
    validating: false,
    submitting: false,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useCrmAuth();

  // Manual state management for stats (no caching)
  const [stats, setStats] = useState({ totalPending: 0, totalApproved: 0, totalOwed: 0, revenueThisMonth: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<any>(null);

  // Manual stats fetching function
  const fetchStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      setStatsLoading(true);
      setStatsError(null);
      console.log('Fetching stats from /api/custom-contents/stats');
      
      const statsUrl = `/api/custom-contents/stats?_t=${Date.now()}&_nocache=${Math.random().toString(36)}`;
      const response = await fetch(statsUrl, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Stats response:', data);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStatsError(error);
    } finally {
      setStatsLoading(false);
    }
  };
  
  const refetchStats = fetchStats;

  // Force cache invalidation on component mount (one time only)
  useEffect(() => {
    console.log('🔄 CustomsDashboard mounted - clearing stats cache once...');
    queryClient.removeQueries({ queryKey: ["/api/custom-contents/stats"] });
  }, []); // Empty dependency array - run only once on mount

  // Debug logging for stats
  useEffect(() => {
    console.log('Customs Dashboard - Stats:', stats);
    console.log('Customs Dashboard - Stats Loading:', statsLoading);
    console.log('Customs Dashboard - Stats Error:', statsError);
    console.log('Customs Dashboard - Stats Error Message:', statsError?.message);
    console.log('Customs Dashboard - Stats Error Stack:', statsError?.stack);
  }, [stats, statsLoading, statsError]);

  // Use the new creator profile system for better consistency
  const { 
    creators, 
    isLoading: creatorsLoading, 
    error: creatorsError,
    getCreatorById
  } = useCreatorProfiles({
    activeOnly: true,
    sortByDisplayName: true
  });

  // Debug logging for creators
  // console.log('Customs Dashboard - Creators:', creators);
  // console.log('Customs Dashboard - Creators Loading:', creatorsLoading);
  // console.log('Customs Dashboard - Creators Error:', creatorsError);

  // Use creators from the new profile system for filter
  const clients = creators;

  // Build filters for API call with useMemo to prevent infinite loops
  const filters = useMemo(() => ({
    ...(clientFilter !== "all" && { clientId: clientFilter }),
    teamSubmissions: teamLinksOnlyFilter ? 'true' : 'false'
  }), [clientFilter, teamLinksOnlyFilter]);

  // Manual state management for custom contents (no caching)
  const [customContents, setCustomContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customContentsError, setCustomContentsError] = useState<any>(null);

  // Manual custom contents fetching function
  const fetchCustomContents = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      setCustomContentsError(null);
      
      const params = new URLSearchParams();
      if (clientFilter !== "all") {
        params.append("clientId", clientFilter);
      }
      params.append("teamSubmissions", teamLinksOnlyFilter ? 'true' : 'false');
      // Add timestamp to prevent ALL caching
      params.append("_t", Date.now().toString());
      params.append("_nocache", Math.random().toString(36));
      
      const url = `/api/custom-contents/admin?${params.toString()}`;
      console.log('Fetching custom contents from:', url, 'at timestamp:', new Date().toISOString());
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Custom contents response:', data);
      setCustomContents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching custom contents:', error);
      setCustomContentsError(error);
      setCustomContents([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, clientFilter, teamLinksOnlyFilter]);
  
  const refetch = fetchCustomContents;

  // Load data on mount and when filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomContents();
      fetchStats();
    }
  }, [isAuthenticated, clientFilter, teamLinksOnlyFilter, fetchCustomContents]); // Refetch when filters change

  // Debug logging for custom contents
  // console.log('Customs Dashboard - Custom Contents Data:', customContents);
  // console.log('Customs Dashboard - Custom Contents Loading:', isLoading);
  // console.log('Customs Dashboard - Custom Contents Error:', customContentsError);

  // Fetch selected content history
  const { data: contentHistory } = useQuery({
    queryKey: ["/api/custom-contents", selectedContent?.id, "history"],
    enabled: !!selectedContent?.id
  });

  // Manual approval function (no React Query caching)
  const handleApprove = async (id: number) => {
    try {
      setActionStates(prev => ({ ...prev, approving: true }));
      
      console.log('Starting approval for ID:', id);
      
      // Direct fetch call with no caching
      const response = await fetch(`/api/custom-contents/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Approval success for ID:', id, 'Response:', data);
      
      // IMMEDIATE stats update - decrease pending, increase approved
      setStats(prevStats => ({
        ...prevStats,
        totalPending: Math.max(0, prevStats.totalPending - 1),
        totalApproved: prevStats.totalApproved + 1
      }));
      
      // Add a small delay to ensure database transaction is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Immediately refetch data to show changes
      await fetchCustomContents();
      await fetchStats();
      
      toast({ 
        title: "Content Approved", 
        description: "Status updated" 
      });
      
      // Close the detail modal if open
      if (selectedContent?.id === id) {
        setSelectedContent(null);
      }
      
    } catch (error: any) {
      console.error('Approval error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to approve content",
        variant: "destructive"
      });
    } finally {
      setActionStates(prev => ({ ...prev, approving: false }));
    }
  };

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      setActionStates(prev => ({ ...prev, rejecting: true }));
      
      // Use apiRequest for proper authentication handling
      return await apiRequest('POST', `/api/custom-contents/${id}/reject`, { rejection_reason: reason });
    },
    onSuccess: async (data, { id, reason }) => {
      setActionStates(prev => ({ ...prev, rejecting: false }));
      
      // IMMEDIATE stats update - decrease pending
      setStats(prevStats => ({
        ...prevStats,
        totalPending: Math.max(0, prevStats.totalPending - 1)
      }));
      
      // Immediately refetch data to show changes
      await fetchCustomContents();
      
      toast({ 
        title: "Content Rejected", 
        description: "Status updated with rejection reason" 
      });
      
      // Close modals
      setIsRejectModalOpen(false);
      if (selectedContent?.id === id) {
        setSelectedContent(null);
      }
    },
    onError: (error) => {
      setActionStates(prev => ({ ...prev, rejecting: false }));
      toast({ 
        title: "Error", 
        description: "Failed to reject content",
        variant: "destructive"
      });
    }
  });

  const soldMutation = useMutation({
    mutationFn: async (id: number) => {
      setActionStates(prev => ({ ...prev, markingSold: true }));
      
      // Direct fetch for immediate backend update
      const response = await fetch(`/api/custom-contents/${id}/sold`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: async (data, id) => {
      setActionStates(prev => ({ ...prev, markingSold: false }));
      
      // IMMEDIATE stats update - decrease approved, increase owed
      setStats(prevStats => ({
        ...prevStats,
        totalApproved: Math.max(0, prevStats.totalApproved - 1),
        totalOwed: prevStats.totalOwed + 1
      }));
      
      // Immediately refetch data to show changes
      await fetchCustomContents();
      
      toast({ title: "Custom content marked as sold" });
    },
    onError: (error) => {
      setActionStates(prev => ({ ...prev, markingSold: false }));
      toast({ 
        title: "Error", 
        description: "Failed to mark as sold",
        variant: "destructive"
      });
    }
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      setActionStates(prev => ({ ...prev, completing: true }));
      
      // Direct fetch for immediate backend update
      const response = await fetch(`/api/custom-contents/${id}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: async (data, id) => {
      setActionStates(prev => ({ ...prev, completing: false }));
      
      // IMMEDIATE stats update - decrease owed
      setStats(prevStats => ({
        ...prevStats,
        totalOwed: Math.max(0, prevStats.totalOwed - 1)
      }));
      
      // Immediately refetch data to show changes
      await fetchCustomContents();
      
      toast({ title: "Custom content marked as complete" });
    },
    onError: (error) => {
      setActionStates(prev => ({ ...prev, completing: false }));
      toast({ 
        title: "Error", 
        description: "Failed to mark as complete",
        variant: "destructive"
      });
    }
  });



  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      setActionStates(prev => ({ ...prev, creating: true }));
      
      // Direct fetch for immediate backend update
      const response = await fetch("/api/custom-contents", {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: async (newContent) => {
      setActionStates(prev => ({ ...prev, creating: false }));
      
      // IMMEDIATE stats update - increase pending since new content is always pending
      setStats(prevStats => ({
        ...prevStats,
        totalPending: prevStats.totalPending + 1
      }));
      
      // Immediately refresh the list to show new content
      await fetchCustomContents();
      
      setIsCreateModalOpen(false);
      setIsCustomCategory(false);
      setCustomCategoryValue("");
      setUploadedFiles([]);
      createForm.reset();
      toast({ title: "Custom content request created successfully" });
    },
    onError: (error) => {
      setActionStates(prev => ({ ...prev, creating: false }));
      toast({ 
        title: "Error", 
        description: "Failed to create custom content request",
        variant: "destructive"
      });
    }
  });

  const rebuttalMutation = useMutation({
    mutationFn: async ({ id, message }: { id: number; message: string }) => {
      setActionStates(prev => ({ ...prev, submitting: true }));
      
      // Direct fetch for immediate backend update
      const response = await fetch(`/api/custom-contents/${id}/rebuttal`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: async (data, { id, message }) => {
      setActionStates(prev => ({ ...prev, submitting: false }));
      
      // Immediately refetch data to show changes
      await fetchCustomContents();
      
      setIsRebuttalModalOpen(false);
      toast({ title: "Rebuttal message submitted" });
    },
    onError: (error) => {
      setActionStates(prev => ({ ...prev, submitting: false }));
      toast({ 
        title: "Error", 
        description: "Failed to submit rebuttal",
        variant: "destructive"
      });
    }
  });

  // Forms
  const createForm = useForm<z.infer<typeof customContentSchema>>({
    resolver: zodResolver(customContentSchema),
    defaultValues: {
      creatorIds: [],
      requestedBy: "",
      fanOnlyFansUrl: "",
      price: "",
      description: "",
      additionalNotes: "",
      priority: "normal",
      category: "Video"
    }
  });

  // Watch form values for unsaved changes detection
  const createFormValues = createForm.watch();

  // Unsaved changes detection for create modal
  const createUnsavedChanges = useUnsavedChanges({
    isOpen: isCreateModalOpen,
    onClose: () => {
      setIsCreateModalOpen(false);
      setIsCustomCategory(false);
      setCustomCategoryValue("");
      createForm.reset();
    },
    watchFields: createFormValues,
    disabled: false
  });

  const rejectForm = useForm({
    resolver: zodResolver(rejectSchema)
  });

  const rebuttalForm = useForm({
    resolver: zodResolver(rebuttalSchema)
  });

  // Filter contents based on search - comprehensive search across all fields
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
      content.price?.toString().includes(searchLower) ||
      content.requested_price?.toString().includes(searchLower) ||
      content.custom_id?.toLowerCase().includes(searchLower) ||
      content.customId?.toLowerCase().includes(searchLower) ||
      
      // Creator information
      content.creator_name?.toLowerCase().includes(searchLower) ||
      content.creator_username?.toLowerCase().includes(searchLower) ||
      content.creatorName?.toLowerCase().includes(searchLower) ||
      content.creatorUsername?.toLowerCase().includes(searchLower) ||
      
      // Additional fields
      content.fan_onlyfans_url?.toLowerCase().includes(searchLower) ||
      content.fanOnlyFansUrl?.toLowerCase().includes(searchLower) ||
      content.chatter_id?.toLowerCase().includes(searchLower) ||
      content.chatterId?.toLowerCase().includes(searchLower) ||
      content.contact_info?.toLowerCase().includes(searchLower) ||
      content.extra_instructions?.toLowerCase().includes(searchLower) ||
      content.additional_notes?.toLowerCase().includes(searchLower) ||
      content.additionalNotes?.toLowerCase().includes(searchLower) ||
      content.rejection_reason?.toLowerCase().includes(searchLower) ||
      content.creator_response?.toLowerCase().includes(searchLower) ||
      content.reviewed_by?.toLowerCase().includes(searchLower) ||
      content.status?.toLowerCase().includes(searchLower) ||
      content.priority?.toLowerCase().includes(searchLower)
    );
  }) : [];

  // Group contents by status - fixed status filtering
  const pendingContents = filteredContents.filter((c: any) => {
    const status = c.status?.toLowerCase();
    return status === 'pending' || status === 'pending_review' || status === 'auto_disapproved';
  });
  
  const approvedContents = filteredContents.filter((c: any) => {
    const status = c.status?.toLowerCase();
    return status === 'approved';
  });
  
  const owedContents = filteredContents.filter((c: any) => {
    const status = c.status?.toLowerCase();
    return status === 'owed' || status === 'sold';
  });
  
  const completedContents = filteredContents.filter((c: any) => {
    const status = c.status?.toLowerCase();
    return status === 'complete' || status === 'completed';
  });
  
  const rejectedContents = filteredContents.filter((c: any) => {
    const status = c.status?.toLowerCase();
    return status === 'rejected' || status === 'declined';
  });
  
  // Debug logging
  console.log('Custom contents array:', customContents);
  console.log('Filtered contents array:', filteredContents);
  console.log('Pending contents:', pendingContents);
  console.log('Approved contents:', approvedContents);
  console.log('All content statuses:', customContents.map(c => ({ id: c.id, status: c.status })));
  console.log('Status filter check - content ID 71:', customContents.find(c => c.id === 71)?.status);

  const handleCreateSubmit = async (data: any) => {
    if (!Array.isArray(data.creatorIds) || data.creatorIds.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please select at least one creator",
        variant: "destructive" 
      });
      return;
    }
    
    setActionStates(prev => ({ ...prev, validating: true }));
    
    try {
      // Create multiple customs, one for each selected creator
      const promises = data.creatorIds.map(async (creatorId: number) => {
        // If there are uploaded files, use FormData, otherwise use JSON
        if (actualFiles.length > 0) {
          const formData = new FormData();
          
          // Add all form fields
          formData.append('creatorId', creatorId.toString());
          formData.append('requestedBy', data.requestedBy || '');
          formData.append('fanOnlyFansUrl', data.fanOnlyFansUrl || '');
          formData.append('price', data.price ? parseFloat(data.price).toString() : '0');
          formData.append('description', data.description || '');
          formData.append('category', data.category || '');
          formData.append('priority', data.priority || 'normal');
          formData.append('additionalNotes', data.additionalNotes || '');
          formData.append('tags', data.tags ? data.tags.split(',').map((tag: string) => tag.trim()).join(',') : '');
          
          // Add actual file objects for upload
          actualFiles.forEach((file) => {
            formData.append('attachments', file);
          });
          
          console.log('Uploading custom content with files:', {
            creatorId,
            filesCount: actualFiles.length,
            fileNames: actualFiles.map(f => f.name)
          });
          
          // Direct fetch with FormData (don't set Content-Type header, let browser set it)
          const response = await fetch('/api/custom-contents', {
            method: 'POST',
            credentials: 'include',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return await response.json();
        } else {
          // No files, use JSON API request
          const processedData = {
            creatorId,
            requestedBy: data.requestedBy,
            fanOnlyFansUrl: data.fanOnlyFansUrl,
            price: data.price ? parseFloat(data.price) : null,
            description: data.description,
            category: data.category,
            priority: data.priority,
            additionalNotes: data.additionalNotes,
            tags: data.tags ? data.tags.split(',').map((tag: string) => tag.trim()) : []
          };
          return apiRequest("POST", "/api/custom-contents", processedData);
        }
      });

      // Wait for all customs to be created
      const results = await Promise.all(promises);
      
      // IMMEDIATE stats update - increase pending by number of new items
      setStats(prevStats => ({
        ...prevStats,
        totalPending: prevStats.totalPending + results.length
      }));
      
      // Immediately refresh the list to show new content
      await fetchCustomContents();
      
      setIsCreateModalOpen(false);
      setIsCustomCategory(false);
      setCustomCategoryValue("");
      setUploadedFiles([]);
      setActualFiles([]);
      createForm.reset();
      toast({ title: "Custom content request(s) created successfully" });
      
    } catch (error: any) {
      console.error('Error creating custom contents:', error);
      toast({ 
        title: "Error creating customs", 
        description: error.message || "Failed to create custom requests",
        variant: "destructive" 
      });
    } finally {
      setActionStates(prev => ({ ...prev, validating: false }));
    }
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

  // Show skeleton loading for better perceived performance
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
            <div className="flex items-center space-x-4">
              <div className="h-6 w-6 bg-muted animate-pulse rounded-md" />
              <div className="space-y-1">
                <div className="h-6 w-40 bg-muted animate-pulse rounded-md" />
                <div className="h-4 w-64 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
            <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
          </div>
        </div>
        <div className="px-6 pb-6 space-y-6">
          <StatsSkeleton />
          <TabsSkeleton />
          <TableSkeleton rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customs"
        description="Manage custom requests"
        showBackButton={true}
        useBrowserBack={true}
        actions={
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Custom</span>
          </Button>
        }
      />
      
      <div className="px-6 pb-6 space-y-6">
        <Dialog open={isCreateModalOpen} {...createUnsavedChanges.getDialogProps()}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Custom Content Request</DialogTitle>
              <DialogDescription>
                Submit a new custom content request for review.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="creatorIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign To Creators</FormLabel>
                          <Popover open={creatorSearchOpen} onOpenChange={setCreatorSearchOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={creatorSearchOpen}
                                  className="w-full justify-between"
                                >
                                  {field.value && field.value.length > 0 && Array.isArray(creators) ? (
                                    <div className="flex items-center space-x-2 flex-wrap">
                                      {field.value.map((creatorId: number) => {
                                        const creator = creators.find((c: any) => c.id === creatorId);
                                        return creator ? (
                                          <div key={creatorId} className="flex items-center space-x-1 bg-gray-100 rounded px-2 py-1">
                                            <CreatorAvatar
                                              creator={{
                                                id: creator.id,
                                                username: creator.username,
                                                displayName: creator.displayName,
                                                profileImageUrl: creator.profileImageUrl
                                              }}
                                              size="sm"
                                            />
                                            <span className="text-sm">{creator.displayName || creator.username}</span>
                                          </div>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    "Search and select creators..."
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Type to search creators..." />
                                <CommandEmpty>No creator found.</CommandEmpty>
                                <CommandList className="max-h-60 overflow-y-auto">
                                  <CommandGroup>
                                    {Array.isArray(creators) && creators.map((creator: any) => (
                                      <CommandItem
                                        key={creator.id}
                                        value={creator.displayName || creator.username}
                                        onSelect={() => {
                                          const currentIds = field.value || [];
                                          if (currentIds.includes(creator.id)) {
                                            // Remove if already selected
                                            field.onChange(currentIds.filter((id: number) => id !== creator.id));
                                          } else {
                                            // Add if not selected
                                            field.onChange([...currentIds, creator.id]);
                                          }
                                        }}
                                      >
                                        <Check
                                          className={(field.value || []).includes(creator.id) ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"}
                                        />
                                        <CreatorAvatar
                                          creator={{
                                            id: creator.id,
                                            username: creator.username,
                                            displayName: creator.displayName,
                                            profileImageUrl: creator.profileImageUrl
                                          }}
                                          size="sm"
                                        />
                                        <span className="ml-2">{creator.displayName || creator.username}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="requestedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Requested By</FormLabel>
                          <FormControl>
                            <Input placeholder="Employee name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="fanOnlyFansUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fan's OnlyFans URL (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="url" 
                              placeholder="https://onlyfans.com/username" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content Type</FormLabel>
                            {!isCustomCategory ? (
                              <Select 
                                onValueChange={(value) => {
                                  if (value === "Custom") {
                                    setIsCustomCategory(true);
                                    setCustomCategoryValue("");
                                    field.onChange("");
                                  } else {
                                    field.onChange(value);
                                  }
                                }} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Video">Video</SelectItem>
                                  <SelectItem value="Photo">Photo</SelectItem>
                                  <SelectItem value="Audio">Audio</SelectItem>
                                  <SelectItem value="Live">Live</SelectItem>
                                  <SelectItem value="Custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="space-y-2">
                                <FormControl>
                                  <Input
                                    placeholder="Enter custom category..."
                                    value={customCategoryValue}
                                    onChange={(e) => {
                                      setCustomCategoryValue(e.target.value);
                                      field.onChange(e.target.value);
                                    }}
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setIsCustomCategory(false);
                                    setCustomCategoryValue("");
                                    field.onChange("Video");
                                  }}
                                >
                                  Back to preset categories
                                </Button>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority Level</FormLabel>
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
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="25.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />



                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Detailed Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide detailed information about your custom content request..." 
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
                      name="additionalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes (Employee View Only)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Internal notes for employees only - creators won't see this..." 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground mt-1">
                            This information is for employee view only and will not be visible to creators.
                          </p>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>File Attachments (Optional)</FormLabel>
                      <FileUploadComponent 
                        onFilesChange={(files) => {
                          // Store actual File objects for upload
                          setActualFiles(files);
                          
                          // Store display information for UI
                          const fileUrls = files.map(file => ({
                            name: file.name,
                            url: URL.createObjectURL(file),
                            type: file.type,
                            size: file.size
                          }));
                          setUploadedFiles(fileUrls);
                        }}
                        uploadedFiles={uploadedFiles}
                        onRemoveFile={(index) => {
                          const newUploadedFiles = uploadedFiles.filter((_, i) => i !== index);
                          const newActualFiles = actualFiles.filter((_, i) => i !== index);
                          setUploadedFiles(newUploadedFiles);
                          setActualFiles(newActualFiles);
                        }}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending || actionStates.creating || actionStates.validating}
                        className={`${(actionStates.creating || actionStates.validating) ? 'opacity-75' : ''}`}
                      >
                        {actionStates.validating ? "Validating..." : 
                         actionStates.creating ? "Creating..." : 
                         createMutation.isPending ? "Saving..." : 
                         "Create Request"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

        {/* Stats Overview */}
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
                <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.revenueThisMonth.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">From completed customs</p>
              </CardContent>
            </Card>
          </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search customs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              


              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="w-48 justify-between"
                  >
                    {clientFilter !== "all"
                      ? clients?.find((client: any) => client.id.toString() === clientFilter)?.displayName || "Client"
                      : "All Clients"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-0">
                  <Command>
                    <CommandInput placeholder="Search clients..." />
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setClientFilter("all");
                          setClientSearchOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            clientFilter === "all" ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        All Clients
                      </CommandItem>
                      {clients?.map((client: any) => (
                        <CommandItem
                          key={client.id}
                          value={client.displayName}
                          onSelect={() => {
                            setClientFilter(client.id.toString());
                            setClientSearchOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              clientFilter === client.id.toString() ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {client.displayName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Team Links Filter Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="teamLinksFilter"
                  checked={teamLinksOnlyFilter}
                  onChange={(e) => setTeamLinksOnlyFilter(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label 
                  htmlFor="teamLinksFilter" 
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Team Link Submissions Only
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending">
              Pending ({pendingContents.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedContents.length})
            </TabsTrigger>
            <TabsTrigger value="owed">
              Owed ({owedContents.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedContents.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedContents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingContents.map((content: any) => (
              <CustomContentCard
                key={content.id}
                content={content}
                onApprove={() => {
                  console.log('Approve button clicked for content ID:', content.id);
                  handleApprove(content.id);
                }}
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
                onGenerateReviewLink={() => {}}
                showSoldAction={true}
                showReviewLinkAction={true}
              />
            ))}
            {approvedContents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No approved custom content awaiting sale
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

          <TabsContent value="rejected" className="space-y-4">
            {rejectedContents.map((content: any) => (
              <CustomContentCard
                key={content.id}
                content={content}
                onView={() => setSelectedContent(content)}
              />
            ))}
            {rejectedContents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No rejected custom content
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
                  <Button 
                    type="submit" 
                    variant="destructive" 
                    disabled={rejectMutation.isPending || actionStates.rejecting}
                    className={`${actionStates.rejecting ? 'opacity-75' : ''}`}
                  >
                    {actionStates.rejecting ? "Rejecting..." : 
                     rejectMutation.isPending ? "Processing..." : 
                     "Reject Request"}
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
              Provide additional information to challenge the rejection.
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
                        placeholder="Explain why this request should be reconsidered..."
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

      {/* Unsaved Changes Dialog for Create Form */}
      <UnsavedChangesDialog
        open={createUnsavedChanges.showDiscardDialog}
        onConfirmDiscard={createUnsavedChanges.handleConfirmDiscard}
        onCancel={createUnsavedChanges.handleCancelDiscard}
      />
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
  onGenerateReviewLink,
  showActions = false,
  showSoldAction = false,
  showCompleteAction = false,
  showReviewLinkAction = false
}: {
  content: any;
  onApprove?: () => void;
  onReject?: () => void;
  onSold?: () => void;
  onComplete?: () => void;
  onRebuttal?: () => void;
  onView?: () => void;
  onGenerateReviewLink?: () => void;
  showActions?: boolean;
  showSoldAction?: boolean;
  showCompleteAction?: boolean;
  showReviewLinkAction?: boolean;
}) {
  const { toast } = useToast();

  const copyReviewLink = async () => {
    try {
      // Generate token and get review URL from server
      const response = await fetch(`/api/custom-contents/${content.id}/generate-token`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate review token');
      }

      const data = await response.json();
      const fullUrl = `${window.location.origin}/review/${data.token}`;
      
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Review link copied!",
        description: "The public review link has been copied to your clipboard.",
      });
    } catch (error) {
      console.error('Failed to generate review link:', error);
      toast({
        title: "Failed to copy",
        description: "Could not generate the review link. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              {/* Creator Name Badge - Prominent Display */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      {content.creator_name || content.creator_username || 'Unknown Creator'}
                      {(content.status === 'approved' || content.status === 'complete' || content.status === 'owed') && (content.custom_number || content.customNumber || content.customnumber) && (
                        <span className="ml-2 font-bold text-blue-900">#{content.custom_number || content.customNumber || content.customnumber}</span>
                      )}
                    </span>
                    {content.creator_username && content.creator_name && (
                      <span className="text-blue-600 text-sm">@{content.creator_username}</span>
                    )}
                  </div>
                </div>
                
                {/* Copy Review Link Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyReviewLink}
                  className="flex items-center space-x-1 text-purple-700 border-purple-200 hover:bg-purple-50"
                >
                  <Copy className="w-3 h-3" />
                  <span className="text-xs">Copy Review Link</span>
                </Button>
              </div>

              <div className="flex items-center flex-wrap gap-2 mb-2">
                <Badge className={getStatusColor(content.status)}>
                  {content.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge className={getPriorityColor(content.priority)}>
                  {content.priority.toUpperCase()}
                </Badge>
                <Badge variant="outline">{content.category}</Badge>
                <Badge variant="outline">{content.platform}</Badge>
              </div>
              
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                {(content.status === 'approved' || content.status === 'complete' || content.status === 'owed') && (content.custom_number || content.customNumber || content.customnumber) && (
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 border border-blue-300 rounded-md text-blue-800 font-bold text-sm">
                    #{content.custom_number || content.customNumber || content.customnumber}
                  </span>
                )}
                <span>
                  ${content.requested_price || content.requestedprice || content.price || '0.00'} - {content.category} Custom
                </span>
              </h3>
              
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {content.description}
              </p>
              
              <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500">
                {content.fanUsername && (
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{content.fanUsername}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{content.created_at ? new Date(content.created_at).toLocaleDateString() : 'No date'}</span>
                </div>
                {content.saleDate && (
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Sold {new Date(content.saleDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {onView && (
              <div className="flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={onView}>
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          
          {(showActions || showSoldAction || showCompleteAction) && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              {showActions && (
                <>
                  {onApprove && (
                    <Button 
                      size="sm" 
                      onClick={onApprove}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  {onReject && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={onReject}
                    >
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
                <Button 
                  size="sm" 
                  onClick={onSold}
                  className="bg-blue-600 hover:bg-blue-700"
                >
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
              
              {showReviewLinkAction && onGenerateReviewLink && (
                <Button size="sm" onClick={onGenerateReviewLink} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  <Share className="w-4 h-4 mr-1" />
                  Copy Review Link
                </Button>
              )}
            </div>
          )}
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

export default CustomsDashboard;