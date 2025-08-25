import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Auto-redirect to login page after 3 seconds
    const timer = setTimeout(() => {
      console.log('404 Error - Redirecting to login page');
      setLocation('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 mb-4">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>

          <div className="flex items-center gap-2 text-sm text-blue-600">
            <ArrowRight className="h-4 w-4" />
            <span>Redirecting to login page in 3 seconds...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
