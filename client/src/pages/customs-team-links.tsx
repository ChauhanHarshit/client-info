import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink, AlertCircle, CheckCircle2, ArrowLeft, Upload, Image, Trash2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { LoadingAnimation } from '@/components/ui/loading-animation';

interface TeamLinkToken {
  id: number;
  creatorId: number;
  token: string;
  isActive: boolean;
  createdAt: string;
  creatorName: string;
  creatorUsername: string;
  loginUsername: string;
  hasTeamLink: boolean;
  hasBanner: boolean;
}

export default function TeamLinksPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedCreatorForBanner, setSelectedCreatorForBanner] = useState<TeamLinkToken | null>(null);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: teamLinkData, isLoading, error } = useQuery({
    queryKey: ['/api/team-link-tokens'],
    enabled: !!isAuthenticated,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        console.log('🔥 Making team links API request...');
        const cacheBuster = `?_=${Date.now()}&_r=${Math.random()}`;
        const response = await fetch(`/api/team-link-tokens${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch team link tokens');
        }
        
        console.log('🔥 Team links API response object:', response);
        
        // Parse JSON from Response object
        const data = await response.json();
        console.log('🔥 Team links parsed data:', data);
        console.log('🔥 Team links data type:', typeof data, 'Is array:', Array.isArray(data));
        
        // Ensure we return an array even if API returns something else
        if (Array.isArray(data)) {
          console.log('✅ Returning array with', data.length, 'items');
          return data;
        } else if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) {
          console.log('✅ Returning nested array with', (data as any).data.length, 'items');
          return (data as any).data;
        } else {
          console.warn('⚠️ API returned non-array data, returning empty array:', data);
          return [];
        }
      } catch (error) {
        console.error('❌ Team links API error:', error);
        return [];
      }
    },
  });



  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(text);
      toast({
        title: "Copied!",
        description: "Team link copied to clipboard",
      });
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  // Banner upload mutation
  const uploadBannerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCreatorForBanner) throw new Error("No creator selected");
      if (!selectedFile) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append('banner', selectedFile);
      formData.append('token', selectedCreatorForBanner.token);
      
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch('/api/team-link-banners', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload banner: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Banner uploaded successfully",
      });
      setBannerDialogOpen(false);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/team-link-tokens'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload banner",
        variant: "destructive",
      });
    }
  });

  // Banner delete mutation
  const deleteBannerMutation = useMutation({
    mutationFn: async (token: string) => {
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/team-link-banners/${token}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete banner: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Banner removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team-link-tokens'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove banner",
        variant: "destructive",
      });
    }
  });

  // Team link delete mutation
  const deleteTeamLinkMutation = useMutation({
    mutationFn: async (teamLinkId: number) => {
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      const jwtToken = localStorage.getItem('creator_jwt_token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const response = await fetch(`/api/team-link-tokens/${teamLinkId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete team link: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Team link deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team-link-tokens'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team link",
        variant: "destructive",
      });
    }
  });

  // First deduplicate team links, then filter based on search query
  const filteredTeamLinks = useMemo(() => {
    if (!teamLinkData) return [];
    
    // Ensure teamLinkData is an array before processing
    const dataArray = Array.isArray(teamLinkData) ? teamLinkData : [];
    
    if (dataArray.length === 0) return [];
    
    // Remove duplicates based on token (most unique identifier)
    const uniqueLinks = dataArray.reduce((acc: TeamLinkToken[], current: TeamLinkToken) => {
      const existingIndex = acc.findIndex(item => item.token === current.token);
      if (existingIndex === -1) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    // Apply search filter
    if (!searchQuery.trim()) return uniqueLinks;
    
    const query = searchQuery.toLowerCase();
    return uniqueLinks.filter((link: TeamLinkToken) => (
      link.creatorName?.toLowerCase().includes(query) ||
      link.creatorUsername?.toLowerCase().includes(query) ||
      link.loginUsername?.toLowerCase().includes(query)
    ));
  }, [teamLinkData, searchQuery]);

  const handleBannerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validateAndSelectFile = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPG, PNG, or GIF file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      validateAndSelectFile(file);
    }
  }, [validateAndSelectFile]);

  const openBannerDialog = (creator: TeamLinkToken) => {
    setSelectedCreatorForBanner(creator);
    setBannerDialogOpen(true);
  };

  const closeBannerDialog = () => {
    setBannerDialogOpen(false);
    setSelectedFile(null);
    setSelectedCreatorForBanner(null);
  };

  const handleSaveBanner = () => {
    if (selectedFile) {
      uploadBannerMutation.mutate();
    }
  };

  console.log("🔍 Team Links Debug - Auth:", isAuthenticated, "Loading:", isLoading, "Data:", teamLinkData, "Data type:", typeof teamLinkData, "Is Array:", Array.isArray(teamLinkData), "Filtered Length:", filteredTeamLinks.length, "Error:", error);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access team links.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingAnimation size="lg" />
          <p className="mt-6 text-gray-600">Loading team links...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Team Links</h2>
          <p className="text-gray-600 mb-4">Please try refreshing the page.</p>
          <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded">
            <strong>Error details:</strong> {error?.message || 'Unknown error'}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader
          title="Team Links"
          description="Manage unique public form links for each creator's team"
          showBackButton={true}
          useBrowserBack={true}
        />
        
        <div className="max-w-7xl mx-auto p-6">



        {/* Creator Team Links Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Creator Team Links</CardTitle>
            <CardDescription>
              Each creator has a unique public form link that their team uses to submit custom content orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search creators by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    title="Clear search"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-500">
                  Showing {filteredTeamLinks.length} of {Array.isArray(teamLinkData) ? teamLinkData.length : 0} creators
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto table-scroll-container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Login Username</TableHead>
                    <TableHead>Team Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeamLinks.length === 0 && !searchQuery && !isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="space-y-2">
                          <div className="text-gray-500">No team links found</div>
                          <div className="text-xs text-gray-400">
                            Debug: Auth={isAuthenticated.toString()}, Loading={isLoading.toString()}, 
                            Data type={typeof teamLinkData}, Array={Array.isArray(teamLinkData).toString()}
                          </div>
                          <Button 
                            onClick={() => {
                              queryClient.invalidateQueries({ queryKey: ['/api/team-link-tokens'] });
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Refresh Data
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTeamLinks.length === 0 && searchQuery ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No creators found matching "{searchQuery}"
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeamLinks.map((link: any) => (
                      <TableRow key={link.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{link.creatorName}</div>
                          <div className="text-sm text-gray-500">@{link.creatorUsername}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {link.loginUsername}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {window.location.host}/team-form/{link.token}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`${window.location.protocol}//${window.location.host}/team-form/${link.token}`)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={link.isActive ? "default" : "secondary"}>
                          {link.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {new Date(link.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`${window.location.protocol}//${window.location.host}/team-form/${link.token}`, '_blank')}
                            title="View Team Portal"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <div
                            className={`relative ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedCreatorForBanner(link);
                              setIsDragOver(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragOver(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragOver(false);
                              setSelectedCreatorForBanner(link);
                              
                              const files = e.dataTransfer.files;
                              if (files.length > 0) {
                                const file = files[0];
                                validateAndSelectFile(file);
                              }
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openBannerDialog(link)}
                              title="Manage Banner (or drag & drop image)"
                              className={isDragOver ? 'bg-blue-50' : ''}
                            >
                              <Image className="w-4 h-4" />
                            </Button>
                          </div>
                          {link.hasBanner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteBannerMutation.mutate(link.token)}
                              title="Remove Banner"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete the team link for ${link.creatorName}? This action cannot be undone and will permanently remove their team submission form.`)) {
                                deleteTeamLinkMutation.mutate(link.id);
                              }
                            }}
                            title="Delete Team Link"
                            className="text-red-600 hover:text-red-700"
                            disabled={deleteTeamLinkMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* How It Works Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>How Team Links Work</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">For Teams:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Visit the unique link for your creator</li>
                  <li>• Fill out custom content request form</li>
                  <li>• Submit order with all required details</li>
                  <li>• Track submission status in real-time</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Order Status Types:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <Badge variant="secondary" className="text-xs">Pending</Badge> - Awaiting review</li>
                  <li>• <Badge variant="default" className="text-xs">Accepted</Badge> - Approved for production</li>
                  <li>• <Badge variant="destructive" className="text-xs">Declined</Badge> - Rejected with reason</li>
                  <li>• <Badge variant="outline" className="text-xs">More Info</Badge> - Additional details needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

      {/* Banner Management Dialog */}
      <Dialog open={bannerDialogOpen} onOpenChange={closeBannerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Manage Banner for {selectedCreatorForBanner?.creatorName}
            </DialogTitle>
            <DialogDescription>
              Upload a banner image for {selectedCreatorForBanner?.creatorName}'s team portal page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Banner Image</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className={`h-8 w-8 mx-auto mb-2 ${
                  isDragOver ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <p className={`text-sm mb-2 ${
                  isDragOver ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {isDragOver ? 'Drop your image here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG, or GIF (max 10MB)
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBannerUpload}
                  className="mt-3"
                >
                  Select File
                </Button>
              </div>

              {selectedFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">File Selected:</span>
                    <span className="text-sm text-green-700">{selectedFile.name}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <strong>Note:</strong> The banner will appear at the top of {selectedCreatorForBanner?.creatorName}'s team portal page. 
              It's recommended to use a high-quality image with dimensions of at least 1200x400 pixels for best results.
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={closeBannerDialog}
                disabled={uploadBannerMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBanner}
                disabled={!selectedFile || uploadBannerMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploadBannerMutation.isPending ? "Uploading..." : "Save Banner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}