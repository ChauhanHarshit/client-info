import React, { useState, useEffect, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash, Users, Shield, Building, UserPlus, Search, Filter, Loader2, Save, Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CenteredSectionLoader } from "@/components/ui/loading-animation";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  teamId?: number;
  massAccess: boolean;
  createdAt: Date;
}

interface Page {
  id: number;
  route: string;
  name: string;
  description?: string;
}

interface UserPermissions {
  pages: Page[];
  massAccess: boolean;
}

interface Role {
  id: number;
  name: string; 
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RolePermission {
  id: number;
  roleId: number;
  pageId: number;
  canView: boolean;
  canEdit: boolean;
  canAssign: boolean;
  dataScope: string;
}

interface Team {
  id: number;
  name: string;
  color: string;
  description?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Employee Management with direct database synchronization

export default function EmployeeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("employees");
  
  // State for UI interactions - removed complex global tracking
  
  // Instant UI feedback states
  const [actionStates, setActionStates] = useState({
    inviting: false,
    updating: false,
    deleting: null as string | null,
    editing: null as string | null,
    testing: false,
    refreshing: false,
    tabSwitching: false,
  });
  
  // State for dialogs and forms
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editEmployeeDialogOpen, setEditEmployeeDialogOpen] = useState(false);
  const [deleteEmployeeDialogOpen, setDeleteEmployeeDialogOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<User | null>(null);
  const [selectedEmployeeForDelete, setSelectedEmployeeForDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamForDelete, setSelectedTeamForDelete] = useState<Team | null>(null);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<any | null>(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    role: "",
    teamId: "all",
    massAccess: false,
    password: ""
  });

  const [editForm, setEditForm] = useState({
    email: "",
    name: "",
    role: "",
    teamId: "all",
    massAccess: false,
    password: ""
  });

  // Initial form values for unsaved changes detection
  const initialInviteForm = {
    email: "",
    name: "",
    role: "",
    teamId: "all",
    massAccess: false,
    password: ""
  };

