import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage("Please enter your email address");
      setMessageType("error");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message || "Password reset link sent to your email");
        setMessageType("success");
        setEmail("");
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || "Failed to send reset email");
        setMessageType("error");
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setMessage("Network error. Please try again.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setMessage("");
    setMessageType(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Forgot Password?
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
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

          <div className="flex flex-col gap-3">
            <Button 
              type="submit" 
              disabled={isLoading || !email.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </div>

          <div className="text-sm text-gray-600 text-center">
            <p>We'll send you a secure link to reset your password.</p>
            <p className="mt-1">The link will expire in 30 minutes.</p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}