import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { useDropzone } from "react-dropzone";
import { 
  ArrowLeft,
  MessageCircle,
  Send,
  Plus,
  Edit,
  Trash2,
  Archive,
  UserPlus,
  MessageSquare,
  Calendar,
  Search,
  UserMinus,
  Users,
  Pin,
  PinOff,
  MoreHorizontal,
  Eye,
  UserX,
  Paperclip,
  Image,
  Video,
  X,
  Play,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { PageHeader } from "@/components/page-header";
import { CenteredSectionLoader } from "@/components/ui/loading-animation";
import { useAuth } from "@/hooks/useAuth";
import { CreatorAvatar } from "@/components/ui/creator-avatar";
import { ChatSkeleton } from "@/components/ui/skeleton-loader";
import { useCreatorProfiles } from "@/hooks/useCreatorProfiles";

// Form schemas
const groupChatSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  creatorIds: z.array(z.number()).min(1, "At least one creator is required"),
});

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
});

// Types
interface GroupChat {
  id: number;
  name: string;
  description: string | null;
  createdBy: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  profile_image_url: string | null;
  memberCount: number;
  messageCount?: number;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: Date;
  };
}

interface GroupChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  mediaThumbnailUrl: string | null;
  mediaFileName: string | null;
  mediaMimeType: string | null;
  mediaFileSize: number | null;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: number;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
    bannerImageUrl: string | null;
    teamId: number | null;
    revenue: string | null;
    messageCount: number | null;
    responseRate: string | null;
    lastActivity: Date | null;
    isActive: boolean | null;
    publicToken: string | null;
    aestheticTemplateId: number | null;
    templateAssignedAt: Date | null;
    templateAssignedBy: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
}

interface Creator {
  id: number;
  creatorId: number;
  displayName: string;
  username: string;
  profileImageUrl: string | null;
  isActive: boolean;
}

