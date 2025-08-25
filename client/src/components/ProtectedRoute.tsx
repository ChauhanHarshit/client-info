import { useCrmAuth } from "@/contexts/CrmAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Home } from "lucide-react";
import { Link } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  pageId?: number;
  requiredRole?: 'admin' | 'manager' | 'team_lead' | 'employee';
  departmentId?: number;
}

export function ProtectedRoute({ 
  children, 
  pageId, 
  requiredRole, 
  departmentId 
}: ProtectedRouteProps) {
  const { employee, hasPageAccess, hasDepartmentAccess, isAuthenticated } = useCrmAuth();

  // If not authenticated, this will be handled by the main auth flow
  if (!isAuthenticated || !employee) {
    return null;
  }

  // Check if user has access
  const hasAccess = (): boolean => {
    if (!employee.isActive) return false;
    
    // Mass access override
    if (employee.massAccess) return true;
    
    // Admin role has all permissions
    if (employee.role === 'admin') return true;
    
    // Check role-based access
    if (requiredRole) {
      const roleHierarchy = ['employee', 'team_lead', 'manager', 'admin'];
      const userRoleIndex = roleHierarchy.indexOf(employee.role);
      const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
      
      if (userRoleIndex < requiredRoleIndex) return false;
    }
    
    // Check page-specific permissions
    if (pageId && !hasPageAccess(pageId, 'view')) return false;
    
    // Check department-specific permissions
    if (departmentId && !hasDepartmentAccess(departmentId, 'view')) return false;
    
    return true;
  };

  if (!hasAccess()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Access Denied
            </CardTitle>
            <CardDescription className="text-gray-600">
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                Your current role: <span className="font-semibold capitalize">{employee.role}</span>
              </p>
              {requiredRole && (
                <p className="text-sm text-gray-600 mt-1">
                  Required role: <span className="font-semibold capitalize">{requiredRole}</span> or higher
                </p>
              )}
            </div>
            <p className="text-sm text-gray-600">
              If you believe this is an error, please contact your administrator to request access to this page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go Back</span>
              </Button>
              <Link href="/">
                <Button className="flex items-center space-x-2 w-full sm:w-auto">
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}