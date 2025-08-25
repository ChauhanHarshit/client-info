import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Users, Edit, Trash2, UserPlus, ArrowLeft } from "lucide-react";
import type { ContentTypeGroup, Creator } from "@shared/schema";

export default function CreatorManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [assignCreatorsDialogOpen, setAssignCreatorsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ContentTypeGroup | null>(null);
  const [selectedCreators, setSelectedCreators] = useState<number[]>([]);

  const handleBackNavigation = () => {
    // Navigate back to dashboard as the parent view
    setLocation('/');
  };

  // Fetch content type groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/content-type-groups']
  });

  // Fetch all creators
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['/api/creators']
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { emoji: string; name: string; description: string }) => {
      return await apiRequest('/api/content-type-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-type-groups'] });
      setNewGroupDialogOpen(false);
      toast({ title: "Success", description: "Content type group created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create content type group", variant: "destructive" });
    }
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ContentTypeGroup> }) => {
      return await apiRequest(`/api/content-type-groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-type-groups'] });
      setEditGroupDialogOpen(false);
      toast({ title: "Success", description: "Content type group updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update content type group", variant: "destructive" });
    }
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/content-type-groups/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-type-groups'] });
      toast({ title: "Success", description: "Content type group deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete content type group", variant: "destructive" });
    }
  });

  // Assign creators mutation
  const assignCreatorsMutation = useMutation({
    mutationFn: async ({ groupId, creatorIds }: { groupId: number; creatorIds: number[] }) => {
      return await apiRequest(`/api/content-type-groups/${groupId}/creators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorIds })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-type-groups'] });
      setAssignCreatorsDialogOpen(false);
      setSelectedCreators([]);
      toast({ title: "Success", description: "Creators assigned to group successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign creators to group", variant: "destructive" });
    }
  });

  // Fetch creators in group
  const { data: groupCreators = [] } = useQuery({
    queryKey: ['/api/content-type-groups', selectedGroup?.id, 'creators'],
    enabled: !!selectedGroup,
    queryFn: () => selectedGroup ? `/api/content-type-groups/${selectedGroup.id}/creators` : null
  });

  const handleCreateGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createGroupMutation.mutate({
      emoji: formData.get('emoji') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string
    });
  };

  const handleUpdateGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGroup) return;
    const formData = new FormData(e.currentTarget);
    updateGroupMutation.mutate({
      id: selectedGroup.id,
      data: {
        emoji: formData.get('emoji') as string,
        name: formData.get('name') as string,
        description: formData.get('description') as string
      }
    });
  };

  const handleAssignCreators = () => {
    if (!selectedGroup || selectedCreators.length === 0) return;
    assignCreatorsMutation.mutate({
      groupId: selectedGroup.id,
      creatorIds: selectedCreators
    });
  };

  const toggleCreatorSelection = (creatorId: number) => {
    setSelectedCreators(prev => 
      prev.includes(creatorId) 
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    );
  };

  if (groupsLoading || creatorsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <h1 className="text-3xl font-bold">Creator Manager</h1>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackNavigation}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Creator Manager</h1>
            <p className="text-muted-foreground mt-2">Organize creators by content types and manage group assignments</p>
          </div>
        </div>
        <Dialog open={newGroupDialogOpen} onOpenChange={setNewGroupDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Content Type Group</DialogTitle>
              <DialogDescription>
                Create a new group to organize creators by content type
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emoji">Emoji</Label>
                  <Input
                    id="emoji"
                    name="emoji"
                    placeholder="Select an emoji"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Nude Twitter Content"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Creators who produce nude content for Twitter marketing"
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setNewGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createGroupMutation.isPending}>
                  {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group: ContentTypeGroup) => (
          <Card key={group.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{group.emoji}</span>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedGroup(group);
                      setAssignCreatorsDialogOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedGroup(group);
                      setEditGroupDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteGroupMutation.mutate(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{groupCreators.length} creators assigned</span>
              </div>
              {groupCreators.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {groupCreators.slice(0, 3).map((creator: Creator) => (
                      <Badge key={creator.id} variant="secondary" className="text-xs">
                        {creator.displayName}
                      </Badge>
                    ))}
                    {groupCreators.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{groupCreators.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content Type Group</DialogTitle>
            <DialogDescription>
              Update the group details
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <form onSubmit={handleUpdateGroup}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-emoji">Emoji</Label>
                  <Input
                    id="edit-emoji"
                    name="emoji"
                    defaultValue={selectedGroup.emoji}
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedGroup.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={selectedGroup.description}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateGroupMutation.isPending}>
                  {updateGroupMutation.isPending ? "Updating..." : "Update Group"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Creators Dialog */}
      <Dialog open={assignCreatorsDialogOpen} onOpenChange={setAssignCreatorsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Creators to Group</DialogTitle>
            <DialogDescription>
              Select creators to add to "{selectedGroup?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {creators.map((creator: Creator) => (
                <div key={creator.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <Checkbox
                    id={`creator-${creator.id}`}
                    checked={selectedCreators.includes(creator.id)}
                    onCheckedChange={() => toggleCreatorSelection(creator.id)}
                  />
                  <div className="flex items-center space-x-2">
                    {creator.profileImageUrl && (
                      <img
                        src={creator.profileImageUrl}
                        alt={creator.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{creator.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{creator.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedCreators.length} creators selected
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssignCreatorsDialogOpen(false);
                  setSelectedCreators([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignCreators}
                disabled={selectedCreators.length === 0 || assignCreatorsMutation.isPending}
              >
                {assignCreatorsMutation.isPending ? "Assigning..." : "Assign Creators"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}