export default function ClientPortalAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  
  // Debug selectedChatId changes
  useEffect(() => {
    console.log('selectedChatId changed to:', selectedChatId);
  }, [selectedChatId]);


  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [isEditMembersOpen, setIsEditMembersOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [showReadReceipts, setShowReadReceipts] = useState<number | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'manage'>('chats');
  const [manageChatId, setManageChatId] = useState<number | null>(null);
  const [isEditChatOpen, setIsEditChatOpen] = useState(false);
  const [editChatForm, setEditChatForm] = useState({ name: '', description: '' });
  const [deleteChatId, setDeleteChatId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket connection setup
  useEffect(() => {
    if (!selectedChatId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('🔌 Connecting to WebSocket for chat:', selectedChatId, 'URL:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log('✅ WebSocket connected, authenticating...');
      
      // Debug: Check all available cookies
      console.log('🔍 All cookies:', document.cookie);
      
      // Try multiple methods to get the JWT token
      let token = null;
      
      // Method 1: Check cookies
      if (document.cookie) {
        token = document.cookie
          .split('; ')
          .find(row => row.startsWith('employee_access_token='))
          ?.split('=')[1];
        
        if (!token) {
          token = document.cookie
            .split('; ')
            .find(row => row.startsWith('access_token='))
            ?.split('=')[1];
        }
      }
      
      // Method 2: If no cookies available, try to get token via API call
      if (!token) {
        try {
          console.log('🔍 No cookies available, trying to get token via API...');
          const response = await fetch('/api/employee-auth/get-token', {
            method: 'GET',
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            token = data.token;
            console.log('🔍 Token retrieved via API:', !!token);
          }
        } catch (error) {
          console.log('🔍 Could not retrieve token via API:', error);
        }
      }
      
      console.log('🔍 Found token:', token ? 'YES' : 'NO');
      
      if (token) {
        // Send authentication message first
        ws.send(JSON.stringify({
          type: 'auth',
          token: token
        }));
      } else {
        console.log('⚠️ No JWT token found, using fallback authentication');
        // For now, still mark as connected and authenticated since the REST API auth is working
        setWsConnected(true);
        setWsAuthenticated(true);
        
        // Join the chat room directly without token auth (fallback mode)
        if (selectedChatId) {
          ws.send(JSON.stringify({
            type: 'join_chat',
            chatId: selectedChatId
          }));
        }
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 WebSocket message received:', data);
      
      if (data.type === 'auth_success') {
        console.log('✅ WebSocket authenticated successfully');
        setWsConnected(true);
        // Now join the specific chat room
        ws.send(JSON.stringify({
          type: 'join_chat',
          chatId: selectedChatId.toString()
        }));
      } else if (data.type === 'auth_error') {
        console.error('❌ WebSocket authentication failed:', data.message);
        setWsConnected(false);
      } else if (data.type === 'joined_chat') {
        console.log('✅ Joined chat:', data.chatId);
      } else if (data.type === 'new_message' && data.chatId === selectedChatId.toString()) {
        // Add the new message to the query cache
        queryClient.setQueryData(
          ["/api/group-chats", selectedChatId, "messages"],
          (oldMessages: any[] = []) => [...oldMessages, data.message]
        );
      } else if (data.type === 'message_deleted' && data.chatId === selectedChatId.toString()) {
        // Remove the deleted message from the query cache
        queryClient.setQueryData(
          ["/api/group-chats", selectedChatId, "messages"],
          (oldMessages: any[] = []) => 
            oldMessages.filter(msg => msg.id !== parseInt(data.messageId))
        );
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leave_chat',
          chatId: selectedChatId.toString()
        }));
        ws.close();
      }
    };
  }, [selectedChatId, queryClient]);

  // Fetch current user info to identify own messages
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/user");
      return response.json();
    },
  });

  // Fetch group chats with performance optimization
  const { data: groupChats = [], isLoading: isLoadingChats, error: groupChatsError } = useQuery<GroupChat[]>({
    queryKey: ["/api/group-chats"],
    queryFn: async () => {
      console.log('🔍 Fetching group chats...');
      const response = await apiRequest("GET", "/api/group-chats");
      console.log('🔍 Group chats response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Group chats error response:', errorText);
        throw new Error(`Failed to fetch group chats: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🔍 Group chats raw data:', data);
      
      // Handle authentication errors
      if (data && typeof data === 'object' && 'message' in data && data.message === 'Not authenticated') {
        console.error('🔍 Authentication error in group chats');
        throw new Error('Authentication required');
      }
      
      // Ensure we have an array
      if (!Array.isArray(data)) {
        console.error('🔍 API returned non-array response:', data);
        throw new Error('Invalid response format');
      }
      
      console.log('🔍 Group chats frontend data:', data.map((gc: any) => ({
        id: gc.id,
        name: gc.name,
        memberCount: gc.memberCount,
        hasProperty: 'memberCount' in gc
      })));
      return data;
    },
    staleTime: 0, // Always refetch
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      console.log('🔍 Group chats retry attempt:', failureCount, error.message);
      // Don't retry authentication errors
      if (error.message.includes('Authentication required')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: 1000
  });

  // Use the new creator profile system for better consistency
  const { 
    creators: creatorsData, 
    isLoading: isLoadingCreators, 
    error: creatorsError,
    getCreatorById
  } = useCreatorProfiles({
    activeOnly: true,
    sortByDisplayName: true
  });

  // Transform creators to format needed for member selection with normalized data
  const creators = creatorsData.map((creator: any) => ({
    id: creator.id,
    creatorId: creator.id, // Use the actual creator ID
    displayName: creator.displayName || creator.username,
    username: creator.username,
    profileImageUrl: creator.profileImageUrl,
    isActive: true
  }));

  // Filter creators based on search query
  const filteredCreators = creators.filter((creator: Creator) => {
    if (!creatorSearchQuery) return true;
    const query = creatorSearchQuery.toLowerCase();
    return (
      creator.displayName.toLowerCase().includes(query) ||
      creator.username.toLowerCase().includes(query)
    );
  });

  // Fetch messages for selected chat (no caching for real-time WebSocket updates)
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/group-chats", selectedChatId, "messages"],
    queryFn: async () => {
      if (!selectedChatId) return [];
      console.log(`📨 Fetching messages for chat ${selectedChatId}...`);
      const response = await apiRequest('GET', `/api/group-chats/${selectedChatId}/messages`);
      const data = await response.json();
      console.log(`📨 Received ${data.length} messages for chat ${selectedChatId}:`, data.map((m: any) => ({ id: m.id, content: m.content, sender: m.senderDisplayName })));
      return data;
    },
    enabled: !!selectedChatId,
    staleTime: 0, // No caching - rely on WebSocket for updates
    gcTime: 0, // No garbage collection time
    refetchOnWindowFocus: false, // No refetch on focus - WebSocket handles updates
    refetchInterval: false, // No polling - WebSocket handles real-time updates
    retry: 2,
    retryDelay: 1000
  });

  // Fetch chat members for selected chat (used for both management and read receipts)
  const activeChatId = manageChatId || (showReadReceipts ? selectedChatId : null);
  const { data: chatMembers = [], isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ["/api/group-chats", activeChatId, "members"],
    enabled: !!activeChatId,
    queryFn: async () => {
      console.log('Fetching members for chat ID:', activeChatId);
      const response = await fetch(getApiUrl(`/api/group-chats/${activeChatId}/members`), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const result = await response.json();
      console.log('Members API response:', result);
      return result;
    },
  });

  // Debug activeChatId changes
  useEffect(() => {
    console.log('activeChatId changed to:', activeChatId);
    if (activeChatId) {
      console.log('Triggering manual refetch for activeChatId:', activeChatId);
      refetchMembers();
    }
  }, [activeChatId, refetchMembers]);

  // Debug log for members data
  console.log('Members query state:', {
    selectedChatId,
    manageChatId,
    showReadReceipts,
    activeChatId,
    chatMembers,
    isLoadingMembers,
    queryEnabled: !!activeChatId
  });

  // Create group chat mutation
  const createChatMutation = useMutation({
    mutationFn: async (data: z.infer<typeof groupChatSchema>) => {
      const response = await apiRequest("POST", "/api/group-chats", data);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/group-chats"] });
      await queryClient.refetchQueries({ queryKey: ["/api/group-chats"] });
      setIsCreateChatOpen(false);
      createChatForm.reset();
      toast({
        title: "Success",
        description: "Group chat created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; files?: File[] }) => {
      const formData = new FormData();
      formData.append("content", data.content);
      formData.append("chatId", selectedChatId!.toString());
      
      if (data.files) {
        data.files.forEach((file) => {
          formData.append("files", file);
        });
      }

      console.log('📤 Sending message with content:', data.content);
      console.log('📤 FormData entries:', Array.from(formData.entries()));

      const response = await apiRequest("POST", `/api/group-chats/${selectedChatId}/messages`, formData);
      const result = await response.json();
      console.log('📤 Message sent result:', result);
      return result;
    },
    onSuccess: async (newMessage) => {
      console.log('📨 Message sent successfully, WebSocket will handle the update');
      
      // WebSocket broadcast will handle adding the message to the UI
      // Just clear the input fields
      setNewMessage("");
      setSelectedFiles([]);
      
      // Scroll to bottom after message is sent
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete chat mutation
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      await apiRequest("DELETE", `/api/group-chats/${chatId}`);
    },
    onSuccess: async () => {
      // Comprehensive cache invalidation for all group chat related queries
      await queryClient.invalidateQueries({ queryKey: ["/api/group-chats"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/creator-group-chats"] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ["/api/group-chats"] });
      
      // Reset UI state
      setSelectedChatId(null);
      setDeleteChatId(null);
      setIsDeleteConfirmOpen(false);
      
      toast({
        title: "Success",
        description: "Group chat permanently deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Management mutations
  const managementMutations = {
    editChat: useMutation({
      mutationFn: async ({ chatId, data }: { chatId: number; data: { name: string; description: string } }) => {
        await apiRequest("PUT", `/api/group-chats/${chatId}`, data);
      },
      onSuccess: async () => {
        // Aggressive cache invalidation
        await queryClient.invalidateQueries({ queryKey: ["/api/group-chats"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/creator-group-chats"] });
        
        // Force immediate refetch
        await queryClient.refetchQueries({ queryKey: ["/api/group-chats"] });
        
        setIsEditChatOpen(false);
        toast({ title: "Success", description: "Group chat updated successfully" });
      },
      onError: (error: Error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    }),
    
    addMember: useMutation({
      mutationFn: async ({ chatId, creatorId }: { chatId: number; creatorId: number }) => {
        await apiRequest("POST", `/api/group-chats/${chatId}/members`, { creatorId });
      },
      onSuccess: async (_, { chatId }) => {
        console.log('Add member success, chatId:', chatId);
        // Aggressive cache invalidation
        await queryClient.invalidateQueries({ queryKey: ["/api/group-chats"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/group-chats", chatId, "members"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/creator-group-chats"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
        
        // Force immediate refetch of all related data
        await queryClient.refetchQueries({ queryKey: ["/api/group-chats"] });
        await queryClient.refetchQueries({ queryKey: ["/api/group-chats", chatId, "members"] });
        
        // Also manually trigger refetch if we have the refetch function
        if (selectedChatId === chatId && refetchMembers) {
          await refetchMembers();
        }
        toast({ title: "Success", description: "Creator added to group chat" });
      },
      onError: (error: Error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    }),
    
    removeMember: useMutation({
      mutationFn: async ({ chatId, creatorId }: { chatId: number; creatorId: number }) => {
        await apiRequest("DELETE", `/api/group-chats/${chatId}/members/${creatorId}`);
      },
      onSuccess: async (_, { chatId }) => {
        // Invalidate both the main group chats query and the specific members query
        await queryClient.invalidateQueries({ queryKey: ["/api/group-chats"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/group-chats", chatId, "members"] });
        // Force immediate refetch of members data
        await queryClient.refetchQueries({ queryKey: ["/api/group-chats", chatId, "members"] });
        toast({ title: "Success", description: "Creator removed from group chat" });
      },
      onError: (error: Error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    }),
    
    deleteMessage: useMutation({
      mutationFn: async (messageId: number) => {
        await apiRequest("DELETE", `/api/group-chats/${selectedChatId}/messages/${messageId}`);
      },
      onSuccess: () => {
        // WebSocket broadcast will handle removing the message from UI
        console.log('🗑️ Message deletion successful, WebSocket will handle the update');
        toast({ title: "Success", description: "Message deleted" });
      },
      onError: (error: Error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    }),

    updateProfilePhoto: useMutation({
      mutationFn: async ({ chatId, file }: { chatId: number; file: File }) => {
        const formData = new FormData();
        formData.append('profilePhoto', file);
        
        // Use apiRequest like other mutations in this file
        const response = await apiRequest("PUT", `/api/group-chats/${chatId}/profile-photo`, formData);
        return response.json();
      },
      onSuccess: async (data, { chatId }) => {
        console.log('🔄 Profile photo upload successful, refreshing cache...', data);
        
        // Invalidate and force immediate refetch of group chats
        await queryClient.invalidateQueries({ queryKey: ["/api/group-chats"] });
        await queryClient.refetchQueries({ queryKey: ["/api/group-chats"] });
        
        // Also refresh the specific chat data
        await queryClient.invalidateQueries({ queryKey: ["/api/group-chats", chatId] });
        
        setIsUploadingProfilePhoto(false);
        toast({ title: "Success", description: "Group photo updated successfully" });
      },
      onError: (error: Error) => {
        console.error('❌ Profile photo upload failed:', error);
        setIsUploadingProfilePhoto(false);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    }),
  };

  // Form for creating group chat
  const createChatForm = useForm<z.infer<typeof groupChatSchema>>({
    resolver: zodResolver(groupChatSchema),
    defaultValues: {
      name: "",
      description: "",
      creatorIds: [],
    },
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 25 * 1024 * 1024; // 25MB limit
      return (isImage || isVideo) && isValidSize;
    });
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Warning",
        description: "Some files were excluded (only images/videos under 25MB are allowed)",
        variant: "destructive",
      });
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  // File drop zone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm']
    },
    maxSize: 25 * 1024 * 1024, // 25MB
    maxFiles: 5,
    onDrop: (acceptedFiles) => {
      setSelectedFiles(prev => [...prev, ...acceptedFiles].slice(0, 5));
    },
  });

  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      await sendMessageMutation.mutateAsync({
        content: newMessage,
        files: selectedFiles.length > 0 ? selectedFiles : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle profile photo upload
  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error", 
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingProfilePhoto(true);
    managementMutations.updateProfilePhoto.mutate({
      chatId: selectedChatId,
      file: file,
    });
  };

  if (isLoadingChats) {
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
        <div className="flex-1 flex flex-col h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex space-x-1">
              <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
              <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
            </div>
          </div>
          <ChatSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Group Chats"
        description="Manage group chats and communication with creators"
        showBackButton={true}
        useBrowserBack={true}
        actions={
          <Button onClick={() => setIsCreateChatOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Group Chat
          </Button>
        }
      />
      
      <div className="flex-1 flex flex-col h-screen bg-gray-50">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('chats')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'chats'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="w-4 h-4 inline mr-2" />
            Group Chats
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'manage'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MoreHorizontal className="w-4 h-4 inline mr-2" />
            Manage Chats
          </button>
          </div>
        </div>

      {/* Create Group Chat Dialog */}
      <Dialog open={isCreateChatOpen} onOpenChange={setIsCreateChatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group Chat</DialogTitle>
            <DialogDescription>
              Create a new group chat and select creators to add.
            </DialogDescription>
          </DialogHeader>
          <Form {...createChatForm}>
            <form onSubmit={createChatForm.handleSubmit((data) => createChatMutation.mutate(data))} className="space-y-4">
              <FormField
                control={createChatForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter group name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createChatForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter group description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createChatForm.control}
                name="creatorIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Creators</FormLabel>
                    <FormDescription>
                      Choose creators to add to this group chat
                    </FormDescription>
                    <div className="space-y-2">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search creators..."
                          value={creatorSearchQuery}
                          onChange={(e) => setCreatorSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div className="max-h-32 overflow-y-auto space-y-2">
                        {filteredCreators.length === 0 && creatorSearchQuery ? (
                          <p className="text-sm text-gray-500 text-center py-2">
                            No creators found matching "{creatorSearchQuery}"
                          </p>
                        ) : (
                          filteredCreators.map((creator) => (
                            <div key={creator.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`creator-${creator.id}`}
                                checked={field.value.includes(creator.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, creator.id]);
                                  } else {
                                    field.onChange(field.value.filter((id) => id !== creator.id));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`creator-${creator.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {creator.displayName} (@{creator.username})
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateChatOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createChatMutation.isPending}>
                  Create Group Chat
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Tab Content */}
      {activeTab === 'chats' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Chat List Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Group Chats</h2>
              <p className="text-sm text-gray-500">{groupChats.length} active chats</p>
              {groupChatsError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  Error: {groupChatsError.message}
                </div>
              )}
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2">
                {isLoadingChats ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading chats...
                  </div>
                ) : groupChatsError ? (
                  <div className="text-center py-8">
                    <div className="text-red-500 mb-2">⚠️</div>
                    <p className="text-red-600 font-medium">Failed to load chats</p>
                    <p className="text-sm text-red-500 mt-1">{groupChatsError.message}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : groupChats.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No group chats yet</p>
                    <p className="text-xs text-gray-400">Create your first group chat to get started</p>
                  </div>
                ) : (
                  groupChats.map((chat) => (
                    <div
                      key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                      selectedChatId === chat.id
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                            {chat.profile_image_url ? (
                              <img 
                                src={chat.profile_image_url.startsWith('http') ? chat.profile_image_url : getApiUrl(chat.profile_image_url)}
                                alt={`${chat.name} profile`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('Failed to load group chat profile image:', chat.profile_image_url);
                                  // Fallback to MessageCircle icon if image fails to load
                                  const container = e.currentTarget.parentElement;
                                  if (container) {
                                    container.innerHTML = '<svg class="w-5 h-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
                                  }
                                }}
                              />
                            ) : (
                              <MessageCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Users className="w-3 h-3" />
                              <span>{chat.memberCount} members</span>
                            </div>
                          </div>
                        </div>
                        
                        {chat.lastMessage && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 truncate">
                              <span className="font-medium">{chat.lastMessage.senderName}:</span>{" "}
                              {chat.lastMessage.content}
                            </p>
                            <p className="text-xs text-gray-400">
                              {chat.lastMessage?.createdAt ? formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true }) : 'No messages'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Interface */}
          {selectedChatId ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                      {(() => {
                        const currentChat = groupChats.find(c => c.id === selectedChatId);
                        return currentChat?.profile_image_url ? (
                          <img 
                            src={currentChat.profile_image_url.startsWith('http') ? currentChat.profile_image_url : getApiUrl(currentChat.profile_image_url)}
                            alt={`${currentChat.name} profile`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Failed to load chat header profile image:', currentChat.profile_image_url);
                              // Fallback to MessageCircle icon if image fails to load
                              const container = e.currentTarget.parentElement;
                              if (container) {
                                container.innerHTML = '<svg class="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
                              }
                            }}
                          />
                        ) : (
                          <MessageCircle className="w-6 h-6 text-blue-600" />
                        );
                      })()}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {groupChats.find(c => c.id === selectedChatId)?.name}
                      </h2>
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span>{groupChats.find(c => c.id === selectedChatId)?.memberCount || 0} members</span>
                        <span className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-xs">{wsConnected ? 'Live' : 'Connecting...'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setManageChatId(selectedChatId);
                        setIsEditMembersOpen(true);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {isLoadingMessages ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message: any) => {
                      // Media display debugging (can be removed in production)
                      const isOwnMessage = currentUser?.id === message.senderId;
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
                          onMouseEnter={() => setHoveredMessage(message.id)}
                          onMouseLeave={() => setHoveredMessage(null)}
                        >
                          <div className={`flex max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                            {/* Profile picture for received messages */}
                            {!isOwnMessage && (
                              <CreatorAvatar 
                                creator={{
                                  id: message.senderId,
                                  displayName: message.senderDisplayName || 'Unknown User',
                                  username: message.senderUsername || '',
                                  profileImageUrl: message.senderProfileImage || message.sender_profile_image || message.sender?.profileImageUrl
                                }}
                                size="sm"
                                className="mb-1"
                              />
                            )}
                            
                            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                              {/* Sender name for received messages */}
                              {!isOwnMessage && (
                                <span className="text-xs text-gray-500 mb-1 px-3">
                                  {message.senderDisplayName || 'Unknown User'}
                                </span>
                              )}
                              
                              {/* Message bubble */}
                              <div className={`
                                relative px-4 py-2 rounded-2xl max-w-full
                                ${isOwnMessage 
                                  ? 'bg-blue-500 text-white rounded-br-md' 
                                  : 'bg-gray-200 text-gray-900 rounded-bl-md'
                                }
                              `}>
                                {message.content && (
                                  <p className="text-sm">{message.content}</p>
                                )}
                                
                                {/* Media attachments */}
                                {message.mediaUrl && (
                                  <div className="mt-2">
                                    {(message.mediaMimeType?.startsWith('image/') || 
                                      message.mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                                      <img 
                                        src={message.mediaUrl} 
                                        alt={message.mediaFileName || "Uploaded image"} 
                                        className="max-w-xs rounded-lg cursor-pointer shadow-md"
                                        style={{ maxHeight: '200px' }}
                                        onClick={() => window.open(message.mediaUrl || '', '_blank')}
                                        onError={(e) => {
                                          console.error('Image failed to load:', message.mediaUrl);
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (message.mediaMimeType?.startsWith('video/') || 
                                         message.mediaUrl?.match(/\.(mp4|mov|webm|avi)$/i)) ? (
                                      <div className="relative max-w-xs rounded-lg shadow-md overflow-hidden">
                                        <video 
                                          src={message.mediaUrl} 
                                          className="w-full h-auto rounded-lg cursor-pointer"
                                          style={{ maxHeight: '200px' }}
                                          onClick={(e) => {
                                            const video = e.currentTarget;
                                            const overlay = video.nextElementSibling as HTMLElement;
                                            if (video.paused) {
                                              video.play();
                                              if (overlay) overlay.style.display = 'none';
                                            } else {
                                              video.pause();
                                              if (overlay) overlay.style.display = 'flex';
                                            }
                                          }}
                                          onPlay={(e) => {
                                            const overlay = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (overlay) overlay.style.display = 'none';
                                          }}
                                          onPause={(e) => {
                                            const overlay = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (overlay) overlay.style.display = 'flex';
                                          }}
                                          onLoadedMetadata={(e) => {
                                            const overlay = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (overlay) overlay.style.display = 'flex';
                                          }}
                                        />
                                        <div 
                                          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer pointer-events-none"
                                          style={{ display: 'flex' }}
                                        >
                                          <div className="bg-white/90 rounded-full p-3 hover:bg-white transition-colors pointer-events-auto">
                                            <svg 
                                              className="w-6 h-6 text-black" 
                                              fill="currentColor" 
                                              viewBox="0 0 24 24"
                                            >
                                              <path d="M8 5v14l11-7z"/>
                                            </svg>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center space-x-2 p-2 bg-black/10 rounded-lg">
                                        <Paperclip className="w-4 h-4" />
                                        <span className="text-sm truncate">
                                          {message.mediaFileName || 'Attachment'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Timestamp */}
                              <span className="text-xs text-gray-400 mt-1 px-3">
                                {(message.createdAt || message.created_at) ? formatDistanceToNow(new Date(message.createdAt || message.created_at), { addSuffix: true }) : 'Unknown time'}
                              </span>
                              
                              {/* Admin controls on hover */}
                              {hoveredMessage === message.id && (
                                <div className="flex space-x-1 mt-1 opacity-40 hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowReadReceipts(message.id)}
                                    className="h-6 w-6 p-0 hover:bg-blue-100 text-blue-600"
                                    title="View read receipts"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => managementMutations.deleteMessage.mutate(message.id)}
                                    className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                                    title="Delete message"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div {...getRootProps()} className={`relative ${isDragActive ? 'bg-blue-50 border-blue-300' : ''}`}>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploading}
                      className="px-4"
                    >
                      {isUploading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* File Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative bg-gray-100 rounded-lg p-2 flex items-center space-x-2">
                          {file.type.startsWith('image/') && (
                            <Image className="w-4 h-4 text-blue-500" />
                          )}
                          {file.type.startsWith('video/') && (
                            <Video className="w-4 h-4 text-purple-500" />
                          )}
                          <span className="text-sm text-gray-700 truncate max-w-32">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                            className="h-4 w-4 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hidden File Input */}
                  <input
                    {...getInputProps()}
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {/* Hidden Profile Photo Input */}
                  <input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Group Chat</h3>
                <p className="text-gray-500">Choose a group chat from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Read Receipts Modal */}
      <Dialog open={showReadReceipts !== null} onOpenChange={() => setShowReadReceipts(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chat Members</DialogTitle>
            <DialogDescription>
              Users who have access to this chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {chatMembers.length > 0 ? (
              chatMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                  <CreatorAvatar 
                    creator={member.creator}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{member.creator.displayName}</p>
                    <p className="text-xs text-gray-500">@{member.creator.username}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">Member</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No members to display</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Management Tab */}
      {activeTab === 'manage' && (
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Group Chat Management</h2>
                <p className="text-gray-600 mt-1">View, edit, and manage all group chats</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupChats.map((chat) => (
                    <div key={chat.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{chat.name}</h3>
                            <p className="text-sm text-gray-500">{chat.description}</p>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setManageChatId(chat.id);
                              setEditChatForm({ name: chat.name, description: chat.description || '' });
                              setIsEditChatOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeleteChatId(chat.id);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{chat.memberCount} members</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>{chat.messageCount || 0} messages</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Created {chat.createdAt ? formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true }) : 'Unknown date'}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setManageChatId(chat.id);
                                setActiveTab('chats');
                                setSelectedChatId(chat.id);
                              }}
                              className="flex-1 min-w-0"
                            >
                              <MessageCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                              <span className="truncate">View Chat</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setManageChatId(chat.id);
                                setSelectedChatId(chat.id);
                                setIsEditMembersOpen(true);
                              }}
                              className="flex-1 min-w-0"
                            >
                              <UserPlus className="w-4 h-4 mr-1 flex-shrink-0" />
                              <span className="truncate">Members</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {groupChats.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No group chats yet</h3>
                    <p className="text-gray-600 mb-4">Create your first group chat to get started</p>
                    <Button onClick={() => setIsCreateChatOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Group Chat
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Chat Dialog */}
      <Dialog open={isEditChatOpen} onOpenChange={setIsEditChatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group Chat</DialogTitle>
            <DialogDescription>
              Update the group chat name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <Input
                value={editChatForm.name}
                onChange={(e) => setEditChatForm({ ...editChatForm, name: e.target.value })}
                placeholder="Enter group name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                value={editChatForm.description}
                onChange={(e) => setEditChatForm({ ...editChatForm, description: e.target.value })}
                placeholder="Enter group description"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsEditChatOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (manageChatId) {
                  managementMutations.editChat.mutate({
                    chatId: manageChatId,
                    data: editChatForm
                  });
                }
              }}
              disabled={managementMutations.editChat.isPending}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isEditMembersOpen} onOpenChange={setIsEditMembersOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
            <DialogDescription>
              Manage group photo, members, and chat settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Profile Picture Section */}
            <div className="space-y-4 pb-6 border-b">
              <h3 className="text-lg font-medium">Group Photo</h3>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-blue-200">
                  <AvatarImage 
                    src={(() => {
                      const profileUrl = groupChats.find(c => c.id === selectedChatId)?.profile_image_url;
                      return profileUrl && profileUrl.startsWith('http') ? profileUrl : getApiUrl(profileUrl || '');
                    })()} 
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-xl">
                    {groupChats.find(c => c.id === selectedChatId)?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    disabled={isUploadingProfilePhoto}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    {isUploadingProfilePhoto ? "Uploading..." : "Change Photo"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Upload a group photo for this chat
                  </p>
                </div>
              </div>
            </div>
            {/* Current Members Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Current Members ({(chatMembers as any[])?.length || 0})</h4>
              </div>
              
              {(chatMembers as any[])?.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {(chatMembers as any[]).map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <CreatorAvatar 
                          creator={{
                            id: member.creator?.id,
                            displayName: member.creator?.displayName || 'Unknown',
                            username: member.creator?.username || 'username',
                            profileImageUrl: member.creator?.profileImageUrl
                          }}
                          size="sm"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{member.creator?.displayName || 'Unknown'}</span>
                          <p className="text-xs text-gray-500">@{member.creator?.username || 'username'}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => managementMutations.removeMember.mutate({ chatId: selectedChatId!, creatorId: member.creator.id })}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        title="Remove from group"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-4 text-center border rounded-lg bg-gray-50">No members in this group yet</p>
              )}
            </div>
            
            {/* Add Members Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Add New Members</h4>
              </div>
              
              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search creators by name..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Available Creators */}
              {(() => {
                const availableCreators = creators
                  .filter(creator => !(chatMembers as any[]).some((member: any) => member.creator?.id === creator.id))
                  .filter(creator => 
                    memberSearchQuery === '' || 
                    creator.displayName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                    creator.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
                  );
                
                return availableCreators.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {availableCreators.map((creator) => (
                      <div key={creator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <CreatorAvatar 
                            creator={{
                              id: creator.id,
                              displayName: creator.displayName,
                              username: creator.username,
                              profileImageUrl: creator.profileImageUrl
                            }}
                            size="sm"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900">{creator.displayName}</span>
                            <p className="text-xs text-gray-500">@{creator.username}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => managementMutations.addMember.mutate({ chatId: selectedChatId!, creatorId: creator.id })}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                          title="Add to group"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm py-4 text-center border rounded-lg bg-gray-50">
                    {memberSearchQuery ? `No creators found matching "${memberSearchQuery}"` : 'All creators are already members of this group'}
                  </p>
                );
              })()}
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => {
              setIsEditMembersOpen(false);
              setMemberSearchQuery(''); // Reset search when closing
            }}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Group Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this group chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This will permanently delete the group chat and remove it from all assigned creators' chat tabs.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setDeleteChatId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteChatId) {
                  deleteChatMutation.mutate(deleteChatId);
                }
              }}
              disabled={deleteChatMutation.isPending}
            >
              {deleteChatMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}