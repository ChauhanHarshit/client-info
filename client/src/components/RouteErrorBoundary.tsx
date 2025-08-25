import React, { Component, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Route Error Boundary caught an error:', error, errorInfo);
    
    // Auto-redirect to login page after catching error
    setTimeout(() => {
      console.log('Route error - Redirecting to login page');
      window.location.href = '/login';
    }, 3000);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="flex mb-4 gap-2">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <h1 className="text-2xl font-bold text-gray-900">Page Error</h1>
              </div>

              <p className="mt-4 text-sm text-gray-600 mb-4">
                Something went wrong while loading this page. Please try logging in again.
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

    return this.props.children;
  }
}

export default RouteErrorBoundary;