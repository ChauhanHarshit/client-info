import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCrmAuth } from "@/contexts/CrmAuthContext";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Sidebar } from "@/components/sidebar";
import { KpiCards } from "@/components/kpi-cards";
import { CreatorTable } from "@/components/creator-table";
import { ActivityFeed } from "@/components/activity-feed";
import { ActiveCreatorsModal } from "@/components/active-creators-modal";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, ArrowLeft, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useSidebar } from "@/contexts/SidebarContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const { toast } = useToast();
  const { employee, isLoading: crmLoading, permissions } = useCrmAuth();
  const { sidebarState } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCreatorsModalOpen, setActiveCreatorsModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  // Debug logging for troubleshooting
  useEffect(() => {
    console.log("Dashboard - Employee:", employee);
    console.log("Dashboard - Permissions:", permissions);
    console.log("Dashboard - CRM Loading:", crmLoading);
    console.log("Dashboard - Session storage:", localStorage.getItem('crm_session_active'));
  }, [employee, permissions, crmLoading]);

  // Redirect to login if not authenticated - but give more time for auth to load
  useEffect(() => {
    // Only redirect if we're definitely not loading and definitely no employee
    if (!crmLoading && !employee) {
      console.log("Dashboard - No employee found after loading complete, redirecting to login");
      // Clear any stale session indicators
      localStorage.removeItem('crm_session_active');
      setLocation("/login");
      return;
    }
  }, [employee, crmLoading, setLocation]);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/export/creators", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'creators-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Creator data has been exported to CSV",
      });
    } catch (error) {
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
        title: "Export Failed",
        description: "Failed to export creator data",
        variant: "destructive",
      });
    }
  };

  // Show loading state
  if (crmLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={() => setLocation("/employee-login")} variant="outline">
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // For admin users with massAccess, always allow dashboard access
  // For regular users, check if they have permissions
  const hasAccess = employee?.massAccess || (permissions && permissions.length > 0);
  
  // Show no permissions state only if user explicitly has no access AND is not admin
  if (!crmLoading && employee && !hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Access Permissions</h2>
            <p className="text-gray-600 mb-6">
              Your account doesn't have any permissions assigned yet. Please contact your administrator.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Logged in as: {employee.firstName} {employee.lastName}</p>
              <p className="text-sm text-gray-500">Email: {employee.email}</p>
              <p className="text-sm text-gray-500">Mass Access: {employee.massAccess ? 'Yes' : 'No'}</p>
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              <Button onClick={() => setLocation("/login")} variant="outline">
                Switch Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your CRM performance and analytics"
        actions={
          <>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search clients, creators, tasks..."
                className="w-64 pl-8 h-8 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            </div>
            
            <Button onClick={handleExport} size="sm" className="flex items-center space-x-2 h-8 px-3 text-sm">
              <Download size={14} />
              <span>Export Report</span>
            </Button>
          </>
        }
      />

      {/* Dashboard Content - Compact and Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        <KpiCards onActiveCreatorsClick={() => setActiveCreatorsModalOpen(true)} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Team Performance Chart Placeholder */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Team Performance</h3>
              <select className="border border-slate-300 rounded-md px-2 py-1 text-xs">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
            
            <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
              <div className="text-center">
                <div className="w-10 h-10 bg-slate-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <span className="text-slate-500 text-lg">📊</span>
                </div>
                <p className="text-slate-500 text-sm">Performance Chart</p>
                <p className="text-xs text-slate-400">Google Sheets Integration</p>
              </div>
            </div>
          </div>

          <ActivityFeed />
        </div>

        <CreatorTable searchQuery={searchQuery} />
      </main>

      {/* Active Creators Modal */}
      <ActiveCreatorsModal 
        open={activeCreatorsModalOpen}
        onOpenChange={setActiveCreatorsModalOpen}
      />
    </>
  );
}
