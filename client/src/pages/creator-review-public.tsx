import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Calendar, 
  User, 
  DollarSign,
  FileText,
  Image,
  Video,
  Download,
  Clock,
  Star
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending_review': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'approved': return 'bg-green-100 text-green-800 border-green-300';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
    case 'owed': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low': return 'bg-green-100 text-green-800 border-green-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
  if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

export default function CreatorReviewPublic({ token }: { token: string }) {
  const [responseSubmitted, setResponseSubmitted] = useState(false);
  const [submittedResponse, setSubmittedResponse] = useState<'approved' | 'rejected' | null>(null);

  // Fetch custom content by token
  const { data: customContent, isLoading, error } = useQuery({
    queryKey: [`/api/custom-contents/review/${token}`],
    queryFn: async () => {
      const response = await fetch(`/api/custom-contents/review/${token}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      return response.json();
    },
    retry: false,
  });

  // Debug logging
  console.log('CreatorReviewPublic Debug:', {
    token,
    isLoading,
    error: error?.message || error,
    hasData: !!customContent,
    customContent,
    apiUrl: `/api/custom-contents/review/${token}`
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/custom-contents/review/${token}/approve`),
    onSuccess: () => {
      setResponseSubmitted(true);
      setSubmittedResponse('approved');
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/custom-contents/review/${token}/reject`),
    onSuccess: () => {
      setResponseSubmitted(true);
      setSubmittedResponse('rejected');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading custom content request...</p>
        </div>
      </div>
    );
  }

  if (error || !customContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Link Invalid</h1>
          <p className="text-gray-600 mb-4">
            This review link is either expired, already used, or invalid. Please contact your team for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (responseSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            submittedResponse === 'approved' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {submittedResponse === 'approved' ? 
              <CheckCircle className="w-10 h-10 text-green-600" /> : 
              <XCircle className="w-10 h-10 text-red-600" />
            }
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Response Recorded</h1>
          <p className="text-gray-600 mb-4">
            Your response has been successfully recorded. The admin dashboard and team portal have been updated automatically.
          </p>
          <Badge className={submittedResponse === 'approved' ? getStatusColor('approved') : getStatusColor('rejected')}>
            {submittedResponse === 'approved' ? 'APPROVED' : 'REJECTED'}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <Star className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Custom Content Review</h1>
              <p className="text-gray-600">Review and respond to this custom content request</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl text-gray-900 mb-2">
                  ${customContent.price} - {customContent.category} Custom
                </CardTitle>
                <CardDescription className="text-base">
                  Custom content request submitted by {customContent.fanUsername}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Badge className={getStatusColor(customContent.status)}>
                  {customContent.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge className={getPriorityColor(customContent.priority)}>
                  {customContent.priority.toUpperCase()} PRIORITY
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Request Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                    Price & Platform
                  </h3>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-600">${customContent.price}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{customContent.category}</Badge>
                      <Badge variant="outline">{customContent.platform}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Requested By
                  </h3>
                  <p className="text-gray-700">{customContent.fanUsername}</p>
                  {customContent.fanOnlyFansUrl && (
                    <p className="text-sm text-blue-600 hover:underline">
                      <a href={customContent.fanOnlyFansUrl} target="_blank" rel="noopener noreferrer">
                        View OnlyFans Profile
                      </a>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                    Timeline
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Submitted: {new Date(customContent.createdAt).toLocaleDateString()}
                    </p>
                    {customContent.requestedDeliveryDate && (
                      <p className="text-sm text-gray-600">
                        Requested by: {new Date(customContent.requestedDeliveryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {customContent.tags && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {customContent.tags.split(',').map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-gray-600" />
                Request Description
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {customContent.description}
                </p>
              </div>
            </div>

            {/* Attachments */}
            {customContent.attachments && customContent.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Download className="w-4 h-4 mr-2 text-blue-600" />
                    Attachments ({customContent.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customContent.attachments.map((attachment: any, index: number) => (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0 mr-3 text-gray-500">
                          {getFileIcon(attachment.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(attachment.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Action Buttons */}
            {customContent.status === 'pending_review' && (
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="text-center mb-4">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Your Response Required</h3>
                  <p className="text-gray-600">
                    Please review the request details above and choose your response
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base"
                    size="lg"
                  >
                    {approveMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Approve Request
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => rejectMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    variant="destructive"
                    className="px-8 py-3 text-base"
                    size="lg"
                  >
                    {rejectMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 mr-2" />
                        Reject Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {customContent.status !== 'pending_review' && (
              <div className="text-center py-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  customContent.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {customContent.status === 'approved' ? 
                    <CheckCircle className="w-10 h-10 text-green-600" /> : 
                    <XCircle className="w-10 h-10 text-red-600" />
                  }
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Request {customContent.status === 'approved' ? 'Approved' : 'Rejected'}
                </h3>
                <p className="text-gray-600">
                  You have already responded to this request.
                </p>
                {customContent.creatorResponseDate && (
                  <p className="text-sm text-gray-500 mt-2">
                    Response submitted on {new Date(customContent.creatorResponseDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}