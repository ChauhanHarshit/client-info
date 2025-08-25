import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Plus, Users, Send, Image, Video, Archive, Trash2, Settings, FileText, Download, Eye, Paperclip } from 'lucide-react';
import { MessageRenderer } from './MessageRenderer';
import { formatDistanceToNow } from 'date-fns';
import { CenteredSectionLoader } from '@/components/ui/loading-animation';
import { apiRequest } from '@/lib/queryClient';
import { useCrmAuth } from '@/contexts/CrmAuthContext';

interface GroupChat {
  id: number;
  name: string;
  description: string | null;
  profileImageUrl?: string | null;
  createdBy: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  memberCount: number;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: Date;
  };
}

interface GroupChatMember {
  id: number;
  chatId: number;
  creatorId: number;
  joinedAt: Date;
  lastReadAt: Date | null;
  creator: {
    id: number;
    displayName: string;
    profileImageUrl: string | null;
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
  sender: {
    id: number;
    displayName: string;
    profileImageUrl: string | null;
  };
  reactions?: MessageReaction[];
}

interface MessageReaction {
  reactionType: 'heart' | 'thumbs_up' | 'thumbs_down';
  count: number;
  creators: {
    id: number;
    displayName: string;
  }[];
}

interface Creator {
  id: number;
  displayName: string;
  profileImageUrl: string | null;
}

export function GroupChatInterface() {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [selectedCreators, setSelectedCreators] = useState<number[]>([]);
  const [showReactionsFor, setShowReactionsFor] = useState<number | null>(null);
  const [longPressedMessage, setLongPressedMessage] = useState<number | null>(null);
  const [profilePictureOpen, setProfilePictureOpen] = useState(false);
  const [selectedProfileFile, setSelectedProfileFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch group chats
  const { data: groupChats, isLoading: chatsLoading } = useQuery<GroupChat[]>({
    queryKey: ['/api/group-chats'],
  });

  // Fetch creators for member selection
  const { data: creators } = useQuery<Creator[]>({
    queryKey: ['/api/creators'],
  });

  // Fetch selected chat details
  const { data: selectedChat } = useQuery<GroupChat>({
    queryKey: ['/api/group-chats', selectedChatId],
    enabled: !!selectedChatId,
  });

  // Fetch chat members
  const { data: chatMembers } = useQuery<GroupChatMember[]>({
    queryKey: ['/api/group-chats', selectedChatId, 'members'],
    enabled: !!selectedChatId,
  });

  // Fetch chat messages
  const { data: chatMessages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery<GroupChatMessage[]>({
    queryKey: ['/api/group-chats', selectedChatId, 'messages'],
    enabled: !!selectedChatId,
    refetchOnWindowFocus: true,
    staleTime: 0, // Force fresh data
  });

  // Force refetch when selectedChatId changes
  useEffect(() => {
    if (selectedChatId) {
      refetchMessages();
    }
  }, [selectedChatId, refetchMessages]);

  // Debug HEIC messages when data changes
  useEffect(() => {
    if (chatMessages) {
      const heicMessages = chatMessages.filter(m => m.mediaFileName?.includes('HEIC'));
      if (heicMessages.length > 0) {
        console.log('🔍 HEIC Messages received:', heicMessages.map(m => ({ 
          id: m.id, 
          messageType: m.messageType, 
          mediaFileName: m.mediaFileName,
          mediaMimeType: m.mediaMimeType
        })));
      }
    }
  }, [chatMessages]);

  // Create new group chat
  const createChatMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await apiRequest('POST', '/api/group-chats', data);
      return await response.json();
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-chats'] });
      setNewChatOpen(false);
      setNewChatName('');
      setNewChatDescription('');
      setSelectedChatId(newChat.id);
      toast({
        title: 'Success',
        description: 'Group chat created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add member to chat
  const addMemberMutation = useMutation({
    mutationFn: async ({ chatId, creatorId }: { chatId: number; creatorId: number }) => {
      const response = await apiRequest('POST', `/api/group-chats/${chatId}/members`, { creatorId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-chats', selectedChatId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-chats'] });
      toast({
        title: 'Success',
        description: 'Member added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { 
      content: string | null; 
      messageType: string; 
      mediaUrl?: string;
      mediaFileName?: string;
      mediaMimeType?: string;
      mediaFileSize?: number;
    }) => {
      return await apiRequest('POST', `/api/group-chats/${selectedChatId}/messages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-chats', selectedChatId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-chats'] });
      setNewMessage('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update profile picture mutation
  const updateProfilePictureMutation = useMutation({
    mutationFn: async ({ chatId, profileImageUrl }: { chatId: number; profileImageUrl: string }) => {
      const response = await apiRequest('PATCH', `/api/group-chats/${chatId}/profile-image`, { profileImageUrl });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-chats', selectedChatId] });
      toast({
        title: 'Success',
        description: 'Profile picture updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, creatorId, reactionType }: { messageId: number; creatorId: number; reactionType: string }) => {
      return await apiRequest('POST', `/api/group-chats/messages/${messageId}/reactions`, { creatorId, reactionType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/group-chats', selectedChatId, 'messages'],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add reaction',
        variant: 'destructive',
      });
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, creatorId }: { messageId: number; creatorId: number }) => {
      return await apiRequest('DELETE', `/api/group-chats/messages/${messageId}/reactions/${creatorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/group-chats', selectedChatId, 'messages'],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove reaction',
        variant: 'destructive',
      });
    },
  });

  // Archive chat
  const archiveChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      const response = await apiRequest('PUT', `/api/group-chats/${chatId}/archive`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-chats'] });
      setSelectedChatId(null);
      toast({
        title: 'Success',
        description: 'Group chat archived successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChatId) return;

    const messageData = {
      content: newMessage,
      messageType: 'text'
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !selectedChatId) {
      console.log('🔧 Upload blocked - no file or chat:', { file: !!file, selectedChatId });
      return;
    }

    console.log('🔧 Starting file upload:', { 
      name: file.name, 
      type: file.type, 
      size: file.size 
    });

    try {
      // Upload the file first
      const formData = new FormData();
      formData.append('file', file);

      console.log('🔧 Uploading to /api/upload...');
      console.log('🔧 FormData contents:', {
        file: file.name,
        type: file.type,
        size: file.size
      });
      
      const uploadResponse = await apiRequest('POST', '/api/upload', formData);
      console.log('🔧 Upload response status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        console.error('🔧 Upload failed with status:', uploadResponse.status);
        const errorText = await uploadResponse.text();
        console.error('🔧 Upload error response:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }
      
      const uploadResult = await uploadResponse.json();
      console.log('🔧 Upload result:', uploadResult);
      
      // Determine message type based on file type and extension
      let messageType = 'text';
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();
      
      console.log('🔧 File analysis:', { fileName, fileType });
      
      // Check for images (including HEIC) - Enhanced detection
      const isHEIC = fileName.includes('.heic') || fileName.includes('.heif') || 
                     fileType === 'image/heic' || fileType === 'image/heif' ||
                     fileName.toLowerCase().endsWith('.heic') || fileName.toLowerCase().endsWith('.heif');
                     
      const isImage = fileType.startsWith('image/') || 
          isHEIC ||
          ['.jpeg', '.jpg', '.png', '.gif', '.heic', '.heif', '.webp'].some(ext => fileName.endsWith(ext));
      
      console.log('🔧 HEIC Detection:', { isHEIC, fileName, fileType });
      
      // Force HEIC detection for debugging
      if (fileName.toLowerCase().includes('heic') || fileName.toLowerCase().includes('heif')) {
        console.log('🔧 FORCING HEIC to image type for file:', fileName);
        messageType = 'image';
      }
          
      const isVideo = fileType.startsWith('video/') || 
                ['.mov', '.mp4', '.webm', '.avi'].some(ext => fileName.endsWith(ext));
      
      if (isImage) {
        messageType = 'image';
      } else if (isVideo) {
        messageType = 'video';
      }
      
      console.log('🔧 Message type determined:', { messageType, isImage, isVideo });

      // Send message with file URL
      const messageData = {
        content: messageType === 'text' ? `Shared file: ${file.name}` : '',
        messageType,
        mediaUrl: uploadResult.fileUrl,
        mediaFileName: file.name,
        mediaMimeType: file.type,
        mediaFileSize: file.size
      };

      console.log('🔧 Sending message data:', messageData);
      sendMessageMutation.mutate(messageData);
    } catch (error) {
      console.error('🔧 File upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Drag and drop handlers
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Log drag details for debugging
    const items = Array.from(e.dataTransfer.items);
    console.log('🔧 Drag over - DataTransfer items:', items.map(item => ({
      kind: item.kind,
      type: item.type
    })));
    
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide the overlay if we're actually leaving the drop zone
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    console.log('🔧 Drop event triggered');
    const files = Array.from(e.dataTransfer.files);
    console.log('🔧 Files dropped:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    if (files.length > 0 && selectedChatId) {
      const file = files[0];
      console.log('🔧 Processing file:', { 
        name: file.name, 
        type: file.type, 
        size: file.size,
        isHEIC: file.name.toLowerCase().includes('.heic') || file.type.toLowerCase().includes('heic')
      });
      
      await handleFileUpload(file);
    } else {
      console.log('🔧 No files or no chat selected:', { filesLength: files.length, selectedChatId });
    }
  };

  const handleCreateChat = () => {
    if (!newChatName.trim()) return;

    createChatMutation.mutate({
      name: newChatName,
      description: newChatDescription,
    });
  };

  const handleAddMember = (creatorId: number) => {
    if (!selectedChatId) return;

    addMemberMutation.mutate({ chatId: selectedChatId, creatorId });
  };

  const handleProfilePictureUpload = async () => {
    if (!selectedProfileFile || !selectedChatId) return;

    // Upload the file first
    const formData = new FormData();
    formData.append('file', selectedProfileFile);

    try {
      const uploadResponse = await apiRequest('POST', '/api/upload', formData);
      const uploadResult = await uploadResponse.json();
      
      // Update the group chat with the new profile picture URL
      updateProfilePictureMutation.mutate({
        chatId: selectedChatId,
        profileImageUrl: uploadResult.fileUrl
      });

      setProfilePictureOpen(false);
      setSelectedProfileFile(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload profile picture',
        variant: 'destructive',
      });
    }
  };

  const handleProfileFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedProfileFile(file);
    } else {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
    }
  };

  // Reaction handlers
  const handleLongPressStart = (messageId: number) => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionsFor(messageId);
      setLongPressedMessage(messageId);
    }, 500); // 500ms long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReaction = (messageId: number, reactionType: string) => {
    // For now, use a default creator ID (you'd get this from auth context)
    const creatorId = 1; // This should come from your auth context
    
    addReactionMutation.mutate({ messageId, creatorId, reactionType });
    setShowReactionsFor(null);
    setLongPressedMessage(null);
  };

  const handleRemoveReaction = (messageId: number) => {
    const creatorId = 1; // This should come from your auth context
    
    removeReactionMutation.mutate({ messageId, creatorId });
  };

  const getReactionEmoji = (reactionType: string) => {
    switch (reactionType) {
      case 'heart': return '❤️';
      case 'thumbs_up': return '👍';
      case 'thumbs_down': return '👎';
      default: return reactionType;
    }
  };

  if (chatsLoading) {
    return <CenteredSectionLoader />;
  }

  return (
    <div className="flex h-[calc(100vh-200px)] bg-background rounded-lg border">
      {/* Chat List Sidebar */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Group Chats</h2>
            <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Group Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Chat Name</label>
                    <Input
                      value={newChatName}
                      onChange={(e) => setNewChatName(e.target.value)}
                      placeholder="Enter chat name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Textarea
                      value={newChatDescription}
                      onChange={(e) => setNewChatDescription(e.target.value)}
                      placeholder="Enter chat description"
                    />
                  </div>
                  <Button
                    onClick={handleCreateChat}
                    disabled={createChatMutation.isPending || !newChatName.trim()}
                    className="w-full"
                  >
                    Create Chat
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {groupChats?.map((chat) => (
              <Card
                key={chat.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedChatId === chat.id ? 'bg-muted border-primary' : ''
                }`}
                onClick={() => setSelectedChatId(chat.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={chat.profileImageUrl || ''} />
                        <AvatarFallback>
                          {chat.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{chat.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {chat.memberCount} members
                          </span>
                        </div>
                        {chat.lastMessage && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            <span className="font-medium">{chat.lastMessage.senderName}:</span>{' '}
                            {chat.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                    {chat.lastMessageAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {selectedChatId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-blue-50 shadow-md flex-shrink-0 min-h-[80px]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedChat?.name}</h3>
                  {selectedChat?.description && (
                    <p className="text-sm text-muted-foreground">{selectedChat.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {chatMembers?.length || 0} members
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Profile Picture Display Only */}
                  <Avatar className="h-12 w-12 border-2 border-blue-200">
                    <AvatarImage src={selectedChat?.profileImageUrl || ''} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {selectedChat?.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Chat Settings</DialogTitle>
                        <DialogDescription>
                          Manage group photo, members, and chat settings
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Profile Picture Section */}
                      <div className="space-y-4 pb-6 border-b">
                        <h3 className="text-lg font-medium">Group Photo</h3>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 border-2 border-blue-200">
                            <AvatarImage src={selectedChat?.profileImageUrl || ''} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-xl">
                              {selectedChat?.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-2">
                            <input
                              ref={profileFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleProfileFileSelect}
                              className="hidden"
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => profileFileInputRef.current?.click()}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                            >
                              <Image className="h-4 w-4 mr-2" />
                              Change Photo
                            </Button>
                            {selectedProfileFile ? (
                              <div className="space-y-2">
                                <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Image className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">
                                      Selected: {selectedProfileFile.name}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  onClick={handleProfilePictureUpload}
                                  disabled={updateProfilePictureMutation.isPending}
                                  className="w-full bg-blue-600 hover:bg-blue-700"
                                  size="sm"
                                >
                                  {updateProfilePictureMutation.isPending ? 'Uploading...' : 'Upload New Photo'}
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Upload a group photo for this chat
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Members Section */}
                      <div className="space-y-4 pt-6">
                        <h3 className="text-lg font-medium">Members</h3>
                        <div className="space-y-2">
                          {chatMembers?.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg border">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.creator.profileImageUrl || ''} />
                                <AvatarFallback>
                                  {member.creator.displayName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">{member.creator.displayName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-2">Add Members</h4>
                          <Select
                            onValueChange={(value) => handleAddMember(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a creator to add" />
                            </SelectTrigger>
                            <SelectContent>
                              {creators
                                ?.filter((creator) => 
                                  !chatMembers?.some((member) => member.creatorId === creator.id)
                                )
                                .map((creator) => (
                                  <SelectItem key={creator.id} value={creator.id.toString()}>
                                    {creator.displayName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archiveChatMutation.mutate(selectedChatId)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea 
              className={`flex-1 p-4 bg-white relative ${isDragOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 Drag enter triggered');
                setIsDragOver(true);
              }}
            >
              {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 z-10 pointer-events-none">
                  <div className="text-blue-600 text-lg font-medium">Drop files to upload</div>
                </div>
              )}
              {messagesLoading ? (
                <CenteredSectionLoader />
              ) : (
                <div className="space-y-3">
                  {(chatMessages as any[] || []).map((message: any) => {
                    // Check if this message is from the current user
                    // Compare the message's senderId with the current user ID from the message data
                    const isOwnMessage = message.senderId === message.currentUserId;
                    
                    return (
                      <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} relative mb-3`}>
                        {/* Other person's message - left side with avatar */}
                        {!isOwnMessage && (
                          <>
                            <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                              <AvatarImage src={message.sender_profile_image || ''} />
                              <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                                {(message.senderDisplayName || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="max-w-[70%]">
                              <div className="mb-1">
                                <span className="text-xs text-gray-500 font-medium">{message.senderDisplayName || 'Unknown User'}</span>
                              </div>
                              <div 
                                className="bg-gray-200 rounded-2xl px-4 py-2 relative select-none"
                                onMouseDown={() => handleLongPressStart(message.id)}
                                onMouseUp={handleLongPressEnd}
                                onMouseLeave={handleLongPressEnd}
                                onTouchStart={() => handleLongPressStart(message.id)}
                                onTouchEnd={handleLongPressEnd}
                              >

                                
                                {/* Show text only if no media file */}
                                {message.messageType === 'text' && !message.mediaFileName && (
                                  <p className="text-sm text-gray-900">{message.content}</p>
                                )}
                                
                                {/* SIMPLE HEIC FIX: Show images for ANY file with image extension OR any messageType image */}
                                {(() => {
                                  const hasImageExtension = message.mediaFileName?.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i);
                                  const hasImageMime = message.mediaMimeType?.startsWith('image/');
                                  const isImageType = message.messageType === 'image';
                                  const shouldShowAsImage = hasImageExtension || hasImageMime || isImageType;
                                  

                                  
                                  return shouldShowAsImage;
                                })() && (
                                  <div className="space-y-2">
                                    {/* COMPLETELY HIDE filename text for media files */}
                                    {message.content && 
                                     !message.content.startsWith('Shared file:') && 
                                     !message.content.match(/^Shared file: .*\.(jpg|jpeg|png|heic|mov|mp4|gif|webp|heif|avi|webm)$/i) && 
                                     <p className="text-sm text-gray-900">{message.content}</p>}
                                    <img
                                      src={(() => {
                                        const isHEIC = message.mediaFileName && 
                                          (message.mediaFileName.toLowerCase().includes('.heic') || 
                                           message.mediaFileName.toLowerCase().includes('.heif') ||
                                           message.mediaMimeType === 'image/heic' ||
                                           message.mediaMimeType === 'image/heif');
                                        
                                        if (isHEIC && message.mediaUrl) {
                                          // Extract filename from URL and use conversion endpoint
                                          const filename = message.mediaUrl.split('/').pop();
                                          return `/api/convert-heic/${filename}`;
                                        }
                                        
                                        return message.mediaUrl || '';
                                      })()}
                                      alt="Shared image"
                                      className="max-w-xs rounded-lg"
                                      onError={(e) => {
                                        console.log('Image failed to load:', message.mediaUrl);
                                      }}
                                    />
                                  </div>
                                )}

                                {message.messageType === 'video' && (
                                  <div className="space-y-2">
                                    {/* COMPLETELY HIDE filename text for video files */}
                                    {message.content && 
                                     !message.content.startsWith('Shared file:') && 
                                     !message.content.match(/^Shared file: .*\.(mov|mp4|avi|webm)$/i) && 
                                     <p className="text-sm text-gray-900">{message.content}</p>}
                                    <video
                                      src={message.mediaUrl || ''}
                                      controls
                                      className="max-w-xs rounded-lg"
                                    />
                                  </div>
                                )}
                                {(message.messageType === 'text' && message.mediaUrl && message.mediaFileName && 
                                  !message.mediaFileName.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i) &&
                                  !message.mediaMimeType?.startsWith('image/')) && (
                                  <div className="space-y-2">
                                    <p className="text-sm text-gray-900">{message.content}</p>
                                    <div className="bg-white border rounded-lg p-3 max-w-xs">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-900 truncate">
                                          {message.mediaFileName}
                                        </span>
                                      </div>
                                      <div className="flex gap-2">
                                        <a
                                          href={message.mediaUrl}
                                          download={message.mediaFileName}
                                          className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                        >
                                          <Download className="h-3 w-3" />
                                          Download
                                        </a>
                                        {message.mediaMimeType === 'application/pdf' && (
                                          <a
                                            href={message.mediaUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                                          >
                                            <Eye className="h-3 w-3" />
                                            Preview
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Reactions display */}
                                {message.reactions && message.reactions.length > 0 && (
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {message.reactions.map((reaction: any) => (
                                      <button
                                        key={reaction.reactionType}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded-full text-xs hover:bg-gray-50 transition-colors"
                                        onClick={() => handleRemoveReaction(message.id)}
                                      >
                                        <span>{getReactionEmoji(reaction.reactionType)}</span>
                                        <span>{reaction.count}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="mt-1 px-1">
                                <span className="text-xs text-gray-400">
                                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Own message - right side, blue bubble, no avatar */}
                        {isOwnMessage && (
                          <div className="max-w-[70%]">
                            <div 
                              className="bg-blue-500 rounded-2xl px-4 py-2 relative select-none"
                              onMouseDown={() => handleLongPressStart(message.id)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onTouchStart={() => handleLongPressStart(message.id)}
                              onTouchEnd={handleLongPressEnd}
                            >

                              
                              {/* Show text only if no media file */}
                              {message.messageType === 'text' && !message.mediaFileName && (
                                <p className="text-sm text-white">{message.content}</p>
                              )}
                              
                              {/* SIMPLE HEIC FIX: Show images for ANY file with image extension OR any messageType image */}
                              {(() => {
                                const hasImageExtension = message.mediaFileName?.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i);
                                const hasImageMime = message.mediaMimeType?.startsWith('image/');
                                const isImageType = message.messageType === 'image';
                                const shouldShowAsImage = hasImageExtension || hasImageMime || isImageType;
                                
                                // Debug log for HEIC files specifically
                                if (message.mediaFileName?.toLowerCase().includes('heic')) {
                                  console.log('🔥 HEIC DETECTION (BLUE BUBBLE):', {
                                    messageId: message.id,
                                    fileName: message.mediaFileName,
                                    messageType: message.messageType,
                                    hasImageExtension: !!hasImageExtension,
                                    hasImageMime: !!hasImageMime,
                                    isImageType,
                                    shouldShowAsImage,
                                    decision: shouldShowAsImage ? 'SHOW AS IMAGE' : 'SHOW AS ATTACHMENT'
                                  });
                                }
                                
                                return shouldShowAsImage;
                              })() && (
                                <div className="space-y-2">
                                  {/* COMPLETELY HIDE filename text for media files (own messages) */}
                                  {message.content && 
                                   !message.content.startsWith('Shared file:') && 
                                   !message.content.match(/^Shared file: .*\.(jpg|jpeg|png|heic|mov|mp4|gif|webp|heif|avi|webm)$/i) && 
                                   <p className="text-sm text-white">{message.content}</p>}
                                  <img
                                    src={(() => {
                                      const isHEIC = message.mediaFileName && 
                                        (message.mediaFileName.toLowerCase().includes('.heic') || 
                                         message.mediaFileName.toLowerCase().includes('.heif') ||
                                         message.mediaMimeType === 'image/heic' ||
                                         message.mediaMimeType === 'image/heif');
                                      
                                      if (isHEIC && message.mediaUrl) {
                                        // Extract filename from URL and use conversion endpoint
                                        const filename = message.mediaUrl.split('/').pop();
                                        return `/api/convert-heic/${filename}`;
                                      }
                                      
                                      return message.mediaUrl || '';
                                    })()}
                                    alt="Shared image"
                                    className="max-w-xs rounded-lg"
                                    onError={(e) => {
                                      console.log('Image failed to load (own message):', message.mediaUrl);
                                    }}
                                  />
                                </div>
                              )}
                              {message.messageType === 'video' && (
                                <div className="space-y-2">
                                  {/* COMPLETELY HIDE filename text for video files (own messages) */}
                                  {message.content && 
                                   !message.content.startsWith('Shared file:') && 
                                   !message.content.match(/^Shared file: .*\.(mov|mp4|avi|webm)$/i) && 
                                   <p className="text-sm text-white">{message.content}</p>}
                                  <video
                                    src={message.mediaUrl || ''}
                                    controls
                                    className="max-w-xs rounded-lg"
                                  />
                                </div>
                              )}

                              
                              {(message.messageType === 'text' && message.mediaUrl && message.mediaFileName && 
                                !message.mediaFileName.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i) &&
                                !message.mediaMimeType?.startsWith('image/')) && (
                                <div className="space-y-2">
                                  <p className="text-sm text-white">{message.content}</p>
                                  <div className="bg-blue-400 border border-blue-300 rounded-lg p-3 max-w-xs">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="h-4 w-4 text-white" />
                                      <span className="text-sm font-medium text-white truncate">
                                        {message.mediaFileName}
                                      </span>
                                    </div>
                                    <div className="flex gap-2">
                                      <a
                                        href={message.mediaUrl}
                                        download={message.mediaFileName}
                                        className="flex items-center gap-1 px-2 py-1 bg-white text-blue-500 text-xs rounded hover:bg-gray-100 transition-colors"
                                      >
                                        <Download className="h-3 w-3" />
                                        Download
                                      </a>
                                      {message.mediaMimeType === 'application/pdf' && (
                                        <a
                                          href={message.mediaUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 px-2 py-1 bg-white text-gray-700 text-xs rounded hover:bg-gray-100 transition-colors"
                                        >
                                          <Eye className="h-3 w-3" />
                                          Preview
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Reactions display */}
                              {message.reactions && message.reactions.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {message.reactions.map((reaction: any) => (
                                    <button
                                      key={reaction.reactionType}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-400 rounded-full text-xs hover:bg-blue-300 transition-colors text-white"
                                      onClick={() => handleRemoveReaction(message.id)}
                                    >
                                      <span>{getReactionEmoji(reaction.reactionType)}</span>
                                      <span>{reaction.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="mt-1 px-1 text-right">
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Reaction picker overlay */}
                        {showReactionsFor === message.id && (
                          <div className="absolute top-0 left-0 right-0 z-50 flex justify-center">
                            <div className="bg-background border rounded-full p-2 shadow-lg flex gap-2">
                              <button
                                className="w-10 h-10 rounded-full bg-muted hover:bg-accent transition-colors flex items-center justify-center text-lg"
                                onClick={() => handleReaction(message.id, 'heart')}
                              >
                                ❤️
                              </button>
                              <button
                                className="w-10 h-10 rounded-full bg-muted hover:bg-accent transition-colors flex items-center justify-center text-lg"
                                onClick={() => handleReaction(message.id, 'thumbs_up')}
                              >
                                👍
                              </button>
                              <button
                                className="w-10 h-10 rounded-full bg-muted hover:bg-accent transition-colors flex items-center justify-center text-lg"
                                onClick={() => handleReaction(message.id, 'thumbs_down')}
                              >
                                👎
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*,video/*,.pdf,.mov,.mp4,.jpeg,.jpg,.png,.gif,.heic"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload files (images, videos, documents)"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Select a chat to start messaging</h3>
              <p className="text-muted-foreground">
                Choose a group chat from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}