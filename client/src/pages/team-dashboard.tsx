import { useParams } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { KpiCards } from "@/components/kpi-cards";
import { CreatorTable } from "@/components/creator-table";
import { ActivityFeed } from "@/components/activity-feed";
import { ActiveCreatorsModal } from "@/components/active-creators-modal";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TeamDashboard() {
  const { teamId } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeCreatorsModalOpen, setActiveCreatorsModalOpen] = useState(false);

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId && isAuthenticated,
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated || teamLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading team dashboard...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Team Not Found</h1>
          <p className="text-slate-600 mb-4">The team you're looking for doesn't exist.</p>
          <Link href="/">
            <Button>
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar activeTeam={parseInt(teamId!)} />
      
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft size={16} className="mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: team.color }}
                ></div>
                <h2 className="text-2xl font-semibold text-slate-900">{team.name}</h2>
                <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium">Team View</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          <KpiCards 
            teamId={parseInt(teamId!)} 
            onActiveCreatorsClick={() => setActiveCreatorsModalOpen(true)}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Performance Chart Placeholder */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">{team.name} Performance</h3>
                <select className="border border-slate-300 rounded-lg px-3 py-1 text-sm">
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
              
              <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                <div className="text-center">
                  <div className="w-12 h-12 bg-slate-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-slate-500 text-xl">📊</span>
                  </div>
                  <p className="text-slate-500">{team.name} Performance Chart</p>
                  <p className="text-sm text-slate-400">Google Sheets Integration</p>
                </div>
              </div>
            </div>

            <ActivityFeed teamId={parseInt(teamId!)} />
          </div>

          <CreatorTable teamFilter={teamId!} />
        </div>
      </main>

      {/* Active Creators Modal */}
      <ActiveCreatorsModal 
        open={activeCreatorsModalOpen}
        onOpenChange={setActiveCreatorsModalOpen}
        teamId={parseInt(teamId!)}
      />
    </div>
  );
}
