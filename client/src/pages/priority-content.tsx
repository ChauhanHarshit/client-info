import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Star, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Edit,
  Trash2,
  Filter,
  Search,
  Link,
  Flag,
  Target,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { CreatorAvatar } from "@/components/ui/creator-avatar";
import { LoadingAnimation } from '@/components/ui/loading-animation';

interface PriorityContent {
  id: number;
  title: string;
  description: string;
  creatorId: number;
  creatorName: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  category: "custom" | "promotion" | "collaboration" | "event" | "other";
  dueDate: string;
  requestedBy: string;
  estimatedDuration: number; // in hours
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PriorityContentPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCreator, setFilterCreator] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<PriorityContent | null>(null);
  const [editingContent, setEditingContent] = useState<PriorityContent | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [forceRefresh, setForceRefresh] = useState(false);

  // Manual refresh function
  const handleManualRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    setForceRefresh(true);
    
    // Clear all priority content caches
    queryClient.removeQueries({ queryKey: ["/api/priority-content"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/priority-content"] });
    
    // Force new trigger
    setUpdateTrigger(prev => {
      const newTrigger = prev + 1;
      console.log("🔄 Manual refresh - new trigger:", newTrigger);
      return newTrigger;
    });
    
    // Force fresh fetch
    setTimeout(async () => {
      await queryClient.refetchQueries({ 
        queryKey: ["/api/priority-content"],
        type: 'active'
      });
      setForceRefresh(false);
    }, 1000);
  };

  // Direct fetch without React Query caching
  const [priorityContent, setPriorityContent] = useState<PriorityContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPriorityContent = async () => {
    console.log("🔍 Direct Priority Content fetch starting...");
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/priority-content", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
      });
      
      const data = await response.json();
      console.log("🔍 Direct Priority Content result:", data);
      console.log("🔍 Direct Priority Content result length:", data?.length);
      
      if (response.ok && Array.isArray(data)) {
        setPriorityContent(data);
      } else if (data.message === "Not authenticated") {
        console.log("🔄 Authentication error - setting empty array");
        setPriorityContent([]);
        setError(new Error("Authentication required"));
      } else {
        setPriorityContent([]);
        setError(new Error(data.message || "Failed to fetch"));
      }
    } catch (err: any) {
      console.error("🔍 Direct Priority Content fetch error:", err);
      setPriorityContent([]);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when update trigger changes
  useEffect(() => {
    fetchPriorityContent();
  }, [updateTrigger, forceRefresh]);

  const refetch = fetchPriorityContent;

  // Direct fetch creators without caching
  const [creators, setCreators] = useState<any[]>([]);

  const fetchCreators = async () => {
    try {
      const response = await fetch("/api/creators", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
      
      const data = await response.json();
      console.log("🔍 Direct creators result:", data?.length, "creators");
      
      if (response.ok && Array.isArray(data)) {
        setCreators(data);
      } else {
        setCreators([]);
      }
    } catch (error: any) {
      console.error("🔍 Direct creators fetch error:", error);
      setCreators([]);
    }
  };

  // Fetch creators on mount
  useEffect(() => {
    fetchCreators();
  }, []);



  // Create priority content mutation
  const createPriorityContent = useMutation({
    mutationFn: async (data: Partial<PriorityContent>) => {
      const response = await fetch("/api/priority-content", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create priority content");
      return response.json();
    },
    onMutate: async (newRequest) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/priority-content", updateTrigger] });

      // Snapshot the previous value
      const previousContent = queryClient.getQueryData(["/api/priority-content", updateTrigger]);

      // Optimistically update to the new value - add to beginning of array for immediate visibility
      const optimisticRequest = {
        id: Date.now(), // Temporary ID
        title: newRequest.title,
        description: newRequest.description,
        creatorId: newRequest.creatorId,
        creatorName: creators.find((c: any) => c.id === newRequest.creatorId)?.displayName || "Unknown",
        priority: newRequest.priority,
        category: newRequest.category,
        dueDate: newRequest.dueDate,
        estimatedDuration: newRequest.estimatedDuration,
        notes: newRequest.notes,
        status: "pending",
        requestedBy: "Carter Jamison", // Current user
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add new request to beginning of array for immediate top visibility
      queryClient.setQueryData(["/api/priority-content", updateTrigger], (old: any) => 
        Array.isArray(old) ? [optimisticRequest, ...old] : [optimisticRequest]
      );

      // Return a context object with the snapshotted value
      return { previousContent };
    },
    onError: (err, newRequest, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["/api/priority-content", updateTrigger], context?.previousContent);
      toast({
        title: "Error",
        description: "Failed to create priority content request",
        variant: "destructive",
      });
    },
    onSuccess: async (response) => {
      // Immediately invalidate and refetch to get fresh server data
      await queryClient.invalidateQueries({ queryKey: ["/api/priority-content"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/priority-content", updateTrigger] });
      
      // Force immediate refetch to update UI instantly
      await queryClient.refetchQueries({ queryKey: ["/api/priority-content", updateTrigger] });
      
      // Invalidate ALL creator-specific priority content queries for immediate creator interface updates
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey.some(key => 
            typeof key === 'string' && (
              key.includes('/priority-content') || 
              key.includes('/api/creator/')
            )
          );
        }
      });
      
      // Trigger UI update to force re-render
      setUpdateTrigger(prev => prev + 1);
      
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Priority content request created successfully",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state across all interfaces
      queryClient.invalidateQueries({ queryKey: ["/api/priority-content"] });
      // Ensure creator interfaces also update
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey.some(key => 
            typeof key === 'string' && key.includes('/api/creator/')
          );
        }
      });
    },
  });

  // Update priority content mutation with optimistic updates
  const updatePriorityContent = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PriorityContent> }) => {
      const response = await fetch(`/api/priority-content/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update priority content");
      return response.json();
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/priority-content", updateTrigger] });

      // Snapshot the previous value
      const previousContent = queryClient.getQueryData(["/api/priority-content", updateTrigger]);

      // Optimistically update the priority content
      queryClient.setQueryData(["/api/priority-content", updateTrigger], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((item: any) => 
          item.id === id 
            ? { ...item, ...data, updatedAt: new Date().toISOString() }
            : item
        );
      });

      // Immediately force UI update by incrementing trigger
      setUpdateTrigger(prev => prev + 1);

      // Return a context object with the snapshotted value
      return { previousContent };
    },
    onError: (err, { id, data }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["/api/priority-content", updateTrigger], context?.previousContent);
      // Revert the trigger increment
      setUpdateTrigger(prev => prev - 1);
      toast({
        title: "Error",
        description: "Failed to update priority content",
        variant: "destructive",
      });
    },
    onSuccess: async () => {
      // Force immediate refetch of priority content data to sync with server
      await queryClient.invalidateQueries({ queryKey: ["/api/priority-content"] });
      await queryClient.refetchQueries({ queryKey: ["/api/priority-content", updateTrigger] });
      
      // Enhanced invalidation strategy: Target ALL creator-specific priority content queries
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const hasCreatorPriorityContent = query.queryKey.some(key => 
            typeof key === 'string' && (
              key.includes('/priority-content') || 
              key.includes('/api/creator/') ||
              key.match(/^\/api\/creator\/.*\/priority-content$/)
            )
          );
          
          // Also invalidate any query keys that are arrays containing creator priority content paths
          const hasCreatorPriorityArray = query.queryKey.some((key, index) => 
            typeof key === 'string' && 
            key.includes('/priority-content') && 
            query.queryKey[index - 1] && 
            typeof query.queryKey[index - 1] === 'string' && 
            (query.queryKey[index - 1] as string).includes('/api/creator/')
          );
          
          return hasCreatorPriorityContent || hasCreatorPriorityArray;
        }
      });
      
      // Force immediate refetch of all creator priority content queries
      await queryClient.refetchQueries({ 
        predicate: (query) => {
          return query.queryKey.some(key => 
            typeof key === 'string' && key.match(/^\/api\/creator\/.*\/priority-content$/)
          );
        }
      });
      
      setIsEditDialogOpen(false);
      setEditingContent(null);
      toast({
        title: "Success",
        description: "Priority content updated successfully",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/priority-content"] });
    },
  });

  // Complete priority content - direct API call with immediate state update
  const [completingIds, setCompletingIds] = useState<Set<number>>(new Set());

  const completePriorityContent = {
    mutate: async (id: number) => {
      console.log("🚀 Starting completion for ID:", id);
      setCompletingIds(prev => new Set(Array.from(prev).concat(id)));

      try {
        // Step 1: Immediately update local state to completed status
        setPriorityContent(prevContent => 
          prevContent.map(item => 
            item.id === id 
              ? { ...item, status: 'completed' as const, updatedAt: new Date().toISOString() }
              : item
          )
        );

        // Step 2: Make API call to server
        const response = await fetch(`/api/priority-content/${id}/complete`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to complete priority content");
        }

        console.log("🎉 Completion successful - item moved to completed");
        
        toast({
          title: "Success",
          description: "Priority content marked as completed",
        });
      } catch (error: any) {
        console.error("❌ Completion failed:", error);
        
        // Revert local state on error
        setPriorityContent(prevContent => 
          prevContent.map(item => 
            item.id === id 
              ? { ...item, status: 'pending' as const }
              : item
          )
        );
        
        toast({
          title: "Error",
          description: "Failed to complete priority content",
          variant: "destructive",
        });
      } finally {
        setCompletingIds(prev => new Set(Array.from(prev).filter(completingId => completingId !== id)));
      }
    },
    isPending: false // We'll use completingIds for individual item loading states
  };

  // Delete priority content mutation (for CRM users)
  const deletePriorityContent = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/priority-content/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to delete priority content");
      return response.json();
    },
    onSuccess: async (data, id) => {
      // Immediate cache invalidation and refresh for instant UI sync
      await queryClient.invalidateQueries({ queryKey: ["/api/priority-content"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/priority-content", updateTrigger] });
      
      // Remove all cached data to force fresh fetch
      queryClient.removeQueries({ queryKey: ["/api/priority-content"] });
      queryClient.removeQueries({ queryKey: ["/api/priority-content", updateTrigger] });
      
      // Force immediate state update to trigger re-render
      setUpdateTrigger(prev => prev + 1);
      
      // Invalidate creator-specific queries for cross-interface sync
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey.some(key => 
            typeof key === 'string' && (
              key.includes('/priority-content') || 
              key.includes('/creator/') ||
              key.includes('/api/creator')
            )
          );
        }
      });
      
      toast({
        title: "Success",
        description: "Priority content deleted successfully",
      });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: "Failed to delete priority content",
        variant: "destructive",
      });
    },
  });

  // Copy link function for priority content sharing
  const copyPriorityContentLink = async (contentId: number) => {
    try {
      // Use production domain for the share URL with direct ID access
      const productionBaseUrl = 'https://tastyyyy.com';
      const shareLink = `${productionBaseUrl}/priority-content-public/${contentId}`;
      
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link Copied",
        description: "Priority content link has been copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy priority content link:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  // Separate content by status for tabs - ensure priorityContent is an array
  const validPriorityContent = Array.isArray(priorityContent) ? priorityContent : [];
  
  const pendingContent = validPriorityContent.filter((content: PriorityContent) => 
    content.status === "pending" || content.status === "in-progress"
  );
  
  const completedContent = validPriorityContent.filter((content: PriorityContent) => 
    content.status === "completed"
  );

  // Filter content based on active tab and filters
  const getFilteredContent = (contentList: PriorityContent[]) => {
    // Ensure contentList is an array before filtering
    const validContentList = Array.isArray(contentList) ? contentList : [];
    
    return validContentList.filter((content: PriorityContent) => {
      const matchesSearch = content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           content.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           content.creatorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === "all" || content.priority === filterPriority;
      const matchesCreator = filterCreator === "all" || content.creatorId.toString() === filterCreator;
      
      return matchesSearch && matchesPriority && matchesCreator;
    });
  };

  const filteredPendingContent = getFilteredContent(pendingContent);
  const filteredCompletedContent = getFilteredContent(completedContent);
  const currentContent = activeTab === "pending" ? filteredPendingContent : filteredCompletedContent;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-gray-100 text-gray-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "in-progress": return <Zap className="w-4 h-4" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const EditContentForm = () => {
    const [formData, setFormData] = useState({
      title: editingContent?.title || "",
      description: editingContent?.description || "",
      creatorId: editingContent?.creatorId?.toString() || "",
      priority: editingContent?.priority || "medium",
      category: editingContent?.category || "custom",
      dueDate: editingContent?.dueDate?.split('T')[0] || "",
      requestedBy: editingContent?.requestedBy || "",
      estimatedDuration: editingContent?.estimatedDuration || 1,
      notes: editingContent?.notes || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingContent) return;
      
      const submitData = {
        title: formData.title,
        description: formData.description,
        creatorId: parseInt(formData.creatorId),
        priority: formData.priority as "urgent" | "high" | "medium" | "low",
        category: formData.category as "custom" | "promotion" | "collaboration" | "event" | "other",
        dueDate: formData.dueDate,
        requestedBy: formData.requestedBy,
        estimatedDuration: formData.estimatedDuration,
        notes: formData.notes,
      };
      updatePriorityContent.mutate({ id: editingContent.id, data: submitData });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Content request title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-creator">Assign to Creator *</Label>
            <Select value={formData.creatorId} onValueChange={(value) => setFormData({ ...formData, creatorId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select creator">
                  {formData.creatorId && Array.isArray(creators) && creators.find((c: any) => c.id.toString() === formData.creatorId) && (
                    <div className="flex items-center space-x-2">
                      <CreatorAvatar 
                        creator={creators.find((c: any) => c.id.toString() === formData.creatorId)}
                        size="sm"
                      />
                      <span>{creators.find((c: any) => c.id.toString() === formData.creatorId)?.displayName}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(creators) && creators.map((creator: any) => (
                  <SelectItem key={creator.id} value={creator.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <CreatorAvatar 
                        creator={{
                          id: creator.id,
                          displayName: creator.displayName,
                          username: creator.username,
                          profileImageUrl: creator.profileImageUrl
                        }}
                        size="sm"
                      />
                      <span>{creator.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Description *</Label>
          <Textarea
            id="edit-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed description of content requirements"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priority *</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as "urgent" | "high" | "medium" | "low" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as "custom" | "promotion" | "collaboration" | "event" | "other" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Content</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
                <SelectItem value="collaboration">Collaboration</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-dueDate">Due Date</Label>
            <Input
              id="edit-dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-requestedBy">Requested By</Label>
            <Input
              id="edit-requestedBy"
              value={formData.requestedBy}
              onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
              placeholder="Who requested this content"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-estimatedDuration">Estimated Duration (hours)</Label>
            <Input
              id="edit-estimatedDuration"
              type="number"
              min="0.5"
              step="0.5"
              value={formData.estimatedDuration}
              onChange={(e) => setFormData({ ...formData, estimatedDuration: parseFloat(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-notes">Additional Notes</Label>
          <Textarea
            id="edit-notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional requirements or notes"
            rows={2}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updatePriorityContent.isPending}>
            {updatePriorityContent.isPending ? "Updating..." : "Update Request"}
          </Button>
        </div>
      </form>
    );
  };

  const CreateContentForm = () => {
    const [formData, setFormData] = useState({
      title: "",
      description: "",
      creatorId: "",
      priority: "medium",
      category: "custom",
      dueDate: "",
      requestedBy: "",
      estimatedDuration: 2,
      notes: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const submitData = {
        title: formData.title,
        description: formData.description,
        creatorId: parseInt(formData.creatorId),
        priority: formData.priority as "urgent" | "high" | "medium" | "low",
        category: formData.category as "custom" | "promotion" | "collaboration" | "event" | "other",
        dueDate: formData.dueDate,
        requestedBy: formData.requestedBy,
        estimatedDuration: formData.estimatedDuration,
        notes: formData.notes,
      };
      createPriorityContent.mutate(submitData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Content request title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="creator">Assign to Creator *</Label>
            <Select value={formData.creatorId} onValueChange={(value) => setFormData({ ...formData, creatorId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select creator">
                  {formData.creatorId && Array.isArray(creators) && creators.find((c: any) => c.id.toString() === formData.creatorId) && (
                    <div className="flex items-center space-x-2">
                      <CreatorAvatar 
                        creator={creators.find((c: any) => c.id.toString() === formData.creatorId)}
                        size="sm"
                      />
                      <span>{creators.find((c: any) => c.id.toString() === formData.creatorId)?.displayName}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(creators) && creators.map((creator: any) => (
                  <SelectItem key={creator.id} value={creator.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <CreatorAvatar 
                        creator={{
                          id: creator.id,
                          displayName: creator.displayName,
                          username: creator.username,
                          profileImageUrl: creator.profileImageUrl
                        }}
                        size="sm"
                      />
                      <span>{creator.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed description of the content request"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">🚨 Urgent</SelectItem>
                <SelectItem value="high">🔴 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Solo">Solo</SelectItem>
                <SelectItem value="BG">BG</SelectItem>
                <SelectItem value="GG">GG</SelectItem>
                <SelectItem value="JOI">JOI</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Twitter">Twitter</SelectItem>
                <SelectItem value="Sexting Set">Sexting Set</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="requestedBy">Requested By</Label>
            <Input
              id="requestedBy"
              value={formData.requestedBy}
              onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
              placeholder="Employee name or department"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedDuration">Estimated Duration (hours)</Label>
            <Input
              id="estimatedDuration"
              type="number"
              min="0.5"
              step="0.5"
              value={formData.estimatedDuration}
              onChange={(e) => setFormData({ ...formData, estimatedDuration: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional requirements or notes"
            rows={2}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createPriorityContent.isPending}>
            {createPriorityContent.isPending ? "Creating..." : "Create Request"}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Priority Content"
        description="Manage high-priority content requests and assignments"
        showBackButton={true}
        useBrowserBack={true}
        actions={
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </Button>
        }
      />
      
      <div className="px-6 pb-6 space-y-6">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Priority Content Request</DialogTitle>
              <DialogDescription>
                Create a new high-priority content request for creators
              </DialogDescription>
            </DialogHeader>
            <CreateContentForm />
          </DialogContent>
        </Dialog>

        {/* Edit Priority Content Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Priority Content Request</DialogTitle>
              <DialogDescription>
                Update the priority content request details
              </DialogDescription>
            </DialogHeader>
            {editingContent && <EditContentForm />}
          </DialogContent>
        </Dialog>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search content requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualRefresh}
              disabled={isLoading || forceRefresh}
              className="flex items-center gap-2"
            >
              {forceRefresh ? (
                <LoadingAnimation size="sm" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              {forceRefresh ? "Refreshing..." : "Refresh"}
            </Button>
            <div className="flex gap-2">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCreator} onValueChange={setFilterCreator}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Creator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  {Array.isArray(creators) && creators.map((creator: any) => (
                    <SelectItem key={creator.id} value={creator.id.toString()}>
                      {creator.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingAnimation size="lg" />
          <p className="text-gray-600 mt-6">Loading priority content...</p>
        </div>
      ) : (
        <>
          {/* Tabs for Pending and Completed Requests */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "pending" | "completed")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Requests
                <Badge variant="secondary" className="ml-2">
                  {filteredPendingContent.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Completed Requests
                <Badge variant="secondary" className="ml-2">
                  {filteredCompletedContent.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPendingContent.map((content: PriorityContent) => (
              <Card key={content.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{content.title}</CardTitle>
                      <div className="flex gap-2 mb-2">
                        <Badge className={getPriorityColor(content.priority)}>
                          <Flag className="w-3 h-3 mr-1" />
                          {content.priority}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(content.status)}>
                          {getStatusIcon(content.status)}
                          <span className="ml-1 capitalize">{content.status}</span>
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyPriorityContentLink(content.id)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Copy Link"
                    >
                      <Link className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-3">{content.description}</p>
                  
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {content.creatorName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{content.creatorName}</span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-500">
                    {content.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {format(new Date(content.dueDate), "MMM d, yyyy")}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {content.estimatedDuration}h estimated
                    </div>
                    {content.requestedBy && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Requested by: {content.requestedBy}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {content.category}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Created {format(new Date(content.createdAt), "MMM d")}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => completePriorityContent.mutate(content.id)}
                        disabled={completingIds.has(content.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title={completingIds.has(content.id) ? "Completing..." : "Mark as Completed"}
                      >
                        {completingIds.has(content.id) ? (
                          <LoadingAnimation size="sm" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingContent(content);
                          setIsEditDialogOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Edit Request"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deletePriorityContent.mutate(content.id)}
                        disabled={deletePriorityContent.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete Request"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPendingContent.length === 0 && (
            <Card className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Requests</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterPriority !== "all" || filterCreator !== "all"
                  ? "No pending requests match your current filters."
                  : "All priority content requests have been completed."}
              </p>
              {(!searchQuery && filterPriority === "all" && filterCreator === "all") && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Request
                </Button>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCompletedContent.map((content: PriorityContent) => (
              <Card key={content.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{content.title}</CardTitle>
                      <div className="flex gap-2 mb-2">
                        <Badge className={getPriorityColor(content.priority)}>
                          <Flag className="w-3 h-3 mr-1" />
                          {content.priority}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(content.status)}>
                          {getStatusIcon(content.status)}
                          <span className="ml-1 capitalize">{content.status}</span>
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyPriorityContentLink(content.id)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Copy Link"
                    >
                      <Link className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-3">{content.description}</p>
                  
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {content.creatorName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{content.creatorName}</span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-500">
                    {content.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {format(new Date(content.dueDate), "MMM d, yyyy")}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {content.estimatedDuration}h estimated
                    </div>
                    {content.requestedBy && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Requested by: {content.requestedBy}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {content.category}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Completed {format(new Date(content.updatedAt), "MMM d")}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingContent(content);
                          setIsEditDialogOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Edit Request"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deletePriorityContent.mutate(content.id)}
                        disabled={deletePriorityContent.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete Request"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCompletedContent.length === 0 && (
            <Card className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Completed Requests</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterPriority !== "all" || filterCreator !== "all"
                  ? "No completed requests match your current filters."
                  : "No priority content requests have been completed yet."}
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </>
      )}
      </div>
    </div>
  );
}