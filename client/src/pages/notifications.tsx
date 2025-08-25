import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, Check, Info, AlertCircle, CheckCircle, AlertTriangle, Calendar, User, Users, Globe, Plus, X, Search, Edit, Trash, Eye, EyeOff, Settings, Upload, Image } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { useCrmAuth } from '@/contexts/CrmAuthContext';
import { formatDistanceToNow } from 'date-fns';
import type { Notification, UserT} from '@shared/schema';

interface NotificationWithStatus extends Notification {
  read?: boolean;
  read_at?: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
  viewedBy?: string[];
}

interface CreateNotificationData {
  title: string;
  message: string;
  type: string;
  targetType: string;
  targetIds: string[];
  link?: string;
  metadata?: any;
  expiresAt?: string;
  image?: File | null;
}

export default function NotificationsPage() {
  const { employee } = useCrmAuth();
  const [selectedNotification, setSelectedNotification] = useState<NotificationWithStatus | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('unread');
  const [mainTab, setMainTab] = useState('notifications');
  const [newNotification, setNewNotification] = useState<CreateNotificationData>({
    title: '',
    message: '',
    type: 'info',
    targetType: 'all',
    targetIds: [],
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [selectedNotificationForView, setSelectedNotificationForView] = useState<NotificationWithStatus | null>(null);
  const [editingNotification, setEditingNotification] = useState<NotificationWithStatus | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery<NotificationWithStatus[]>({
    queryKey: ['/api/notifications'],
  });
  
  // Fetch unread count
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Fetch users for admin notification creation
  const { data: users = [] } = useQuery<UserT[]>({
    queryKey: ['/api/users'],
    enabled: employee?.accessLevel === 'admin',
  });
  
  // Mark notifications as read
  const markReadMutation = useMutation({
    mutationFn: (notificationIds: number[]) => 
      apiRequest('/api/notifications/mark-read', 'POST', { notificationIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
  
  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications/mark-all-read', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
  
  // Create notification (admin only)
  const createNotificationMutation = useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('message', data.message);
      formData.append('type', data.type);
      formData.append('targetType', data.targetType);
      formData.append('targetIds', JSON.stringify(data.targetIds));
      if (data.link) formData.append('link', data.link);
      if (data.metadata) formData.append('metadata', JSON.stringify(data.metadata));
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      return fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create notification');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setShowCreateDialog(false);
      resetNotificationForm();
    },
  });
  
  // Delete notification (admin only)
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest(`/api/notifications/${notificationId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });
  
  // Update notification (admin only)
  const updateNotificationMutation = useMutation({
    mutationFn: (data: { id: number; updates: Partial<NotificationWithStatus> }) => 
      apiRequest(`/api/notifications/${data.id}`, 'PATCH', data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setEditingNotification(null);
    },
  });
  
  const unreadCount = unreadCountData?.count || 0;
  
  // Filter notifications by tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    if (activeTab === 'client-updates') {
      // Filter for client-related notifications
      return notification.title?.toLowerCase().includes('client') || 
             notification.message?.toLowerCase().includes('client') ||
             notification.type === 'client';
    }
    if (activeTab === 'warning') return notification.type === 'warning';
    if (activeTab === 'admin-panel') return true; // Admin panel shows all notifications
    return false;
  });
  
  // Filter notifications for admin panel search
  const adminFilteredNotifications = notifications.filter(notification => {
    if (!adminSearchQuery) return true;
    const searchLower = adminSearchQuery.toLowerCase();
    return (
      notification.title?.toLowerCase().includes(searchLower) ||
      notification.message?.toLowerCase().includes(searchLower) ||
      notification.targetType?.toLowerCase().includes(searchLower)
    );
  });
  
  // Mark as read when page loads
  useEffect(() => {
    if (notifications.length > 0 && unreadCount > 0) {
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id);
      if (unreadIds.length > 0) {
        markReadMutation.mutate(unreadIds);
      }
    }
  }, [notifications]);
  
  const handleNotificationClick = (notification: NotificationWithStatus) => {
    setSelectedNotification(notification);
  };
  
  const resetNotificationForm = () => {
    setNewNotification({
      title: '',
      message: '',
      type: 'info',
      targetType: 'all',
      targetIds: [],
    });
    setSelectedUsers([]);
    setSelectedTeams([]);
    setSelectedRoles([]);
    setSelectedImage(null);
    setImagePreview(null);
  };
  
  const handleImageSelect = (file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG, JPG, JPEG, or WEBP)');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }
    
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleCreateNotification = () => {
    let targetIds: string[] = [];
    
    if (newNotification.targetType === 'user') {
      targetIds = selectedUsers;
    } else if (newNotification.targetType === 'team') {
      targetIds = selectedTeams;
    } else if (newNotification.targetType === 'role') {
      targetIds = selectedRoles;
    }
    
    createNotificationMutation.mutate({
      ...newNotification,
      targetIds,
    });
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };
  
  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'success' as const;
      case 'warning':
        return 'warning' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <PageHeader
          title="Notifications"
          description="Stay updated with your alerts and notifications"
        />
      </div>
      
      {/* Main Page-Level Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <div className="border-b mb-6">
          <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger value="notifications" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Notifications
            </TabsTrigger>
            {employee?.accessLevel === 'admin' && (
              <TabsTrigger value="admin-panel" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                Admin Panel
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        
        {/* Notifications Tab Content */}
        <TabsContent value="notifications" className="m-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6" />
                  <CardTitle>Notifications</CardTitle>
                  {unreadCount > 0 && (
                    <Badge variant="destructive">{unreadCount}</Badge>
                  )}
                </div>
                <div className="flex gap-3">
                  {unreadCount > 0 && (
                    <Button variant="outline" onClick={() => markAllReadMutation.mutate()}>
                      <Check className="w-4 h-4 mr-2" />
                      Mark All Read
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b">
                  <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
                    <TabsTrigger value="unread" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                      Unread
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {unreadCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="client-updates" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                      Client Updates
                    </TabsTrigger>
                    <TabsTrigger value="warning" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                      Warning
                    </TabsTrigger>
                    <TabsTrigger value="all" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                      All
                    </TabsTrigger>
                  </TabsList>
                </div>
            
            <TabsContent value={activeTab} className="m-0">
              <ScrollArea className="h-[600px]">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading notifications...
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No notifications to display
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold">{notification.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={getNotificationBadgeVariant(notification.type)}>
                                  {notification.type}
                                </Badge>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              {notification.created_by_first_name && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {notification.created_by_first_name} {notification.created_by_last_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TabsContent>
    
    {/* Admin Panel Tab - Page Level */}
    {employee?.accessLevel === 'admin' && (
      <TabsContent value="admin-panel" className="m-0">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6" />
              <CardTitle>Admin Panel</CardTitle>
            </div>
            <CardDescription>
              Manage and track all system notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Bar and Create Button */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, message, or target audience..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Notification
                </Button>
              </div>
                  
                  {/* Notifications Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminFilteredNotifications.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No notifications found
                            </TableCell>
                          </TableRow>
                        ) : (
                          adminFilteredNotifications.map((notification) => (
                            <TableRow key={notification.id}>
                              <TableCell className="font-medium">
                                <div>
                                  <p className="font-semibold">{notification.title}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {notification.message}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getNotificationBadgeVariant(notification.type)}>
                                  {notification.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{notification.targetType || 'All'}</TableCell>
                              <TableCell className="text-sm">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedNotificationForView(notification)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Track
                                </Button>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingNotification(notification)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this notification?')) {
                                        deleteNotificationMutation.mutate(notification.id);
                                      }
                                    }}
                                  >
                                    <Trash className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedNotification && getNotificationIcon(selectedNotification.type)}
              <DialogTitle>{selectedNotification?.title}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm">{selectedNotification?.message}</p>
            </div>
            {selectedNotification?.link && (
              <div>
                <Button variant="outline" className="w-full" asChild>
                  <a href={selectedNotification.link} target="_blank" rel="noopener noreferrer">
                    View Details
                  </a>
                </Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Sent {selectedNotification && formatDistanceToNow(new Date(selectedNotification.createdAt), { addSuffix: true })}</p>
              {selectedNotification?.created_by_first_name && (
                <p>By {selectedNotification.created_by_first_name} {selectedNotification.created_by_last_name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedNotification(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Tracking Dialog (Admin Only) */}
      {employee?.accessLevel === 'admin' && (
        <Dialog open={!!selectedNotificationForView} onOpenChange={() => setSelectedNotificationForView(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>View Tracking - {selectedNotificationForView?.title}</DialogTitle>
              <DialogDescription>
                Track which employees have viewed this notification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Viewed ({selectedNotificationForView?.viewedBy?.length || 0})
                  </h3>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    {selectedNotificationForView?.viewedBy?.length ? (
                      <div className="space-y-1">
                        {selectedNotificationForView.viewedBy.map((userId: string) => {
                          const user = users.find(u => u.id === userId);
                          return (
                            <div key={userId} className="text-sm p-1">
                              {user?.firstName} {user?.lastName} - {user?.email}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No views yet</p>
                    )}
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    Not Viewed ({users.length - (selectedNotificationForView?.viewedBy?.length || 0)})
                  </h3>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <div className="space-y-1">
                      {users
                        .filter(user => !selectedNotificationForView?.viewedBy?.includes(user.id))
                        .map(user => (
                          <div key={user.id} className="text-sm p-1">
                            {user.firstName} {user.lastName} - {user.email}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Target Audience: {selectedNotificationForView?.targetType || 'All'}</p>
                <p>Created: {selectedNotificationForView && formatDistanceToNow(new Date(selectedNotificationForView.createdAt), { addSuffix: true })}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedNotificationForView(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Edit Notification Dialog (Admin Only) */}
      {employee?.accessLevel === 'admin' && (
        <Dialog open={!!editingNotification} onOpenChange={() => setEditingNotification(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Notification</DialogTitle>
              <DialogDescription>
                Update the notification details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingNotification?.title || ''}
                  onChange={(e) => setEditingNotification(prev => prev ? {...prev, title: e.target.value} : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-message">Message</Label>
                <Textarea
                  id="edit-message"
                  value={editingNotification?.message || ''}
                  onChange={(e) => setEditingNotification(prev => prev ? {...prev, message: e.target.value} : null)}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={editingNotification?.type || 'info'}
                  onValueChange={(value) => setEditingNotification(prev => prev ? {...prev, type: value} : null)}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingNotification(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingNotification) {
                    updateNotificationMutation.mutate({
                      id: editingNotification.id,
                      updates: {
                        title: editingNotification.title,
                        message: editingNotification.message,
                        type: editingNotification.type,
                      }
                    });
                  }
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Create Notification Dialog (Admin Only) */}
      {employee?.accessLevel === 'admin' && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Notification</DialogTitle>
              <DialogDescription>
                Send a notification to users based on their role, team, or individually
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  placeholder="Notification title"
                />
              </div>
              
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  placeholder="Notification message"
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newNotification.type}
                    onValueChange={(value) => setNewNotification({ ...newNotification, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="targetType">Target Audience</Label>
                  <Select
                    value={newNotification.targetType}
                    onValueChange={(value) => setNewNotification({ ...newNotification, targetType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="role">By Role</SelectItem>
                      <SelectItem value="team">By Team</SelectItem>
                      <SelectItem value="user">Specific Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {newNotification.targetType === 'role' && (
                <div>
                  <Label>Select Roles</Label>
                  <div className="space-y-2 mt-2">
                    {['employee', 'team_lead', 'manager', 'admin'].map((role) => (
                      <label key={role} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, role]);
                            } else {
                              setSelectedRoles(selectedRoles.filter(r => r !== role));
                            }
                          }}
                        />
                        <span className="capitalize">{role.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {newNotification.targetType === 'user' && (
                <div>
                  <Label>Select Users</Label>
                  <ScrollArea className="h-48 border rounded-md p-2 mt-2">
                    {users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <span>{user.firstName} {user.lastName} - {user.email}</span>
                      </label>
                    ))}
                  </ScrollArea>
                </div>
              )}
              
              <div>
                <Label htmlFor="link">Link (Optional)</Label>
                <Input
                  id="link"
                  value={newNotification.link || ''}
                  onChange={(e) => setNewNotification({ ...newNotification, link: e.target.value })}
                  placeholder="/path/to/resource"
                />
              </div>
              
              {/* Image Upload Field */}
              <div>
                <Label htmlFor="image">Attach Image (optional)</Label>
                <div
                  className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      handleImageSelect(file);
                    }
                  }}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <input
                    id="image-upload"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageSelect(file);
                      }
                    }}
                  />
                  
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="mx-auto max-h-32 rounded-md"
                      />
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {selectedImage?.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, JPEG, or WEBP up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                resetNotificationForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateNotification}
                disabled={!newNotification.title || !newNotification.message}
              >
                Send Notification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
