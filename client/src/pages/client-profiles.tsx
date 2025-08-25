import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatorAvatar } from "@/components/ui/creator-avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, ArrowLeft, Trash2, Upload, User, Camera } from "lucide-react";
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";

interface Creator {
  id: number;
  username: string;
  displayName: string;
  email: string;
  teamId: number;
  profileImageUrl?: string;
}

interface Team {
  id: number;
  name: string;
}

const createCreatorSchema = z.object({
  username: z.string().min(1, "Username is required"),
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email"),
});

const editCreatorSchema = z.object({
  username: z.string().min(1, "Username is required"),
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email"),
});

type CreateCreatorData = z.infer<typeof createCreatorSchema>;
type EditCreatorData = z.infer<typeof editCreatorSchema>;

export default function ClientProfiles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Handle profile image file selection
  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image function
  const uploadProfileImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(getApiUrl('/api/upload'), {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    const data = await response.json();
    console.log('Upload response data:', data);
    return data.file?.url || data.url || data.fileUrl;
  };

  // Reset image state
  const resetImageState = () => {
    setProfileImageFile(null);
    setProfileImagePreview("");
    setIsUploadingImage(false);
  };

  const createForm = useForm<CreateCreatorData>({
    resolver: zodResolver(createCreatorSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
    },
  });

  const editForm = useForm<EditCreatorData>({
    resolver: zodResolver(editCreatorSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
    },
  });

  // Creators query with complete cache bypass
  const [creatorsCacheKey] = useState(() => `creators_${Date.now()}_${Math.random()}`);
  const {
    data: creators = [],
    isLoading: creatorsLoading,
    error: creatorsError,
  } = useQuery<Creator[]>({
    queryKey: [creatorsCacheKey],
    queryFn: async () => {
      console.log('🔄 Fetching creators with cache bypass - key:', creatorsCacheKey);
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
      const arrayData = Array.isArray(data) ? data : [];
      console.log(`✅ Fresh creators data from database (${arrayData.length} creators):`, arrayData.map(c => `${c.displayName} (${c.id})`));
      
      return arrayData;
    },
    // Disable all caching to ensure fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 1
  });

  // Debug logging to see what we're getting
  useEffect(() => {
    console.log("ClientProfiles Debug:");
    console.log("- creators data:", creators);
    console.log("- creators type:", typeof creators);
    console.log("- creators isArray:", Array.isArray(creators));
    console.log("- creators length:", Array.isArray(creators) ? creators.length : 'not array');
    console.log("- creatorsLoading:", creatorsLoading);
    console.log("- creatorsError:", creatorsError);
    if (creatorsError) {
      console.log("- creatorsError details:", JSON.stringify(creatorsError, null, 2));
      console.log("- creatorsError message:", creatorsError?.message);
    }
  }, [creators, creatorsLoading, creatorsError]);

  // Teams query with complete cache bypass
  const [teamsCacheKey] = useState(() => `teams_${Date.now()}_${Math.random()}`);
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: [teamsCacheKey],
    queryFn: async () => {
      console.log('🔄 Fetching teams with cache bypass - key:', teamsCacheKey);
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/teams${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      
      const data = await response.json();
      const arrayData = Array.isArray(data) ? data : [];
      console.log(`✅ Fresh teams data from database (${arrayData.length} teams):`, arrayData.map(t => `${t.name} (${t.id})`));
      
      return arrayData;
    },
    // Disable all caching to ensure fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 1
  });

  // Direct create function with instant cache update (zero-caching approach)
  const createCreatorDirectly = async (data: CreateCreatorData & { profileImageUrl?: string }) => {
    try {
      console.log('📝 Creating creator with zero-caching approach...');
      
      // Direct fetch call with cache-busting headers
      const response = await fetch(getApiUrl("/api/creators"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create creator: ${response.status}`);
      }

      const newCreator = await response.json();
      console.log('✅ Creator created successfully:', newCreator);

      // Immediate cache update without waiting for invalidation
      queryClient.setQueryData([creatorsCacheKey], (oldData: Creator[] | undefined) => {
        const currentData = oldData || [];
        const updatedData = [...currentData, newCreator];
        console.log(`✅ Added creator to cache. Count: ${currentData.length} → ${updatedData.length}`);
        return updatedData;
      });

      // Reset form and close dialog
      createForm.reset();
      setIsCreateDialogOpen(false);
      resetImageState();
      
      toast({
        title: "Success",
        description: "Creator added successfully",
      });

      return newCreator;
    } catch (error: any) {
      console.error('❌ Creator creation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add creator",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Keep the old mutation for compatibility but replace its usage
  const createCreatorMutation = {
    isPending: isUploadingImage,
    mutate: createCreatorDirectly
  };

  // Edit creator mutation
  const editCreatorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditCreatorData & { profileImageUrl?: string } }) => 
      apiRequest("PUT", getApiUrl(`/api/creators/${id}`), data),
    onSuccess: async () => {
      // Force immediate cache invalidation and refetch for production
      await queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      await queryClient.refetchQueries({ queryKey: ["/api/creators"] });
      editForm.reset();
      setIsUploadingImage(false);
      setIsEditDialogOpen(false);
      setEditingCreator(null);
      resetImageState();
      toast({
        title: "Success",
        description: "Creator updated successfully",
      });
    },
    onError: (error: any) => {
      setIsUploadingImage(false);
      toast({
        title: "Error",
        description: error.message || "Failed to update creator",
        variant: "destructive",
      });
    },
  });

  // Direct delete function with instant cache update (zero-caching approach)
  const deleteCreatorDirectly = async (id: number) => {
    try {
      console.log(`🗑️ Deleting creator ${id} with zero-caching approach...`);
      
      // Optimistic cache update - remove creator immediately
      queryClient.setQueryData(["/api/creators"], (oldData: Creator[] | undefined) => {
        const currentData = oldData || [];
        const updatedData = currentData.filter(creator => creator.id !== id);
        console.log(`✅ Removed creator from cache. Count: ${currentData.length} → ${updatedData.length}`);
        return updatedData;
      });

      // Direct fetch call with cache-busting headers
      const response = await fetch(getApiUrl(`/api/creators/${id}`), {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        // Rollback optimistic update on error
        queryClient.setQueryData(["/api/creators"], (oldData: Creator[] | undefined) => {
          const currentData = oldData || [];
          // Find the deleted creator from original data and restore it
          const originalCreators = creators || [];
          const deletedCreator = originalCreators.find(creator => creator.id === id);
          if (deletedCreator) {
            return [...currentData, deletedCreator].sort((a, b) => a.id - b.id);
          }
          return currentData;
        });
        
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete creator: ${response.status}`);
      }

      console.log('✅ Creator deleted successfully from database');
      
      toast({
        title: "Success",
        description: "Creator deleted successfully",
      });

    } catch (error: any) {
      console.error('❌ Creator deletion failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete creator",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Keep the old mutation for compatibility but replace its usage
  const deleteCreatorMutation = {
    isPending: false,
    mutate: deleteCreatorDirectly
  };

  const handleCreateSubmit = async (data: CreateCreatorData) => {
    try {
      setIsUploadingImage(true);
      let profileImageUrl = "";
      
      // Upload profile image if selected
      if (profileImageFile) {
        profileImageUrl = await uploadProfileImage(profileImageFile);
      }
      
      // Include profile image URL in creator data
      const creatorData = {
        ...data,
        profileImageUrl
      };
      
      await createCreatorDirectly(creatorData);
      resetImageState();
    } catch (error) {
      setIsUploadingImage(false);
      toast({
        title: "Error",
        description: "Failed to upload profile image",
        variant: "destructive",
      });
    }
  };

  const handleEditSubmit = async (data: EditCreatorData) => {
    if (editingCreator) {
      try {
        setIsUploadingImage(true);
        let profileImageUrl = editingCreator.profileImageUrl || "";
        
        // Upload new profile image if selected
        if (profileImageFile) {
          console.log("Uploading new profile image...");
          profileImageUrl = await uploadProfileImage(profileImageFile);
          console.log("Profile image uploaded:", profileImageUrl);
        }
        
        // Include profile image URL in update data
        const updatedData = {
          ...data,
          profileImageUrl
        };
        
        console.log("Updating creator with data:", updatedData);
        
        // Trigger the mutation and wait for completion
        editCreatorMutation.mutate({ id: editingCreator.id, data: updatedData });
        
      } catch (error) {
        console.error("Edit submission error:", error);
        setIsUploadingImage(false);
        toast({
          title: "Error",
          description: "Failed to upload profile image",
          variant: "destructive",
        });
      }
    }
  };

  // Filter creators based on search query
  const filteredCreators = useMemo(() => {
    // Ensure creators is always an array
    const creatorsArray = Array.isArray(creators) ? creators : [];
    
    if (!searchQuery) return creatorsArray;
    
    return creatorsArray.filter((creator: Creator) =>
      creator.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [creators, searchQuery]);

  // Set edit form values when editing creator changes
  useEffect(() => {
    if (editingCreator) {
      editForm.reset({
        username: editingCreator.username,
        displayName: editingCreator.displayName,
        email: editingCreator.email,
      });
      // Set existing profile image preview
      if (editingCreator.profileImageUrl) {
        setProfileImagePreview(getApiUrl(editingCreator.profileImageUrl));
      } else {
        setProfileImagePreview("");
      }
      setProfileImageFile(null);
    }
  }, [editingCreator, editForm]);



  return (
    <div className="space-y-6">
      <PageHeader
        title="Creators"
        description="Manage content creators and their assignments"
        showBackButton={true}
        useBrowserBack={true}
        actions={
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Creator</span>
          </Button>
        }
      />

      <div className="px-6 pb-6 space-y-6">
        <Card>
            <CardHeader>
              <CardTitle>Search Creators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-6">
                <Input
                  type="text"
                  placeholder="Search creators..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {creatorsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingAnimation size="lg" />
              <p className="text-slate-600 mt-6">Loading creators...</p>
            </div>
          ) : !Array.isArray(creators) || creators.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Search className="text-slate-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No creators found</h3>
              <p className="text-slate-600 mb-6">Get started by adding your first creator.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Creator
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreators.map((creator: Creator) => {
                const team = (teams as Team[]).find((t: Team) => t.id === creator.teamId);
                return (
                  <Card key={creator.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-4">
                          <CreatorAvatar 
                            creator={creator} 
                            size="xl" 
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">
                              {creator.displayName}
                            </h3>
                            <p className="text-sm text-slate-500 mb-1">@{creator.username}</p>
                            {creator.email && (
                              <p className="text-sm text-slate-600 mb-2">{creator.email}</p>
                            )}
                            {team && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {team.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCreator(creator);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Creator</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {creator.displayName}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteCreatorMutation.mutate(creator.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
      </div>

      {/* Create Creator Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Creator</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Profile Picture Upload */}
              <div className="space-y-2">
                <FormLabel>Profile Picture</FormLabel>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profileImagePreview} alt="Profile preview" />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="profile-image-upload"
                    />
                    <label htmlFor="profile-image-upload">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span className="cursor-pointer">
                          <Camera className="h-4 w-4 mr-2" />
                          {profileImageFile ? 'Change Photo' : 'Upload Photo'}
                        </span>
                      </Button>
                    </label>
                    {profileImageFile && (
                      <p className="text-xs text-gray-500 mt-1">{profileImageFile.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetImageState();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCreatorMutation.isPending || isUploadingImage}>
                  {isUploadingImage ? "Uploading..." : createCreatorMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Creator Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Creator</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Profile Picture Upload */}
              <div className="space-y-2">
                <FormLabel>Profile Picture</FormLabel>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profileImagePreview} alt="Profile preview" />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="edit-profile-image-upload"
                    />
                    <label htmlFor="edit-profile-image-upload">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span className="cursor-pointer">
                          <Camera className="h-4 w-4 mr-2" />
                          {profileImageFile ? 'Change Photo' : 'Upload Photo'}
                        </span>
                      </Button>
                    </label>
                    {profileImageFile && (
                      <p className="text-xs text-gray-500 mt-1">{profileImageFile.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingCreator(null);
                  resetImageState();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editCreatorMutation.isPending || isUploadingImage}>
                  {isUploadingImage ? "Uploading..." : editCreatorMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}