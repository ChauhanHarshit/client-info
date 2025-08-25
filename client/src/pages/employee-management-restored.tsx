import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash, Users, Shield, Building, UserPlus, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CenteredSectionLoader } from "@/components/ui/loading-animation";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function EmployeeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("employees");
  
  // State for dialogs and forms
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "",
    teamId: "",
    massAccess: false
  });

  const [roleForm, setRoleForm] = useState({
    name: "",
    description: ""
  });

  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<Role | null>(null);

  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageSearchQuery, setPageSearchQuery] = useState("");
  
  const [teamForm, setTeamForm] = useState({
    name: "",
    color: "#3b82f6",
    description: "",
    displayOrder: 1
  });

  // Data queries
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
  });

  const { data: teams, isLoading: teamsLoading, error: teamsError, refetch: refetchTeams } = useQuery({
    queryKey: ["teams-fixed", "/api/teams"],
    queryFn: async () => {
      console.log("Teams queryFn called");
      const response = await apiRequest("GET", "/api/teams");
      const data = await response.json();
      console.log("Teams queryFn result:", data);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
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

  // Manual API test function
  const testTeamsAPI = async () => {
    try {
      console.log("Manual teams API test starting...");
      const response = await apiRequest("GET", "/api/teams");
      const data = await response.json();
      console.log("Manual teams API response data:", data);
      console.log("Manual teams API response count:", Array.isArray(data) ? data.length : 'not array');
    } catch (error) {
      console.error("Manual teams API error:", error);
    }
  };

  const { data: pagesData, isLoading: pagesLoading, error: pagesError, refetch: refetchPages } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => {
      const response = await fetch('/api/pages', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }
      return response.json();
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  // Debug pages data
  console.log("Pages debug:", { 
    pagesData, 
    pagesLoading, 
    pagesError,
    hasPages: !!pagesData,
    pagesCount: pagesData?.pages?.length || 0 
  });

  // Filter users based on search and role
  const filteredUsers = Array.isArray(users) ? users.filter((user: User) => 
    (user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  ).filter((user: User) => 
    selectedRole === "all" || user.role === selectedRole
  ) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Management"
        description="Manage team members, roles, and permissions"
        showBackButton
        backTo="/dashboard"
        actions={
          <Button onClick={() => setInviteDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Employee
          </Button>
        }
      />

      <div className="px-6 pb-6 space-y-6">
        <div className="space-y-6">
          <div className="grid w-full grid-cols-3 h-12 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab("employees")}
              className={`flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "employees" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              Employees
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "roles" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="w-4 h-4" />
              Roles
            </button>
            <button
              onClick={() => setActiveTab("teams")}
              className={`flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "teams" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
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
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
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
                    {filteredUsers.length === 0 ? (
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
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline">
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

          {activeTab === "roles" && (
            <div>
            {rolesLoading ? (
              <CenteredSectionLoader />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end items-center gap-2">
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="h-8 px-3 text-xs"
                  >
                    Refresh
                  </Button>
                  <Button 
                    onClick={() => setIsCreateRoleDialogOpen(true)}
                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create Role
                  </Button>
                </div>

                {/* Roles Table - Same Format as Teams */}
                <div className="bg-white rounded-lg border">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Roles</h4>
                      <span className="text-xs text-muted-foreground">
                        {Array.isArray(roles) ? roles.length : 0} roles
                      </span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto" style={{ position: 'relative' }}>
                    <div style={{ minWidth: '1600px' }}>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50/50">
                            <th className="text-left p-3 font-medium text-xs text-gray-600 w-64">Role Name</th>
                            <th className="text-left p-3 font-medium text-xs text-gray-600 w-96">Description</th>
                            <th className="text-left p-3 font-medium text-xs text-gray-600 w-32">Members</th>
                            <th className="text-left p-3 font-medium text-xs text-gray-600 w-48">Created</th>
                            <th className="text-center p-3 font-medium text-xs text-gray-600 w-32">Actions & Settings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!Array.isArray(roles) || roles.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                                No roles found. Create your first role to get started.
                              </td>
                            </tr>
                          ) : (
                            roles.map((role: any) => (
                              <tr key={role.id} className="border-b hover:bg-gray-50/50 transition-colors">
                                <td className="p-3">
                                  <div className="font-medium text-sm">{role.name}</div>
                                </td>
                                <td className="p-3">
                                  <div className="text-sm text-gray-600 max-w-md truncate">
                                    {role.description || "No description"}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <Badge variant="secondary" className="text-xs">
                                    0 Members
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <div className="text-xs text-gray-500">
                                    {new Date(role.createdAt).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex gap-1 justify-center">
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                                      <Trash className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
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
                      onClick={testTeamsAPI}
                      variant="outline"
                      size="sm"
                    >
                      Test API
                    </Button>
                    <Button 
                      onClick={() => refetchTeams()}
                      variant="outline"
                      size="sm"
                    >
                      Refresh
                    </Button>
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
                                <th style={{ width: '150px', padding: '12px 16px', textAlign: 'left', fontWeight: '500', whiteSpace: 'nowrap' }}>Display Order</th>
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
                                      <td style={{ width: '150px', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '14px' }}>{team.displayOrder}</span>
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
                                          <button style={{ 
                                            padding: '4px 8px', 
                                            fontSize: '11px', 
                                            border: '1px solid #e5e7eb', 
                                            borderRadius: '4px', 
                                            backgroundColor: 'white',
                                            cursor: 'pointer'
                                          }}>
                                            Edit
                                          </button>
                                          <button style={{ 
                                            padding: '4px 8px', 
                                            fontSize: '11px', 
                                            border: '1px solid #e5e7eb', 
                                            borderRadius: '4px', 
                                            backgroundColor: 'white',
                                            cursor: 'pointer'
                                          }}>
                                            Delete
                                          </button>
                                          <button style={{ 
                                            padding: '4px 8px', 
                                            fontSize: '11px', 
                                            border: '1px solid #e5e7eb', 
                                            borderRadius: '4px', 
                                            backgroundColor: 'white',
                                            cursor: 'pointer'
                                          }}>
                                            Permissions
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
    </div>
  );
}