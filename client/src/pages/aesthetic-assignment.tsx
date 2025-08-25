import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Palette, User, Check, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AestheticTemplate {
  id: number;
  name: string;
  description: string;
  bannerUrl: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  animationConfig: any;
  isActive: boolean;
}

interface CreatorWithAesthetic {
  id: number;
  username: string;
  displayName: string;
  email: string;
  profileImageUrl: string;
  aestheticTemplate: AestheticTemplate | null;
  templateAssignedAt: string;
  templateAssignedBy: string;
}

export default function AestheticAssignment() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch creators with their aesthetic assignments
  const { data: creators = [], isLoading: isLoadingCreators } = useQuery({
    queryKey: ['/api/creators/with-aesthetics'],
    queryFn: () => apiRequest('/api/creators/with-aesthetics'),
  });

  // Fetch available aesthetic templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/page-templates'],
    queryFn: () => apiRequest('/api/page-templates'),
  });

  // Assign aesthetic template mutation
  const assignTemplateMutation = useMutation({
    mutationFn: async ({ creatorId, templateId }: { creatorId: number; templateId: number }) => {
      return apiRequest(`/api/creators/${creatorId}/assign-aesthetic`, {
        method: 'POST',
        body: JSON.stringify({ templateId }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creators/with-aesthetics'] });
      toast({
        title: "Success",
        description: "Aesthetic template assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign aesthetic template",
        variant: "destructive",
      });
    },
  });

  // Remove aesthetic template mutation
  const removeTemplateMutation = useMutation({
    mutationFn: async (creatorId: number) => {
      return apiRequest(`/api/creators/${creatorId}/assign-aesthetic`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creators/with-aesthetics'] });
      toast({
        title: "Success",
        description: "Aesthetic template removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove aesthetic template",
        variant: "destructive",
      });
    },
  });

  const handleAssignTemplate = async (creatorId: number) => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select an aesthetic template",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    try {
      await assignTemplateMutation.mutateAsync({
        creatorId,
        templateId: parseInt(selectedTemplate),
      });
      setSelectedTemplate('');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveTemplate = async (creatorId: number) => {
    await removeTemplateMutation.mutateAsync(creatorId);
  };

  if (isLoadingCreators || isLoadingTemplates) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <PageHeader title="Aesthetic Assignment" useBrowserBack={true} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <PageHeader title="Aesthetic Assignment" useBrowserBack={true} />
      
      <div className="space-y-6">
        {/* Template Selection Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Assign Aesthetic Template
            </CardTitle>
            <CardDescription>
              Select an aesthetic template to assign to creators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select aesthetic template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: AestheticTemplate) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: template.accentColor }}
                        />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTemplate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ 
                      backgroundColor: templates.find(t => t.id.toString() === selectedTemplate)?.accentColor 
                    }}
                  />
                  {templates.find(t => t.id.toString() === selectedTemplate)?.description}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Creators List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Creator Aesthetic Assignments
            </CardTitle>
            <CardDescription>
              View and manage aesthetic template assignments for creators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creators.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No creators found
                </div>
              ) : (
                creators.map((creator: CreatorWithAesthetic) => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={creator.profileImageUrl} />
                        <AvatarFallback>
                          {creator.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="font-medium">{creator.displayName}</div>
                        <div className="text-sm text-gray-500">@{creator.username}</div>
                        <div className="text-sm text-gray-500">{creator.email}</div>
                      </div>
                      
                      <div className="text-center">
                        {creator.aestheticTemplate ? (
                          <div className="space-y-1">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: creator.aestheticTemplate.accentColor }}
                              />
                              {creator.aestheticTemplate.name}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              Assigned {new Date(creator.templateAssignedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            No template assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAssignTemplate(creator.id)}
                        disabled={!selectedTemplate || isAssigning || assignTemplateMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Assign
                      </Button>
                      
                      {creator.aestheticTemplate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveTemplate(creator.id)}
                          disabled={removeTemplateMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}