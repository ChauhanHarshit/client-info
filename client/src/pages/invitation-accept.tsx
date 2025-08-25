import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Check, AlertCircle } from "lucide-react";

interface InvitationData {
  email: string;
  role: string;
  invitedBy: string;
  isValid: boolean;
  isExpired: boolean;
  isUsed: boolean;
}

export default function InvitationAccept() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: ""
  });

  // Get token from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let inviteToken = urlParams.get('token');
    
    // Also check for invitationToken= format from the URL path
    if (!inviteToken && window.location.pathname.includes('invitationToken=')) {
      const pathToken = window.location.pathname.split('invitationToken=')[1];
      if (pathToken) {
        inviteToken = pathToken;
      }
    }
    
    if (inviteToken) {
      setToken(inviteToken);
      validateInvitation(inviteToken);
    } else {
      setLoading(false);
    }
  }, []);

  const validateInvitation = async (token: string) => {
    try {
      const response = await fetch(`/api/invitations/validate?token=${token}`);
      const data = await response.json();
      console.log("Invitation validation response:", data);
      
      // Ensure we have the correct data structure
      if (data && data.isValid && data.email) {
        setInvitationData(data);
      } else {
        throw new Error("Invalid invitation data structure");
      }
    } catch (error) {
      console.error("Invitation validation error:", error);
      toast({
        title: "Invalid invitation",
        description: "This invitation link is invalid or has expired.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitationMutation = useMutation({
    mutationFn: async (data: typeof formData & { token: string }) => {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account created successfully!",
        description: "Welcome to TASTY. You are now logged in."
      });
      // If the user is automatically authenticated, redirect to dashboard
      if (data?.authenticated) {
        window.location.href = "/"; // Force page reload to update authentication state
      } else {
        setLocation("/login");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create account",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields match.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (!token) return;

    acceptInvitationMutation.mutate({
      ...formData,
      token
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (!token || !invitationData || !invitationData.isValid || invitationData.isExpired || invitationData.isUsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 mb-4">
              This invitation link is invalid, expired, or has already been used.
            </p>
            <Button onClick={() => setLocation("/")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationData.isUsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Already Accepted</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 mb-4">
              This invitation has already been accepted. You can sign in with your existing credentials.
            </p>
            <Button onClick={() => setLocation("/")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserPlus className="w-12 h-12 text-primary mx-auto mb-4" />
          <CardTitle>Complete Your Account</CardTitle>
          <p className="text-slate-600">
            You've been invited to join TASTY as a {invitationData.role}
          </p>
          <p className="text-sm text-slate-500">
            Email: {invitationData.email}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                placeholder="Create a secure password"
                minLength={6}
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                placeholder="Confirm your password"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={acceptInvitationMutation.isPending}
            >
              {acceptInvitationMutation.isPending ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}