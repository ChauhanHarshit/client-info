import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCrmAuth } from "@/contexts/CrmAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ForgotPasswordModal } from "@/components/forgot-password-modal";

export default function EmployeeLogin() {
  const [, setLocation] = useLocation();
  const { login, isLoading, isAuthenticated, employee } = useCrmAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-redirect if already authenticated
  useEffect(() => {
    // Enhanced authentication check - ensure we have a valid session
    const isActuallyAuthenticated = isAuthenticated && employee;
    
    if (isActuallyAuthenticated) {
      console.log("Employee already authenticated, redirecting to CRM dashboard", { employee, isAuthenticated });
      setLocation("/");
    }
  }, [isAuthenticated, employee, setLocation]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-muted-foreground">Checking authentication...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      console.log("Attempting login for:", formData.email);
      // Use the auth context login function which handles everything including navigation
      await login(formData.email, formData.password);
      console.log("Login function completed successfully");
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl font-bold">TASTY CRM</CardTitle>
          <CardDescription className="text-sm">
            Universal access portal - Enter your credentials to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your work email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading || isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading || isSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || isSubmitting || !formData.email || !formData.password}
            >
              {(isLoading || isSubmitting) ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button 
              type="button" 
              variant="link" 
              className="text-sm text-muted-foreground p-0 h-auto"
              onClick={() => setShowForgotPassword(true)}
              disabled={isLoading || isSubmitting}
            >
              Forgot your password?
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Need access? Contact your system administrator</p>
          </div>
        </CardContent>
      </Card>

      <ForgotPasswordModal 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
}