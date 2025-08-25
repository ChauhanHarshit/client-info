import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Key, User, Calendar, Shield, Palette, Copy, RotateCcw, Upload, X } from 'lucide-react';
import { CreatorAvatar } from '@/components/ui/creator-avatar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PageHeader } from '@/components/page-header';

interface CreatorLogin {
  id: number;
  creatorId?: number;
  creatorid?: number; // Handle both camelCase and lowercase from API
  username: string;
  password?: string;
  plainPassword?: string;
  plainpassword?: string; // Handle both camelCase and lowercase from API
  isActive?: boolean;
  isactive?: boolean; // Handle both camelCase and lowercase from API
  lastLogin?: string | null;
  lastlogin?: string | null; // Handle both camelCase and lowercase from API
  createdAt: string;
  createdat?: string; // Handle both camelCase and lowercase from API
  creatorName: string;
  creatorname?: string; // Handle both camelCase and lowercase from API
  creatorUsername: string;
  creatorusername?: string; // Handle both camelCase and lowercase from API
}

interface Creator {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  aestheticTemplateId?: number;
  templateAssignedAt?: string;
  templateAssignedBy?: string;
}

interface PageTemplate {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  category: string;
}

export default function CreatorPageLogins() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLogin, setEditingLogin] = useState<CreatorLogin | null>(null);
  const [isAestheticDialogOpen, setIsAestheticDialogOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loginToDelete, setLoginToDelete] = useState<CreatorLogin | null>(null);
  const [loginsRefreshKey, setLoginsRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
    creatorId: '',
    username: '',
    password: '',
    isActive: true
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch creator logins with ZERO CACHING - always fresh from server (same method as client-profiles)
  const { data: logins = [], isLoading, error, refetch } = useQuery<CreatorLogin[]>({
    queryKey: ['/api/creator-logins', loginsRefreshKey],
    queryFn: async () => {
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/creator-logins${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch creator logins');
      }
      
      const data = await response.json();
      
      // Validate that the response is an array, not an error object
      if (!Array.isArray(data)) {
        console.error('Creator logins API returned non-array data:', data);
        
        // If it's an authentication error, handle it gracefully
        if (data && data.message && data.requiresLogin) {
          throw new Error(`Authentication required: ${data.message}`);
        }
        
        // For other non-array responses, return empty array
        console.warn('Creator logins API returned unexpected data, using empty array');
        return [];
      }
      
      return data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Don't refetch on focus to avoid excessive calls
    staleTime: 0,        // Data is immediately stale - no caching
    gcTime: 0,           // Don't cache at all - garbage collect immediately  
    refetchInterval: false, // Disable automatic refetching
  });

  // Fetch creators with ZERO CACHING - always fresh from server (same method as client-profiles)
  const { data: creators = [], error: creatorsError } = useQuery<Creator[]>({
    queryKey: ['/api/creators'],
    queryFn: async () => {
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/creators${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch creators');
      }
      
      const data = await response.json();
      
      // Validate that the response is an array, not an error object
      if (!Array.isArray(data)) {
        console.error('Creators API returned non-array data:', data);
        
        // If it's an authentication error, handle it gracefully
        if (data && data.message && data.requiresLogin) {
          throw new Error(`Authentication required: ${data.message}`);
        }
        
        // For other non-array responses, return empty array
        console.warn('Creators API returned unexpected data, using empty array');
        return [];
      }
      
      return data;
    },
    staleTime: 0,        // Data is immediately stale - no caching
    gcTime: 0,           // Don't cache at all - garbage collect immediately
    refetchOnMount: true,
    retry: 1,            // Only retry once on failure
  });

  // Fetch page templates for aesthetic assignment (same method as client-profiles)
  const { data: templates = [] } = useQuery<PageTemplate[]>({
    queryKey: ['/api/page-templates'],
    queryFn: async () => {
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/page-templates${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch page templates');
      }
      
      const data = await response.json();
      
      // Validate that the response is an array, not an error object
      if (!Array.isArray(data)) {
        console.error('Page templates API returned non-array data:', data);
        
        // If it's an authentication error, handle it gracefully
        if (data && data.message && data.requiresLogin) {
          console.warn('Page templates requires authentication, returning empty array');
          return [];
        }
        
        // For other non-array responses, return empty array
        console.warn('Page templates API returned unexpected data, using empty array');
        return [];
      }
      
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  console.log('Creator Page Logins - Data length:', logins?.length || 0, 'Loading:', isLoading, 'Error:', error?.message);
  console.log('Creator Page Logins - Creators length:', creators?.length || 0, 'Templates length:', templates?.length || 0);
  console.log('Creator Page Logins - Data types:', {
    logins: Array.isArray(logins) ? 'array' : typeof logins,
    creators: Array.isArray(creators) ? 'array' : typeof creators,
    templates: Array.isArray(templates) ? 'array' : typeof templates
  });
  
  // Debug authentication state
  useEffect(() => {
    console.log('Creator Page Logins mounted - checking auth and fetching data');
    setTimeout(() => {
      console.log('Delayed refetch attempt...');
      refetch();
    }, 1000);
  }, [refetch]);

  // Debug fetched creators
  useEffect(() => {
    if (creators.length > 0) {
      console.log('Fetching creators from API...');
      console.log('Creators API response:', {});
      console.log('Creators data parsed:', creators);
    }
  }, [creators]);

  // Force immediate list refresh - fetch fresh data exactly like initial page load
  const forceListRefresh = async () => {
    console.log('🔄 FORCING FRESH DATA FETCH (like initial page load)...');
    
    try {
      // 1. Clear ALL cached data first
      queryClient.removeQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === '/api/creator-logins'
      });
      
      // 2. Update refresh key to force new query
      const newKey = Date.now();
      setLoginsRefreshKey(newKey);
      
      // 3. Make direct fresh API call exactly like initial page load
      const response = await fetch('/api/creator-logins', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Prevent browser caching
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const freshData = await response.json();
      
      // Validate that the response is an array, not an error object
      if (!Array.isArray(freshData)) {
        console.error('Fresh fetch returned non-array data:', freshData);
        
        // If it's an authentication error, show toast and don't update cache
        if (freshData && freshData.message && freshData.requiresLogin) {
          toast({
            title: "Authentication Required",
            description: freshData.message || "Please log in to access this page",
            variant: "destructive",
          });
          return;
        }
        
        // For other non-array responses, use empty array
        console.warn('Fresh fetch returned unexpected data, using empty array');
      }
      
      const validData = Array.isArray(freshData) ? freshData : [];
      console.log('🔄 FRESH DATA FETCHED:', validData.length, 'items from server');
      
      // 4. Set the fresh data directly into the query cache
      queryClient.setQueryData(['/api/creator-logins', newKey], validData);
      
      console.log('🔄 LIST REFRESH COMPLETE - UI updated with fresh server data');
      
      return validData;
    } catch (error) {
      console.error('🔄 LIST REFRESH ERROR:', error);
      throw error;
    }
  };

  // Create login mutation
  const createLoginMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/creator-logins', data),
    onSuccess: async (result, variables) => {
      console.log('✅ CREATE SUCCESS: Creator login created, refreshing list...');
      
      // Close dialog first for immediate UI feedback
      setIsCreateDialogOpen(false);
      setFormData({ creatorId: '', username: '', password: '', isActive: true });
      
      // Wait a moment for database transaction to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force immediate list refresh
      await forceListRefresh();
      
      toast({
        title: "Success",
        description: "Creator login created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create creator login",
        variant: "destructive",
      });
    },
  });

  // Update login mutation with profile picture upload support
  const updateLoginMutation = useMutation({
    mutationFn: async ({ id, data, profileImage }: { id: number; data: any; profileImage?: File }) => {
      // First, upload profile image if provided
      let updatedData = { ...data };
      
      if (profileImage && editingLogin) {
        setIsUploadingProfileImage(true);
        try {
          // Get the creator ID from the login being edited
          const creatorId = editingLogin.creatorId || editingLogin.creatorid;
          
          if (!creatorId) {
            throw new Error('Creator ID not found for profile image upload');
          }
          
          const formData = new FormData();
          formData.append('file', profileImage);
          formData.append('creatorId', creatorId.toString());
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Failed to upload profile image');
          }
          
          const uploadResult = await uploadResponse.json();
          console.log('Profile image uploaded:', uploadResult);
          
          // Update creator profile image
          await apiRequest('PUT', `/api/creators/${creatorId}`, {
            profileImageUrl: uploadResult.url
          });
          
          console.log('Creator profile image updated successfully');
        } catch (error) {
          console.error('Profile image upload failed:', error);
          throw new Error('Failed to upload profile image');
        } finally {
          setIsUploadingProfileImage(false);
        }
      }
      
      // Then update the login credentials
      return apiRequest('PUT', `/api/creator-logins/${id}`, updatedData);
    },
    onSuccess: async () => {
      console.log('✏️ UPDATE SUCCESS: Creator login updated, refreshing list...');
      
      // Close dialog first for immediate UI feedback
      setIsEditDialogOpen(false);
      setEditingLogin(null);
      resetProfileImageStates();
      
      // Invalidate creators cache to refresh profile images
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      
      // Wait longer for database transaction to fully commit across all connections
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force immediate list refresh
      await forceListRefresh();
      
      toast({
        title: "Success",
        description: "Creator login updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update creator login",
        variant: "destructive",
      });
    },
  });

  // Delete login mutation
  const deleteLoginMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/creator-logins/${id}`),
    onSuccess: async (_, deletedId) => {
      console.log(`🗑️ DELETE SUCCESS: Creator login deleted (ID ${deletedId}), refreshing list...`);
      
      // Close dialog first for immediate UI feedback
      setShowDeleteDialog(false);
      setLoginToDelete(null);
      
      // Wait longer for database transaction to fully commit across all connections
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force immediate list refresh
      await forceListRefresh();
      
      toast({
        title: "Success", 
        description: "Creator login deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
      toast({
        title: "Error",
        description: "Failed to delete creator login",
        variant: "destructive",
      });
    },
  });

  // Assign aesthetic template mutation
  const assignAestheticMutation = useMutation({
    mutationFn: ({ creatorId, templateId }: { creatorId: number; templateId: number }) => 
      apiRequest('POST', `/api/creators/${creatorId}/aesthetic`, { templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      setIsAestheticDialogOpen(false);
      setSelectedCreator(null);
      setSelectedTemplateId('');
      toast({
        title: "Success",
        description: "Aesthetic template assigned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign aesthetic template",
        variant: "destructive",
      });
    },
  });

  // Copy URL to clipboard function
  const copyUrlToClipboard = async () => {
    const url = `${window.location.origin}/creatorlogin`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Copied!",
        description: "Creator login URL copied to clipboard",
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Copied!",
        description: "Creator login URL copied to clipboard",
      });
    }
  };

  const handleCreate = () => {
    if (!formData.creatorId || !formData.username || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Find the selected creator to get their actual username from the database
    const selectedCreator = Array.isArray(creators) ? 
      creators.find((creator: Creator) => creator.id === parseInt(formData.creatorId)) : 
      null;
    
    if (!selectedCreator) {
      // If creators data isn't loaded or creator not found, use a fallback
      toast({
        title: "Warning",
        description: "Creator data not available, using login username",
        variant: "default",
      });
    }

    createLoginMutation.mutate({
      creatorId: parseInt(formData.creatorId),
      username: selectedCreator?.username || formData.username, // Use creator's username if available, otherwise use form input
      password: formData.password,
      isActive: formData.isActive,
    });
  };

  const handleEdit = (login: CreatorLogin) => {
    const creatorId = login.creatorId || login.creatorid || 0;
    const isActive = login.isActive !== undefined ? login.isActive : login.isactive !== undefined ? login.isactive : true;
    
    setEditingLogin(login);
    setFormData({
      creatorId: creatorId.toString(),
      username: login.username,
      password: '',
      isActive: isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingLogin || !formData.username) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      username: formData.username,
      isActive: formData.isActive,
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    updateLoginMutation.mutate({
      id: editingLogin.id,
      data: updateData,
      profileImage: profileImageFile || undefined,
    });
  };

  // Handle profile image selection
  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset profile image states when dialog closes
  const resetProfileImageStates = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    setIsUploadingProfileImage(false);
  };

  const handleDelete = (login: CreatorLogin) => {
    setLoginToDelete(login);
    setShowDeleteDialog(true);
  };
  
  const confirmDelete = () => {
    if (loginToDelete) {
      deleteLoginMutation.mutate(loginToDelete.id);
    }
  };

  const handleAssignAesthetic = (creator: Creator) => {
    setSelectedCreator(creator);
    setSelectedTemplateId(creator.aestheticTemplateId?.toString() || '');
    setIsAestheticDialogOpen(true);
  };

  const handleAestheticAssignment = () => {
    if (!selectedCreator || !selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    assignAestheticMutation.mutate({
      creatorId: selectedCreator.id,
      templateId: parseInt(selectedTemplateId),
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creator Page Logins"
        description="Manage login credentials for creator access to their personal app pages"
        showBackButton={true}
        backTo="/"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={async () => {
                console.log('🔄 REFRESH BUTTON: Refreshing creator login list...');
                await forceListRefresh();
                toast({
                  title: "Data Refreshed",
                  description: "Creator login list updated with latest data",
                });
              }}
              disabled={isLoading}
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Login
            </Button>
          </div>
        }
      />

      {/* Error Display for Authentication Issues */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <Shield className="w-5 h-5" />
              <div>
                <h3 className="font-medium">Authentication Required</h3>
                <p className="text-sm text-red-500">
                  {error.message || 'Please log in to access creator login management.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {creatorsError && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-orange-600">
              <User className="w-5 h-5" />
              <div>
                <h3 className="font-medium">Creator Data Unavailable</h3>
                <p className="text-sm text-orange-500">
                  {creatorsError.message || 'Unable to load creator list. Please try refreshing the page.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog Content */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Creator Login</DialogTitle>
              <DialogDescription>
                Create login credentials for a creator to access their personal app page.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="creator">Creator</Label>
                <Select value={formData.creatorId} onValueChange={(value) => {
                  const selectedCreator = Array.isArray(creators) ? 
                    creators.find((creator: Creator) => creator.id === parseInt(value)) : 
                    null;
                  setFormData(prev => ({ 
                    ...prev, 
                    creatorId: value,
                    username: selectedCreator?.username || ''
                  }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a creator" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(creators) && creators.length > 0 ? (
                      creators.map((creator: Creator) => (
                        <SelectItem key={creator.id} value={creator.id.toString()}>
                          {creator.displayName} (@{creator.username})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No creators available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="username">Login Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  readOnly
                  placeholder="Select a creator to auto-populate username"
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Username is automatically set based on the selected creator
                </p>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter login password"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createLoginMutation.isPending}>
                {createLoginMutation.isPending ? 'Creating...' : 'Create Login'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            Login Credentials
          </CardTitle>
          <CardDescription>
            Manage access credentials for creators to log into their personal app pages at {window.location.origin}/creatorlogin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">Error loading creator logins: {error.message}</p>
              <Button onClick={() => refetch()} variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <div 
              style={{
                position: 'relative',
                width: '100%',
                height: '400px'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  overflowX: 'scroll',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  zIndex: 1
                }}
              >
                <div 
                  style={{
                    width: '1200px',
                    minWidth: '1200px',
                    height: 'auto'
                  }}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creator</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logins.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No creator logins found. Create a login to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logins.map((login: CreatorLogin) => {
                          // Handle both camelCase and lowercase API response formats
                          const creatorId = login.creatorId || login.creatorid || 0;
                          const isActive = login.isActive !== undefined ? login.isActive : (login.isactive !== undefined ? login.isactive : true);
                          const lastLogin = login.lastLogin || login.lastlogin || null;
                          const createdAt = login.createdAt || login.createdat || '';
                          const creatorName = login.creatorName || login.creatorname || 'Unknown Creator';
                          const creatorUsername = login.creatorUsername || login.creatorusername || 'N/A';

                          // Find the creator data from the creators array to get profile image
                          const creator = Array.isArray(creators) ? creators.find(c => c.id === creatorId) : null;
                          
                          return (
                            <TableRow key={login.id}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <CreatorAvatar
                                    creator={{
                                      id: creatorId,
                                      username: creatorUsername,
                                      displayName: creatorName,
                                      profileImageUrl: creator?.profileImageUrl || null
                                    }}
                                    size="sm"
                                  />
                                  <div>
                                    <div className="font-medium">{creatorName}</div>
                                    <div className="text-sm text-muted-foreground">@{creatorUsername}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{login.username}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Key className="w-4 h-4" />
                                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                    {login.plainPassword || login.plainpassword || 'N/A'}
                                  </code>
                                  {(login.plainPassword || login.plainpassword) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(login.plainPassword || login.plainpassword || '');
                                          toast({
                                            title: "Copied!",
                                            description: "Password copied to clipboard",
                                          });
                                        } catch (err) {
                                          toast({
                                            title: "Error",
                                            description: "Failed to copy password",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={isActive ? "default" : "secondary"}>
                                  {isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formatDate(lastLogin)}</span>
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit({
                                      ...login,
                                      creatorId,
                                      isActive,
                                      lastLogin,
                                      createdAt,
                                      creatorName,
                                      creatorUsername
                                    })}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(login)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Creator Login</DialogTitle>
            <DialogDescription>
              Update login credentials for {editingLogin?.creatorName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Profile Picture Upload Section */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center space-x-4">
                {/* Current/Preview Profile Picture */}
                <div className="flex-shrink-0">
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Profile preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : editingLogin ? (
                    <CreatorAvatar
                      creator={{
                        id: editingLogin.creatorId || editingLogin.creatorid || 0,
                        username: editingLogin.creatorUsername || editingLogin.creatorusername || '',
                        displayName: editingLogin.creatorName || editingLogin.creatorname || '',
                        profileImageUrl: Array.isArray(creators) ? creators.find(c => c.id === (editingLogin.creatorId || editingLogin.creatorid))?.profileImageUrl : null
                      }}
                      size="lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Upload Controls */}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Label
                      htmlFor="profile-image-upload"
                      className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {profileImageFile ? 'Change Image' : 'Upload Image'}
                    </Label>
                    {profileImageFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProfileImageFile(null);
                          setProfileImagePreview(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="hidden"
                  />
                  {profileImageFile && (
                    <p className="text-sm text-gray-600">
                      Selected: {profileImageFile.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Upload a new profile picture to update the creator's avatar across the platform
                  </p>
                </div>
              </div>
            </div>
            
            {/* Username Field */}
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter login username"
              />
            </div>
            
            {/* Password Field */}
            <div>
              <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter new password"
              />
            </div>
            
            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                resetProfileImageStates();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateLoginMutation.isPending || isUploadingProfileImage}
            >
              {isUploadingProfileImage ? 'Uploading Image...' : 
               updateLoginMutation.isPending ? 'Updating...' : 
               'Update Login'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Creator Login</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the login for {loginToDelete?.creatorName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 p-4 bg-red-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-red-800">This will permanently delete:</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1 ml-4">
              <li>• Login username: <code className="bg-red-100 px-1 rounded">{loginToDelete?.username}</code></li>
              <li>• Access to creator personal app page</li>
              <li>• All associated login credentials</li>
            </ul>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setLoginToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteLoginMutation.isPending}
            >
              {deleteLoginMutation.isPending ? 'Deleting...' : 'Delete Login'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Public Login Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">Creator Login URL</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Share this URL with creators to access their personal app pages:
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-white px-3 py-2 rounded border text-sm flex-1">
                  {window.location.origin}/creatorlogin
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyUrlToClipboard}
                  className="flex items-center gap-1 hover:bg-blue-100 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <h3 className="font-medium mb-2">Security Notes</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Only admins can create and manage login credentials</li>
                <li>• No public sign-up functionality is available</li>
                <li>• Creators can only access their assigned personal app page</li>
                <li>• Login credentials are manually created and assigned</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aesthetic Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            Aesthetic Template Management
          </CardTitle>
          <CardDescription>
            Assign aesthetic templates to creators for their personal app pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(creators) && creators.map((creator: Creator) => {
              const assignedTemplate = Array.isArray(templates) ? 
                templates.find((t: PageTemplate) => t.id === creator.aestheticTemplateId) : 
                null;
              
              return (
                <div key={creator.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center space-x-3">
                    <User className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">{creator.displayName}</h3>
                      <p className="text-sm text-muted-foreground">@{creator.username}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {assignedTemplate ? (
                      <div className="p-3 bg-green-50 rounded border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{assignedTemplate.name}</p>
                            <p className="text-xs text-muted-foreground">{assignedTemplate.category}</p>
                          </div>
                          {assignedTemplate.imageUrl && (
                            <div className="w-12 h-8 bg-cover bg-center rounded border" 
                                 style={{ backgroundImage: `url(${assignedTemplate.imageUrl})` }} />
                          )}
                        </div>
                        {creator.templateAssignedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Assigned {formatDate(creator.templateAssignedAt)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded border">
                        <p className="text-sm text-muted-foreground">No template assigned</p>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleAssignAesthetic(creator)}
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      {assignedTemplate ? 'Change Template' : 'Assign Template'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Aesthetic Assignment Dialog */}
      <Dialog open={isAestheticDialogOpen} onOpenChange={setIsAestheticDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Aesthetic Template</DialogTitle>
            <DialogDescription>
              Choose an aesthetic template for {selectedCreator?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template">Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(templates) && templates.length > 0 ? (
                    templates.map((template: PageTemplate) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <span>{template.name}</span>
                          <Badge variant="secondary">{template.category}</Badge>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No templates available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTemplateId && (
              <div className="p-3 border rounded">
                {(() => {
                  const selectedTemplate = Array.isArray(templates) ? 
                    templates.find((t: PageTemplate) => t.id === parseInt(selectedTemplateId)) : 
                    null;
                  return selectedTemplate ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{selectedTemplate.name}</h4>
                        <Badge variant="outline">{selectedTemplate.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                      {selectedTemplate.imageUrl && (
                        <div className="w-full h-24 bg-cover bg-center rounded border" 
                             style={{ backgroundImage: `url(${selectedTemplate.imageUrl})` }} />
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAestheticDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAestheticAssignment}
              disabled={!selectedTemplateId || assignAestheticMutation.isPending}
            >
              {assignAestheticMutation.isPending ? 'Assigning...' : 'Assign Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}