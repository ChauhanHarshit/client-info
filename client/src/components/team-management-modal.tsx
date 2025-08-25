import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Users, Settings, UserPlus, Edit, Trash2, Move, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeamSchema, type Team, type User, type Page, type Department, type Role, type InsertTeamDefaultPermission } from "@shared/schema";
import { z } from "zod";
import { TeamOrderingModal } from "./team-ordering-modal";
import { useAuth } from "@/hooks/useAuth";

const teamFormSchema = insertTeamSchema.extend({
  name: z.string().min(1, "Team name is required"),
  color: z.string().min(1, "Team color is required"),
  defaultRoleId: z.number().optional(),
});

const userInviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["assistant", "team_lead", "manager", "admin"]),
  teamId: z.number().optional(),
});

interface TeamManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamManagementModal({ open, onOpenChange }: TeamManagementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("teams");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showTeamOrderingModal, setShowTeamOrderingModal] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<{[key: number]: { canView: boolean; canEdit: boolean; canAssign: boolean; dataScope: string }}>({});
  const { user } = useAuth();

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    enabled: open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: open,
  });

  const { data: pages = [] } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
    enabled: open,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    enabled: open,
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    enabled: open,
  });

  const teamForm = useForm({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      color: "#3B82F6",
      description: "",
      googleSheetId: "",
      defaultRoleId: undefined,
    },
  });

  const inviteForm = useForm({
    resolver: zodResolver(userInviteSchema),
    defaultValues: {
      email: "",
      role: "assistant" as const,
      teamId: undefined,
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: z.infer<typeof teamFormSchema>) => {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      teamForm.reset();
      toast({
        title: "Team Created",
        description: "New team has been successfully created",
      });
    },
    onError: (error) => {
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Creation Failed",
        description: "Failed to create team",
        variant: "destructive",
      });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async (data: z.infer<typeof teamFormSchema>) => {
      const response = await fetch(`/api/teams/${editingTeam!.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditingTeam(null);
      teamForm.reset();
      toast({
        title: "Team Updated",
        description: "Team has been successfully updated",
      });
    },
    onError: (error) => {
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Update Failed",
        description: "Failed to update team",
        variant: "destructive",
      });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userInviteSchema>) => {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      inviteForm.reset();
      toast({
        title: "Invitation Sent",
        description: "User invitation has been sent successfully",
      });
    },
    onError: (error) => {
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Invitation Failed",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const handleTeamSubmit = (data: z.infer<typeof teamFormSchema>) => {
    const teamData = {
      ...data,
      permissions: Object.entries(selectedPermissions).map(([pageId, permissions]) => ({
        pageId: parseInt(pageId),
        ...permissions
      }))
    };

    if (editingTeam) {
      updateTeamMutation.mutate(teamData);
    } else {
      createTeamMutation.mutate(teamData);
    }
  };

  const handleInviteSubmit = (data: z.infer<typeof userInviteSchema>) => {
    inviteUserMutation.mutate(data);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    teamForm.setValue("name", team.name);
    teamForm.setValue("color", team.color);
    teamForm.setValue("description", team.description || "");
    teamForm.setValue("googleSheetId", team.googleSheetId || "");
    setActiveTab("teams");
  };

  const predefinedColors = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", 
    "#EF4444", "#EC4899", "#06B6D4", "#84CC16"
  ];

  const getTeamName = (teamId: number | null) => {
    const team = teams.find((t: Team) => t.id === teamId);
    return team?.name || "No Team";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto scale-[0.7] origin-center">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center space-x-2">
            <Settings size={20} />
            <span>Team Management</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teams" className="flex items-center space-x-2">
              <Users size={16} />
              <span>Teams</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <UserPlus size={16} />
              <span>User Access</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingTeam ? "Edit Team" : "Create New Team"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={teamForm.handleSubmit(handleTeamSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Team Name</Label>
                      <Input
                        id="name"
                        {...teamForm.register("name")}
                        placeholder="e.g., Content Team"
                      />
                      {teamForm.formState.errors.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {teamForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="color">Team Color</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          id="color"
                          type="color"
                          {...teamForm.register("color")}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <div className="flex space-x-1">
                          {predefinedColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className="w-8 h-8 rounded border-2 border-transparent hover:border-slate-300"
                              style={{ backgroundColor: color }}
                              onClick={() => teamForm.setValue("color", color)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...teamForm.register("description")}
                      placeholder="Brief description of team responsibilities"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="googleSheetId">Google Sheet ID (Optional)</Label>
                    <Input
                      id="googleSheetId"
                      {...teamForm.register("googleSheetId")}
                      placeholder="Google Sheets document ID for data sync"
                    />
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Shield size={16} className="text-blue-600" />
                      <h3 className="text-lg font-medium">Default Team Permissions</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Set default permissions that new team members will inherit. These can be overridden individually.
                    </p>

                    <div>
                      <Label htmlFor="defaultRole">Default Role</Label>
                      <Select 
                        value={teamForm.watch("defaultRoleId")?.toString() || ""} 
                        onValueChange={(value) => teamForm.setValue("defaultRoleId", value ? parseInt(value) : undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select default role for team members" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No default role</SelectItem>
                          {roles.map((role: Role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Page-Level Permissions</Label>
                      <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                        {pages.length === 0 ? (
                          <p className="text-sm text-gray-500">No pages available</p>
                        ) : (
                          <div className="space-y-3">
                            {pages.map((page: Page) => (
                              <div key={page.id} className="space-y-2">
                                <div className="font-medium text-sm">{page.name}</div>
                                <div className="grid grid-cols-3 gap-4 ml-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`page-${page.id}-view`}
                                      checked={selectedPermissions[page.id]?.canView || false}
                                      onCheckedChange={(checked) => {
                                        setSelectedPermissions(prev => ({
                                          ...prev,
                                          [page.id]: {
                                            ...prev[page.id],
                                            canView: !!checked
                                          }
                                        }));
                                      }}
                                    />
                                    <Label htmlFor={`page-${page.id}-view`} className="text-sm">
                                      View
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`page-${page.id}-edit`}
                                      checked={selectedPermissions[page.id]?.canEdit || false}
                                      onCheckedChange={(checked) => {
                                        setSelectedPermissions(prev => ({
                                          ...prev,
                                          [page.id]: {
                                            ...prev[page.id],
                                            canEdit: !!checked
                                          }
                                        }));
                                      }}
                                    />
                                    <Label htmlFor={`page-${page.id}-edit`} className="text-sm">
                                      Edit
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`page-${page.id}-assign`}
                                      checked={selectedPermissions[page.id]?.canAssign || false}
                                      onCheckedChange={(checked) => {
                                        setSelectedPermissions(prev => ({
                                          ...prev,
                                          [page.id]: {
                                            ...prev[page.id],
                                            canAssign: !!checked
                                          }
                                        }));
                                      }}
                                    />
                                    <Label htmlFor={`page-${page.id}-assign`} className="text-sm">
                                      Assign
                                    </Label>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <Label htmlFor={`page-${page.id}-scope`} className="text-sm">
                                    Data Scope
                                  </Label>
                                  <Select 
                                    value={selectedPermissions[page.id]?.dataScope || "none"} 
                                    onValueChange={(value) => {
                                      setSelectedPermissions(prev => ({
                                        ...prev,
                                        [page.id]: {
                                          ...prev[page.id],
                                          dataScope: value
                                        }
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="w-full mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">No Access</SelectItem>
                                      <SelectItem value="own">Own Data Only</SelectItem>
                                      <SelectItem value="team">Team Data</SelectItem>
                                      <SelectItem value="all">All Data</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      disabled={createTeamMutation.isPending || updateTeamMutation.isPending}
                    >
                      {editingTeam ? "Update Team" : "Create Team"}
                    </Button>
                    {editingTeam && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingTeam(null);
                          teamForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">Existing Teams</CardTitle>
                {user?.role === "admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTeamOrderingModal(true)}
                    className="flex items-center space-x-2"
                  >
                    <Move size={14} />
                    <span>Reorder Teams</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team: Team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <div>
                          <h4 className="font-medium">{team.name}</h4>
                          <p className="text-sm text-slate-500">{team.description}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTeam(team)}
                      >
                        <Edit size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invite New User</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        {...inviteForm.register("email")}
                        placeholder="user@example.com"
                      />
                      {inviteForm.formState.errors.email && (
                        <p className="text-sm text-red-500 mt-1">
                          {inviteForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteForm.watch("role")}
                        onValueChange={(value) => inviteForm.setValue("role", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assistant">Assistant</SelectItem>
                          <SelectItem value="team_lead">Team Lead</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="team">Team Access (Optional)</Label>
                      <Select
                        value={inviteForm.watch("teamId")?.toString() || ""}
                        onValueChange={(value) => 
                          inviteForm.setValue("teamId", value ? parseInt(value) : undefined)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All teams" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Teams</SelectItem>
                          {teams.map((team: Team) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={inviteUserMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <UserPlus size={16} />
                    <span>Send Invitation</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user: User) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email
                          }
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="capitalize">
                            {user.role}
                          </Badge>
                          <Badge variant="outline">
                            {getTeamName(user.teamId)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      <TeamOrderingModal
        isOpen={showTeamOrderingModal}
        onClose={() => setShowTeamOrderingModal(false)}
      />
    </Dialog>
  );
}