import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Shield, Users, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
});

const permissionSchema = z.object({
  canView: z.boolean(),
  canEdit: z.boolean(),
  canAssign: z.boolean(),
  dataScope: z.enum(["self", "subordinates", "all"]),
});

interface Role {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Page {
  id: number;
  name: string;
  route: string;
  departmentId?: number;
}

interface Department {
  id: number;
  name: string;
  description?: string;
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

export default function RoleManagement() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
  });

  // Fetch pages
  const { data: pages = [] } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
  });

  // Fetch departments
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Fetch role permissions when role is selected
  const { data: rolePermissions = [] } = useQuery<RolePermission[]>({
    queryKey: ["/api/roles", selectedRole?.id, "permissions"],
    enabled: !!selectedRole,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof roleSchema>) => {
      const response = await apiRequest("POST", "/api/roles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Role created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create role", description: error.message, variant: "destructive" });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof roleSchema>> }) => {
      const response = await apiRequest("PUT", `/api/roles/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      toast({ title: "Role updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete role", description: error.message, variant: "destructive" });
    },
  });

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: number; permissions: any[] }) => {
      await apiRequest("PUT", `/api/roles/${roleId}/permissions`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles", selectedRole?.id, "permissions"] });
      setIsPermissionsDialogOpen(false);
      toast({ title: "Permissions updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update permissions", description: error.message, variant: "destructive" });
    },
  });

  const createForm = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "" },
  });

  const editForm = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "" },
  });

  const handleCreateRole = (data: z.infer<typeof roleSchema>) => {
    createRoleMutation.mutate(data);
  };

  const handleUpdateRole = (data: z.infer<typeof roleSchema>) => {
    if (selectedRole) {
      updateRoleMutation.mutate({ id: selectedRole.id, data });
    }
  };

  const handleDeleteRole = (id: number) => {
    if (confirm("Are you sure you want to delete this role? This action cannot be undone.")) {
      deleteRoleMutation.mutate(id);
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    editForm.reset({ name: role.name, description: role.description || "" });
    setIsEditDialogOpen(true);
  };

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setIsPermissionsDialogOpen(true);
  };

  // Group pages by department
  const pagesByDepartment = pages.reduce((acc, page) => {
    const deptId = page.departmentId || 0;
    if (!acc[deptId]) {
      acc[deptId] = [];
    }
    acc[deptId].push(page);
    return acc;
  }, {} as Record<number, Page[]>);

  const getPermissionForPage = (pageId: number) => {
    return rolePermissions.find(p => p.pageId === pageId);
  };

  const updatePagePermission = (pageId: number, updates: Partial<RolePermission>) => {
    if (!selectedRole) return;
    
    const existingPerms = rolePermissions.filter(p => p.pageId !== pageId);
    const updatedPerm = {
      roleId: selectedRole.id,
      pageId,
      canView: false,
      canEdit: false,
      canAssign: false,
      dataScope: "self",
      ...getPermissionForPage(pageId),
      ...updates,
    };
    
    const newPermissions = [...existingPerms, updatedPerm];
    updatePermissionsMutation.mutate({ roleId: selectedRole.id, permissions: newPermissions });
  };

  if (rolesLoading) {
    return <div className="p-6">Loading roles...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Create a new role with specific permissions
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateRole)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter role name" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter role description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRoleMutation.isPending}>
                    {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            System Roles
          </CardTitle>
          <CardDescription>
            Manage roles and their associated permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role: Role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>
                    <Badge variant={role.isActive ? "default" : "secondary"}>
                      {role.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(role.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManagePermissions(role)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role information
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateRole)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter role description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Permissions Management Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto scale-[0.7] origin-center">
          <DialogHeader>
            <DialogTitle>Manage Permissions - {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Set page-level permissions for this role
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {Object.entries(pagesByDepartment).map(([deptId, deptPages]) => {
              const department = departments.find(d => d.id === parseInt(deptId)) || { name: "Unassigned", id: 0 };
              
              return (
                <Card key={deptId}>
                  <CardHeader>
                    <CardTitle className="text-lg">{department.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {deptPages.map((page) => {
                        const permission = getPermissionForPage(page.id);
                        
                        return (
                          <div key={page.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">{page.name}</h4>
                              <p className="text-sm text-muted-foreground">{page.route}</p>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={permission?.canView || false}
                                  onCheckedChange={(checked) => 
                                    updatePagePermission(page.id, { canView: !!checked })
                                  }
                                />
                                <label className="text-sm">View</label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={permission?.canEdit || false}
                                  onCheckedChange={(checked) => 
                                    updatePagePermission(page.id, { canEdit: !!checked })
                                  }
                                />
                                <label className="text-sm">Edit</label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={permission?.canAssign || false}
                                  onCheckedChange={(checked) => 
                                    updatePagePermission(page.id, { canAssign: !!checked })
                                  }
                                />
                                <label className="text-sm">Assign</label>
                              </div>
                              
                              <Select
                                value={permission?.dataScope || "self"}
                                onValueChange={(value) => 
                                  updatePagePermission(page.id, { dataScope: value })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="self">Self</SelectItem>
                                  <SelectItem value="subordinates">Team</SelectItem>
                                  <SelectItem value="all">All</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setIsPermissionsDialogOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}