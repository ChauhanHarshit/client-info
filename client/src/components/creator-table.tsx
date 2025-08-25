import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, MessageSquare, Edit, RefreshCw } from "lucide-react";
import type { Creator, Team } from "@shared/schema";

interface CreatorTableProps {
  searchQuery?: string;
  teamFilter?: string;
}

export function CreatorTable({ searchQuery = "", teamFilter = "all" }: CreatorTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeamFilter, setSelectedTeamFilter] = useState(teamFilter);

  const { data: creators = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/creators", { team: selectedTeamFilter, search: searchQuery }],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
  });

  const refreshMutation = useMutation({
    mutationFn: () => refetch(),
    onSuccess: () => {
      toast({
        title: "Data Refreshed",
        description: "Creator data has been updated from Google Sheets",
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
        title: "Refresh Failed",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    },
  });

  const getTeamInfo = (teamId: number | null) => {
    const team = teams.find((t: Team) => t.id === teamId);
    return {
      name: team?.name || "No Team",
      color: team?.color || "#64748b",
    };
  };

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return "Never";
    
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffMs = now.getTime() - activity.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  const getResponseRateColor = (rate: string | null) => {
    const numRate = Number(rate) || 0;
    if (numRate >= 90) return "bg-green-500";
    if (numRate >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Top Performing Creators
          </CardTitle>
          <div className="flex items-center space-x-3">
            <select 
              className="border border-slate-300 rounded-lg px-3 py-1 text-sm"
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
            >
              <option value="all">All Teams</option>
              {teams.map((team: Team) => (
                <option key={team.id} value={team.id.toString()}>
                  {team.name}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              <RefreshCw 
                className={refreshMutation.isPending ? "animate-spin" : ""} 
                size={16} 
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Loading creators...</p>
          </div>
        ) : creators.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-600">No creators found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Response Rate
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {creators.map((creator: Creator) => {
                  const teamInfo = getTeamInfo(creator.teamId);
                  
                  return (
                    <tr key={creator.id} className="hover:bg-slate-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <Avatar className="w-8 h-8 mr-3">
                            <AvatarImage 
                              src={creator.profileImageUrl || undefined} 
                              className="object-cover"
                            />
                            <AvatarFallback>
                              {creator.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              @{creator.username}
                            </div>
                            <div className="text-sm text-slate-500">
                              {creator.displayName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge 
                          variant="secondary" 
                          className="inline-flex items-center"
                          style={{ 
                            backgroundColor: `${teamInfo.color}20`,
                            color: teamInfo.color
                          }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full mr-2" 
                            style={{ backgroundColor: teamInfo.color }}
                          ></div>
                          {teamInfo.name}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900 font-medium">
                        ${Number(creator.revenue || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900">
                        {creator.messageCount || 0}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-16 bg-slate-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${getResponseRateColor(creator.responseRate)}`}
                              style={{ width: `${Number(creator.responseRate) || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-900">
                            {Number(creator.responseRate) || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500">
                        {formatLastActivity(creator.lastActivity)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye size={14} />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MessageSquare size={14} />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {creators.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {creators.length} creators
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
