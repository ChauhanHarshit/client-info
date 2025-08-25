import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, MessageSquare, TrendingUp } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <BarChart3 className="text-white" size={24} />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">Agency CRM</h1>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Streamline your OnlyFans agency operations with role-based team management, 
            real-time Google Sheets integration, and comprehensive analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Team Management</CardTitle>
              <CardDescription>
                Role-based access control for team leads, assistants, and managers
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Real-time Sync</CardTitle>
              <CardDescription>
                Direct integration with Google Sheets for live data synchronization
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Comprehensive KPIs and performance metrics across all teams
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Sign in to access your team dashboard and manage your agency operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogin} className="w-full" size="lg">
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
