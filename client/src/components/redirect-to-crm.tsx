import { useEffect } from "react";
import { useLocation } from "wouter";

export function RedirectToCrm() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to main CRM dashboard
    setLocation("/dashboard");
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to CRM Dashboard...</p>
      </div>
    </div>
  );
}