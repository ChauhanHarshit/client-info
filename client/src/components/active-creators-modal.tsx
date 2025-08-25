import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Creator, Team } from "@shared/schema";

interface ActiveCreatorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId?: number;
}

export function ActiveCreatorsModal({ open, onOpenChange, teamId }: ActiveCreatorsModalProps) {
  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["/api/creators", { team: teamId || "all" }],
    enabled: open,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    enabled: open,
  });

  const activeCreators = creators.filter((creator: Creator) => creator.isActive);

  const getTeamInfo = (teamId: number | null) => {
    const team = teams.find((t: Team) => t.id === teamId);
    return {
      name: team?.name || "No Team",
      color: team?.color || "#64748b",
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Active Creators {teamId ? `- ${getTeamInfo(teamId).name}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center space-y-3">
                      <Skeleton className="w-16 h-16 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeCreators.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-slate-400 text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Creators</h3>
              <p className="text-slate-600">
                {teamId ? "This team has no active creators" : "No active creators found across all teams"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeCreators.map((creator: Creator) => {
                const teamInfo = getTeamInfo(creator.teamId);
                
                return (
                  <Card key={creator.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center space-y-3">
                        <Avatar className="w-16 h-16">
                          <AvatarImage 
                            src={creator.profileImageUrl || undefined} 
                            className="object-cover"
                          />
                          <AvatarFallback className="text-lg font-medium">
                            {creator.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="text-center">
                          <h4 className="font-medium text-slate-900 truncate max-w-full">
                            {creator.displayName}
                          </h4>
                          <p className="text-sm text-slate-500">@{creator.username}</p>
                        </div>
                        
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                          style={{ 
                            backgroundColor: `${teamInfo.color}20`,
                            color: teamInfo.color
                          }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full mr-1" 
                            style={{ backgroundColor: teamInfo.color }}
                          ></div>
                          {teamInfo.name}
                        </Badge>
                        
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-900">
                            ${Number(creator.revenue || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">Revenue</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {activeCreators.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              Showing {activeCreators.length} active creator{activeCreators.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}