import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Eye, Trash2, Copy, Palette, Monitor, Smartphone, Upload, X, Sparkles, Image, FileType, Zap, Download, ArrowLeft, Save, RefreshCw, Settings, Check, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Schema definitions
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  backgroundColor: z.string().min(1, "Background color is required"),
  textColor: z.string().min(1, "Text color is required"), 
  accentColor: z.string().min(1, "Accent color is required"),
  bannerUrl: z.string().optional(),
  animationConfig: z.object({
    enabled: z.boolean()
  }).optional()
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface PageTemplate {
  id: number;
  name: string;
  description?: string;
  background_color?: string;
  backgroundColor?: string;
  text_color?: string;
  textColor?: string;
  accent_color?: string;
  accentColor?: string;
  banner_url?: string;
  bannerUrl?: string;
  animation_config?: any;
  animationConfig?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface AnimationLibrary {
  id: number;
  name: string;
  category: string;
  fileUrl: string;
  thumbnailUrl?: string;
  animationType: string;
  duration?: number;
}

interface BannerLibrary {
  id: number;
  name: string;
  description?: string;
  bannerType: string;
  fileUrl: string;
  thumbnailUrl?: string;
  dimensions?: string;
  fileFormat: string;
  fileSize?: number;
  isAnimated: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Live preview component for the create template dialog
const LiveTemplatePreview = ({ 
  template, 
  uploadedBanner, 
  selectedBanner, 
  uploadedAnimations, 
  selectedAnimations 
}: {
  template: {
    name: string;
    description?: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    bannerUrl?: string;
  };
  uploadedBanner: File | null;
  selectedBanner: BannerLibrary | null;
  uploadedAnimations: File[];
  selectedAnimations: {[placement: string]: AnimationLibrary};
}) => {
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  // Create preview URL for uploaded banner
  useEffect(() => {
    if (uploadedBanner) {
      const url = URL.createObjectURL(uploadedBanner);
      setBannerPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setBannerPreviewUrl(null);
    }
  }, [uploadedBanner]);

  // Determine which banner to show
  const bannerToShow = bannerPreviewUrl || selectedBanner?.fileUrl || template.bannerUrl;

  // Animation indicators
  const hasAnimations = uploadedAnimations.length > 0 || Object.keys(selectedAnimations).length > 0;

  return (
    <div 
      className="w-full h-full rounded-lg overflow-hidden relative transition-all duration-300"
      style={{
        backgroundColor: template.backgroundColor || '#ffffff',
        color: template.textColor || '#000000'
      }}
    >
      {/* Banner Section */}
      {bannerToShow && (
        <div className="w-full h-20 relative overflow-hidden">
          <img
            src={bannerToShow}
            alt="Template banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      {/* Content Section */}
      <div className="p-4 space-y-3">
        <div>
          <h3 
            className="text-lg font-semibold truncate"
            style={{ color: template.textColor || '#000000' }}
          >
            {template.name || 'New Template'}
          </h3>
          {template.description && (
            <p className="text-sm opacity-70 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>

        {/* Sample content blocks */}
        <div className="space-y-2">
          <div 
            className="h-2 rounded-full"
            style={{ backgroundColor: template.accentColor || '#3b82f6' }}
          />
          <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full w-3/4" />
          <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full w-1/2" />
        </div>

        {/* Animation indicators */}
        {hasAnimations && (
          <div className="absolute bottom-2 right-2 flex space-x-1">
            {uploadedAnimations.length > 0 && (
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center animate-pulse">
                <Zap className="w-3 h-3 text-white" />
              </div>
            )}
            {Object.keys(selectedAnimations).length > 0 && (
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        )}

        {/* Banner indicator */}
        {bannerToShow && (
          <div className="absolute top-2 left-2">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Image className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Template Editor Component
function TemplateEditor({ template, onBack }: { template: PageTemplate, onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('colors');
  const [selectedBanner, setSelectedBanner] = useState<BannerLibrary | null>(null);
  const [selectedAnimations, setSelectedAnimations] = useState<{[placement: string]: AnimationLibrary}>({});
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [showAnimationDialog, setShowAnimationDialog] = useState(false);
  const [animationPlacement, setAnimationPlacement] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadType, setUploadType] = useState<'banner' | 'animation'>('banner');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLoadingTest, setShowLoadingTest] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    name: '',
    category: '',
    animationType: '',
    file: null as File | null,
    previewImage: null as File | null
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template.name,
      description: template.description || '',
      backgroundColor: template.backgroundColor,
      textColor: template.textColor,
      accentColor: template.accentColor,
      bannerUrl: template.bannerUrl || '',
      animationConfig: template.animationConfig || { enabled: false }
    }
  });

  // Reset form values when template changes
  useEffect(() => {
    console.log('Template Editor - template data:', template);
    
    const formValues = {
      name: template.name,
      description: template.description || '',
      backgroundColor: template.background_color || template.backgroundColor,
      textColor: template.text_color || template.textColor,
      accentColor: template.accent_color || template.accentColor,
      bannerUrl: template.banner_url || template.bannerUrl || '',
      animationConfig: template.animation_config || template.animationConfig || { enabled: false }
    };
    
    console.log('Template Editor - resetting form with values:', formValues);
    
    form.reset(formValues);
  }, [template, form]);

  // Fetch libraries
  const { data: animationLibrary } = useQuery({
    queryKey: ['/api/animation-library'],
  });

  const { data: bannerLibrary } = useQuery({
    queryKey: ['/api/banner-library'],
  });

  // Load existing template banner
  useEffect(() => {
    const bannerUrl = template.banner_url || template.bannerUrl;
    console.log('Banner loading effect - template data:', template);
    console.log('Banner loading effect - bannerUrl:', bannerUrl);
    console.log('Banner loading effect - bannerLibrary:', bannerLibrary);
    
    if (bannerUrl && Array.isArray(bannerLibrary) && bannerLibrary.length > 0) {
      console.log('Banner loading effect - searching for banner with fileUrl:', bannerUrl);
      const matchingBanner = bannerLibrary.find((banner: BannerLibrary) => 
        banner.fileUrl === bannerUrl
      );
      console.log('Banner loading effect - matching banner found:', matchingBanner);
      if (matchingBanner) {
        setSelectedBanner(matchingBanner);
        console.log('Banner loading effect - selectedBanner set to:', matchingBanner);
      }
    }
  }, [template.banner_url, template.bannerUrl, bannerLibrary]);

  // Load existing template animations
  useEffect(() => {
    const loadTemplateAnimations = async () => {
      try {
        const response = await fetch(`/api/page-templates/${template.id}/animations`);
        if (response.ok) {
          const templateAnimations = await response.json();
          console.log('Raw animation data:', templateAnimations);
          
          if (templateAnimations && Array.isArray(templateAnimations)) {
            const animationsMap: {[placement: string]: AnimationLibrary} = {};
            templateAnimations.forEach((ta: any) => {
              console.log('Processing animation item:', ta);
              
              // Handle the joined data structure from the API
              const assignment = ta.template_animation_assignments;
              const animation = ta.animation_library;
              
              console.log('Assignment:', assignment);
              console.log('Animation:', animation);
              
              if (assignment && animation && assignment.placement) {
                animationsMap[assignment.placement] = {
                  id: animation.id,
                  name: animation.name,
                  category: animation.category,
                  animationType: animation.animationType,
                  fileUrl: animation.fileUrl,
                  thumbnailUrl: animation.thumbnailUrl,
                  duration: animation.duration
                };
                console.log('Added animation to map:', assignment.placement, animation.name);
              }
            });
            console.log('Final animations map:', animationsMap);
            console.log('Has boxOutline?', !!animationsMap.boxOutline);
            console.log('Has box_outline?', !!animationsMap.box_outline);
            setSelectedAnimations(animationsMap);
          }
        }
      } catch (error) {
        console.error('Failed to load template animations:', error);
      }
    };

    loadTemplateAnimations();
  }, [template.id]);

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      // Map camelCase to snake_case for database fields
      const dbData = {
        name: data.name,
        description: data.description,
        background_color: data.backgroundColor,
        text_color: data.textColor,
        accent_color: data.accentColor,
        banner_url: data.bannerUrl,
        animation_config: data.animationConfig
      };
      
      console.log('Template Editor - sending update data:', dbData);
      console.log('Template Editor - form data received:', data);
      
      const response = await fetch(`/api/page-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData)
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Template updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/page-templates'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (data: TemplateFormData) => {
    updateTemplateMutation.mutate(data);
  };

  const handleAnimationSelect = async (animation: AnimationLibrary, placement: string) => {
    const previousAnimation = selectedAnimations[placement];
    
    try {
      // Save animation assignment to database
      const response = await fetch(`/api/page-templates/${template.id}/animations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animationId: animation.id,
          placement: placement,
          settings: {}
        })
      });

      if (!response.ok) {
        throw new Error('Failed to assign animation');
      }

      // Update local state only after successful save
      setSelectedAnimations(prev => ({
        ...prev,
        [placement]: animation
      }));
      setShowAnimationDialog(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/page-templates/${template.id}/animations`] });
      
      if (previousAnimation) {
        toast({ 
          title: "Animation replaced", 
          description: `${previousAnimation.name} replaced with ${animation.name} for ${placement}` 
        });
      } else {
        toast({ 
          title: "Animation applied", 
          description: `${animation.name} applied to ${placement}` 
        });
      }
    } catch (error) {
      console.error('Failed to assign animation:', error);
      toast({
        title: "Error",
        description: "Failed to assign animation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleBannerSelect = (banner: BannerLibrary) => {
    const previousBanner = selectedBanner;
    setSelectedBanner(banner);
    form.setValue('bannerUrl', banner.fileUrl);
    setShowBannerDialog(false);
    
    console.log('Banner selected - setting form value:', banner.fileUrl);
    
    if (previousBanner) {
      toast({ 
        title: "Banner replaced", 
        description: `${previousBanner.name} replaced with ${banner.name}` 
      });
    } else {
      toast({ 
        title: "Banner applied", 
        description: `${banner.name} has been applied to your template` 
      });
    }
  };

  const removeBanner = () => {
    if (selectedBanner) {
      toast({ 
        title: "Banner removed", 
        description: `${selectedBanner.name} has been removed` 
      });
    }
    setSelectedBanner(null);
    form.setValue('bannerUrl', '');
  };

  const removeAnimation = async (placement: string) => {
    const animationToRemove = selectedAnimations[placement];
    if (!animationToRemove) return;

    try {
      // Remove animation assignment from database
      const response = await fetch(`/api/page-templates/${template.id}/animations/${placement}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove animation');
      }

      // Update local state only after successful removal
      setSelectedAnimations(prev => {
        const newAnimations = { ...prev };
        delete newAnimations[placement];
        return newAnimations;
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/page-templates/${template.id}/animations`] });
      
      toast({ 
        title: "Animation removed", 
        description: `${animationToRemove.name} has been removed from ${placement}` 
      });
    } catch (error) {
      console.error('Failed to remove animation:', error);
      toast({
        title: "Error",
        description: "Failed to remove animation. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Upload mutations
  const uploadBannerMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; file: File; animationType?: string }) => {
      // Convert file to data URL
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(data.file);
      });

      const response = await fetch('/api/banner-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          fileUrl: fileDataUrl,
          bannerType: data.category,
          description: '',
          fileFormat: data.file.type.split('/')[1] || 'jpg',
          isAnimated: data.file.type.includes('gif')
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload banner');
      }
      return response.json();
    },
    onSuccess: (uploadedBanner) => {
      toast({ title: "Banner uploaded and applied successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/banner-library'] });
      
      // Auto-select the newly uploaded banner
      setSelectedBanner(uploadedBanner);
      form.setValue('bannerUrl', uploadedBanner.fileUrl);
      
      setShowUploadDialog(false);
      setUploadFormData({ name: '', category: '', animationType: '', file: null, previewImage: null });
      setHasUnsavedChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const uploadAnimationMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; animationType: string; file: File; previewImage: File }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('category', data.category);
      formData.append('animationType', data.animationType);
      formData.append('description', '');
      formData.append('file', data.file);
      formData.append('previewImage', data.previewImage);

      const response = await fetch('/api/animation-library', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload animation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Animation uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/animation-library'] });
      setShowUploadDialog(false);
      setUploadFormData({ name: '', category: '', animationType: '', file: null, previewImage: null });
      setHasUnsavedChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      setUploadFormData(prev => ({ ...prev, file }));
      setShowUploadDialog(true);
    }
  };

  const handleFileUpload = () => {
    if (!uploadFormData.file || !uploadFormData.name || !uploadFormData.category) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (uploadType === 'animation' && !uploadFormData.animationType) {
      toast({ title: "Error", description: "Please select an animation type", variant: "destructive" });
      return;
    }

    if (uploadType === 'animation' && !uploadFormData.previewImage) {
      toast({ title: "Error", description: "Please upload a preview image for the animation", variant: "destructive" });
      return;
    }

    if (uploadType === 'banner') {
      const uploadData = {
        name: uploadFormData.name,
        category: uploadFormData.category,
        file: uploadFormData.file
      };
      uploadBannerMutation.mutate(uploadData);
    } else {
      const uploadData = {
        name: uploadFormData.name,
        category: uploadFormData.category,
        animationType: uploadFormData.animationType,
        file: uploadFormData.file,
        previewImage: uploadFormData.previewImage!
      };
      uploadAnimationMutation.mutate(uploadData);
    }
  };

  const watchedValues = form.watch();

  // Check if form has unsaved changes
  const checkForUnsavedChanges = () => {
    return !!(uploadFormData.name || uploadFormData.category || uploadFormData.animationType || uploadFormData.file || uploadFormData.previewImage);
  };

  // Handle dialog close with confirmation
  const handleCloseUploadDialog = () => {
    if (checkForUnsavedChanges()) {
      setShowConfirmDialog(true);
    } else {
      setShowUploadDialog(false);
      setUploadFormData({ name: '', category: '', animationType: '', file: null, previewImage: null });
      setHasUnsavedChanges(false);
    }
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    setShowUploadDialog(false);
    setShowConfirmDialog(false);
    setUploadFormData({ name: '', category: '', animationType: '', file: null, previewImage: null });
    setHasUnsavedChanges(false);
  };

  // Handle save changes (proceed with upload)
  const handleSaveChanges = () => {
    setShowConfirmDialog(false);
    // Keep the dialog open so user can complete the upload
  };

  // Track changes in upload form
  useEffect(() => {
    setHasUnsavedChanges(checkForUnsavedChanges());
  }, [uploadFormData]);

  // Auto-hide loading test after 3 seconds
  useEffect(() => {
    if (showLoadingTest) {
      const timer = setTimeout(() => {
        setShowLoadingTest(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showLoadingTest]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Template: {template.name}</h1>
            <p className="text-muted-foreground">Customize your template design</p>
          </div>
        </div>
        <Button 
          onClick={form.handleSubmit(handleSubmit)}
          disabled={updateTemplateMutation.isPending}
          className="gap-2"
        >
          {updateTemplateMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Editor */}
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex border-b">
            {[
              { id: 'colors', label: 'Colors', icon: Palette },
              { id: 'banner', label: 'Banner', icon: Image },
              { id: 'animations', label: 'Animations', icon: Sparkles },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  
                  {/* Colors Tab */}
                  {activeTab === 'colors' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Color Scheme
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="backgroundColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Background Color</FormLabel>
                              <div className="flex gap-3">
                                <FormControl>
                                  <Input type="color" {...field} className="w-16 h-10" />
                                </FormControl>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="#ffffff"
                                    onChange={(e) => {
                                      let value = e.target.value;
                                      if (value && !value.startsWith('#')) {
                                        value = '#' + value;
                                      }
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="textColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Text Color</FormLabel>
                              <div className="flex gap-3">
                                <FormControl>
                                  <Input type="color" {...field} className="w-16 h-10" />
                                </FormControl>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="#000000"
                                    onChange={(e) => {
                                      let value = e.target.value;
                                      if (value && !value.startsWith('#')) {
                                        value = '#' + value;
                                      }
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="accentColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Accent Color</FormLabel>
                              <div className="flex gap-3">
                                <FormControl>
                                  <Input type="color" {...field} className="w-16 h-10" />
                                </FormControl>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="#0066ff"
                                    onChange={(e) => {
                                      let value = e.target.value;
                                      if (value && !value.startsWith('#')) {
                                        value = '#' + value;
                                      }
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Banner Tab */}
                  {activeTab === 'banner' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Image className="h-5 w-5" />
                          Background Banner
                        </h3>
                        <Button 
                          type="button"
                          size="sm"
                          onClick={() => {
                            setUploadType('banner');
                            setShowUploadDialog(true);
                          }}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload New
                        </Button>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="bannerUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner URL</FormLabel>
                            <div className="flex gap-3">
                              <FormControl>
                                <Input {...field} placeholder="https://..." />
                              </FormControl>
                              <Button 
                                type="button"
                                onClick={() => setShowBannerDialog(true)}
                                variant="outline"
                                size="sm"
                              >
                                Browse Library
                              </Button>
                              {selectedBanner && (
                                <Button 
                                  type="button"
                                  onClick={removeBanner}
                                  variant="destructive"
                                  size="sm"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Current Banner Status */}
                      {selectedBanner && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              Current Banner: {selectedBanner.name}
                            </span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            Category: {selectedBanner.category}
                          </p>
                        </div>
                      )}

                      {/* Drag and Drop Zone */}
                      <div 
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Drag and drop banner images here, or click to upload
                        </p>
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setUploadType('banner');
                            setShowUploadDialog(true);
                          }}
                        >
                          Choose Files
                        </Button>
                      </div>

                      {watchedValues.bannerUrl && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Preview:</p>
                          <div 
                            className="w-full h-32 rounded-lg border bg-cover bg-center"
                            style={{ backgroundImage: `url(${watchedValues.bannerUrl})` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Animations Tab */}
                  {activeTab === 'animations' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Animations
                        </h3>
                        <Button 
                          type="button"
                          size="sm"
                          onClick={() => {
                            setUploadType('animation');
                            setShowUploadDialog(true);
                          }}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload New
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {['title', 'loading', 'boxOutline'].map(placement => (
                          <div key={placement} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium capitalize">{placement.replace(/([A-Z])/g, ' $1')}</p>
                              {selectedAnimations[placement] ? (
                                <p className="text-sm text-muted-foreground">
                                  {selectedAnimations[placement].name}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">No animation selected</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAnimationPlacement(placement);
                                  setShowAnimationDialog(true);
                                }}
                              >
                                {selectedAnimations[placement] ? 'Change' : 'Select'}
                              </Button>
                              {selectedAnimations[placement] && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeAnimation(placement)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Animation Upload Zone */}
                      <div 
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Drag and drop animation files here (CSS, JSON, GIF, MP4)
                        </p>
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setUploadType('animation');
                            setShowUploadDialog(true);
                          }}
                        >
                          Choose Files
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Settings Tab */}
                  {activeTab === 'settings' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Template Settings
                      </h3>
                      
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Creator Page Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Creator Page Preview</h3>
            <Button 
              onClick={() => setShowLoadingTest(true)}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Test Refresh
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 relative">
              {/* Exact replica of Content & Comms Creator Page layout */}
              <div 
                className="min-h-screen relative" 
                style={{
                  backgroundColor: watchedValues.backgroundColor || '#ffffff',
                  color: watchedValues.textColor || '#000000'
                }}
              >
                {/* Loading overlay for testing - shows within preview */}
                {showLoadingTest && (
                  <div 
                    className="absolute inset-0 z-50 flex items-center justify-center"
                    style={{
                      backgroundColor: watchedValues.backgroundColor || '#ffffff'
                    }}
                  >
                    {selectedAnimations.loading && selectedAnimations.loading.fileUrl ? (
                      <div className="flex flex-col items-center gap-4">
                        <img
                          src={selectedAnimations.loading.fileUrl}
                          alt="Loading animation"
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: watchedValues.accentColor || '#3b82f6' }} />
                        <p className="text-sm" style={{ color: watchedValues.textColor || '#000000' }}>Loading...</p>
                      </div>
                    )}
                  </div>
                )}
                {/* Hero Section - Exact match to creator-page-view.tsx */}
                <div 
                  className="text-white relative overflow-hidden"
                  style={{
                    backgroundImage: (selectedBanner?.fileUrl || watchedValues.bannerUrl) 
                      ? `url(${selectedBanner?.fileUrl || watchedValues.bannerUrl}), linear-gradient(135deg, ${watchedValues.backgroundColor || '#a855f7'}, ${watchedValues.accentColor || '#3b82f6'})`
                      : `linear-gradient(135deg, ${watchedValues.backgroundColor || '#a855f7'}, ${watchedValues.accentColor || '#3b82f6'})`,
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat'
                  }}
                >
                  <div className="absolute inset-0 bg-black/20"></div>
                  
                  {/* Title animation background overlay */}
                  {(() => {
                    const titleAnimation = Object.values(selectedAnimations).find(anim => 
                      anim.category === 'title' || anim.name.toLowerCase().includes('title')
                    );
                    console.log('Creator page preview - checking for title animation:', {
                      selectedAnimations,
                      allAnimationNames: Object.values(selectedAnimations).map(a => a.name),
                      titleAnimation,
                      hasFileUrl: !!titleAnimation?.fileUrl
                    });
                    
                    if (titleAnimation?.fileUrl) {
                      console.log('Rendering title animation background:', titleAnimation.name, titleAnimation.fileUrl.substring(0, 50) + '...');
                      return (
                        <div 
                          className="absolute inset-0 opacity-40"
                          style={{
                            backgroundImage: `url(${titleAnimation.fileUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            filter: 'blur(1px) brightness(0.8)',
                            zIndex: 1
                          }}
                        />
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
                    {/* Creator Avatar */}
                    <div className="mb-6">
                      <div className="w-24 h-24 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                        <span className="text-white text-2xl font-bold">JM</span>
                      </div>
                    </div>
                    
                    {/* Creator Name and Title with Animation */}
                    <h1 className="text-4xl font-bold mb-2 relative inline-block">
                      {/* Title animation backgrounds - positioned around the text only */}
                      {selectedAnimations.title && selectedAnimations.title.fileUrl && (
                        <div className="absolute inset-0 -inset-x-4 -inset-y-2 rounded overflow-hidden" style={{ zIndex: 0 }}>
                          {(() => {
                            const fileUrl = selectedAnimations.title.fileUrl;
                            const isGif = fileUrl.toLowerCase().includes('.gif') || fileUrl.includes('data:image/gif');
                            const isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm') || fileUrl.includes('data:video/');
                            const isLottie = fileUrl.toLowerCase().includes('.json') || fileUrl.toLowerCase().includes('lottie');
                            
                            if (isVideo) {
                              return (
                                <video
                                  className="w-full h-full object-cover opacity-80"
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  style={{ 
                                    backgroundColor: 'transparent',
                                    filter: 'brightness(1.2)'
                                  }}
                                >
                                  <source src={fileUrl} type="video/mp4" />
                                </video>
                              );
                            } else if (isGif || isLottie) {
                              return (
                                <img
                                  src={fileUrl}
                                  className="w-full h-full object-cover opacity-80"
                                  style={{ 
                                    backgroundColor: 'transparent',
                                    filter: 'brightness(1.2)'
                                  }}
                                  alt="Title animation"
                                />
                              );
                            } else {
                              return (
                                <div 
                                  className="w-full h-full opacity-80"
                                  style={{
                                    backgroundImage: `url(${fileUrl})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundColor: 'transparent',
                                    filter: 'brightness(1.2)'
                                  }}
                                />
                              );
                            }
                          })()}
                        </div>
                      )}
                      
                      <span 
                        className="relative z-10"
                        style={{
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                          color: watchedValues.textColor || '#ffffff'
                        }}
                      >
                        Jade Moon - Creator Page
                      </span>
                    </h1>
                    <p className="text-xl text-white/90 mb-6">
                      Personalized content page for Jade Moon
                    </p>
                    
                    {/* Status Badges */}
                    <div className="flex justify-center space-x-3">
                      <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full border border-white/30">
                        👤 Active Creator
                      </span>
                      <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full border border-white/30">
                        ⭐ Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Sections - Exact match to creator-page-view.tsx */}
                <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                  {/* Priority Content Section */}
                  <div className="space-y-4">
                    <div className="relative">
                      {/* Animated border wrapper */}
                      {selectedAnimations.boxOutline && selectedAnimations.boxOutline.fileUrl && (
                        <div 
                          className="absolute inset-0 rounded-lg overflow-hidden"
                          style={{ 
                            zIndex: 0,
                            margin: '-4px', // Expand beyond the content box
                            padding: '4px'  // Create border thickness
                          }}
                        >
                          {(() => {
                            const fileUrl = selectedAnimations.boxOutline.fileUrl;
                            const isGif = fileUrl.toLowerCase().includes('.gif') || fileUrl.includes('data:image/gif');
                            const isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm') || fileUrl.includes('data:video/');
                            
                            if (isVideo) {
                              return (
                                <video
                                  className="w-full h-full object-cover"
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  style={{ 
                                    backgroundColor: 'transparent',
                                    borderRadius: '12px'
                                  }}
                                >
                                  <source src={fileUrl} type="video/mp4" />
                                </video>
                              );
                            } else if (isGif) {
                              return (
                                <img
                                  src={fileUrl}
                                  className="w-full h-full object-cover"
                                  style={{ 
                                    backgroundColor: 'transparent',
                                    borderRadius: '12px'
                                  }}
                                  alt="Box outline animation"
                                />
                              );
                            } else {
                              return (
                                <div 
                                  className="w-full h-full"
                                  style={{
                                    backgroundImage: `url(${fileUrl})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundColor: 'transparent',
                                    borderRadius: '12px'
                                  }}
                                />
                              );
                            }
                          })()}
                        </div>
                      )}
                      
                      <div 
                        className={`flex items-center space-x-3 rounded-lg p-6 shadow-sm relative ${
                          selectedAnimations.boxOutline ? 'border-transparent' : 'border'
                        }`}
                        style={{
                          backgroundColor: watchedValues.backgroundColor || '#ffffff',
                          borderColor: selectedAnimations.boxOutline 
                            ? 'transparent' 
                            : (watchedValues.accentColor || '#fecaca'),
                          color: watchedValues.textColor || '#000000',
                          zIndex: 1
                        }}
                      >
                      
                      {/* Animated border outline only */}
                      {selectedAnimations.boxOutline && selectedAnimations.boxOutline.fileUrl && (
                        <div 
                          className="absolute pointer-events-none"
                          style={{ 
                            top: '-8px',
                            left: '-8px',
                            right: '-8px',
                            bottom: '-8px',
                            zIndex: 0,
                            borderRadius: '16px',
                            padding: '8px'
                          }}
                        >
                          {(() => {
                            const fileUrl = selectedAnimations.boxOutline.fileUrl;
                            const isGif = fileUrl.toLowerCase().includes('.gif') || fileUrl.includes('data:image/gif');
                            const isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm') || fileUrl.includes('data:video/');
                            
                            if (isGif) {
                              return (
                                <div 
                                  className="w-full h-full"
                                  style={{
                                    borderRadius: '16px',
                                    border: '4px solid transparent',
                                    background: `linear-gradient(white, white) padding-box, url(${fileUrl}) border-box`,
                                    backgroundSize: 'cover',
                                    backgroundRepeat: 'repeat'
                                  }}
                                />
                              );
                            } else if (isVideo) {
                              return (
                                <div 
                                  className="w-full h-full"
                                  style={{
                                    borderRadius: '16px',
                                    border: '4px solid transparent',
                                    background: `linear-gradient(white, white) padding-box, url(${fileUrl}) border-box`,
                                    backgroundSize: 'cover'
                                  }}
                                />
                              );
                            } else {
                              return (
                                <div 
                                  className="w-full h-full"
                                  style={{
                                    borderRadius: '16px',
                                    border: '4px solid transparent',
                                    background: `linear-gradient(white, white) padding-box, url(${fileUrl}) border-box`,
                                    backgroundSize: 'cover'
                                  }}
                                />
                              );
                            }
                          })()}
                        </div>
                      )}
                      
                      
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center relative z-10"
                        style={{
                          backgroundColor: (watchedValues.accentColor || '#dc2626') + '20',
                        }}
                      >
                        <FileText 
                          className="w-6 h-6"
                          style={{ color: watchedValues.accentColor || '#dc2626' }}
                        />
                      </div>
                      <div className="flex-1 relative z-10">
                        <h2 className="text-xl font-semibold relative inline-block">
                          {/* Title animation backgrounds - positioned around the text only */}
                          {selectedAnimations.title && selectedAnimations.title.fileUrl && (
                            <div className="absolute inset-0 -inset-x-2 -inset-y-1 rounded overflow-hidden" style={{ zIndex: 0 }}>
                              {(() => {
                                const fileUrl = selectedAnimations.title.fileUrl;
                                const isGif = fileUrl.toLowerCase().includes('.gif') || fileUrl.includes('data:image/gif');
                                const isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm') || fileUrl.includes('data:video/');
                                const isLottie = fileUrl.toLowerCase().includes('.json') || fileUrl.toLowerCase().includes('lottie');
                                
                                if (isVideo) {
                                  return (
                                    <video
                                      className="w-full h-full object-cover opacity-60"
                                      autoPlay
                                      loop
                                      muted
                                      playsInline
                                      style={{ 
                                        backgroundColor: 'transparent',
                                        filter: 'brightness(1.1)'
                                      }}
                                    >
                                      <source src={fileUrl} type="video/mp4" />
                                    </video>
                                  );
                                } else if (isGif || isLottie) {
                                  return (
                                    <img
                                      src={fileUrl}
                                      className="w-full h-full object-cover opacity-60"
                                      style={{ 
                                        backgroundColor: 'transparent',
                                        filter: 'brightness(1.1)'
                                      }}
                                      alt="Title animation"
                                    />
                                  );
                                } else {
                                  return (
                                    <div 
                                      className="w-full h-full opacity-60"
                                      style={{
                                        backgroundImage: `url(${fileUrl})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundColor: 'transparent',
                                        filter: 'brightness(1.1)'
                                      }}
                                    />
                                  );
                                }
                              })()}
                            </div>
                          )}
                          
                          <span 
                            className="relative z-10"
                            style={{ color: watchedValues.textColor || '#111827' }}
                          >
                            Priority Content Needs
                          </span>
                        </h2>
                        <p 
                          className="opacity-70"
                          style={{ color: watchedValues.textColor || '#4b5563' }}
                        >
                          High-priority content requests and urgent tasks
                        </p>
                      </div>
                      <span 
                        className="px-2 py-1 text-sm rounded border relative z-10"
                        style={{
                          backgroundColor: (watchedValues.accentColor || '#dc2626') + '10',
                          color: watchedValues.accentColor || '#dc2626',
                          borderColor: (watchedValues.accentColor || '#dc2626') + '30'
                        }}
                      >
                        0 items
                      </span>
                      </div>
                    </div>
                    
                    <div 
                      className={`rounded-lg p-8 text-center relative ${
                        selectedAnimations.boxOutline ? 'border-transparent' : 'border'
                      }`}
                      style={{
                        backgroundColor: watchedValues.backgroundColor || '#ffffff',
                        borderColor: selectedAnimations.boxOutline 
                          ? 'transparent' 
                          : (watchedValues.accentColor || '#e5e7eb') + '20',
                        color: watchedValues.textColor || '#000000',
                        zIndex: 1
                      }}
                    >
                      {/* Animated border outline only */}
                      {selectedAnimations.boxOutline && selectedAnimations.boxOutline.fileUrl && (
                        <div 
                          className="absolute pointer-events-none"
                          style={{ 
                            top: '-8px',
                            left: '-8px',
                            right: '-8px',
                            bottom: '-8px',
                            zIndex: 0,
                            borderRadius: '16px',
                            padding: '8px'
                          }}
                        >
                          {(() => {
                            const fileUrl = selectedAnimations.boxOutline.fileUrl;
                            const isGif = fileUrl.toLowerCase().includes('.gif') || fileUrl.includes('data:image/gif');
                            const isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm') || fileUrl.includes('data:video/');
                            
                            if (isGif) {
                              return (
                                <div 
                                  className="w-full h-full"
                                  style={{
                                    borderRadius: '16px',
                                    border: '4px solid transparent',
                                    background: `linear-gradient(white, white) padding-box, url(${fileUrl}) border-box`,
                                    backgroundSize: 'cover',
                                    backgroundRepeat: 'repeat'
                                  }}
                                />
                              );
                            } else if (isVideo) {
                              return (
                                <video
                                  className="w-full h-full object-cover opacity-30"
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  style={{ 
                                    backgroundColor: 'transparent',
                                    filter: 'brightness(1.5) contrast(1.2)'
                                  }}
                                >
                                  <source src={fileUrl} type="video/mp4" />
                                </video>
                              );
                            } else if (isGif) {
                              return (
                                <img
                                  src={fileUrl}
                                  className="w-full h-full object-cover opacity-30"
                                  style={{ 
                                    backgroundColor: 'transparent',
                                    filter: 'brightness(1.5) contrast(1.2)'
                                  }}
                                  alt="Box outline animation"
                                />
                              );
                            } else {
                              return (
                                <div 
                                  className="w-full h-full opacity-30"
                                  style={{
                                    backgroundImage: `url(${fileUrl})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundColor: 'transparent',
                                    filter: 'brightness(1.5) contrast(1.2)'
                                  }}
                                />
                              );
                            }
                          })()}
                        </div>
                      )}
                      
                      <FileText 
                        className="w-12 h-12 mx-auto mb-4 opacity-40 relative z-10"
                        style={{ color: watchedValues.textColor || '#9ca3af' }}
                      />
                      <p 
                        className="mb-2 opacity-60 relative z-10"
                        style={{ color: watchedValues.textColor || '#6b7280' }}
                      >
                        No content assigned to this section
                      </p>
                      <p 
                        className="text-sm opacity-40 relative z-10"
                        style={{ color: watchedValues.textColor || '#9ca3af' }}
                      >
                        Priority content is managed separately
                      </p>
                    </div>
                  </div>

                  {/* Loading animation indicator */}
                  {Object.values(selectedAnimations).some(anim => anim.category === 'loading') && (
                    <div className="flex justify-center items-center space-x-1 py-4">
                      <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: watchedValues.accentColor || '#8b5cf6', animationDelay: '0ms' }}></div>
                      <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: watchedValues.accentColor || '#8b5cf6', animationDelay: '150ms' }}></div>
                      <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: watchedValues.accentColor || '#8b5cf6', animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </div>

                {/* Animation Status Indicator */}
                {Object.keys(selectedAnimations).length > 0 && (
                  <div className="absolute top-4 right-4 bg-purple-600/90 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-purple-400/50 z-20">
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="font-medium">Live Preview</span>
                    </div>
                  </div>
                )}
              </div>
              
              {Object.keys(selectedAnimations).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Active Animations:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedAnimations).map(([placement, animation]) => (
                      <Badge key={placement} variant="secondary" className="text-xs">
                        {placement}: {animation.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Banner Selection Dialog */}
      <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
        <DialogContent className="max-w-2xl max-h-[56vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Banner</DialogTitle>
            <DialogDescription>Choose a banner for your template</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.isArray(bannerLibrary) && bannerLibrary.map((banner: BannerLibrary) => {
              const isSelected = selectedBanner?.id === banner.id;
              return (
                <Card 
                  key={banner.id} 
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'ring-2 ring-green-500 bg-green-50' 
                      : 'hover:ring-2 hover:ring-primary'
                  }`}
                  onClick={() => handleBannerSelect(banner)}
                >
                  <CardContent className="p-3">
                    <div className="relative">
                      <div 
                        className="w-full h-24 rounded bg-cover bg-center mb-2 bg-gray-200"
                        style={{ backgroundImage: `url(${banner.thumbnailUrl || banner.fileUrl})` }}
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-green-800' : ''}`}>
                      {banner.name}
                    </p>
                    <p className={`text-xs ${isSelected ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {banner.bannerType}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Animation Selection Dialog */}
      <Dialog open={showAnimationDialog} onOpenChange={setShowAnimationDialog}>
        <DialogContent className="max-w-2xl max-h-[56vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Animation for {animationPlacement.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</DialogTitle>
            <DialogDescription>Choose an animation for this placement</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.isArray(animationLibrary) && animationLibrary
              .filter((animation: AnimationLibrary) => {
                // Filter animations by type based on placement
                if (animationPlacement === 'title' && animation.category?.toLowerCase().includes('title')) return true;
                if (animationPlacement === 'loading' && animation.category?.toLowerCase().includes('loading')) return true;
                if (animationPlacement === 'boxOutline' && (
                  animation.category?.toLowerCase().includes('outline') || 
                  animation.category?.toLowerCase().includes('border') ||
                  animation.category?.toLowerCase().includes('box_outline') ||
                  animation.category?.toLowerCase() === 'boxoutline'
                )) return true;
                // If no specific category match, show all for backward compatibility
                return animationPlacement === '' || !animation.category;
              })
              .map((animation: AnimationLibrary) => (
              <Card 
                key={animation.id} 
                className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => handleAnimationSelect(animation, animationPlacement)}
              >
                <CardContent className="p-3">
                  <div className="w-full h-24 rounded mb-2 flex items-center justify-center overflow-hidden relative bg-white border">
                    {animation.thumbnailUrl ? (
                      <img
                        src={animation.thumbnailUrl}
                        alt={animation.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback to emoji display if thumbnail fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.fallback-preview')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'fallback-preview w-full h-full flex flex-col items-center justify-center text-center p-2 bg-gradient-to-br from-blue-50 to-purple-50';
                            fallback.innerHTML = `
                              <div class="mb-1 text-2xl">${animationPlacement === 'boxOutline' ? '🔳' : 
                                                            animationPlacement === 'loading' ? '⏳' : '✨'}</div>
                              <div class="font-medium text-gray-700 text-xs leading-tight">${animation.name}</div>
                              <div class="text-gray-500 text-xs mt-1">Click to Select</div>
                            `;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 bg-gradient-to-br from-blue-50 to-purple-50">
                        <div className="mb-1 text-2xl">
                          {animationPlacement === 'boxOutline' ? '🔳' : 
                           animationPlacement === 'loading' ? '⏳' : '✨'}
                        </div>
                        <div className="font-medium text-gray-700 text-xs leading-tight">{animation.name}</div>
                        <div className="text-gray-500 text-xs mt-1">Click to Select</div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium">{animation.name}</p>
                  <p className="text-xs text-muted-foreground">{animation.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        if (!open) {
          handleCloseUploadDialog();
        } else {
          setShowUploadDialog(true);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Upload {uploadType === 'banner' ? 'Banner' : 'Animation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={uploadFormData.name}
                onChange={(e) => setUploadFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter a name..."
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input
                value={uploadFormData.category}
                onChange={(e) => setUploadFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Abstract, Nature, Modern..."
              />
            </div>
            
            {uploadType === 'animation' && (
              <div>
                <label className="text-sm font-medium">Animation Type</label>
                <Select 
                  value={uploadFormData.animationType || ''} 
                  onValueChange={(value) => setUploadFormData(prev => ({ ...prev, animationType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select animation type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title Animation</SelectItem>
                    <SelectItem value="loading">Loading Animation</SelectItem>
                    <SelectItem value="boxOutline">Box Outline Animation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium">{uploadType === 'banner' ? 'Banner' : 'Animation'} File</label>
              <Input
                type="file"
                accept={uploadType === 'banner' ? 'image/*' : '.css,.json,.gif,.mp4,video/*'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFormData(prev => ({ ...prev, file }));
                  }
                }}
              />
              {uploadFormData.file && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {uploadFormData.file.name}
                </p>
              )}
            </div>
            
            {uploadType === 'animation' && (
              <div>
                <label className="text-sm font-medium">Preview Image *</label>
                <p className="text-xs text-muted-foreground mb-2">Upload an image that shows what this animation looks like</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadFormData(prev => ({ ...prev, previewImage: file }));
                    }
                  }}
                />
                {uploadFormData.previewImage && (
                  <div className="mt-2">
                    <img 
                      src={URL.createObjectURL(uploadFormData.previewImage)} 
                      alt="Preview" 
                      className="w-full h-24 object-contain rounded border"
                    />
                    <p className="text-sm text-green-600 mt-1">Preview image uploaded</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleFileUpload}
                disabled={!uploadFormData.file || !uploadFormData.name || !uploadFormData.category || (uploadType === 'animation' && !uploadFormData.animationType) || (uploadType === 'animation' && !uploadFormData.previewImage) || uploadBannerMutation.isPending || uploadAnimationMutation.isPending}
                className="flex-1"
              >
                {(uploadBannerMutation.isPending || uploadAnimationMutation.isPending) ? 'Uploading...' : 'Upload'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCloseUploadDialog}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You have unsaved changes in the upload form. What would you like to do?
            </p>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveChanges}
                className="flex-1"
              >
                Continue Editing
              </Button>
              <Button
                variant="destructive"
                onClick={handleDiscardChanges}
                className="flex-1"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PageTemplateBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [editingTemplate, setEditingTemplate] = useState<PageTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PageTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedAnimations, setSelectedAnimations] = useState<{[placement: string]: AnimationLibrary}>({});
  const [animationCategory, setAnimationCategory] = useState<string>('all');
  const [showAnimationLibrary, setShowAnimationLibrary] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showBannerLibrary, setShowBannerLibrary] = useState(false);
  const [bannerCategory, setBannerCategory] = useState<string>('all');
  const [selectedBanner, setSelectedBanner] = useState<BannerLibrary | null>(null);
  const [uploadedBanner, setUploadedBanner] = useState<File | null>(null);
  const [uploadedAnimations, setUploadedAnimations] = useState<{file: File, previewImage: File, type: string, name: string}[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<'banner' | 'animation' | null>(null);
  const [showAnimationTypeDialog, setShowAnimationTypeDialog] = useState(false);
  const [pendingAnimationFiles, setPendingAnimationFiles] = useState<File[]>([]);
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0);
  const [animationName, setAnimationName] = useState('');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const animationInputRef = useRef<HTMLInputElement>(null);
  const previewImageInputRef = useRef<HTMLInputElement>(null);

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      accentColor: "#3b82f6",
      bannerUrl: "",
      animationConfig: { enabled: true }
    }
  });

  // Watch form values for live preview
  const watchedValues = form.watch();

  // Data fetching
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/page-templates'],
  });

  const { data: animationLibrary, isLoading: isLoadingAnimations } = useQuery({
    queryKey: ['/api/animation-library'],
  });

  const { data: bannerLibrary, isLoading: isLoadingBanners } = useQuery({
    queryKey: ['/api/banner-library'],
  });

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, target: 'banner' | 'animation') => {
    e.preventDefault();
    setIsDragging(true);
    setDragTarget(target);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only hide drag state if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
      setDragTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, target: 'banner' | 'animation') => {
    e.preventDefault();
    setIsDragging(false);
    setDragTarget(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    if (target === 'banner') {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setUploadedBanner(file);
      setSelectedBanner(null);
      setUnsavedChanges(true);
    } else if (target === 'animation') {
      const validFiles: File[] = [];
      
      files.forEach(file => {
        const validTypes = ['video/mp4', 'video/webm', 'image/gif', 'application/json'];
        if (validTypes.includes(file.type) || file.name.endsWith('.lottie')) {
          if (file.size <= 10 * 1024 * 1024) {
            validFiles.push(file);
          } else {
            toast({
              title: "File too large",
              description: `${file.name} is too large. Please select files smaller than 10MB`,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported animation format`,
            variant: "destructive"
          });
        }
      });

      if (validFiles.length > 0) {
        setPendingAnimationFiles(validFiles);
        setShowAnimationTypeDialog(true);
      }
    }
  };

  // File upload handlers
  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setUploadedBanner(file);
      setSelectedBanner(null); // Clear library selection when uploading
      setUnsavedChanges(true);
    }
  };

  const handleAnimationUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles: File[] = [];
      
      Array.from(files).forEach(file => {
        // Validate file type (allow video, gif, and lottie json files)
        const validTypes = ['video/mp4', 'video/webm', 'image/gif', 'application/json'];
        if (validTypes.includes(file.type) || file.name.endsWith('.lottie')) {
          // Validate file size (max 10MB per file)
          if (file.size <= 10 * 1024 * 1024) {
            validFiles.push(file);
          } else {
            toast({
              title: "File too large",
              description: `${file.name} is too large. Please select files smaller than 10MB`,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported animation format`,
            variant: "destructive"
          });
        }
      });
      
      if (validFiles.length > 0) {
        setPendingAnimationFiles(validFiles);
        setCurrentAnimationIndex(0);
        setAnimationName(validFiles[0].name.replace(/\.[^/.]+$/, "")); // Remove file extension
        setShowAnimationTypeDialog(true);
      }
    }
  };

  const removeBanner = () => {
    setUploadedBanner(null);
    setSelectedBanner(null);
    setUnsavedChanges(true);
  };

  const removeAnimation = (index: number) => {
    setUploadedAnimations(prev => prev.filter((_, i) => i !== index));
    setUnsavedChanges(true);
  };

  const handlePreviewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file for the preview",
          variant: "destructive"
        });
        return;
      }
      setPreviewImage(file);
      setPreviewImageUrl(URL.createObjectURL(file));
    }
  };

  const handleAnimationTypeSelection = (type: string) => {
    if (!animationName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your animation",
        variant: "destructive"
      });
      return;
    }

    if (!previewImage) {
      toast({
        title: "Preview image required",
        description: "Please upload a preview image for your animation",
        variant: "destructive"
      });
      return;
    }

    const currentFile = pendingAnimationFiles[currentAnimationIndex];
    const newAnimation = {
      file: currentFile,
      previewImage: previewImage,
      type,
      name: animationName.trim()
    };
    
    setUploadedAnimations(prev => [...prev, newAnimation]);
    
    // Move to next animation if there are more
    if (currentAnimationIndex < pendingAnimationFiles.length - 1) {
      const nextIndex = currentAnimationIndex + 1;
      setCurrentAnimationIndex(nextIndex);
      setAnimationName(pendingAnimationFiles[nextIndex].name.replace(/\.[^/.]+$/, ""));
      setPreviewImage(null);
      setPreviewImageUrl('');
    } else {
      // All animations processed
      setPendingAnimationFiles([]);
      setShowAnimationTypeDialog(false);
      setCurrentAnimationIndex(0);
      setAnimationName('');
      setPreviewImage(null);
      setPreviewImageUrl('');
      
      toast({
        title: "Animations uploaded",
        description: `${pendingAnimationFiles.length} animation(s) added successfully`
      });
    }
    
    setUnsavedChanges(true);
  };

  // Upload animation mutation with preview image
  const uploadAnimationMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; animationType: string; file: File; previewImage: File }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('previewImage', data.previewImage);
      formData.append('name', data.name);
      formData.append('category', data.animationType);
      formData.append('animationType', data.animationType);
      formData.append('description', `${data.name} animation`);

      const response = await fetch('/api/animation-library', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload animation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/animation-library'] });
      toast({
        title: "Animation uploaded successfully!",
        description: "Your animation has been added to the library"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      // Step 1: Upload any pending animations with preview images
      const uploadedAnimationIds: {[key: string]: number} = {};
      
      if (uploadedAnimations.length > 0) {
        for (const animationData of uploadedAnimations) {
          try {
            const uploadedAnimation = await uploadAnimationMutation.mutateAsync({
              name: animationData.name,
              category: animationData.type,
              animationType: animationData.type,
              file: animationData.file,
              previewImage: animationData.previewImage
            });
            uploadedAnimationIds[animationData.type] = uploadedAnimation.id;
          } catch (error) {
            console.error('Failed to upload animation:', error);
            throw new Error(`Failed to upload ${animationData.name} animation`);
          }
        }
      }

      // Step 2: Create the template with basic data and banner URL
      const templateData = {
        name: data.name,
        description: data.description || '',
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        accentColor: data.accentColor,
        bannerUrl: selectedBanner?.fileUrl || data.bannerUrl || undefined,
        animationConfig: { enabled: Object.keys(selectedAnimations).length > 0 || uploadedAnimations.length > 0 }
      };

      const response = await fetch('/api/page-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) throw new Error('Failed to create template');
      const newTemplate = await response.json();

      // Step 3: Assign existing selected animations to the template
      if (Object.keys(selectedAnimations).length > 0) {
        for (const [placement, animation] of Object.entries(selectedAnimations)) {
          try {
            await fetch(`/api/page-templates/${newTemplate.id}/animations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                animationId: animation.id,
                placement: placement
              })
            });
          } catch (error) {
            console.warn(`Failed to assign ${placement} animation:`, error);
          }
        }
      }

      // Step 4: Assign newly uploaded animations to the template
      for (const [type, animationId] of Object.entries(uploadedAnimationIds)) {
        try {
          await fetch(`/api/page-templates/${newTemplate.id}/animations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              animationId: animationId,
              placement: type === 'box_outline' ? 'boxOutline' : type
            })
          });
        } catch (error) {
          console.warn(`Failed to assign uploaded ${type} animation:`, error);
        }
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/page-templates'] });
      toast({ title: "Template created successfully!" });
      setShowCreateDialog(false);
      form.reset();
      setSelectedAnimations({});
      setSelectedBanner(null);
      setUploadedBanner(null);
      setUploadedAnimations([]);
      setUnsavedChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating template", description: error.message, variant: "destructive" });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/page-templates/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete template');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/page-templates'] });
      toast({ title: "Template deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
    }
  });

  // Event handlers
  const handleSubmit = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const handleDeleteTemplate = async (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handlePreviewTemplate = (template: PageTemplate) => {
    setPreviewTemplate(template);
  };

  const handleEditTemplate = (template: PageTemplate) => {
    setEditingTemplate(template);
    setViewMode('editor');
  };

  const handleAnimationSelect = (animation: AnimationLibrary, placement: string) => {
    setSelectedAnimations(prev => ({
      ...prev,
      [placement]: animation
    }));
    setUnsavedChanges(true);
  };

  const handleBannerSelect = (banner: BannerLibrary) => {
    form.setValue('bannerUrl', banner.fileUrl);
    setSelectedBanner(banner);
    setShowBannerLibrary(false);
    setUnsavedChanges(true);
  };

  // Unsaved changes protection
  const handleCloseWithUnsavedWarning = (callback: () => void) => {
    if (unsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      callback();
    }
  };

  const handleConfirmDiscard = () => {
    setUnsavedChanges(false);
    setShowUnsavedWarning(false);
    setShowCreateDialog(false);
    form.reset();
    setSelectedAnimations({});
  };

  // Form change tracking
  useEffect(() => {
    const subscription = form.watch(() => {
      setUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Filtered data
  const filteredAnimations = Array.isArray(animationLibrary) 
    ? animationLibrary.filter((animation: AnimationLibrary) => 
        animationCategory === 'all' || animation.category === animationCategory
      )
    : [];

  const filteredBanners = Array.isArray(bannerLibrary)
    ? bannerLibrary.filter((banner: BannerLibrary) =>
        bannerCategory === 'all' || banner.bannerType === bannerCategory
      )
    : [];

  // Enhanced preview component showing actual theme appearance with colorways
  const EnhancedPreview = ({ template }: { template: any }) => {
    const watchedValues = form.watch();
    const hasBoxOutlineAnimations = uploadedAnimations.filter(a => a.type === 'box_outline').length > 0;
    const hasTitleAnimations = uploadedAnimations.filter(a => a.type === 'title').length > 0;
    const hasLoadingAnimations = uploadedAnimations.filter(a => a.type === 'loading').length > 0;
    
    const backgroundColor = template.background_color || template.backgroundColor || watchedValues.backgroundColor;
    const textColor = template.text_color || template.textColor || watchedValues.textColor;
    const accentColor = template.accent_color || template.accentColor || watchedValues.accentColor;
    const templateName = template.name || watchedValues.name || 'New Template';
    const templateDescription = template.description || watchedValues.description;
    const bannerUrl = template.banner_url || template.bannerUrl;
    
    return (
      <div className="w-full space-y-3">
        {/* Main visual preview */}
        <div 
          className={`w-full h-40 rounded-lg border-2 p-4 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
            hasBoxOutlineAnimations ? 'ring-2 ring-purple-500 ring-opacity-60 animate-pulse' : ''
          }`}
          style={{
            backgroundColor,
            borderColor: accentColor
          }}
        >
          {/* Background pattern/texture overlay */}
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full" style={{
              backgroundImage: `linear-gradient(45deg, ${accentColor}40 25%, transparent 25%), linear-gradient(-45deg, ${accentColor}40 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${accentColor}40 75%), linear-gradient(-45deg, transparent 75%, ${accentColor}40 75%)`,
              backgroundSize: '12px 12px',
              backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px'
            }} />
          </div>
          
          {/* Banner area simulation - exactly matching test 2 behavior */}
          {bannerUrl && (
            <div 
              className="absolute inset-0 rounded-lg overflow-hidden"
              style={{
                backgroundImage: `url(${bannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: 0.3
              }}
            />
          )}
          
          {/* Content area */}
          <div className="relative z-10 flex flex-col justify-center items-center h-full text-center">
            <h3 
              className={`font-bold text-lg mb-2 drop-shadow-sm ${
                hasTitleAnimations 
                  ? 'animate-[fadeIn_2s_ease-in-out_infinite,bounce_1s_ease-in-out_infinite,glow_2s_ease-in-out_infinite]' 
                  : ''
              }`}
              style={{ 
                color: textColor,
                textShadow: hasTitleAnimations 
                  ? '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' 
                  : 'none',
                filter: hasTitleAnimations 
                  ? 'drop-shadow(0 0 8px currentColor)' 
                  : 'none'
              }}
            >
              {hasTitleAnimations && '✨ '}
              {templateName}
            </h3>
            
            {/* Simulated content elements */}
            <div className="space-y-1.5 w-full max-w-[100px] mb-2">
              <div 
                className="h-1.5 rounded-full"
                style={{ backgroundColor: `${textColor}50` }}
              />
              <div 
                className="h-1.5 rounded-full w-3/4 mx-auto"
                style={{ backgroundColor: `${textColor}30` }}
              />
              <div 
                className="h-1.5 rounded-full w-1/2 mx-auto"
                style={{ backgroundColor: `${textColor}20` }}
              />
            </div>
            
            {/* Accent button simulation */}
            <div 
              className={`w-16 h-5 rounded-full flex items-center justify-center text-xs font-medium shadow-sm ${
                hasLoadingAnimations ? 'animate-pulse' : ''
              }`}
              style={{ 
                backgroundColor: accentColor,
                color: backgroundColor
              }}
            >
              Link
            </div>
            
            {/* Animation indicators */}
            {uploadedAnimations.length > 0 && (
              <div className="flex gap-1 mt-2">
                {hasBoxOutlineAnimations && (
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping"></div>
                )}
                {hasTitleAnimations && (
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                )}
                {hasLoadingAnimations && (
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-spin"></div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Colorway display */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <div 
              className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
              style={{ backgroundColor }}
              title={`Background: ${backgroundColor}`}
            />
            <div 
              className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
              style={{ backgroundColor: textColor }}
              title={`Text: ${textColor}`}
            />
            <div 
              className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
              style={{ backgroundColor: accentColor }}
              title={`Accent: ${accentColor}`}
            />
          </div>
          
          {/* Theme metadata */}
          <div className="text-right text-xs">
            <div className="text-muted-foreground">
              {templateDescription ? 'Custom' : 'Basic'} Theme
            </div>
            {uploadedAnimations.length > 0 && (
              <div className="text-purple-600 dark:text-purple-400 font-medium">
                +{uploadedAnimations.length} animations
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (viewMode === 'editor' && editingTemplate) {
    return <TemplateEditor template={editingTemplate} onBack={() => setViewMode('list')} />;
  }

  return (
    <div className="min-h-screen p-6">
        {/* Back Button - Consistent with Content & Comms layout */}
        <div className="mb-8">
          <Button
            variant="outline"
            size="default"
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Button>
        </div>

        {/* Title Section - Consistent positioning */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-6 h-6" />
              <h1 className="text-3xl font-bold">Aesthetic Builder</h1>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>

          {isLoadingTemplates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(templates) && templates.map((template: PageTemplate) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <EnhancedPreview template={template} />
                  
                  <div className="mt-4 space-y-3">
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewTemplate(template)}
                        className="flex-1 gap-2"
                      >
                        <Eye className="h-3 w-3" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                        className="flex-1 gap-2"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>

        {/* Create Template Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) {
          handleCloseWithUnsavedWarning(() => setShowCreateDialog(false));
        }
      }}>
        <DialogContent className="max-w-5xl w-[85vw] max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="px-4 py-3 border-b bg-white dark:bg-gray-900 text-center">
            <DialogTitle className="text-xl font-bold">Create New Template</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Design a custom aesthetic template for creator pages with live preview
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex h-[calc(85vh-80px)]">
            {/* Left Panel - Form Controls (60% width) */}
            <div className="w-[60%] border-r">
              <ScrollArea className="h-full p-4">
                <div className="w-full max-w-md mx-auto pb-16 px-2">
                  <Form {...form}>
                    <form id="template-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Dark Luxe, Sunset Vibes..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the aesthetic and mood of this template..." 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="backgroundColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Background Color</FormLabel>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="color" {...field} className="w-16 h-10 p-1" />
                                <Input 
                                  {...field} 
                                  placeholder="#ffffff" 
                                  className="flex-1"
                                  onChange={(e) => {
                                    let value = e.target.value;
                                    if (value && !value.startsWith('#')) {
                                      value = '#' + value;
                                    }
                                    field.onChange(value);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="textColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Text Color</FormLabel>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="color" {...field} className="w-16 h-10 p-1" />
                                <Input 
                                  {...field} 
                                  placeholder="#000000" 
                                  className="flex-1"
                                  onChange={(e) => {
                                    let value = e.target.value;
                                    if (value && !value.startsWith('#')) {
                                      value = '#' + value;
                                    }
                                    field.onChange(value);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accentColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accent Color</FormLabel>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="color" {...field} className="w-16 h-10 p-1" />
                                <Input 
                                  {...field} 
                                  placeholder="#3b82f6" 
                                  className="flex-1"
                                  onChange={(e) => {
                                    let value = e.target.value;
                                    if (value && !value.startsWith('#')) {
                                      value = '#' + value;
                                    }
                                    field.onChange(value);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
                        <FormLabel>Banner Image</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowBannerLibrary(true)}
                            className="gap-2"
                          >
                            <Image className="h-4 w-4" />
                            Choose from Library
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => bannerInputRef.current?.click()}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Upload Image
                          </Button>
                        </div>
                        
                        {/* Drag and Drop Zone for Banner */}
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                            isDragging && dragTarget === 'banner'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                          }`}
                          onDragOver={(e) => handleDragOver(e, 'banner')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, 'banner')}
                        >
                          <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">
                            {isDragging && dragTarget === 'banner'
                              ? 'Drop your banner image here'
                              : 'Drag and drop a banner image here, or click upload above'
                            }
                          </p>
                          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WebP up to 5MB</p>
                        </div>
                        
                        {/* Hidden file input */}
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="hidden"
                        />
                        
                        {/* Display selected/uploaded banner */}
                        {(selectedBanner || uploadedBanner) && (
                          <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                                <Image className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {selectedBanner ? selectedBanner.name : uploadedBanner?.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedBanner ? 'From library' : `${(uploadedBanner?.size || 0 / 1024 / 1024).toFixed(1)}MB`}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeBanner}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <FormLabel>Animations</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAnimationLibrary(!showAnimationLibrary)}
                            className="gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Animation Library
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => animationInputRef.current?.click()}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Upload Animation
                          </Button>
                        </div>
                        
                        {/* Enhanced Drag and Drop Zone for Animations */}
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer group ${
                            isDragging && dragTarget === 'animation'
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 scale-105 shadow-lg'
                              : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/10'
                          }`}
                          onDragOver={(e) => handleDragOver(e, 'animation')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, 'animation')}
                          onClick={() => animationInputRef.current?.click()}
                        >
                          <div className={`transition-transform duration-200 ${isDragging && dragTarget === 'animation' ? 'scale-110' : 'group-hover:scale-105'}`}>
                            <Zap className={`mx-auto h-8 w-8 mb-3 transition-colors ${
                              isDragging && dragTarget === 'animation' 
                                ? 'text-purple-500' 
                                : 'text-gray-400 group-hover:text-purple-500'
                            }`} />
                            <p className={`text-sm font-medium transition-colors ${
                              isDragging && dragTarget === 'animation'
                                ? 'text-purple-700 dark:text-purple-300'
                                : 'text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                            }`}>
                              {isDragging && dragTarget === 'animation'
                                ? 'Release to upload animation files'
                                : 'Drag & drop animation files here'
                              }
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              MP4, WebM, GIF, JSON, Lottie • Up to 10MB each • Multiple files supported
                            </p>
                            {!isDragging && (
                              <p className="text-xs text-purple-500 dark:text-purple-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to browse files
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Hidden file input for animations */}
                        <input
                          ref={animationInputRef}
                          type="file"
                          accept="video/mp4,video/webm,image/gif,.json,.lottie"
                          onChange={handleAnimationUpload}
                          multiple
                          className="hidden"
                        />
                        
                        {/* Display uploaded animations */}
                        {uploadedAnimations.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Uploaded Animations:</p>
                            {uploadedAnimations.map((animation, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                                    <Zap className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{animation.file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(animation.file.size / 1024 / 1024).toFixed(1)}MB • {animation.type}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAnimation(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {showAnimationLibrary && (
                          <div className="border rounded-lg p-4 space-y-4">
                            <div className="flex space-x-2 flex-wrap">
                              {['all', 'box_outline', 'title', 'loading', 'cursor'].map(category => (
                                <Button
                                  key={category}
                                  type="button"
                                  variant={animationCategory === category ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setAnimationCategory(category)}
                                >
                                  {category === 'all' ? 'All' : 
                                   category === 'box_outline' ? 'Borders' :
                                   category === 'title' ? 'Titles' :
                                   category === 'loading' ? 'Loading' : 'Cursor'}
                                </Button>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                              {filteredAnimations.map((animation: AnimationLibrary) => (
                                <div
                                  key={animation.id}
                                  className="border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
                                  onClick={() => handleAnimationSelect(animation, 'title')}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                                      <Zap className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{animation.name}</p>
                                      <p className="text-xs text-muted-foreground">{animation.category}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {Object.keys(selectedAnimations).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Selected Animations:</p>
                            {Object.entries(selectedAnimations).map(([placement, animation]) => (
                              <div key={placement} className="flex items-center justify-between text-sm bg-accent rounded p-2">
                                <span>{animation.name} ({placement})</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newAnimations = { ...selectedAnimations };
                                    delete newAnimations[placement];
                                    setSelectedAnimations(newAnimations);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </form>
                  </Form>
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Live Preview (40% width) */}
            <div className="w-[40%] flex flex-col bg-gray-50 dark:bg-gray-900">
              <div className="flex-shrink-0 p-6 border-b bg-white dark:bg-gray-900 text-center">
                <h4 className="font-medium text-lg">Live Preview</h4>
                <p className="text-sm text-muted-foreground mt-1">See your template in real-time</p>
              </div>
              
              <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
                <div className="w-full flex items-center justify-center">
                  <div className="border rounded-xl overflow-hidden shadow-xl bg-white dark:bg-gray-800 w-full max-w-[270px] h-[340px] flex items-center justify-center">
                    <div className="p-3 w-full h-full flex items-center justify-center">
                      <div 
                        className="transform-gpu w-full h-full flex items-center justify-center"
                        style={{
                          transform: 'scale(0.7)',
                          transformOrigin: 'center'
                        }}
                      >
                        <div 
                          className={`w-full h-full rounded-lg overflow-hidden relative transition-all duration-300 ${
                            uploadedAnimations.filter(a => a.type === 'box_outline').length > 0 
                              ? 'ring-2 ring-purple-500 ring-opacity-60 animate-pulse' 
                              : ''
                          }`}
                          style={{
                            backgroundColor: watchedValues.backgroundColor || '#ffffff',
                            color: watchedValues.textColor || '#000000'
                          }}
                        >
                          {/* Banner Section */}
                          {(uploadedBanner || selectedBanner || watchedValues.bannerUrl) && (
                            <div className="w-full h-20 relative overflow-hidden">
                              <img
                                src={
                                  uploadedBanner 
                                    ? URL.createObjectURL(uploadedBanner)
                                    : selectedBanner?.fileUrl || watchedValues.bannerUrl
                                }
                                alt="Template banner"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                          )}

                          {/* Content Section */}
                          <div className="p-4 space-y-3">
                            <div>
                              <div className="relative">
                                <h3 
                                  className="text-lg font-semibold truncate relative"
                                  style={{ color: watchedValues.textColor || '#000000' }}
                                >
                                  {/* Title animation backgrounds - positioned around the text only */}
                                  {selectedAnimations.title && selectedAnimations.title.fileUrl && (
                                    <div className="absolute inset-0 -inset-x-2 -inset-y-1 rounded overflow-hidden" style={{ zIndex: 0 }}>
                                      {(() => {
                                        const fileUrl = selectedAnimations.title.fileUrl;
                                        const isGif = fileUrl.toLowerCase().includes('.gif') || fileUrl.includes('data:image/gif');
                                        const isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm') || fileUrl.includes('data:video/');
                                        const isLottie = fileUrl.toLowerCase().includes('.json') || fileUrl.toLowerCase().includes('lottie');
                                        
                                        if (isVideo) {
                                          return (
                                            <video
                                              className="w-full h-full object-cover opacity-60"
                                              autoPlay
                                              loop
                                              muted
                                              playsInline
                                              style={{ 
                                                backgroundColor: 'transparent',
                                                filter: 'brightness(1.1)'
                                              }}
                                            >
                                              <source src={fileUrl} type="video/mp4" />
                                            </video>
                                          );
                                        } else if (isGif || isLottie) {
                                          return (
                                            <img
                                              src={fileUrl}
                                              className="w-full h-full object-cover opacity-60"
                                              style={{ 
                                                backgroundColor: 'transparent',
                                                filter: 'brightness(1.1)'
                                              }}
                                              alt="Title animation"
                                            />
                                          );
                                        } else {
                                          return (
                                            <div 
                                              className="w-full h-full opacity-60"
                                              style={{
                                                backgroundImage: `url(${fileUrl})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundColor: 'transparent',
                                                filter: 'brightness(1.1)'
                                              }}
                                            />
                                          );
                                        }
                                      })()}
                                    </div>
                                  )}
                                  
                                  <span className="relative z-10">
                                    {watchedValues.name || 'New Template'}
                                  </span>
                                </h3>
                              </div>
                              {watchedValues.description && (
                                <p className="text-sm opacity-70 line-clamp-2">
                                  {watchedValues.description}
                                </p>
                              )}
                            </div>

                            {/* Sample content blocks */}
                            <div className="space-y-2">
                              <div 
                                className={`h-2 rounded-full ${uploadedAnimations.filter(a => a.type === 'loading').length > 0 ? 'animate-pulse' : ''}`}
                                style={{ backgroundColor: watchedValues.accentColor || '#3b82f6' }}
                              />
                              <div className={`h-1 bg-gray-300 dark:bg-gray-600 rounded-full w-3/4 ${uploadedAnimations.filter(a => a.type === 'cursor').length > 0 ? 'animate-pulse' : ''}`} />
                              <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full w-1/2" />
                            </div>

                            {/* Animation previews */}
                            {(uploadedAnimations.length > 0 || Object.keys(selectedAnimations).length > 0) && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium opacity-70">Live Animations:</div>
                                
                                {/* Box outline animations */}
                                {uploadedAnimations.filter(a => a.type === 'box_outline').length > 0 && (
                                  <div className="relative">
                                    <div className="w-full h-8 border-2 border-purple-500 rounded animate-pulse">
                                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
                                    </div>
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                      Box Outline ({uploadedAnimations.filter(a => a.type === 'box_outline').length})
                                    </div>
                                  </div>
                                )}

                                {/* Title animations */}
                                {(uploadedAnimations.filter(a => a.type === 'title').length > 0 || selectedAnimations.title) && (
                                  <div className="relative">
                                    <div className="space-y-2">
                                      {/* Background animation preview */}
                                      <div className="relative h-8 rounded border overflow-hidden">
                                        {/* Animated gradient background */}
                                        <div className="absolute inset-0 opacity-30 animate-pulse"
                                             style={{
                                               background: `linear-gradient(45deg, #ffd700, transparent, #ffd700)`
                                             }} />
                                        {/* Money rain particles */}
                                        <div className="absolute w-1 h-1 rounded-full opacity-60 animate-bounce"
                                             style={{ 
                                               backgroundColor: '#ffd700',
                                               top: '25%', left: '20%',
                                               animationDelay: '0s',
                                               boxShadow: '0 0 2px #ffd700'
                                             }} />
                                        <div className="absolute w-1 h-1 rounded-full opacity-40 animate-bounce"
                                             style={{ 
                                               backgroundColor: '#ffd700',
                                               top: '60%', right: '15%',
                                               animationDelay: '0.5s',
                                               boxShadow: '0 0 2px #ffd700'
                                             }} />
                                        <div className="absolute w-1 h-1 rounded-full opacity-50 animate-bounce"
                                             style={{ 
                                               backgroundColor: '#ffd700',
                                               bottom: '25%', left: '70%',
                                               animationDelay: '1s',
                                               boxShadow: '0 0 2px #ffd700'
                                             }} />
                                        {/* Money emoji particles */}
                                        <div className="absolute text-xs opacity-40 animate-bounce"
                                             style={{ 
                                               top: '10%', left: '10%',
                                               animationDelay: '0.2s'
                                             }}>💰</div>
                                        <div className="absolute text-xs opacity-30 animate-bounce"
                                             style={{ 
                                               top: '70%', right: '30%',
                                               animationDelay: '0.8s'
                                             }}>💵</div>
                                        {/* Sample title text */}
                                        <div className="relative z-10 h-full flex items-center px-2">
                                          <span className="text-sm font-medium">
                                            {selectedAnimations.title ? selectedAnimations.title.name : 'Title Background Animation'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                      Title Animations ({selectedAnimations.title ? 1 : uploadedAnimations.filter(a => a.type === 'title').length})
                                    </div>
                                  </div>
                                )}

                                {/* Loading animations */}
                                {uploadedAnimations.filter(a => a.type === 'loading').length > 0 && (
                                  <div className="relative">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-green-500 rounded-full animate-spin"></div>
                                      <div className="w-12 h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div className="w-full h-full bg-green-500 rounded-full animate-pulse"></div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                      Loading Animation ({uploadedAnimations.filter(a => a.type === 'loading').length})
                                    </div>
                                  </div>
                                )}

                                {/* Cursor animations */}
                                {uploadedAnimations.filter(a => a.type === 'cursor').length > 0 && (
                                  <div className="relative">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-sm">Interactive</span>
                                      <div className="w-1 h-4 bg-orange-500 animate-pulse rounded"></div>
                                    </div>
                                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                      Cursor Animation ({uploadedAnimations.filter(a => a.type === 'cursor').length})
                                    </div>
                                  </div>
                                )}

                                {/* Library animations */}
                                {Object.entries(selectedAnimations).length > 0 && (
                                  <div className="space-y-1">
                                    {Object.entries(selectedAnimations).map(([placement, animation]) => (
                                      <div key={placement} className="flex items-center space-x-2">
                                        <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-spin"></div>
                                        <span className="text-xs text-blue-600 dark:text-blue-400">
                                          {animation.name} ({placement})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Banner indicator */}
                            {(uploadedBanner || selectedBanner || watchedValues.bannerUrl) && (
                              <div className="absolute top-2 left-2">
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                  <Image className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center gap-3 max-w-xs mx-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    className="px-3 py-2 text-sm min-w-[80px]"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    form="template-form"
                    disabled={createTemplateMutation.isPending}
                    className="px-3 py-2 text-sm min-w-[100px]"
                    size="sm"
                  >
                    {createTemplateMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Full-screen preview of how this template would look on a creator page
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <EnhancedPreview template={previewTemplate} />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Background:</strong> {previewTemplate.backgroundColor}
                </div>
                <div>
                  <strong>Text:</strong> {previewTemplate.textColor}
                </div>
                <div>
                  <strong>Accent:</strong> {previewTemplate.accentColor}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close Preview
            </Button>
            <Button onClick={() => handleEditTemplate(previewTemplate!)}>
              Edit Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Banner Library Dialog */}
      <Dialog open={showBannerLibrary} onOpenChange={setShowBannerLibrary}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Banner Library</DialogTitle>
            <DialogDescription>Choose a banner image for your template</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              {['all', 'nature', 'abstract', 'minimal', 'dark'].map(category => (
                <Button
                  key={category}
                  variant={bannerCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBannerCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Button>
              ))}
            </div>

            {isLoadingBanners ? (
              <div className="grid grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-video bg-gray-200 animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredBanners.map((banner: BannerLibrary) => (
                  <div
                    key={banner.id}
                    className="aspect-video border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                    onClick={() => handleBannerSelect(banner)}
                  >
                    <img 
                      src={banner.thumbnailUrl || banner.fileUrl} 
                      alt={banner.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning Dialog */}
      <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to leave without saving?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowUnsavedWarning(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDiscard}>
              Discard Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Animation Type Selection Dialog */}
      <Dialog open={showAnimationTypeDialog} onOpenChange={setShowAnimationTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Animation</DialogTitle>
            <DialogDescription>
              Animation {currentAnimationIndex + 1} of {pendingAnimationFiles.length}: {pendingAnimationFiles[currentAnimationIndex]?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="animationName" className="text-sm font-medium">Animation Name</label>
              <input
                id="animationName"
                type="text"
                value={animationName}
                onChange={(e) => setAnimationName(e.target.value)}
                placeholder="Enter animation name..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Preview Image *</label>
              <p className="text-xs text-muted-foreground mb-2">Upload an image that shows what this animation looks like</p>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => previewImageInputRef.current?.click()}
              >
                {previewImageUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={previewImageUrl} 
                      alt="Preview" 
                      className="w-full h-24 object-contain rounded"
                    />
                    <p className="text-sm text-green-600">Preview image uploaded</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Image className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500">Click to upload preview image</p>
                    <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={previewImageInputRef}
                type="file"
                accept="image/*"
                onChange={handlePreviewImageUpload}
                className="hidden"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Animation Type</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['box_outline', 'title', 'loading', 'cursor'].map(type => (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => handleAnimationTypeSelection(type)}
                    disabled={!animationName.trim() || !previewImage}
                  >
                    <Sparkles className="h-6 w-6" />
                    <span className="text-sm font-medium">
                      {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}