  // Unsaved changes detection for invite dialog
  const inviteUnsavedChanges = useUnsavedChanges({
    isOpen: inviteDialogOpen,
    onClose: () => {
      setInviteDialogOpen(false);
      setInviteForm(initialInviteForm);
    },
    watchFields: inviteForm,
    disabled: false
  });

  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    teamId: "none"
  });

  const [editRoleForm, setEditRoleForm] = useState({
    name: "",
    description: "",
    teamId: "none"
  });

  const [editSelectedPages, setEditSelectedPages] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [selectedRoleForDelete, setSelectedRoleForDelete] = useState<any | null>(null);
  const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false);
  const [pageSearchQuery, setPageSearchQuery] = useState("");
  
  const [teamForm, setTeamForm] = useState({
    name: "",
    color: "#3b82f6",
    description: "",
    displayOrder: 1
  });

  // Direct team creation without React Query caching
  const createTeamDirectly = async (data: typeof teamForm) => {
    setActionStates(prev => ({ ...prev, inviting: true }));
    
    try {
      console.log('🚀 Creating team directly:', data);
      
      // Make direct API call
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Creation failed' }));
        throw new Error(errorData.message || `Failed to create team: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Team created successfully:', result);
      
      // Immediately update the teams cache with new team
      queryClient.setQueryData([teamsCacheKey], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        
        // Create new team object matching the expected structure
        const newTeam = {
          id: result.id || Date.now(),
          name: data.name,
          color: data.color,
          description: data.description || "",
          displayOrder: data.displayOrder || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const updatedData = [newTeam, ...oldData];
        console.log(`✅ Added team to cache. Count: ${oldData.length} → ${updatedData.length}`);
        return updatedData;
      });
      
      // Reset form and close dialog
      setIsCreateTeamDialogOpen(false);
      setTeamForm({
        name: "",
        color: "#3b82f6",
        description: "",
        displayOrder: 1
      });
      
      toast({
        title: "Team Created",
        description: `Team "${data.name}" has been successfully created and appears instantly in the table.`
      });
      
    } catch (error: any) {
      console.error('❌ Direct team creation failed:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create team. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionStates(prev => ({ ...prev, inviting: false }));
    }
  };

  // Team form handlers
  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Team name is required.",
        variant: "destructive",
      });
      return;
    }

    createTeamDirectly(teamForm);
  };



  // Edit Team handlers
  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setTeamForm({
      name: team.name,
      color: team.color,
      description: team.description || "",
      displayOrder: team.displayOrder || 1
    });
    setIsEditTeamDialogOpen(true);
  };

  const handleEditTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Team name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTeam) {
      toast({
        title: "Error",
        description: "No team selected for editing.",
        variant: "destructive",
      });
      return;
    }

    // Note: Edit functionality can be implemented later if needed
    toast({
      title: "Feature Not Implemented",
      description: "Team editing will be implemented in a future update.",
      variant: "destructive",
    });
  };

  // Direct team deletion without React Query caching
  const deleteTeamDirectly = async (teamId: number) => {
    if (!selectedTeamForDelete) return;
    
    setActionStates(prev => ({ ...prev, deleting: teamId.toString() }));
    
    try {
      console.log('🗑️ Deleting team directly:', teamId);
      
      // Make direct API call
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Deletion failed' }));
        throw new Error(errorData.message || `Failed to delete team: ${response.status}`);
      }
      
      console.log('✅ Team deleted successfully from database');
      
      // Immediately remove from teams cache
      queryClient.setQueryData([teamsCacheKey], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        
        const filteredData = oldData.filter((team: Team) => team.id !== teamId);
        console.log(`✅ Removed team from cache. Count: ${oldData.length} → ${filteredData.length}`);
        return filteredData;
      });
      
      // Close dialog and reset state
      setIsDeleteTeamDialogOpen(false);
      setSelectedTeamForDelete(null);
      
      toast({
        title: "Team Deleted",
        description: `Team "${selectedTeamForDelete.name}" has been successfully deleted and removed instantly from all lists.`
      });
      
    } catch (error: any) {
      console.error('❌ Direct team deletion failed:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete team. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionStates(prev => ({ ...prev, deleting: null }));
    }
  };

  // Delete Team handlers
  const handleDeleteTeam = (team: Team) => {
    setSelectedTeamForDelete(team);
    setIsDeleteTeamDialogOpen(true);
  };

  const handleConfirmDeleteTeam = () => {
    if (!selectedTeamForDelete) {
      toast({
        title: "Error",
        description: "No team selected for deletion.",
        variant: "destructive",
      });
      return;
    }

    deleteTeamDirectly(selectedTeamForDelete.id);
  };

  // Generate a unique cache buster for each page load to prevent stale data
  const [cacheKey] = useState(() => `users_${Date.now()}_${Math.random()}`);

  // Data queries with complete cache bypass to prevent any stale data issues
  const { data: users, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: [cacheKey], // Unique key ensures no cache collision
    queryFn: async () => {
      console.log('🔄 Fetching users with cache bypass - key:', cacheKey);
      
      // Force a fresh request with no caching whatsoever
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/users${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      const arrayData = Array.isArray(data) ? data : [];
      console.log(`✅ Fresh user data from database (${arrayData.length} users):`, arrayData.map(u => `${u.email} (${u.id})`));
      
      return arrayData;
    },
    // Completely disable all caching mechanisms
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 1
  });

  // Debug logging
  console.log('Employee Management - Users data:', users);
  console.log('Employee Management - Users loading:', usersLoading);
  console.log('Employee Management - Users error:', usersError);

  // Roles query with complete cache bypass
  const [rolesCacheKey] = useState(() => `roles_${Date.now()}_${Math.random()}`);
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: [rolesCacheKey],
    queryFn: async () => {
      console.log('🔄 Fetching roles with cache bypass - key:', rolesCacheKey);
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/roles${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      
      const data = await response.json();
      const arrayData = Array.isArray(data) ? data : [];
      console.log(`✅ Fresh roles data from database (${arrayData.length} roles):`, arrayData.map(r => `${r.name} (${r.id})`));
      
      return arrayData;
    },
    // Disable all caching to ensure fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false
  });

  // Pages query with complete cache bypass
  const [pagesCacheKey] = useState(() => `pages_${Date.now()}_${Math.random()}`);
  const { data: pages } = useQuery({
    queryKey: [pagesCacheKey],
    queryFn: async () => {
      console.log('🔄 Fetching pages with cache bypass - key:', pagesCacheKey);
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/pages${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }
      
      const pagesData = await response.json();
      console.log('✅ Fresh pages data from database:', pagesData);
      return pagesData;
    },
    // Disable all caching to ensure fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false
  });

  // Direct employee creation without React Query caching
  const createEmployeeDirectly = async (data: { email: string; name: string; role: string; teamId?: string; massAccess: boolean; password?: string }) => {
    setActionStates(prev => ({ ...prev, inviting: true }));
    
    try {
      console.log('🚀 Creating employee directly:', data);
      
      // Make direct API call
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Creation failed' }));
        throw new Error(errorData.message || `Failed to create employee: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Employee created successfully:', result);
      
      // Immediately update the users cache with new employee
      queryClient.setQueryData([cacheKey], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        
        // Create new employee object matching the expected structure
        const newEmployee = {
          id: result.id || result.user?.id || Date.now().toString(),
          email: data.email,
          username: data.email,
          role: data.role,
          isActive: true,
          massAccess: data.massAccess || false,
          teamId: data.teamId && data.teamId !== "all" ? parseInt(data.teamId) : null,
          createdAt: new Date().toISOString()
        };
        
        const updatedData = [newEmployee, ...oldData];
        console.log(`✅ Added employee to cache. Count: ${oldData.length} → ${updatedData.length}`);
        return updatedData;
      });
      
      // Reset form and close dialog
      setInviteForm({ email: "", name: "", role: "", teamId: "all", massAccess: false, password: "" });
      setInviteDialogOpen(false);
      setActionStates(prev => ({ ...prev, inviting: false }));
      
      toast({
        title: "Employee Created",
        description: "Employee account has been created successfully and appears in the list",
      });
      
    } catch (error: any) {
      setActionStates(prev => ({ ...prev, inviting: false }));
      console.error('❌ Employee creation failed:', error);
      
      let errorMessage = "Failed to create employee";
      
      if (error?.message) {
        if (error.message.includes("User with this email already exists")) {
          errorMessage = "A user with this email address already exists. Please use a different email address.";
        } else if (error.message.includes("400:")) {
          const match = error.message.match(/400:\s*({.*})/);
          if (match) {
            try {
              const errorObj = JSON.parse(match[1]);
              errorMessage = errorObj.message || errorMessage;
            } catch (e) {
              errorMessage = error.message.replace("400: ", "");
            }
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Keep the old mutation for compatibility but replace its usage
  const inviteUserMutation = {
    isPending: actionStates.inviting,
    mutate: createEmployeeDirectly
  };

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      setActionStates(prev => ({ ...prev, updating: true }));
      const response = await apiRequest('PUT', `/api/users/${data.id}`, data.updates);
      return response.json();
    },
    onSuccess: async () => {
      setActionStates(prev => ({ ...prev, updating: false }));
      
      // Aggressive cache invalidation
      await queryClient.invalidateQueries({ queryKey: [cacheKey] });
      await queryClient.refetchQueries({ queryKey: [cacheKey] });
      
      setEditForm({ email: "", name: "", role: "", teamId: "all", massAccess: false, password: "" });
      setEditEmployeeDialogOpen(false);
      setSelectedEmployeeForEdit(null);
      toast({
        title: "Employee Updated",
        description: "Employee information has been updated successfully",
      });
    },
    onError: (error: any) => {
      setActionStates(prev => ({ ...prev, updating: false }));
      const errorMessage = error?.message || "Failed to update employee";
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Direct employee deletion with database sync
  const deleteEmployeeDirectly = async (employeeId: string) => {
    setActionStates(prev => ({ ...prev, deleting: employeeId }));
    
    try {
      console.log('🗑️ Attempting to delete employee:', employeeId);
      
      // Make direct API call first
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to delete employee: ${response.status}`);
      }
      
      console.log('✅ Employee deleted successfully from database:', result);
      
      // Immediately update cache by removing the deleted employee
      queryClient.setQueryData([cacheKey], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        const filtered = oldData.filter((user: any) => user.id !== employeeId);
        console.log(`✅ Updated cache: ${oldData.length} → ${filtered.length} users`);
        return filtered;
      });
      
      // Reset states and close dialog
      setActionStates(prev => ({ ...prev, deleting: null }));
      setSelectedEmployeeForDelete(null);
      setDeleteEmployeeDialogOpen(false);
      
      toast({
        title: "Employee Deleted",
        description: `Employee has been permanently removed from the database and list`,
      });
      
    } catch (error: any) {
      console.error('❌ Employee deletion failed:', error);
      setActionStates(prev => ({ ...prev, deleting: null }));
      
      const errorMessage = error?.message || "Failed to delete employee";
      
      toast({
        title: "Delete Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Keep the old mutation for compatibility but replace its usage
  const deleteEmployeeMutation = {
    isPending: (employeeId: string) => actionStates.deleting === employeeId,
    mutate: deleteEmployeeDirectly
  };

  // Direct role creation with database sync - matching employee creation pattern
  const createRoleDirectly = async (roleData: { name: string; description: string; teamId: string; selectedPages: number[] }) => {
    try {
      console.log('🚀 Creating role directly:', roleData);
      
      // Make direct API call
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(roleData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Creation failed' }));
        throw new Error(errorData.message || `Failed to create role: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Role created successfully:', result);
      
      // Immediately update the roles cache with new role
      queryClient.setQueryData([rolesCacheKey], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        
        // Create new role object matching the expected structure
        const newRole = {
          id: result.id || Date.now(),
          name: roleData.name,
          description: roleData.description,
          memberCount: 0,
          teamId: roleData.teamId === "none" ? null : roleData.teamId,
          pagePermissions: roleData.selectedPages || [],
          createdAt: new Date().toISOString()
        };
        
        const updatedData = [newRole, ...oldData];
        console.log(`✅ Added role to cache. Count: ${oldData.length} → ${updatedData.length}`);
        return updatedData;
      });
      
      // Reset form and close dialog
      setRoleForm({ name: "", description: "", teamId: "none" });
      setSelectedPages([]);
      setIsCreateRoleDialogOpen(false);
      
      toast({
        title: "Role Created",
        description: "Role has been created successfully and appears in the list",
      });
      
    } catch (error: any) {
      console.error('❌ Role creation failed:', error);
      
      const errorMessage = error?.message || "Failed to create role";
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Create Role mutation - updated to use direct approach
  const createRoleMutation = useMutation({
    mutationFn: createRoleDirectly,
    onSuccess: () => {
      // Success is already handled in createRoleDirectly
      console.log('✅ Role creation mutation completed');
    },
    onError: (error: any) => {
      console.error('❌ Role creation mutation error:', error);
    },
  });

  // Handle create role form submission
  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roleForm.name.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }
    
    // Use direct creation for instant UI updates
    createRoleDirectly({
      name: roleForm.name.trim(),
      description: roleForm.description.trim(),
      teamId: roleForm.teamId,
      selectedPages: selectedPages
    });
  };

  // Edit Role mutation
  const editRoleMutation = useMutation({
    mutationFn: async (roleData: { id: number; name: string; description: string; teamId: string; selectedPages: number[] }) => {
      const response = await apiRequest("PUT", `/api/roles/${roleData.id}`, {
        name: roleData.name,
        description: roleData.description,
        teamId: roleData.teamId,
        selectedPages: roleData.selectedPages
      });
      if (!response.ok) {
        throw new Error("Failed to update role");
      }
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch roles query
      await queryClient.invalidateQueries({ queryKey: [rolesCacheKey] });
      await queryClient.refetchQueries({ queryKey: [rolesCacheKey] });
      
      // Reset form and close dialog
      setEditRoleForm({ name: "", description: "", teamId: "none" });
      setEditSelectedPages([]);
      setIsEditRoleDialogOpen(false);
      setSelectedRoleForEdit(null);
      
      toast({
        title: "Role Updated",
        description: "Role has been updated successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update role";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle edit role button click
  const handleEditRole = async (role: any) => {
    setSelectedRoleForEdit(role);
    setEditRoleForm({
      name: role.name || "",
      description: role.description || "",
      teamId: role.teamId ? String(role.teamId) : "none"
    });
    
    // Fetch current page permissions for this role
    try {
      const response = await fetch(`/api/roles/${role.id}/permissions`);
      if (response.ok) {
        const permissions = await response.json();
        const pageIds = permissions.map((p: any) => p.page_id);
        setEditSelectedPages(pageIds);
      } else {
        // If endpoint doesn't exist, try to get permissions from role data
        setEditSelectedPages(role.pagePermissions || []);
      }
    } catch (error) {
      console.log('Could not fetch role permissions, using default:', error);
      setEditSelectedPages(role.pagePermissions || []);
    }
    
    setIsEditRoleDialogOpen(true);
  };

  // Handle edit role form submission
  const handleEditRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRoleForEdit || !editRoleForm.name.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }
    
    editRoleMutation.mutate({
      id: selectedRoleForEdit.id,
      name: editRoleForm.name.trim(),
      description: editRoleForm.description.trim(),
      teamId: editRoleForm.teamId,
      selectedPages: editSelectedPages
    });
  };

  // Direct role deletion with database sync - matching employee deletion pattern
  const deleteRoleDirectly = async (roleId: number) => {
    try {
      console.log('🗑️ Attempting to delete role:', roleId);
      
      // Make direct API call first
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to delete role: ${response.status}`);
      }
      
      console.log('✅ Role deleted successfully from database:', result);
      
      // Immediately update cache by removing the deleted role
      queryClient.setQueryData([rolesCacheKey], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        const filtered = oldData.filter((role: any) => role.id !== roleId);
        console.log(`✅ Updated roles cache: ${oldData.length} → ${filtered.length} roles`);
        return filtered;
      });
      
      // Close dialogs and reset state
      setIsDeleteRoleDialogOpen(false);
      setSelectedRoleForDelete(null);
      
      toast({
        title: "Role Deleted",
        description: "Role has been permanently removed from the database and all dropdowns",
      });
      
    } catch (error: any) {
      console.error('❌ Role deletion failed:', error);
      
      const errorMessage = error?.message || "Failed to delete role";
      
      toast({
        title: "Delete Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Delete Role mutation - updated to use direct approach
  const deleteRoleMutation = useMutation({
    mutationFn: deleteRoleDirectly,
    onSuccess: () => {
      // Success is already handled in deleteRoleDirectly
      console.log('✅ Role deletion mutation completed');
    },
    onError: (error: any) => {
      console.error('❌ Role deletion mutation error:', error);
      const errorMessage = error?.message || "Failed to delete role";
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle delete role button click
  const handleDeleteRole = (role: any) => {
    setSelectedRoleForDelete(role);
    setIsDeleteRoleDialogOpen(true);
  };

  // Handle delete role confirmation
  const handleConfirmDeleteRole = () => {
    if (selectedRoleForDelete) {
      deleteRoleMutation.mutate(selectedRoleForDelete.id);
    }
  };

  // Handle invite form submission with direct creation
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email || !inviteForm.name || !inviteForm.role) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Convert "all" teamId to undefined for API call
    const formData = {
      ...inviteForm,
      teamId: inviteForm.teamId === "all" ? undefined : inviteForm.teamId
    };
    
    // Use direct creation for instant UI updates
    createEmployeeDirectly(formData);
  };

  // Handle edit employee functionality
  const handleEditEmployee = (user: User) => {
    setSelectedEmployeeForEdit(user);
    setEditForm({
      email: user.email || "",
      name: user.username || "",
      role: user.role || "",
      teamId: user.teamId ? String(user.teamId) : "all",
      massAccess: user.massAccess || false,
      password: "" // Keep password empty for editing
    });
    setEditEmployeeDialogOpen(true);
  }

  const handleDeleteEmployee = (user: User) => {
    setSelectedEmployeeForDelete(user);
    setDeleteEmployeeDialogOpen(true);
  }

  const handleConfirmDelete = () => {
    if (!selectedEmployeeForDelete) return;
    
    const deletedEmployeeId = selectedEmployeeForDelete.id;
    const deletedEmployeeEmail = selectedEmployeeForDelete.email;
    
    console.log(`Deleting employee: ${deletedEmployeeEmail} (${deletedEmployeeId})`);
    
    // Use direct deletion for instant UI updates
    deleteEmployeeDirectly(deletedEmployeeId);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployeeForEdit) return;
    
    // Instant UI feedback
    setActionStates(prev => ({ ...prev, updating: true }));
    
    setTimeout(() => {
      if (!editForm.email || !editForm.name || !editForm.role) {
        setActionStates(prev => ({ ...prev, updating: false }));
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      
      // Prepare update data
      const updateData = {
        email: editForm.email,
        username: editForm.name,
        role: editForm.role,
        teamId: editForm.teamId === "all" ? null : editForm.teamId,
        massAccess: editForm.massAccess,
        ...(editForm.password && { password: editForm.password }) // Only include password if provided
      };
      
      updateEmployeeMutation.mutate({
        id: selectedEmployeeForEdit.id,
        updates: updateData
      });
    }, 0);
  };

  // Teams query with complete cache bypass
  const [teamsCacheKey] = useState(() => `teams_${Date.now()}_${Math.random()}`);
  const { data: teams, isLoading: teamsLoading, error: teamsError } = useQuery({
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
    refetchOnReconnect: false
  });

  // Debug teams data
  console.log("Teams debug:", { 
    teams, 
    teamsLoading, 
    teamsError,
    hasTeams: !!teams,
    teamsLength: Array.isArray(teams) ? teams.length : 'not array',
    teamsData: teams 
  });



  // Additional pages query for role management with cache bypass
  const [pagesDataCacheKey] = useState(() => `pagesData_${Date.now()}_${Math.random()}`);
  const { data: pagesData, isLoading: pagesLoading, error: pagesError, refetch: refetchPages } = useQuery({
    queryKey: [pagesDataCacheKey],
    queryFn: async () => {
      console.log('🔄 Fetching pages data with cache bypass - key:', pagesDataCacheKey);
      const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(`/api/pages${cacheBuster}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch pages data');
      }
      const data = await response.json();
      console.log('✅ Fresh pages data for roles from database:', data);
      return data;
    },
    // Disable all caching to ensure fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false
  });

  // Debug pages data
  console.log("Pages debug:", { 
    pagesData, 
    pagesLoading, 
    pagesError,
    hasPages: !!pagesData,
    pagesCount: pagesData?.pages?.length || 0 
  });

  // Filter users based on search only - no cache filtering needed
  const filteredUsers = Array.isArray(users) ? users
    .filter((user: User) => 
      (user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Management"
        description="Manage team members, roles, and permissions"
        showBackButton={true}
        useBrowserBack={true}
        actions={
          <Button onClick={() => setInviteDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        }
      />

      <div className="px-6 pb-6 space-y-6">
        <div className="space-y-6">
          <div className="grid w-full grid-cols-3 h-12 p-1 bg-muted rounded-lg">
            <button
              onClick={() => {
                setActionStates(prev => ({ ...prev, tabSwitching: true }));
                startTransition(() => {
                  setActiveTab("employees");
                  setTimeout(() => setActionStates(prev => ({ ...prev, tabSwitching: false })), 100);
                });
              }}
              disabled={actionStates.tabSwitching}
              className={`flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "employees" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              } ${actionStates.tabSwitching ? "opacity-50" : ""}`}
            >
              <Users className="w-4 h-4" />
              Employees
            </button>
            <button
              onClick={() => {
                setActionStates(prev => ({ ...prev, tabSwitching: true }));
                startTransition(() => {
                  setActiveTab("roles");
                  setTimeout(() => setActionStates(prev => ({ ...prev, tabSwitching: false })), 100);
                });
              }}
              disabled={actionStates.tabSwitching}
              className={`flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "roles" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              } ${actionStates.tabSwitching ? "opacity-50" : ""}`}
            >
              <Shield className="w-4 h-4" />
              Roles
            </button>
            <button
              onClick={() => {
                setActionStates(prev => ({ ...prev, tabSwitching: true }));
                startTransition(() => {
                  setActiveTab("teams");
                  setTimeout(() => setActionStates(prev => ({ ...prev, tabSwitching: false })), 100);
                });
              }}
              disabled={actionStates.tabSwitching}
              className={`flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "teams" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              } ${actionStates.tabSwitching ? "opacity-50" : ""}`}
            >
              <Users className="w-4 h-4" />
              Teams
            </button>
          </div>

          {activeTab === "employees" && (
            <div>
            {usersLoading ? (
              <CenteredSectionLoader />
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mass Access</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersError ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-red-500">
                          Error loading users: {usersError.message || 'Authentication required. Please log in first.'}
                          <br />
                          <span className="text-sm text-muted-foreground">Go to /login to authenticate</span>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No employees found. Invite your first team member to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{user.username}</span>
                              <span className="text-sm text-muted-foreground">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">Team {user.teamId || "None"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.massAccess ? "default" : "outline"}>
                              {user.massAccess ? "Full Access" : "Limited"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleEditEmployee(user)}
                                disabled={actionStates.updating}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleDeleteEmployee(user)}
                                disabled={actionStates.deleting === user.id}
                              >
                                {actionStates.deleting === user.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            </div>
          )}

          {activeTab === "roles" && (
            <div>
            {rolesLoading ? (
              <CenteredSectionLoader />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Roles</h3>
                    <p className="text-sm text-muted-foreground">Define roles and permissions for team members</p>
                  </div>
                  <Button onClick={() => setIsCreateRoleDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Role
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Team Assignment</TableHead>
                      <TableHead>Page Permissions</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!Array.isArray(roles) || roles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No roles found. Create your first role to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      roles.map((role: any) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {role.description || "No description"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {role.teamName || (role.teamId ? `Team ${role.teamId}` : "All Teams")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {role.pageNames && role.pageNames.length > 0 ? (
                                role.pageNames.slice(0, 2).map((pageName: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {pageName}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-xs">No pages</Badge>
                              )}
                              {role.pageNames && role.pageNames.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{role.pageNames.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">0 members</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(role.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditRole(role)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeleteRole(role)}
                              >
                                <Trash className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            </div>
          )}

          {activeTab === "teams" && (
            <div>
            {teamsLoading ? (
              <CenteredSectionLoader />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Teams</h3>
                    <p className="text-sm text-muted-foreground">Manage team structure and permissions</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setIsCreateTeamDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Team
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg bg-white">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Teams</h3>
                      <Badge variant="secondary">{teams?.length || 0} teams</Badge>
                    </div>
                    
                    {/* ABSOLUTE POSITIONED SCROLLABLE CONTAINER */}
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
                            width: '1600px',
                            minWidth: '1600px',
                            height: 'auto'
                          }}
                        >
                          <table 
                            style={{
                              width: '100%',
                              tableLayout: 'fixed',
                              borderCollapse: 'collapse'
                            }}
                          >
                            <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0, zIndex: 2 }}>
                              <tr>
                                <th style={{ width: '300px', padding: '12px 16px', textAlign: 'left', fontWeight: '500', whiteSpace: 'nowrap' }}>Team Name</th>
                                <th style={{ width: '200px', padding: '12px 16px', textAlign: 'left', fontWeight: '500', whiteSpace: 'nowrap' }}>Color</th>

                                <th style={{ width: '200px', padding: '12px 16px', textAlign: 'left', fontWeight: '500', whiteSpace: 'nowrap' }}>Description</th>
                                <th style={{ width: '150px', padding: '12px 16px', textAlign: 'left', fontWeight: '500', whiteSpace: 'nowrap' }}>Members</th>
                                <th style={{ width: '300px', padding: '12px 16px', textAlign: 'left', fontWeight: '500', whiteSpace: 'nowrap' }}>Pages Access</th>
                                <th style={{ width: '300px', padding: '12px 16px', textAlign: 'left', fontWeight: '500', whiteSpace: 'nowrap' }}>Actions & Settings</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!teams || !Array.isArray(teams) || teams.length === 0 ? (
                                <tr>
                                  <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280' }}>
                                    No teams found. Create your first team to get started.
                                  </td>
                                </tr>
                              ) : (
                                teams.map((team: Team) => 
                                  team?.id ? (
                                    <tr key={team.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                      <td style={{ width: '300px', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                          <div 
                                            style={{ 
                                              width: '20px', 
                                              height: '20px', 
                                              borderRadius: '4px', 
                                              backgroundColor: team.color,
                                              flexShrink: 0
                                            }} 
                                          />
                                          <span style={{ fontWeight: '500', fontSize: '14px' }}>{team.name}</span>
                                        </div>
                                      </td>
                                      <td style={{ width: '200px', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                        <span style={{ 
                                          fontSize: '12px', 
                                          fontFamily: 'monospace', 
                                          backgroundColor: '#f3f4f6', 
                                          padding: '2px 6px', 
                                          borderRadius: '4px' 
                                        }}>
                                          {team.color}
                                        </span>
                                      </td>

                                      <td style={{ width: '200px', padding: '12px 16px' }}>
                                        <div style={{ 
                                          fontSize: '13px', 
                                          color: '#6b7280',
                                          maxWidth: '180px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {team.description || 'No description'}
                                        </div>
                                      </td>
                                      <td style={{ width: '150px', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                        <span style={{ 
                                          fontSize: '12px', 
                                          backgroundColor: '#f3f4f6', 
                                          padding: '2px 8px', 
                                          borderRadius: '12px',
                                          color: '#6b7280'
                                        }}>
                                          0 members
                                        </span>
                                      </td>
                                      <td style={{ width: '300px', padding: '12px 16px' }}>
                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                          No pages assigned
                                        </span>
                                      </td>
                                      <td style={{ width: '300px', padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          <button 
                                            onClick={() => handleEditTeam(team)}
                                            style={{ 
                                              padding: '4px 8px', 
                                              fontSize: '11px', 
                                              border: '1px solid #e5e7eb', 
                                              borderRadius: '4px', 
                                              backgroundColor: 'white',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            Edit
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteTeam(team)}
                                            style={{ 
                                              padding: '4px 8px', 
                                              fontSize: '11px', 
                                              border: '1px solid #e5e7eb', 
                                              borderRadius: '4px', 
                                              backgroundColor: 'white',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : null
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
      
      {/* Invite Employee Dialog */}
      <Dialog open={inviteDialogOpen} {...inviteUnsavedChanges.getDialogProps()}>
        <DialogContent 
          className="max-w-md"
          onPointerDownOutside={(e) => {
            e.preventDefault();
            inviteUnsavedChanges.handleClose();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            inviteUnsavedChanges.handleClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account with login credentials
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Set Password for Employee</Label>
              <Input
                id="password"
                type="password"
                value={inviteForm.password || ""}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                placeholder="Enter password for this employee"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be the employee's login password. They can change it later.
              </p>
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(roles) && roles.length > 0 ? (
                    roles.map((role: Role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No roles available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="massAccess"
                checked={inviteForm.massAccess}
                onCheckedChange={(checked) => setInviteForm({ ...inviteForm, massAccess: checked })}
              />
              <Label htmlFor="massAccess" className="text-sm">
                Grant full CRM access
              </Label>
            </div>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => inviteUnsavedChanges.handleClose()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteUserMutation.isPending || actionStates.inviting}
                className="flex-1"
              >
                {(inviteUserMutation.isPending || actionStates.inviting) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Employee
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editEmployeeDialogOpen} onOpenChange={setEditEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information. Changes will reflect immediately in the system and login credentials.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address (Login ID) *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="employee@company.com"
                  required
                  disabled={actionStates.updating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  disabled={actionStates.updating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (Leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Enter new password"
                disabled={actionStates.updating}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role *</Label>
                <Select 
                  value={editForm.role} 
                  onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                  disabled={actionStates.updating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(roles) && roles.length > 0 ? (
                      roles.map((role: Role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No roles available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-team">Team</Label>
                <Select 
                  value={editForm.teamId} 
                  onValueChange={(value) => setEditForm({ ...editForm, teamId: value })}
                  disabled={actionStates.updating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">No Team</SelectItem>
                    {Array.isArray(teams) && teams.map((team: Team) => 
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit-mass-access"
                checked={editForm.massAccess}
                onCheckedChange={(checked) => setEditForm({ ...editForm, massAccess: checked === true })}
                disabled={actionStates.updating}
              />
              <Label htmlFor="edit-mass-access">Grant full CRM access</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditEmployeeDialogOpen(false)}
                disabled={actionStates.updating}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={actionStates.updating}
              >
                {actionStates.updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Employee
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog for Invite Form */}
      <UnsavedChangesDialog
        open={inviteUnsavedChanges.showDiscardDialog}
        onConfirmDiscard={inviteUnsavedChanges.handleConfirmDiscard}
        onCancel={inviteUnsavedChanges.handleCancelDiscard}
      />

      {/* Delete Employee Confirmation Dialog */}
      <AlertDialog open={deleteEmployeeDialogOpen} onOpenChange={setDeleteEmployeeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEmployeeForDelete?.username}? This action will:
              <br />
              • Remove the employee from the system
              <br />
              • Disable their login access
              <br />
              • This action cannot be undone
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionStates.deleting !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={actionStates.deleting !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionStates.deleting !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="w-4 h-4 mr-2" />
                  Delete Employee
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Role Dialog */}
      <Dialog open={isCreateRoleDialogOpen} onOpenChange={setIsCreateRoleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a new role and assign page permissions.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateRoleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  id="roleName"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter role name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter role description (optional)"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="teamAssignment">Team Assignment</Label>
                <Select
                  value={roleForm.teamId}
                  onValueChange={(value) => setRoleForm(prev => ({ ...prev, teamId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team assignment</SelectItem>
                    {Array.isArray(teams) && teams.map((team: Team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Page Permissions</Label>
                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {pagesData?.pages?.map((page: any) => (
                    <div key={page.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`page-${page.id}`}
                        checked={selectedPages.includes(page.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPages(prev => [...prev, page.id]);
                          } else {
                            setSelectedPages(prev => prev.filter(id => id !== page.id));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`page-${page.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {page.name}
                        {page.description && (
                          <span className="text-muted-foreground ml-2">
                            - {page.description}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedPages.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No pages selected. Users with this role will have no page access.
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateRoleDialogOpen(false);
                  setRoleForm({ name: "", description: "", teamId: "none" });
                  setSelectedPages([]);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRoleMutation.isPending || !roleForm.name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createRoleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Role
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role details and page permissions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditRoleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role-name">Role Name *</Label>
                <Input
                  id="edit-role-name"
                  value={editRoleForm.name}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, name: e.target.value })}
                  placeholder="Enter role name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-role-team">Team Assignment</Label>
                <Select
                  value={editRoleForm.teamId}
                  onValueChange={(value) => setEditRoleForm({ ...editRoleForm, teamId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team assignment</SelectItem>
                    {Array.isArray(teams) && teams.map((team: Team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role-description">Description</Label>
              <Textarea
                id="edit-role-description"
                value={editRoleForm.description}
                onChange={(e) => setEditRoleForm({ ...editRoleForm, description: e.target.value })}
                placeholder="Enter role description"
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Page Permissions</Label>
                <p className="text-sm text-muted-foreground">
                  Select which pages this role can access
                </p>
              </div>
              
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {Array.isArray(pages?.pages) && pages.pages.map((page: any) => (
                    <div key={page.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-page-${page.id}`}
                        checked={editSelectedPages.includes(page.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditSelectedPages([...editSelectedPages, page.id]);
                          } else {
                            setEditSelectedPages(editSelectedPages.filter(id => id !== page.id));
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`edit-page-${page.id}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {page.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {editSelectedPages.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No pages selected. Users with this role will have no page access.
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditRoleDialogOpen(false);
                  setEditRoleForm({ name: "", description: "", teamId: "none" });
                  setEditSelectedPages([]);
                  setSelectedRoleForEdit(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editRoleMutation.isPending || !editRoleForm.name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editRoleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Role
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <AlertDialog open={isDeleteRoleDialogOpen} onOpenChange={setIsDeleteRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{selectedRoleForDelete?.name}"? This action will:
              <br />
              • Remove the role from the system
              <br />
              • Remove it from the Add Employee dropdown
              <br />
              • This action cannot be undone
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoleMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteRole}
              disabled={deleteRoleMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRoleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="w-4 h-4 mr-2" />
                  Delete Role
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Team Dialog */}
      <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team and define its properties.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateTeamSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="teamName">Team Name *</Label>
                <Input
                  id="teamName"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Content Team"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="teamColor">Team Color</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="teamColor"
                    type="color"
                    value={teamForm.color}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-20 h-10 p-1 border rounded cursor-pointer"
                  />
                  <Input
                    value={teamForm.color}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#3b82f6"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="teamDescription">Description</Label>
                <Textarea
                  id="teamDescription"
                  value={teamForm.description}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the team's purpose and responsibilities (optional)"
                  rows={3}
                />
              </div>
              

            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateTeamDialogOpen(false);
                  setTeamForm({
                    name: "",
                    color: "#3b82f6",
                    description: ""
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionStates.inviting || !teamForm.name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {actionStates.inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Team
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditTeamDialogOpen} onOpenChange={setIsEditTeamDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team information and settings.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditTeamSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTeamName">Team Name *</Label>
                <Input
                  id="editTeamName"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Content Team"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="editTeamColor">Team Color</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="editTeamColor"
                    type="color"
                    value={teamForm.color}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-20 h-10 p-1 border rounded cursor-pointer"
                  />
                  <Input
                    value={teamForm.color}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#3b82f6"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="editTeamDescription">Description</Label>
                <Textarea
                  id="editTeamDescription"
                  value={teamForm.description}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the team's purpose and responsibilities (optional)"
                  rows={3}
                />
              </div>
              

            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditTeamDialogOpen(false);
                  setSelectedTeam(null);
                  setTeamForm({
                    name: "",
                    color: "#3b82f6",
                    description: "",
                    displayOrder: 1
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionStates.updating || !teamForm.name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {actionStates.updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Team
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
      <AlertDialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the team "{selectedTeamForDelete?.name}"? This action will:
              <br />
              • Remove the team from the system
              <br />
              • Remove it from the Add Employee dropdown
              <br />
              • Set team assignments to null for affected employees
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionStates.deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteTeam}
              disabled={actionStates.deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {actionStates.deleting ? "Deleting..." : "Delete Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}