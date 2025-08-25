import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useCreatorAuth } from '@/contexts/CreatorAuthContext';
import { LogIn, User, Lock, Heart, ExternalLink } from 'lucide-react';
import { 
  useFormPerformanceOptimizer, 
  OptimizedInput, 
  ProgressiveLoading,
  useResourcePreloader 
} from '@/components/auth/LoginPerformanceOptimizer';

export default function CreatorLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setCreatorAuth } = useCreatorAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isProductionDomain, setIsProductionDomain] = useState(false);

  useEffect(() => {
    // Check if we're on a production domain that needs redirect
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isProduction = hostname === 'tastyyyy.com' || 
                          hostname === 'www.tastyyyy.com' || 
                          hostname.includes('vercel.app');
      setIsProductionDomain(isProduction);
      
      if (isProduction) {
        // Production domain detected
      }
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      try {
        const response = await apiRequest('POST', '/api/creator-auth/login', data);
        const result = await response.json();
        return result;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Handle both backend response formats
      if (data.success || data.isAuthenticated) {
        const creator = data.creator || data;
        
        // Store JWT token if provided by server (for mobile compatibility)
        if (data.token) {
          localStorage.setItem('creator_jwt_token', data.token);
        }
        
        // Set authentication state
        await setCreatorAuth(creator.id, creator.username);
        
        toast({
          title: "Welcome back!",
          description: "Successfully logged into your creator dashboard.",
        });
        
        // Small delay to ensure cookies are properly set before redirect
        setTimeout(() => {
          setLocation('/creator-app-layout');
        }, 100);
      } else {
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('Login mutation error:', error);
      console.error('Error type:', typeof error);
      console.error('Error properties:', Object.keys(error || {}));
      
      // Enhanced error handling for mobile connectivity issues
      let errorMessage = "Unable to connect. Please try again.";
      let errorTitle = "Login Error";
      
      if (error?.message?.includes('Load failed') || error?.message?.includes('Failed to fetch')) {
        errorTitle = "Connection Error";
        errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
      } else if (error?.message?.includes('Network error') || error?.message?.includes('ERR_NETWORK')) {
        errorTitle = "Network Error";
        errorMessage = "Network connection issue. Please check your internet and try again.";
      } else if (error?.message?.includes('CORS') || error?.message?.includes('cors')) {
        errorTitle = "Connection Error";
        errorMessage = "Cross-origin request blocked. Please refresh the page and try again.";
      } else if (error?.message) {
        errorMessage = `Connection error: ${error.message}`;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast({
        title: "Required Fields",
        description: "Please enter both username and password.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRedirectToReplit = () => {
    // Redirect to Replit domain for creator login
    const replitUrl = 'https://b911dd49-61eb-4d0b-b4c6-5c8fad3a1497-00-2d3umxy1xela5.spock.replit.dev/creatorlogin';
    window.location.href = replitUrl;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 animate-gradient-xy"></div>
      
      {/* Floating hearts animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Heart className="absolute top-20 left-10 w-4 h-4 text-pink-300 animate-float opacity-60" style={{ animationDelay: '0s' }} />
        <Heart className="absolute top-32 right-20 w-3 h-3 text-purple-300 animate-float opacity-40" style={{ animationDelay: '2s' }} />
        <Heart className="absolute top-1/2 left-1/4 w-5 h-5 text-pink-200 animate-float opacity-50" style={{ animationDelay: '4s' }} />
        <Heart className="absolute bottom-1/4 right-1/3 w-4 h-4 text-purple-200 animate-float opacity-30" style={{ animationDelay: '6s' }} />
        <Heart className="absolute bottom-1/3 left-1/2 w-3 h-3 text-pink-300 animate-float opacity-70" style={{ animationDelay: '8s' }} />
        <Heart className="absolute top-1/4 right-1/2 w-6 h-6 text-purple-100 animate-float opacity-20" style={{ animationDelay: '10s' }} />
        <Heart className="absolute bottom-20 left-20 w-4 h-4 text-pink-200 animate-float opacity-60" style={{ animationDelay: '12s' }} />
        <Heart className="absolute top-40 right-40 w-5 h-5 text-purple-300 animate-float opacity-40" style={{ animationDelay: '14s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">

          
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">Creator Login</CardTitle>
            <CardDescription className="text-gray-600">
              Access your personal content dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 font-medium">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold text-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 leading-relaxed">
                Don't have login credentials? Contact your team administrator to get access to your personal creator dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
        <p className="text-gray-600 text-sm">
          Powered by{' '}
          <button 
            onClick={() => setLocation('/')}
            className="text-purple-600 hover:text-purple-700 font-semibold transition-colors cursor-pointer"
          >
            Tasty
          </button>
        </p>
      </div>
    </div>
  );
}