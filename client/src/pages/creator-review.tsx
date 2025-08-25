import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, User, DollarSign, Calendar, AlertTriangle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const CreatorReview = () => {
  const { creatorId, customId } = useParams<{ creatorId: string; customId: string }>();
  const [responseSubmitted, setResponseSubmitted] = useState(false);

  // Fetch custom content by creator and custom IDs
  const { data: content, isLoading, error } = useQuery({
    queryKey: [`/api/custom-contents/creator-review/${creatorId}/${customId}`],
    enabled: !!(creatorId && customId),
    retry: false
  });



  // Submit response mutation
  const responseMutation = useMutation({
    mutationFn: async (response: 'approved' | 'declined') => {
      const res = await apiRequest("POST", `/api/custom-contents/creator-review/${creatorId}/${customId}/respond`, { response });
      return res.json();
    },
    onSuccess: () => {
      setResponseSubmitted(true);
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading custom content request...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Review Link Not Found</h2>
            <p className="text-gray-600 mb-4">
              This review link may have expired or is no longer valid.
            </p>
            <p className="text-sm text-gray-500">
              Please contact your team if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (responseSubmitted || content.creatorResponse) {
    const isApproved = content.creatorResponse === 'approved';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            {isApproved ? (
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            )}
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Response Submitted
            </h2>
            <p className="text-gray-600 mb-4">
              You have {isApproved ? 'approved' : 'declined'} this custom content request.
            </p>
            {content.creatorResponseDate && (
              <p className="text-sm text-gray-500">
                Responded on {new Date(content.creatorResponseDate).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Custom Content Review</h1>
          <p className="text-gray-600">
            Please review the custom content request below and choose your response
          </p>
        </div>

        {/* Creator Info */}
        {content.creator && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Creator Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{content.creator.displayName}</p>
                  <p className="text-sm text-gray-500">@{content.creator.username}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Request Details</CardTitle>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <Badge className="bg-green-100 text-green-800">
                {content.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline">{content.category}</Badge>
              <Badge variant="outline">{content.platform}</Badge>
              {content.priority && content.priority !== 'normal' && (
                <Badge className={
                  content.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  content.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }>
                  {content.priority.toUpperCase()} PRIORITY
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price */}
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-semibold text-gray-900">${content.price}</span>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{content.description}</p>
            </div>

            {/* Fan Information */}
            {content.fanUsername && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Requested By</h4>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{content.fanUsername}</span>
                </div>
              </div>
            )}

            {/* OnlyFans URL */}
            {content.fanOnlyFansUrl && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Fan's OnlyFans Profile</h4>
                <a 
                  href={content.fanOnlyFansUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 underline break-all"
                >
                  {content.fanOnlyFansUrl}
                </a>
              </div>
            )}

            {/* Attachments */}
            {content.attachments && content.attachments.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Attachments</h4>
                <div className="space-y-2">
                  {content.attachments.map((attachment: any, index: number) => (
                    <a
                      key={index}
                      href={attachment.url || attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm text-gray-700 truncate">
                        {attachment.name || `Attachment ${index + 1}`}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Request Date */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Requested on {new Date(content.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Delivery Date */}
            {content.requestedDeliveryDate && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Requested delivery: {new Date(content.requestedDeliveryDate).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Response</CardTitle>
            <CardDescription>
              Please choose whether you want to approve or decline this custom content request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => responseMutation.mutate('approved')}
                disabled={responseMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {responseMutation.isPending ? 'Submitting...' : 'Approve Request'}
              </Button>
              
              <Button
                onClick={() => responseMutation.mutate('declined')}
                disabled={responseMutation.isPending}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <XCircle className="w-5 h-5 mr-2" />
                {responseMutation.isPending ? 'Submitting...' : 'Decline Request'}
              </Button>
            </div>
            
            {responseMutation.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Failed to submit response. Please try again.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatorReview;