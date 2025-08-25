import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Star, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  CheckCircle, 
  Flag,
  Target,
  AlertTriangle
} from "lucide-react";
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { format } from "date-fns";

interface SharedPriorityContent {
  id: number;
  title: string;
  description: string;
  creatorName: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  category: "custom" | "promotion" | "collaboration" | "event" | "other";
  dueDate: string;
  requestedBy: string;
  estimatedDuration: number;
  notes?: string;
  createdAt: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-500 text-white hover:bg-red-600";
    case "high": return "bg-orange-500 text-white hover:bg-orange-600";
    case "medium": return "bg-yellow-500 text-white hover:bg-yellow-600";
    case "low": return "bg-green-500 text-white hover:bg-green-600";
    default: return "bg-gray-500 text-white hover:bg-gray-600";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "text-yellow-600 border-yellow-200 bg-yellow-50";
    case "in-progress": return "text-blue-600 border-blue-200 bg-blue-50";
    case "completed": return "text-green-600 border-green-200 bg-green-50";
    case "cancelled": return "text-red-600 border-red-200 bg-red-50";
    default: return "text-gray-600 border-gray-200 bg-gray-50";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending": return <Clock className="w-3 h-3" />;
    case "in-progress": return <Target className="w-3 h-3" />;
    case "completed": return <CheckCircle className="w-3 h-3" />;
    case "cancelled": return <AlertTriangle className="w-3 h-3" />;
    default: return <Clock className="w-3 h-3" />;
  }
};

export default function SharedPriorityContentPage() {
  const { toast } = useToast();
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Extract ID from URL path /priority-content-public/[id]
  const path = window.location.pathname;
  const contentId = path.split('/priority-content-public/')[1];

  // Fetch shared priority content directly by ID (without authentication)
  const { data: content, isLoading, error } = useQuery<SharedPriorityContent>({
    queryKey: ['/api/priority-content-public', contentId],
    enabled: !!contentId,
    queryFn: async () => {
      // Use custom fetch without credentials to bypass authentication
      const response = await fetch(`/api/priority-content-public/${contentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Do NOT include credentials: "include" - this allows public access
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch content' }));
        throw new Error(error.error || 'Failed to fetch priority content');
      }
      
      return response.json();
    },
  });

  // Update page title and meta tags for link previews
  useEffect(() => {
    if (content) {
      const pageTitle = `${content.title} - Priority Content`;
      const pageDescription = `${content.description} - Priority content for ${content.creatorName}`;
      
      // Update page title
      document.title = pageTitle;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', pageDescription);
      }
      
      // Update Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', pageTitle);
      }
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', pageDescription);
      }
      
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        ogUrl.setAttribute('content', `${window.location.origin}/priority-content-public/${contentId}`);
      }
      
      // Update Twitter tags
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute('content', pageTitle);
      }
      
      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      if (twitterDescription) {
        twitterDescription.setAttribute('content', pageDescription);
      }
    }
    
    // Cleanup function to restore original meta tags when component unmounts
    return () => {
      document.title = 'CRM Dashboard';
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 'CRM Dashboard for managing content creators and inspiration pages');
      }
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', 'CRM Dashboard');
      }
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', 'CRM Dashboard for managing content creators and inspiration pages');
      }
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        ogUrl.setAttribute('content', 'https://tastyyyy.com');
      }
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute('content', 'CRM Dashboard');
      }
      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      if (twitterDescription) {
        twitterDescription.setAttribute('content', 'CRM Dashboard for managing content creators and inspiration pages');
      }
    };
  }, [content, contentId]);

  // Complete priority content mutation (without authentication)
  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/priority-content-public/${contentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Do NOT include credentials: "include" - this allows public access
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to complete content' }));
        throw new Error(error.error || 'Failed to complete priority content');
      }
      
      return response.json();
    },
    onMutate: () => {
      setIsCompleting(true);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Priority content marked as completed!",
      });
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/priority-content-public', contentId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCompleting(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingAnimation size="lg" />
          <p className="text-gray-600 mt-6">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-700 mb-2">Content Not Found</h1>
          <p className="text-red-600 mb-4">
            This shared content could not be found or may have expired.
          </p>
        </div>
      </div>
    );
  }

  const handleComplete = () => {
    if (content.status !== 'completed') {
      completeMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Priority Content Request</h1>
            <p className="text-gray-600">Shared content details and completion</p>
          </div>

          {/* Main Content Card */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-3">{content.title}</CardTitle>
                  <div className="flex gap-3 flex-wrap">
                    <Badge className={getPriorityColor(content.priority)}>
                      <Flag className="w-4 h-4 mr-1" />
                      {content.priority} Priority
                    </Badge>
                    <Badge variant="outline" className="bg-white/20 border-white/30 text-white">
                      {getStatusIcon(content.status)}
                      <span className="ml-1 capitalize">{content.status}</span>
                    </Badge>
                    <Badge variant="outline" className="bg-white/20 border-white/30 text-white">
                      <Tag className="w-4 h-4 mr-1" />
                      {content.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-8">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {content.description}
                </p>
              </div>

              <Separator />

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Assigned to</p>
                      <p className="text-gray-900">{content.creatorName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Requested by</p>
                      <p className="text-gray-900">{content.requestedBy}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Estimated Duration</p>
                      <p className="text-gray-900">{content.estimatedDuration} hours</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Due Date</p>
                      <p className="text-gray-900">
                        {content.dueDate ? format(new Date(content.dueDate), 'PPP') : 'No due date'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Created</p>
                      <p className="text-gray-900">
                        {format(new Date(content.createdAt), 'PPP')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {content.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                      {content.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Action Button */}
              <Separator />
              <div className="flex justify-center">
                {content.status === 'completed' ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-6 py-3 rounded-lg border border-green-200">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Already Completed</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 text-lg font-medium shadow-lg"
                  >
                    {isCompleting ? (
                      <>
                        <LoadingAnimation size="sm" />
                        <span className="ml-2">Completing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Mark as Completed
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm">
              Priority Content Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}