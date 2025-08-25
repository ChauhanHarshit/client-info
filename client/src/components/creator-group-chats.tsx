import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatorAvatar } from "@/components/ui/creator-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Send,
  ArrowLeft,
  Plus,
  Info,
  ChevronLeft,
  Play,
  Pause,
  Download,
  Paperclip,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CenteredSectionLoader } from "@/components/ui/loading-animation";
import { getApiUrl } from "@/lib/api-config";
import { useCreatorAuth } from "@/contexts/CreatorAuthContext";

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
  memberCount: number;
  profilePictureUrl: string | null;
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
  messageType: 'text' | 'image' | 'video';
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
  currentUserId: number;
  senderDisplayName: string;
  sender_profile_image: string | null;
}

interface ChatMember {
  id: number;
  displayName: string;
  profileImageUrl: string | null;
}

export function CreatorGroupChats() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { creatorId } = useCreatorAuth();
  
  // State management
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showMembersInfo, setShowMembersInfo] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const { isLoading, isCreatorAuthenticated } = useCreatorAuth();
  
  // Debug creator authentication
  console.log('🔍 Creator Chat Debug - Creator ID:', creatorId);
  console.log('🔍 Creator Chat Debug - Auth Status:', !!creatorId);
  console.log('🔍 Creator Chat Debug - Is Loading:', isLoading);
  console.log('🔍 Creator Chat Debug - Is Creator Authenticated:', isCreatorAuthenticated);

  // Mark messages as read when chat is selected
  useEffect(() => {
    if (selectedChatId && creatorId) {
      const markAsRead = async () => {
        try {
          const response = await fetch(getApiUrl(`/api/creator-auth/mark-read/${selectedChatId}`), {
            method: 'POST',
            credentials: 'include',
          });
          
          if (response.ok) {
            queryClient.invalidateQueries({ queryKey: ['/api/creator-auth/unread-messages'] });
          }
        } catch (error) {
          console.error('Failed to mark messages as read:', error);
        }
      };
      
      markAsRead();
    }
  }, [selectedChatId, queryClient, creatorId]);

  // Fetch creator's group chats
  const { data: groupChats = [], isLoading: isLoadingChats, error: groupChatsError } = useQuery<GroupChat[]>({
    queryKey: ["/api/creator-group-chats"],
    enabled: !isLoading && isCreatorAuthenticated && !!creatorId, // Only fetch when fully authenticated
    queryFn: async () => {
      console.log('🔍 Fetching group chats for creator:', creatorId);
      
      // Add JWT token to Authorization header
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      // Check for JWT token in localStorage
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
        console.log('🔍 Using JWT token for creator group chats');
      }
      
      const response = await fetch("/api/creator-group-chats", {
        method: "GET",
        credentials: "include",
        headers
      });
      
      if (!response.ok) {
        console.error('🔍 Group chats fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch group chats: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Check if the result is an error response
      if (result.message && typeof result.message === 'string') {
        console.error('🔍 Group chats API error:', result.message);
        throw new Error(result.message);
      }
      
      // Ensure result is an array
      if (!Array.isArray(result)) {
        console.error('🔍 Group chats API returned non-array:', result);
        throw new Error('Invalid response format from group chats API');
      }
      
      console.log('🔍 Group chats fetched:', result.length, 'chats found');
      console.log('🔍 Group chats data:', result);
      
      return result;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0 // Always fetch fresh data
  });

  // Debug group chats
  console.log('🔍 Creator Chat Debug - Group Chats:', groupChats);
  console.log('🔍 Creator Chat Debug - Loading:', isLoadingChats);
  console.log('🔍 Creator Chat Debug - Error:', groupChatsError);

  // Fetch messages for selected chat
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<GroupChatMessage[]>({
    queryKey: ["/api/creator-group-chats", selectedChatId, "messages"],
    enabled: !!selectedChatId && isCreatorAuthenticated && !!creatorId,
    queryFn: async () => {
      const response = await fetch(`/api/creator-group-chats/${selectedChatId}/messages`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Check if the result is an error response
      if (result.message && typeof result.message === 'string') {
        console.error('🔍 Messages API error:', result.message);
        throw new Error(result.message);
      }
      
      // Ensure result is an array
      if (!Array.isArray(result)) {
        console.error('🔍 Messages API returned non-array:', result);
        throw new Error('Invalid response format from messages API');
      }
      
      const messagesWithUserId = result.map((message: any) => {
        // Fallback: reconstruct media URL from filename if mediaUrl is null but filename exists
        let mediaUrl = message.media_url;
        if (!mediaUrl && message.media_file_name && message.message_type !== 'text') {
          // Try common filename patterns used by the upload system
          const filename = message.media_file_name;
          // Check if it's already a properly formatted filename or needs reconstruction
          if (filename.includes('-') && /\d+/.test(filename)) {
            mediaUrl = `/uploads/${filename}`;
          } else {
            // For older uploads that might use original filenames
            mediaUrl = `/uploads/${filename}`;
          }
        }
        
        return {
          ...message,
          senderId: message.sender_id,
          currentUserId: creatorId,
          mediaUrl: mediaUrl,
          mediaFileName: message.media_file_name,
          mediaMimeType: message.media_mime_type,
          mediaFileSize: message.media_file_size,
          messageType: message.message_type,
          createdAt: message.created_at,
          updatedAt: message.updated_at,
          senderDisplayName: message.sender_name
        };
      });
      
      return messagesWithUserId;
    }
  });

  // Fetch chat members for info view
  const { data: chatMembers = [] } = useQuery<ChatMember[]>({
    queryKey: ["/api/creator-group-chats", selectedChatId, "members"],
    enabled: !!selectedChatId && isCreatorAuthenticated && !!creatorId,
    queryFn: async () => {
      const response = await fetch(`/api/creator-group-chats/${selectedChatId}/members`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat members: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Check if the result is an error response
      if (result.message && typeof result.message === 'string') {
        console.error('🔍 Chat members API error:', result.message);
        throw new Error(result.message);
      }
      
      // Ensure result is an array
      if (!Array.isArray(result)) {
        console.error('🔍 Chat members API returned non-array:', result);
        throw new Error('Invalid response format from chat members API');
      }
      
      return result;
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      // Use fetch directly to send FormData
      const response = await fetch(`/api/creator-group-chats/${selectedChatId}/messages`, {
        method: "POST",
        credentials: "include",
        body: messageData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to send message: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch messages for current chat
      await queryClient.invalidateQueries({ queryKey: ["/api/creator-group-chats", selectedChatId, "messages"] });
      await queryClient.refetchQueries({ queryKey: ["/api/creator-group-chats", selectedChatId, "messages"] });
      
      // Invalidate and refetch chat list to update last message previews
      await queryClient.invalidateQueries({ queryKey: ["/api/creator-group-chats"] });
      await queryClient.refetchQueries({ queryKey: ["/api/creator-group-chats"] });
      
      setNewMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send message
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !pendingFile) || !selectedChatId) return;
    
    try {
      // Create FormData to handle both text and file uploads
      const formData = new FormData();
      
      // Add message content
      const content = newMessage || (pendingFile ? `Shared file: ${pendingFile.name}` : '');
      formData.append('content', content);
      
      // Determine message type
      let messageType = 'text';
      if (pendingFile) {
        if (pendingFile.type.startsWith('image/')) {
          messageType = 'image';
        } else if (pendingFile.type.startsWith('video/')) {
          messageType = 'video';
        }
      }
      formData.append('messageType', messageType);
      
      // Add file if present
      if (pendingFile) {
        formData.append('file', pendingFile);
        console.log('📤 Sending message with file:', {
          fileName: pendingFile.name,
          fileType: pendingFile.type,
          fileSize: pendingFile.size,
          messageType,
          content
        });
      }

      // Send message using FormData
      sendMessageMutation.mutate(formData);
      
      // Clean up
      setNewMessage('');
      removeFilePreview();
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Send failed",
        description: "Failed to send message with attachment.",
        variant: "destructive",
      });
    }
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // File upload handler
  const handleFileUpload = (file: File) => {
    // Create preview URL for the file
    const previewUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setFilePreviewUrl(previewUrl);
  };

  const removeFilePreview = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setPendingFile(null);
    setFilePreviewUrl(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Format time for messages
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return format(date, "MMM d");
  };

  // Get initials for avatar fallback
  const getInitials = (name: string | null | undefined) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  // Truncate message preview for chat list
  const truncateMessage = (content: string | null | undefined, maxLength: number = 50) => {
    if (!content || typeof content !== 'string') return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  // Selected chat data
  const selectedChat = groupChats.find(chat => chat.id === selectedChatId);

  // Show loading while fetching chats
  if (isLoadingChats) {
    return (
      <div className="flex items-center justify-center h-full">
        <CenteredSectionLoader />
      </div>
    );
  }

  // Only show authentication error if we're not loading and not authenticated
  // Don't show auth error just because of API error - user is already in creator app
  if (groupChatsError && !isLoading && !isCreatorAuthenticated) {
    // Check if this is actually an authentication error vs other API error
    const errorMessage = (groupChatsError as any)?.message || '';
    const isAuthError = errorMessage.includes('authenticate') || errorMessage.includes('login');
    
    // Only show auth required for actual auth errors, not API failures
    if (isAuthError) {
      return (
        <div className="h-full bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Issue</h3>
              <p className="text-gray-500">Unable to load your conversations. Please try refreshing.</p>
            </div>
          </div>
        </div>
      );
    }
  }

  // Main chat list view (iPhone Messages style)
  if (!selectedChatId) {
    return (
      <div className="h-full bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-100">
            {groupChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
              >
                <div className="flex items-center space-x-3">
                  {/* Chat Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat?.profilePictureUrl || ''} />
                    <AvatarFallback className="bg-blue-500 text-white text-sm">
                      {getInitials(chat?.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {chat?.name || 'Unnamed Chat'}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(chat.lastMessage.createdAt.toString())}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage ? (
                          <>
                            <span className="font-medium">{chat.lastMessage.senderName}:</span>{' '}
                            {truncateMessage(chat.lastMessage.content)}
                          </>
                        ) : (
                          "No messages yet"
                        )}
                      </p>
                      <div className="ml-2 text-right">
                        <span className="text-xs text-gray-400">
                          {chat.memberCount} {chat.memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {groupChats.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations</h3>
              <p className="text-gray-500">Your chat conversations will appear here</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Individual chat thread view (iPhone Messages style)
  return (
    <div className="h-full bg-white flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedChatId(null)}
          className="p-2 hover:bg-gray-200"
        >
          <ArrowLeft className="h-5 w-5 text-blue-500" />
        </Button>

        {/* Chat Title & Avatar */}
        <div className="flex items-center space-x-3 flex-1 justify-center">
          <Avatar className="h-8 w-8">
            <AvatarImage src={selectedChat?.profilePictureUrl || ''} />
            <AvatarFallback className="bg-blue-500 text-white text-xs">
              {getInitials(selectedChat?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="text-sm font-semibold text-gray-900">
              {selectedChat?.name || 'Unnamed Chat'}
            </h2>
            <p className="text-xs text-gray-500">
              {chatMembers.length} {chatMembers.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        {/* Info Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMembersInfo(!showMembersInfo)}
          className="p-2 hover:bg-gray-200"
        >
          <Info className="h-5 w-5 text-blue-500" />
        </Button>
      </div>

      {/* Members Info Panel */}
      {showMembersInfo && (
        <div className="bg-gray-50 border-b p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Members</h3>
          <div className="space-y-2">
            {chatMembers.map((member) => (
              <div key={member.id} className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member?.profileImageUrl || ''} />
                  <AvatarFallback className="bg-gray-400 text-white text-xs">
                    {getInitials(member?.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700">{member?.displayName || 'Unknown Member'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-hidden relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center z-10 border-2 border-dashed border-blue-300">
            <div className="text-center">
              <Paperclip className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-blue-700 font-medium">Drop to share file</p>
            </div>
          </div>
        )}

        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {isLoadingMessages ? (
              <div className="flex justify-center">
                <CenteredSectionLoader />
              </div>
            ) : (
              messages.map((message) => {
                // Debug logging for message data
                console.log('🔍 Message Debug:', {
                  id: message.id,
                  content: message.content,
                  messageType: message.messageType,
                  mediaUrl: message.mediaUrl,
                  senderId: message.senderId,
                  creatorId: creatorId,
                  senderDisplayName: message.senderDisplayName
                });
                
                const isOwnMessage = Number(message.senderId) === Number(creatorId);

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end space-x-2`}
                  >
                    {/* Other user's avatar (left side) */}
                    {!isOwnMessage && (
                      <CreatorAvatar 
                        creator={{
                          displayName: message?.senderDisplayName,
                          sender_profile_image: message?.sender_profile_image
                        }} 
                        size="md" 
                        className="mb-1"
                        fallbackClassName="bg-gray-400 text-white text-xs"
                      />
                    )}

                    <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Sender name for other users */}
                      {!isOwnMessage && (
                        <span className="text-xs text-gray-500 mb-1 px-2">
                          {message.senderDisplayName || 'Unknown User'}
                        </span>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-2 max-w-full ${
                          isOwnMessage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        {/* Image Message */}
                        {(() => {
                          // Check if it's an image message - more comprehensive detection
                          const isImageMessage = message.messageType === 'image' || 
                            message.mediaFileName?.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i) ||
                            (message.content && message.content.startsWith('Shared file:') && 
                             message.content.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) ||
                            (message.mediaUrl && message.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i));
                          
                          if (!isImageMessage) return null;
                          

                          
                          // Get media URL - either from mediaUrl field or construct from content
                          let imageUrl = message.mediaUrl;
                          
                          // If no mediaUrl but content starts with "Shared file:", try to find the uploaded file
                          if (!imageUrl && message.content?.startsWith('Shared file:')) {
                            const fileName = message.content.replace('Shared file: ', '');
                            const fileExtension = fileName.split('.').pop()?.toLowerCase();
                            
                            // For existing messages, try different approaches to find the file
                            // 1. Try direct filename match (for legacy uploads)
                            imageUrl = `/uploads/${fileName}`;
                            
                            // For messages created around July 7, 2025, try recent uploaded files
                            // This is a workaround for messages that have mediaType but no mediaUrl
                            if (fileName.includes('Screenshot 2025-07-07')) {
                              if (fileName.includes('1.45.28 PM')) {
                                // Try the most recent PNG files based on timestamps
                                imageUrl = `/uploads/file-1751922424516-101783978.png`; // Recent upload
                              }
                            }
                          }
                          
                          if (!imageUrl) return null;
                          
                          return (
                            <div className="space-y-2">
                              {/* Only show content if it's not a "Shared file:" message for media files */}
                              {message.content && 
                               !message.content.startsWith('Shared file:') && 
                               !message.content.match(/^Shared file: .*\.(jpg|jpeg|png|heic|mov|mp4)$/i) && (
                                <p className="text-sm">{message.content}</p>
                              )}
                              <div className="relative">
                                <img
                                  src={imageUrl}
                                  alt="Shared image"
                                  className="max-w-full max-h-60 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setFullScreenImage(imageUrl)}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const container = target.parentElement;
                                    if (container) {
                                      container.innerHTML = `
                                        <div class="flex items-center justify-center w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                                          <div class="text-center">
                                            <svg class="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            <p class="text-sm text-gray-500">Image not available</p>
                                            <p class="text-xs text-gray-400">File may have been moved</p>
                                          </div>
                                        </div>
                                      `;
                                    }
                                    console.log('Image failed to load:', imageUrl);
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Video Message */}
                        {((message.messageType === 'video' || 
                          message.mediaFileName?.match(/\.(mp4|mov|webm|avi)$/i) ||
                          (message.content && message.content.startsWith('Shared file:') && 
                           message.content.match(/\.(mp4|mov|webm|avi)$/i))) && message.mediaUrl) && (
                          <div className="space-y-2">
                            {/* Only show content if it's not a "Shared file:" message for media files */}
                            {message.content && 
                             !message.content.startsWith('Shared file:') && 
                             !message.content.match(/^Shared file: .*\.(jpg|jpeg|png|heic|mov|mp4)$/i) && (
                              <p className="text-sm">{message.content}</p>
                            )}
                            <div className="relative max-w-full">
                              <video
                                src={message.mediaUrl}
                                className="max-w-full max-h-60 rounded-lg cursor-pointer"
                                controls
                                preload="metadata"
                                onClick={(e) => {
                                  const video = e.target as HTMLVideoElement;
                                  if (video.paused) {
                                    video.play();
                                  } else {
                                    video.pause();
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Text Message (only if no media and not image/video type) */}
                        {(() => {
                          // Hide ALL "Shared file:" messages that contain media file extensions
                          if (message.content && message.content.startsWith('Shared file:') && 
                              message.content.match(/\.(jpg|jpeg|png|heic|mov|mp4|gif|webp|heif|avi|webm)$/i)) {
                            return null; // Completely hide these
                          }
                          
                          // Hide if it's a media message type or has media URL
                          const isMediaMessage = message.messageType === 'image' || 
                                                message.messageType === 'video' ||
                                                message.mediaUrl ||
                                                message.mediaFileName?.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|mp4|mov|webm|avi)$/i);
                          
                          if (isMediaMessage) return null;
                          
                          // Show regular text content (including non-media "Shared file:" messages)
                          if (message.content) {
                            return (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            );
                          }
                          
                          return null;
                        })()}



                        {/* File Attachment */}
                        {message.mediaUrl && message.mediaFileName && 
                         !message.mediaFileName.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|mp4|mov|avi|webm)$/i) && (
                          <div className="space-y-2">
                            {/* Only show content if it's not a "Shared file:" message for media files */}
                            {message.content && 
                             !message.content.startsWith('Shared file:') && 
                             !message.content.match(/^Shared file: .*\.(jpg|jpeg|png|heic|mov|mp4)$/i) && (
                              <p className="text-sm">{message.content}</p>
                            )}
                            <div className={`${isOwnMessage ? 'bg-white bg-opacity-20' : 'bg-gray-100'} rounded-lg p-3 max-w-xs`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Paperclip className={`h-4 w-4 ${isOwnMessage ? 'text-white' : 'text-gray-600'}`} />
                                <span className={`text-sm font-medium truncate ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                                  {message.mediaFileName}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant={isOwnMessage ? "secondary" : "outline"}
                                asChild
                                className="w-full"
                              >
                                <a
                                  href={message.mediaUrl}
                                  download={message.mediaFileName}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </a>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className={`text-xs text-gray-400 mt-1 px-2 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                        {message.createdAt ? formatMessageTime(message.createdAt.toString()) : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="border-t bg-white">
        {/* File Preview Area */}
        {pendingFile && filePreviewUrl && (
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-start space-x-3">
              {/* File Preview */}
              <div className="relative flex-shrink-0">
                {pendingFile.type.startsWith('image/') ? (
                  <img
                    src={filePreviewUrl}
                    alt={pendingFile.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : pendingFile.type.startsWith('video/') ? (
                  <video
                    src={filePreviewUrl}
                    className="w-16 h-16 object-cover rounded-lg"
                    muted
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Paperclip className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                
                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFilePreview}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 p-0"
                >
                  <X className="h-3 w-3 text-white" />
                </Button>
              </div>
              
              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {pendingFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(pendingFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4">
          <div className="flex items-center space-x-2">
            {/* Add Attachment Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 shrink-0"
            >
              <Plus className="h-5 w-5 text-gray-500" />
            </Button>

            {/* Message Input */}
            <div className="flex-1 relative">
              <Input
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="iMessage"
                className="pr-12 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                disabled={sendMessageMutation.isPending}
              />

              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !pendingFile) || sendMessageMutation.isPending}
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 p-0"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-full max-h-full p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFullScreenImage(null)}
              className="absolute top-2 right-2 text-white hover:bg-white hover:bg-opacity-20 p-2"
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={fullScreenImage}
              alt="Full screen view"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}