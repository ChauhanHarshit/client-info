import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // Extract token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      setIsValidToken(true);
    } else {
      setMessage("Invalid or missing reset token");
      setMessageType("error");
    }
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setMessage(passwordError);
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      setMessageType("error");
      return;
    }

    if (!token) {
      setMessage("Invalid reset token");
      setMessageType("error");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          newPassword 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message || "Password updated successfully");
        setMessageType("success");
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || "Failed to reset password");
        setMessageType("error");
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setMessage("Network error. Please try again.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              Invalid Reset Link
            </CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Back to Login clicked');
                try {
                  window.location.href = "/login";
                } catch (error) {
                  console.error('Navigation error:', error);
                  window.location.replace("/login");
                }
              }}
              className="w-full"
              type="button"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="h-6 w-6" />
            Reset Your Password
          </CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {message && (
              <Alert className={messageType === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {messageType === "success" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={messageType === "success" ? "text-green-800" : "text-red-800"}>
                    {message}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <div className="space-y-3">
              <Button 
                type="submit" 
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Back to Login clicked from form');
                  try {
                    window.location.href = "/employee-login";
                  } catch (error) {
                    console.error('Navigation error:', error);
                    window.location.replace("/employee-login");
                  }
                }}
                disabled={isLoading}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>

            {messageType === "success" && (
              <div className="text-sm text-center text-gray-600">
                Redirecting to login page in 3 seconds...
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}