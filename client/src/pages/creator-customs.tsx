import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Plus,
  User,
  Calendar,
  MessageSquare,
  X,
  DollarSign,
  Link,
  Image
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Creator {
  id: number;
  username: string;
  displayName: string;
}

interface CustomContent {
  id: number;
  creatorId: number;
  chatterId: string;
  fanUsername?: string | null;
  price: string;
  description: string;
  category: string;
  platform: string;
  priority: string;
  status: string;
  rejectionReason?: string | null;
  rebuttalMessage?: string | null;
  saleDate?: Date | null;
  completionDate?: Date | null;
  isAutoRejected?: boolean | null;
  followUpDate?: Date | null;
  followUpAttempts?: number | null;
  notSoldReason?: string | null;
  tags?: any;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800"
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

export default function CreatorCustomsPage() {
  const [, params] = useRoute("/creator-customs/:creatorId");
  const creatorId = params?.creatorId ? parseInt(params.creatorId) : null;
  const { toast } = useToast();
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "content",
    priority: "medium",
    requestedBy: "",
    fanOnlyFansUrl: "",
    price: "",
    dueDate: "",
    notes: "",
    attachments: [] as File[]
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Fetch creator details
  const { data: creator, isLoading: creatorLoading } = useQuery({
    queryKey: [`/api/creators/${creatorId}`],
    enabled: !!creatorId,
  });

  // Fetch custom contents for this creator with real-time updates
  const { data: customContents = [], isLoading: contentsLoading } = useQuery({
    queryKey: ['/api/custom-contents', creatorId],
    queryFn: async () => {
      const response = await fetch(`/api/custom-contents?creatorId=${creatorId}`);
      if (!response.ok) throw new Error('Failed to fetch custom contents');
      return response.json();
    },
    enabled: !!creatorId,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/custom-contents/submit", {
        ...data,
        creatorId,
        dueDate: data.dueDate || null
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your custom content request has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/custom-contents'] });
      resetForm();
      setIsSubmitDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "content",
      priority: "medium",
      requestedBy: "",
      fanOnlyFansUrl: "",
      price: "",
      dueDate: "",
      notes: "",
      attachments: [] as File[]
    });
    setUploadedFiles([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (creatorLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation size="lg" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <XCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Creator Not Found</h1>
        <p className="text-gray-600">The requested creator could not be found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Custom Content Portal</h1>
              <p className="text-gray-600">
                Submit and track custom content requests for{" "}
                <span className="font-semibold text-primary">{creator.displayName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{creator.displayName}</span>
            </div>
          </div>
        </div>

        {/* Header with New Request Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Request Status Tracker
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              View and track all custom content requests for {creator.displayName}
            </p>
          </div>
          <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Custom Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  New Custom Content Request
                </DialogTitle>
                <DialogDescription>
                  Submit a new custom content request for {creator.displayName}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Request Title *</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of the request"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requestedBy">Requested By *</Label>
                    <Input
                      id="requestedBy"
                      placeholder="Your name or team member name"
                      value={formData.requestedBy}
                      onChange={(e) => setFormData(prev => ({ ...prev, requestedBy: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Price and Fan's OnlyFans URL Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Price (USD) *
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="100.00"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fanOnlyFansUrl" className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Fan's OnlyFans URL
                    </Label>
                    <Input
                      id="fanOnlyFansUrl"
                      type="url"
                      placeholder="https://onlyfans.com/username"
                      value={formData.fanOnlyFansUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, fanOnlyFansUrl: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Content Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="content">Regular Content</SelectItem>
                        <SelectItem value="custom_video">Custom Video</SelectItem>
                        <SelectItem value="photo_set">Photo Set</SelectItem>
                        <SelectItem value="live_stream">Live Stream</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date (Optional)</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed information about your custom content request..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[120px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information, references, or special instructions..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="min-h-[80px]"
                  />
                </div>

                {/* File Upload Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    File Upload
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center space-y-2">
                        <Image className="h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          Images, videos, or PDF files
                        </p>
                      </div>
                    </label>
                  </div>
                  
                  {/* File Preview */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700 truncate">{file.name}</span>
                              <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                  >
                    Clear Form
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <LoadingAnimation size="sm" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Track Requests Content */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Request Status Tracker
              </CardTitle>
              <CardDescription>
                View and track all custom content requests for {creator.displayName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contentsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingAnimation size="lg" />
                </div>
              ) : customContents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
                  <p className="text-gray-600 mb-4">
                    Submit your first custom content request to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Request</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customContents.map((content: CustomContent) => (
                        <TableRow key={content.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(content.status)}
                              <Badge 
                                variant="secondary" 
                                className={statusColors[content.status as keyof typeof statusColors]}
                              >
                                {content.status === 'pending_review' ? 'Pending Review' :
                                 content.status === 'approved' ? 'Approved' :
                                 content.status === 'rejected' ? 'Declined' :
                                 content.status.replace('_', ' ')}
                              </Badge>
                              {content.chatterId === "team_submission" && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Team Link
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {content.chatterId === "team_submission" 
                                  ? `Team Request: ${content.fanUsername || 'Team Member'}` 
                                  : `Request from ${content.fanUsername || 'Customer'}`}
                              </div>
                              <div className="text-sm text-gray-600 truncate max-w-xs">
                                {content.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {content.category?.replace('_', ' ') || 'Custom'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary"
                              className={priorityColors[content.priority as keyof typeof priorityColors]}
                            >
                              {content.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                {content.chatterId === "team_submission" ? content.fanUsername || 'Team' : content.fanUsername}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                {content.chatterId === "team_submission" ? 'Team Submission' : 'Direct Request'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">${content.price || '0.00'}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}