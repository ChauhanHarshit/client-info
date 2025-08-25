import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { Plus, Edit, Eye, Trash2, Copy, Palette, Monitor, Smartphone, Upload, X, Sparkles, Image, FileType, Zap, Download, ArrowLeft, Save, RefreshCw, Settings, Check, FileText, MoreHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Schema definitions
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  
  // Core CSS Variables - all optional with defaults
  aestheticPrimary: z.string().optional(),
  aestheticSecondary: z.string().optional(),
  aestheticAccent: z.string().optional(),
  aestheticBackground: z.string().optional(),
  aestheticText: z.string().optional(),
  aestheticBorder: z.string().optional(),
  aestheticGradientStart: z.string().optional(),
  aestheticGradientEnd: z.string().optional(),
  
  // Legacy fields for backward compatibility
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  accentColor: z.string().optional(),
  
  // Header/Banner Elements
  headerBackground: z.string().optional(),
  headerGradient: z.string().optional(),
  bannerContent: z.string().optional(),
  aestheticBanner: z.string().optional(),
  
  // Typography & Text Elements
  headingPrimary: z.string().optional(),
  headingSecondary: z.string().optional(),
  headingAccent: z.string().optional(),
  statNumber: z.string().optional(),
  statLabel: z.string().optional(),
  badgeAesthetic: z.string().optional(),
  
  // Navigation Elements
  tabActive: z.string().optional(),
  tabInactive: z.string().optional(),
  navBackground: z.string().optional(),
  homeIndicator: z.string().optional(),
  
  // Interactive Elements
  btnPrimary: z.string().optional(),
  btnSecondary: z.string().optional(),
  btnAccent: z.string().optional(),
  indicatorDot: z.string().optional(),
  
  // Progress & Status Elements
  progressBar: z.string().optional(),
  progressBackground: z.string().optional(),
  statusActive: z.string().optional(),
  statusInactive: z.string().optional(),
  
  // Container & Background Elements
  contentBackground: z.string().optional(),
  sectionBackground: z.string().optional(),
  cardBackground: z.string().optional(),
  overlayBackground: z.string().optional(),
  
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
  
  // Core CSS Variables
  aestheticPrimary?: string;
  aestheticSecondary?: string;
  aestheticAccent?: string;
  aestheticBackground?: string;
  aestheticText?: string;
  aestheticBorder?: string;
  aestheticGradientStart?: string;
  aestheticGradientEnd?: string;
  
  // Legacy fields for backward compatibility
  background_color?: string;
  backgroundColor?: string;
  text_color?: string;
  textColor?: string;
  accent_color?: string;
  accentColor?: string;
  
  // Header/Banner Elements
  headerBackground?: string;
  headerGradient?: string;
  bannerContent?: string;
  aestheticBanner?: string;
  
  // Typography & Text Elements
  headingPrimary?: string;
  headingSecondary?: string;
  headingAccent?: string;
  statNumber?: string;
  statLabel?: string;
  badgeAesthetic?: string;
  
  // Navigation Elements
  tabActive?: string;
  tabInactive?: string;
  navBackground?: string;
  homeIndicator?: string;
  
  // Interactive Elements
  btnPrimary?: string;
  btnSecondary?: string;
  btnAccent?: string;
  indicatorDot?: string;
  
  // Progress & Status Elements
  progressBar?: string;
  progressBackground?: string;
  statusActive?: string;
  statusInactive?: string;
  
  // Container & Background Elements
  contentBackground?: string;
  sectionBackground?: string;
  cardBackground?: string;
  overlayBackground?: string;
  
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

// Template Editor Component
function TemplateEditor({ template, onBack, animationLibrary, bannerLibrary }: { 
  template: PageTemplate, 
  onBack: () => void,
  animationLibrary?: AnimationLibrary[],
  bannerLibrary?: BannerLibrary[]
}) {
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

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template.name,
      description: template.description || '',
      
      // Core CSS Variables
      aestheticPrimary: template.aestheticPrimary || template.accentColor || template.accent_color || '#EC4899',
      aestheticSecondary: template.aestheticSecondary || '#F3E8FF',
      aestheticAccent: template.aestheticAccent || template.accentColor || template.accent_color || '#EC4899',
      aestheticBackground: template.aestheticBackground || template.backgroundColor || template.background_color || '#FFFFFF',
      aestheticText: template.aestheticText || template.textColor || template.text_color || '#1F2937',
      aestheticBorder: template.aestheticBorder || '#E5E7EB',
      aestheticGradientStart: template.aestheticGradientStart || '#FDF2F8',
      aestheticGradientEnd: template.aestheticGradientEnd || '#FEF7F0',
      
      // Legacy fields for backward compatibility
      backgroundColor: template.backgroundColor || template.background_color || '#FFFFFF',
      textColor: template.textColor || template.text_color || '#1F2937',
      accentColor: template.accentColor || template.accent_color || '#EC4899',
      
      // Header/Banner Elements
      headerBackground: template.headerBackground || '#FDF2F8',
      headerGradient: template.headerGradient || 'linear-gradient(135deg, #FDF2F8 0%, #FEF7F0 100%)',
      bannerContent: template.bannerContent || '#FFFFFF',
      aestheticBanner: template.aestheticBanner || '#EC4899',
      
      // Typography & Text Elements
      headingPrimary: template.headingPrimary || '#1F2937',
      headingSecondary: template.headingSecondary || '#374151',
      headingAccent: template.headingAccent || '#EC4899',
      statNumber: template.statNumber || '#1F2937',
      statLabel: template.statLabel || '#6B7280',
      badgeAesthetic: template.badgeAesthetic || '#EC4899',
      
      // Navigation Elements
      tabActive: template.tabActive || '#EC4899',
      tabInactive: template.tabInactive || '#9CA3AF',
      navBackground: template.navBackground || '#FDF2F8',
      homeIndicator: template.homeIndicator || '#EC4899',
      
      // Interactive Elements
      btnPrimary: template.btnPrimary || '#EC4899',
      btnSecondary: template.btnSecondary || '#F3E8FF',
      btnAccent: template.btnAccent || '#EC4899',
      indicatorDot: template.indicatorDot || '#EC4899',
      
      // Progress & Status Elements
      progressBar: template.progressBar || '#EC4899',
      progressBackground: template.progressBackground || '#F3E8FF',
      statusActive: template.statusActive || '#10B981',
      statusInactive: template.statusInactive || '#6B7280',
      
      // Container & Background Elements
      contentBackground: template.contentBackground || '#FFFFFF',
      sectionBackground: template.sectionBackground || '#F9FAFB',
      cardBackground: template.cardBackground || '#FFFFFF',
      overlayBackground: template.overlayBackground || 'rgba(0, 0, 0, 0.5)',
      
      bannerUrl: template.bannerUrl || template.banner_url || '',
      animationConfig: template.animationConfig || template.animation_config || { enabled: false }
    }
  });

  // Watch form values for live preview
  const watchedValues = form.watch();

  // Fetch libraries - moved to main component to maintain hook order

  // Load existing template banner
  useEffect(() => {
    const bannerUrl = template.banner_url || template.bannerUrl;
    if (bannerUrl && Array.isArray(bannerLibrary) && bannerLibrary.length > 0) {
      const matchingBanner = bannerLibrary.find((banner: BannerLibrary) => 
        banner.fileUrl === bannerUrl
      );
      if (matchingBanner) {
        setSelectedBanner(matchingBanner);
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
          if (templateAnimations && Array.isArray(templateAnimations)) {
            const animationsMap: {[placement: string]: AnimationLibrary} = {};
            templateAnimations.forEach((ta: any) => {
              const assignment = ta.template_animation_assignments;
              const animation = ta.animation_library;
              
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
              }
            });
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
      const dbData = {
        name: data.name,
        description: data.description,
        
        // Core CSS Variables
        aestheticPrimary: data.aestheticPrimary,
        aestheticSecondary: data.aestheticSecondary,
        aestheticAccent: data.aestheticAccent,
        aestheticBackground: data.aestheticBackground,
        aestheticText: data.aestheticText,
        aestheticBorder: data.aestheticBorder,
        aestheticGradientStart: data.aestheticGradientStart,
        aestheticGradientEnd: data.aestheticGradientEnd,
        
        // Legacy fields for backward compatibility
        background_color: data.backgroundColor,
        text_color: data.textColor,
        accent_color: data.accentColor,
        
        // Header/Banner Elements
        headerBackground: data.headerBackground,
        headerGradient: data.headerGradient,
        bannerContent: data.bannerContent,
        aestheticBanner: data.aestheticBanner,
        
        // Typography & Text Elements
        headingPrimary: data.headingPrimary,
        headingSecondary: data.headingSecondary,
        headingAccent: data.headingAccent,
        statNumber: data.statNumber,
        statLabel: data.statLabel,
        badgeAesthetic: data.badgeAesthetic,
        
        // Navigation Elements
        tabActive: data.tabActive,
        tabInactive: data.tabInactive,
        navBackground: data.navBackground,
        homeIndicator: data.homeIndicator,
        
        // Interactive Elements
        btnPrimary: data.btnPrimary,
        btnSecondary: data.btnSecondary,
        btnAccent: data.btnAccent,
        indicatorDot: data.indicatorDot,
        
        // Progress & Status Elements
        progressBar: data.progressBar,
        progressBackground: data.progressBackground,
        statusActive: data.statusActive,
        statusInactive: data.statusInactive,
        
        // Container & Background Elements
        contentBackground: data.contentBackground,
        sectionBackground: data.sectionBackground,
        cardBackground: data.cardBackground,
        overlayBackground: data.overlayBackground,
        
        banner_url: data.bannerUrl,
        animation_config: data.animationConfig
      };
      
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
      setHasUnsavedChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (data: TemplateFormData) => {
    updateTemplateMutation.mutate(data);
  };

  const handleAnimationSelect = async (animation: AnimationLibrary, placement: string) => {
    try {
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

      setSelectedAnimations(prev => ({
        ...prev,
        [placement]: animation
      }));

      toast({
        title: "Animation assigned",
        description: `${animation.name} assigned to ${placement}`
      });
      
      setHasUnsavedChanges(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign animation",
        variant: "destructive"
      });
    }
  };

  const removeAnimation = async (placement: string) => {
    try {
      const response = await fetch(`/api/page-templates/${template.id}/animations/${placement}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove animation');
      }

      const newAnimations = { ...selectedAnimations };
      delete newAnimations[placement];
      setSelectedAnimations(newAnimations);
      
      toast({
        title: "Animation removed",
        description: `Animation removed from ${placement}`
      });
      
      setHasUnsavedChanges(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove animation",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              console.log('Back button clicked, calling onBack function');
              onBack();
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Templates
          </Button>
          <h1 className="text-3xl font-bold">Edit Template: {template.name}</h1>
        </div>
        <Button 
          onClick={() => form.handleSubmit(handleSubmit)()}
          disabled={updateTemplateMutation.isPending}
          className="bg-blue-500 hover:bg-blue-600"
        >
          {updateTemplateMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Editor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tab Navigation */}
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  {[
                    { id: 'colors', label: 'Core', icon: Palette },
                    { id: 'elements', label: 'Elements', icon: Monitor },
                    { id: 'backgrounds', label: 'Backgrounds', icon: Image },
                    { id: 'animations', label: 'Animations', icon: Sparkles },
                    { id: 'settings', label: 'Settings', icon: Settings },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Elements Tab */}
                {activeTab === 'elements' && (
                  <ScrollArea className="h-96">
                    <div className="space-y-6 pr-4">
                      {/* Header/Banner Elements */}
                      <div className="space-y-4">
                        <h4 className="text-md font-semibold text-muted-foreground border-b pb-2">Header/Banner Elements</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <FormField
                            control={form.control}
                            name="headerBackground"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Header Background (.header-background)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="aestheticBanner"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Aesthetic Banner (.aesthetic-banner)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Typography Elements */}
                      <div className="space-y-4">
                        <h4 className="text-md font-semibold text-muted-foreground border-b pb-2">Typography & Text Elements</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <FormField
                            control={form.control}
                            name="headingPrimary"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Headings (.heading-primary)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="headingSecondary"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Secondary Headings (.heading-secondary)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="statNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Statistics Numbers (.stat-number)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="statLabel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Statistics Labels (.stat-label)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Navigation Elements */}
                      <div className="space-y-4">
                        <h4 className="text-md font-semibold text-muted-foreground border-b pb-2">Navigation Elements</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <FormField
                            control={form.control}
                            name="tabActive"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Active Tab (.tab-active)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="tabInactive"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inactive Tab (.tab-inactive)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="navBackground"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Navigation Background (.nav-background)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="homeIndicator"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Home Indicator (.home-indicator)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Interactive Elements */}
                      <div className="space-y-4">
                        <h4 className="text-md font-semibold text-muted-foreground border-b pb-2">Interactive Elements</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <FormField
                            control={form.control}
                            name="btnPrimary"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Buttons (.btn-primary)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="btnSecondary"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Secondary Buttons (.btn-secondary)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="indicatorDot"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Indicator Dots (.indicator-dot)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Progress Elements */}
                      <div className="space-y-4">
                        <h4 className="text-md font-semibold text-muted-foreground border-b pb-2">Progress & Status Elements</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <FormField
                            control={form.control}
                            name="progressBar"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Progress Bars (.progress-bar)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="progressBackground"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Progress Background (.progress-background)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Container Elements */}
                      <div className="space-y-4">
                        <h4 className="text-md font-semibold text-muted-foreground border-b pb-2">Container & Background Elements</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <FormField
                            control={form.control}
                            name="contentBackground"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Content Background (.content-background)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="sectionBackground"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Section Background (.section-background)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="cardBackground"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Card Background (.card-background)</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                )}

                {/* Colors Tab */}
                {activeTab === 'colors' && (
                  <div className="space-y-6">
                    {/* Core CSS Variables Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Core CSS Variables
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="aestheticPrimary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Color (--aesthetic-primary)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input type="color" {...field} className="w-12 h-8 p-1" />
                                </FormControl>
                                <FormControl>
                                  <Input {...field} className="flex-1 h-8" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="aestheticSecondary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary Color (--aesthetic-secondary)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input type="color" {...field} className="w-12 h-8 p-1" />
                                </FormControl>
                                <FormControl>
                                  <Input {...field} className="flex-1 h-8" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="aestheticAccent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Accent Color (--aesthetic-accent)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input type="color" {...field} className="w-12 h-8 p-1" />
                                </FormControl>
                                <FormControl>
                                  <Input {...field} className="flex-1 h-8" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="aestheticBackground"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Background Color (--aesthetic-background)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input type="color" {...field} className="w-12 h-8 p-1" />
                                </FormControl>
                                <FormControl>
                                  <Input {...field} className="flex-1 h-8" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="aestheticText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Text Color (--aesthetic-text)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input type="color" {...field} className="w-12 h-8 p-1" />
                                </FormControl>
                                <FormControl>
                                  <Input {...field} className="flex-1 h-8" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="aestheticBorder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Border Color (--aesthetic-border)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input type="color" {...field} className="w-12 h-8 p-1" />
                                </FormControl>
                                <FormControl>
                                  <Input {...field} className="flex-1 h-8" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="aestheticGradientStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gradient Start (--aesthetic-gradient-start)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input type="color" {...field} className="w-12 h-8 p-1" />
                                </FormControl>
                                <FormControl>
                                  <Input {...field} className="flex-1 h-8" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="aestheticGradientEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gradient End (--aesthetic-gradient-end)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input type="color" {...field} className="w-12 h-8 p-1" />
                                </FormControl>
                                <FormControl>
                                  <Input {...field} className="flex-1 h-8" />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Backgrounds Tab */}
                {activeTab === 'backgrounds' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Background Images
                      </h3>
                      <Button 
                        type="button"
                        size="sm"
                        onClick={() => setShowBannerDialog(true)}
                        className="gap-2"
                      >
                        <FileType className="h-4 w-4" />
                        Browse Library
                      </Button>
                    </div>

                    {selectedBanner && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Current Banner: {selectedBanner.name}
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Category: {selectedBanner.bannerType}
                        </p>
                      </div>
                    )}

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
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Live Preview</h3>
              <Button 
                onClick={() => setShowLoadingTest(true)}
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Test Loading
              </Button>
            </div>
            <Card>
              <CardContent className="p-0 relative">
                <div 
                  className="min-h-screen relative" 
                  style={{
                    backgroundColor: watchedValues.backgroundColor || '#ffffff',
                    color: watchedValues.textColor || '#000000'
                  }}
                >
                  {/* Loading overlay for testing */}
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

                  {/* Hero Section */}
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
                    {selectedAnimations.title?.fileUrl && (
                      <div 
                        className="absolute inset-0 opacity-40"
                        style={{
                          backgroundImage: `url(${selectedAnimations.title.fileUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          filter: 'blur(1px) brightness(0.8)',
                          zIndex: 1
                        }}
                      />
                    )}
                    
                    <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
                      {/* Creator Avatar */}
                      <div className="mb-6">
                        <div className="w-24 h-24 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                          <span className="text-white text-2xl font-bold">JM</span>
                        </div>
                      </div>
                      
                      {/* Creator Name and Title with Animation */}
                      <h1 className="text-4xl font-bold mb-2 relative inline-block">
                        {/* Title animation backgrounds */}
                        {selectedAnimations.title?.fileUrl && (
                          <div className="absolute inset-0 -inset-x-4 -inset-y-2 rounded overflow-hidden" style={{ zIndex: 0 }}>
                            <img
                              src={selectedAnimations.title.fileUrl}
                              alt="Title animation"
                              className="w-full h-full object-cover"
                              style={{ filter: 'brightness(0.8) contrast(1.2)' }}
                            />
                          </div>
                        )}
                        <span className="relative" style={{ zIndex: 1 }}>
                          {watchedValues.name || template.name}
                        </span>
                      </h1>
                      
                      <p className="text-xl mb-8 text-white/90">
                        {watchedValues.description || template.description || 'Content Creator'}
                      </p>
                    </div>
                  </div>

                  {/* Box Outline Animation */}
                  {selectedAnimations.boxOutline?.fileUrl && (
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                      <img
                        src={selectedAnimations.boxOutline.fileUrl}
                        alt="Box outline animation"
                        className="w-full h-full object-cover opacity-60"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>

      {/* Banner Library Dialog */}
      <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Banner Library</DialogTitle>
            <DialogDescription>Choose a background image from your library</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            <div className="grid grid-cols-3 gap-4">
              {Array.isArray(bannerLibrary) && bannerLibrary.map((banner: BannerLibrary) => (
                <Card 
                  key={banner.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedBanner?.id === banner.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedBanner(banner);
                    form.setValue('bannerUrl', banner.fileUrl);
                    setShowBannerDialog(false);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <div 
                    className="h-32 bg-cover bg-center rounded-t-lg"
                    style={{ backgroundImage: `url(${banner.fileUrl})` }}
                  />
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm">{banner.name}</h4>
                    <p className="text-xs text-muted-foreground">{banner.bannerType}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Animation Library Dialog */}
      <Dialog open={showAnimationDialog} onOpenChange={setShowAnimationDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Animation Library</DialogTitle>
            <DialogDescription>Choose animations for your template</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            <div className="grid grid-cols-4 gap-4">
              {Array.isArray(animationLibrary) && animationLibrary.map((animation: AnimationLibrary) => (
                <Card 
                  key={animation.id} 
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => {
                    if (animationPlacement) {
                      handleAnimationSelect(animation, animationPlacement);
                      setAnimationPlacement('');
                    }
                    setShowAnimationDialog(false);
                  }}
                >
                  <div className="p-3">
                    {animation.thumbnailUrl ? (
                      <img 
                        src={animation.thumbnailUrl} 
                        alt={animation.name}
                        className="w-full h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-20 bg-muted rounded flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <h4 className="font-medium text-sm mt-2">{animation.name}</h4>
                    <p className="text-xs text-muted-foreground">{animation.category}</p>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AestheticBuilderAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const animationInputRef = useRef<HTMLInputElement>(null);
  const previewImageInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [editingTemplate, setEditingTemplate] = useState<PageTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PageTemplate | null>(null);
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<'banner' | 'animation' | null>(null);
  const [showAnimationTypeDialog, setShowAnimationTypeDialog] = useState(false);
  const [pendingAnimationFiles, setPendingAnimationFiles] = useState<File[]>([]);
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0);
  const [animationName, setAnimationName] = useState('');
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [animationPlacement, setAnimationPlacement] = useState('');
  const [editorActiveTab, setEditorActiveTab] = useState('colors');

  // Direct fetch without cache for aesthetic templates
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      setTemplatesError(null);
      console.log('🎨 Fetching aesthetic templates with no cache...');
      
      const response = await fetch('/api/page-templates', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('🎨 Templates API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎨 Templates API error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🎨 Templates data received:', data?.length || 0, 'templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('🎨 Templates fetch error:', error);
      setTemplatesError(error instanceof Error ? error.message : 'Failed to fetch templates');
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const { data: animationLibrary, isLoading: isLoadingAnimations } = useQuery({
    queryKey: ['/api/animation-library'],
  });

  const { data: bannerLibrary, isLoading: isLoadingBanners } = useQuery({
    queryKey: ['/api/banner-library'],
  });

  // Form setup - must be called consistently
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      // Core CSS Variables with defaults
      aestheticPrimary: "#3b82f6",
      aestheticSecondary: "#6366f1",
      aestheticAccent: "#8b5cf6",
      aestheticBackground: "#ffffff",
      aestheticText: "#1f2937",
      aestheticBorder: "#e5e7eb",
      aestheticGradientStart: "#3b82f6",
      aestheticGradientEnd: "#8b5cf6",
      // Legacy fields
      backgroundColor: "#ffffff",
      textColor: "#000000",
      accentColor: "#3b82f6",
      bannerUrl: "",
      animationConfig: { enabled: true }
    }
  });

  // Watch form values for live preview
  const watchedValues = form.watch();

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, target: 'banner' | 'animation') => {
    e.preventDefault();
    setIsDragging(true);
    setDragTarget(target);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
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
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
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
    }
  };

  const handleAnimationUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles: File[] = [];
      
      Array.from(files).forEach(file => {
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
        setCurrentAnimationIndex(0);
        setAnimationName(validFiles[0].name.replace(/\.[^/.]+$/, ""));
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
    
    if (currentAnimationIndex < pendingAnimationFiles.length - 1) {
      const nextIndex = currentAnimationIndex + 1;
      setCurrentAnimationIndex(nextIndex);
      setAnimationName(pendingAnimationFiles[nextIndex].name.replace(/\.[^/.]+$/, ""));
      setPreviewImage(null);
      setPreviewImageUrl('');
    } else {
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
      const response = await fetch("/api/page-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      fetchTemplates(); // Refresh templates list
      toast({ title: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/page-templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
    },
    onSuccess: () => {
      fetchTemplates(); // Refresh templates list
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  // Helper function to get template colors
  const getTemplateColors = (template: PageTemplate) => {
    return {
      backgroundColor: template.backgroundColor || template.background_color || '#ffffff',
      textColor: template.textColor || template.text_color || '#000000',
      accentColor: template.accentColor || template.accent_color || '#3b82f6',
    };
  };

  const handleSubmit = (data: TemplateFormData) => {
    // Immediate UI feedback - close dialog and reset form instantly
    setShowCreateDialog(false);
    form.reset();
    
    // Show instant feedback
    toast({ title: "Creating template..." });
    
    // Execute mutation in background
    createTemplateMutation.mutate(data);
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const renderTemplateCard = (template: PageTemplate) => {
    const colors = getTemplateColors(template);
    
    return (
      <Card key={template.id} className="border-2 overflow-hidden hover:shadow-lg transition-shadow">
        {/* Template Preview */}
        <div 
          className="h-40 relative flex items-center justify-center overflow-hidden"
          style={{
            backgroundColor: colors.backgroundColor
          }}
        >
          {/* Background Image/GIF */}
          {(template.bannerUrl || template.banner_url) ? (
            <img
              src={template.bannerUrl || template.banner_url}
              alt={`${template.name} background`}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 1 }}
            />
          ) : (
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                background: `linear-gradient(135deg, ${colors.backgroundColor}, ${colors.accentColor})`,
                zIndex: 1
              }}
            />
          )}
          <div className="absolute inset-0 bg-black/20" style={{ zIndex: 2 }}></div>
          <div className="relative text-center" style={{ zIndex: 3 }}>
            <h3 className="text-xl font-bold text-white mb-2">{template.name}</h3>
            <div className="flex gap-1">
              <div className="w-8 h-2 bg-white/80 rounded"></div>
              <div className="w-12 h-2 bg-white/60 rounded"></div>
              <div className="w-6 h-2 bg-white/40 rounded"></div>
            </div>
            <button 
              className="mt-3 px-4 py-1 rounded text-white text-sm font-medium"
              style={{ backgroundColor: colors.accentColor }}
            >
              Link
            </button>
          </div>
        </div>
        
        {/* Color Palette */}
        <div className="p-3 flex items-center justify-between">
          <div className="flex gap-2">
            <div 
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: colors.backgroundColor }}
              title="Background"
            ></div>
            <div 
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: colors.textColor }}
              title="Text"
            ></div>
            <div 
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: colors.accentColor }}
              title="Accent"
            ></div>
          </div>
          <span className="text-xs text-muted-foreground">Custom Theme</span>
        </div>
        
        {/* Template Info */}
        <CardContent className="pt-0">
          <h4 className="font-semibold mb-1">{template.name}</h4>
          <p className="text-sm text-muted-foreground mb-3">
            {template.description || 'Template for testing Active Animations'}
          </p>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => setPreviewTemplate(template)}
            >
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => setEditingTemplate(template)}
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleDeleteTemplate(template.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Removed auto-selection to allow proper navigation back to template list

  if (isLoadingTemplates) {
    return (
      <div className="min-h-screen p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingAnimation size="lg" />
          <p className="mt-6 text-lg text-muted-foreground">Loading aesthetic templates...</p>
        </div>
      </div>
    );
  }

  // Show template editor if editing
  if (editingTemplate) {
    return <TemplateEditor 
      template={editingTemplate} 
      onBack={() => setEditingTemplate(null)}
      animationLibrary={Array.isArray(animationLibrary) ? animationLibrary as AnimationLibrary[] : []}
      bannerLibrary={Array.isArray(bannerLibrary) ? bannerLibrary as BannerLibrary[] : []}
    />;
  }

  return (
    <div className="min-h-screen p-6">
      {/* Back Button */}
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

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Palette className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Aesthetic Builder</h1>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.isArray(templates) ? templates.map(renderTemplateCard) : []}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-6 h-6" />
              Create New Aesthetic Template
            </DialogTitle>
            <DialogDescription>
              Design a visual theme with colors, fonts, and styling that creators can apply
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {[
                { id: 'basic', label: 'Basic Info', icon: FileText },
                { id: 'colors', label: 'Colors', icon: Palette },
                { id: 'backgrounds', label: 'Backgrounds', icon: Image },
                { id: 'animations', label: 'Animations', icon: Sparkles },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Form Fields */}
                  <div className="space-y-4">
                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Midnight Elegance" {...field} />
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
                                <Textarea placeholder="Describe the aesthetic style..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Colors Tab */}
                    {activeTab === 'colors' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Palette className="h-5 w-5" />
                          Color Palette
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <FormField
                            control={form.control}
                            name="backgroundColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Background</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
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
                                <FormLabel className="text-xs">Text Color</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
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
                                <FormLabel className="text-xs">Accent Color</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input type="color" {...field} className="w-12 h-8 p-1" />
                                  </FormControl>
                                  <FormControl>
                                    <Input {...field} className="flex-1 h-8" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* Backgrounds Tab */}
                    {activeTab === 'backgrounds' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Image className="h-5 w-5" />
                            Background Images
                          </h3>
                          <Button 
                            type="button"
                            size="sm"
                            onClick={() => setShowBannerLibrary(true)}
                            className="gap-2"
                          >
                            <FileType className="h-4 w-4" />
                            Library
                          </Button>
                        </div>

                        {/* Current Banner */}
                        {(selectedBanner || uploadedBanner) && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                Current Banner: {selectedBanner?.name || uploadedBanner?.name}
                              </span>
                            </div>
                            {selectedBanner && (
                              <p className="text-xs text-green-600 mt-1">
                                Category: {selectedBanner.bannerType}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Drag and Drop Zone */}
                        <div 
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                            isDragging && dragTarget === 'banner' ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                          }`}
                          onDragOver={(e) => handleDragOver(e, 'banner')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, 'banner')}
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
                            onClick={() => bannerInputRef.current?.click()}
                          >
                            Choose Files
                          </Button>
                        </div>

                        {/* Banner Preview */}
                        {(selectedBanner?.fileUrl || uploadedBanner) && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Preview:</p>
                            <div 
                              className="w-full h-32 rounded-lg border bg-cover bg-center"
                              style={{ 
                                backgroundImage: `url(${selectedBanner?.fileUrl || (uploadedBanner ? URL.createObjectURL(uploadedBanner) : '')})` 
                              }}
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
                            onClick={() => setShowAnimationLibrary(true)}
                            className="gap-2"
                          >
                            <Zap className="h-4 w-4" />
                            Library
                          </Button>
                        </div>
                        
                        {/* Animation Assignments */}
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
                                    setShowAnimationLibrary(true);
                                  }}
                                >
                                  {selectedAnimations[placement] ? 'Change' : 'Select'}
                                </Button>
                                {selectedAnimations[placement] && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      const newAnimations = { ...selectedAnimations };
                                      delete newAnimations[placement];
                                      setSelectedAnimations(newAnimations);
                                    }}
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
                            isDragging && dragTarget === 'animation' ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                          }`}
                          onDragOver={(e) => handleDragOver(e, 'animation')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, 'animation')}
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
                            onClick={() => animationInputRef.current?.click()}
                          >
                            Choose Files
                          </Button>
                        </div>

                        {/* Uploaded Animations */}
                        {uploadedAnimations.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Uploaded Animations:</p>
                            <div className="space-y-2">
                              {uploadedAnimations.map((animation, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <FileType className="h-4 w-4" />
                                    <span className="text-sm font-medium">{animation.name}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {animation.type}
                                    </Badge>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeAnimation(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Live Preview */}
                  <div className="space-y-4">
                    <Label>Live Preview</Label>
                    <div 
                      className="border-2 rounded-lg overflow-hidden relative" 
                      style={{ backgroundColor: watchedValues.backgroundColor }}
                    >
                      {/* Header Banner */}
                      <div 
                        className="h-32 relative flex items-center justify-center text-white overflow-hidden"
                        style={{
                          backgroundImage: selectedBanner?.fileUrl || uploadedBanner
                            ? `url(${selectedBanner?.fileUrl || (uploadedBanner ? URL.createObjectURL(uploadedBanner) : '')})`
                            : `linear-gradient(135deg, ${watchedValues.backgroundColor}, ${watchedValues.accentColor})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        <div className="absolute inset-0 bg-black/20"></div>
                        
                        {/* Title animation background overlay */}
                        {selectedAnimations.title && selectedAnimations.title.fileUrl && (
                          <div 
                            className="absolute inset-0 opacity-40"
                            style={{
                              backgroundImage: `url(${selectedAnimations.title.fileUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                              filter: 'blur(1px) brightness(0.8)',
                              zIndex: 1
                            }}
                          />
                        )}
                        
                        {/* Title with Animation */}
                        <h2 className="relative text-xl font-bold text-white inline-block" style={{ zIndex: 2 }}>
                          {/* Title animation backgrounds - positioned around the text only */}
                          {selectedAnimations.title && selectedAnimations.title.fileUrl && (
                            <div className="absolute inset-0 -inset-x-4 -inset-y-2 rounded overflow-hidden" style={{ zIndex: 0 }}>
                              {(() => {
                                const fileUrl = selectedAnimations.title.fileUrl;
                                const isGif = fileUrl.toLowerCase().includes('.gif') || fileUrl.includes('data:image/gif');
                                const isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm') || fileUrl.includes('data:video/');
                                
                                if (isVideo) {
                                  return (
                                    <video
                                      autoPlay
                                      loop
                                      muted
                                      playsInline
                                      className="w-full h-full object-cover"
                                      style={{ filter: 'brightness(0.8) contrast(1.2)' }}
                                    >
                                      <source src={fileUrl} type="video/mp4" />
                                    </video>
                                  );
                                } else if (isGif) {
                                  return (
                                    <img
                                      src={fileUrl}
                                      alt="Title animation"
                                      className="w-full h-full object-cover"
                                      style={{ filter: 'brightness(0.8) contrast(1.2)' }}
                                    />
                                  );
                                } else {
                                  return (
                                    <div 
                                      className="w-full h-full bg-cover bg-center"
                                      style={{ 
                                        backgroundImage: `url(${fileUrl})`,
                                        filter: 'brightness(0.8) contrast(1.2)'
                                      }}
                                    />
                                  );
                                }
                              })()}
                            </div>
                          )}
                          <span className="relative" style={{ zIndex: 1 }}>
                            {watchedValues.name || 'Template Name'}
                          </span>
                        </h2>
                      </div>
                      
                      {/* Box Outline Animation - positioned around the entire preview */}
                      {selectedAnimations.boxOutline && selectedAnimations.boxOutline.fileUrl && (
                        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                          {(() => {
                            const fileUrl = selectedAnimations.boxOutline.fileUrl;
                            const isGif = fileUrl.toLowerCase().includes('.gif') || fileUrl.includes('data:image/gif');
                            const isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm') || fileUrl.includes('data:video/');
                            
                            if (isVideo) {
                              return (
                                <video
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  className="w-full h-full object-cover opacity-60"
                                >
                                  <source src={fileUrl} type="video/mp4" />
                                </video>
                              );
                            } else if (isGif) {
                              return (
                                <img
                                  src={fileUrl}
                                  alt="Box outline animation"
                                  className="w-full h-full object-cover opacity-60"
                                />
                              );
                            } else {
                              return (
                                <div 
                                  className="w-full h-full bg-cover bg-center opacity-60"
                                  style={{ backgroundImage: `url(${fileUrl})` }}
                                />
                              );
                            }
                          })()}
                        </div>
                      )}
                      
                      {/* Content Area */}
                      <div className="p-4 space-y-3 relative" style={{ color: watchedValues.textColor, zIndex: 2 }}>
                        <h3 className="font-semibold">Sample Content</h3>
                        <p className="text-sm opacity-80">
                          {watchedValues.description || 'This is how your content will appear with this aesthetic template.'}
                        </p>
                        
                        {/* Sample Button */}
                        <button 
                          className="px-4 py-2 rounded text-white text-sm font-medium"
                          style={{ backgroundColor: watchedValues.accentColor }}
                        >
                          Link
                        </button>
                        
                        {/* Color Palette */}
                        <div className="flex gap-2 mt-3">
                          <div 
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: watchedValues.backgroundColor }}
                            title="Background"
                          ></div>
                          <div 
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: watchedValues.textColor }}
                            title="Text"
                          ></div>
                          <div 
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: watchedValues.accentColor }}
                            title="Accent"
                          ></div>
                        </div>
                      </div>

                      {/* Loading Animation Overlay - shows when loading animation is selected */}
                      {selectedAnimations.loading && selectedAnimations.loading.fileUrl && activeTab === 'animations' && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/20"
                          style={{ zIndex: 50 }}
                        >
                          {(() => {
                            const fileUrl = selectedAnimations.loading.fileUrl;
                            const isGif = fileUrl.toLowerCase().includes('.gif') || fileUrl.includes('data:image/gif');
                            const isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm') || fileUrl.includes('data:video/');
                            
                            if (isVideo) {
                              return (
                                <video
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  className="w-16 h-16 object-contain"
                                >
                                  <source src={fileUrl} type="video/mp4" />
                                </video>
                              );
                            } else if (isGif) {
                              return (
                                <img
                                  src={fileUrl}
                                  alt="Loading animation"
                                  className="w-16 h-16 object-contain"
                                />
                              );
                            } else {
                              return (
                                <div 
                                  className="w-16 h-16 bg-cover bg-center"
                                  style={{ backgroundImage: `url(${fileUrl})` }}
                                />
                              );
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={createTemplateMutation.isPending}>
                    {createTemplateMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 mr-2">
                          <LoadingAnimation size="sm" />
                        </div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={bannerInputRef}
        onChange={handleBannerUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={animationInputRef}
        onChange={handleAnimationUpload}
        accept=".mp4,.webm,.gif,.json,.lottie"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={previewImageInputRef}
        onChange={handlePreviewImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Animation Type Selection Dialog */}
      <Dialog open={showAnimationTypeDialog} onOpenChange={setShowAnimationTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Animation</DialogTitle>
            <DialogDescription>
              Configure your animation file and upload a preview image
            </DialogDescription>
          </DialogHeader>
          
          {pendingAnimationFiles.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                File {currentAnimationIndex + 1} of {pendingAnimationFiles.length}: {pendingAnimationFiles[currentAnimationIndex]?.name}
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="animation-name">Animation Name</Label>
                  <Input
                    id="animation-name"
                    value={animationName}
                    onChange={(e) => setAnimationName(e.target.value)}
                    placeholder="Enter animation name"
                  />
                </div>
                
                <div>
                  <Label>Preview Image</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => previewImageInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Preview
                    </Button>
                    {previewImage && (
                      <span className="text-sm text-muted-foreground flex items-center">
                        ✓ {previewImage.name}
                      </span>
                    )}
                  </div>
                  {previewImageUrl && (
                    <div className="mt-2">
                      <img
                        src={previewImageUrl}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <Label>Animation Type</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {['title', 'loading', 'decoration'].map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnimationTypeSelection(type)}
                        className="capitalize"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Banner Library Dialog */}
      <Dialog open={showBannerLibrary} onOpenChange={setShowBannerLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Banner Library</DialogTitle>
            <DialogDescription>Choose a background image from your library</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={bannerCategory} onValueChange={setBannerCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="nature">Nature</SelectItem>
                  <SelectItem value="abstract">Abstract</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <ScrollArea className="h-96">
              <div className="grid grid-cols-3 gap-4">
                {Array.isArray(bannerLibrary) && bannerLibrary
                  .filter((banner: BannerLibrary) => bannerCategory === 'all' || banner.bannerType === bannerCategory)
                  .map((banner: BannerLibrary) => (
                    <Card 
                      key={banner.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedBanner?.id === banner.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => {
                        setSelectedBanner(banner);
                        setUploadedBanner(null);
                        form.setValue('bannerUrl', banner.fileUrl);
                        setShowBannerLibrary(false);
                        setUnsavedChanges(true);
                      }}
                    >
                      <div 
                        className="h-32 bg-cover bg-center rounded-t-lg"
                        style={{ backgroundImage: `url(${banner.fileUrl})` }}
                      />
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm">{banner.name}</h4>
                        <p className="text-xs text-muted-foreground">{banner.bannerType}</p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Animation Library Dialog */}
      <Dialog open={showAnimationLibrary} onOpenChange={setShowAnimationLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Animation Library</DialogTitle>
            <DialogDescription>Choose animations for your template</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={animationCategory} onValueChange={setAnimationCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="loading">Loading</SelectItem>
                  <SelectItem value="decoration">Decoration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <ScrollArea className="h-96">
              <div className="grid grid-cols-4 gap-4">
                {Array.isArray(animationLibrary) && animationLibrary
                  .filter((animation: AnimationLibrary) => animationCategory === 'all' || animation.category === animationCategory)
                  .map((animation: AnimationLibrary) => (
                    <Card 
                      key={animation.id} 
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => {
                        if (animationPlacement) {
                          setSelectedAnimations(prev => ({
                            ...prev,
                            [animationPlacement]: animation
                          }));
                          setAnimationPlacement('');
                        }
                        setShowAnimationLibrary(false);
                        setUnsavedChanges(true);
                      }}
                    >
                      <div className="p-3">
                        {animation.thumbnailUrl ? (
                          <img 
                            src={animation.thumbnailUrl} 
                            alt={animation.name}
                            className="w-full h-20 object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-20 bg-muted rounded flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <h4 className="font-medium text-sm mt-2">{animation.name}</h4>
                        <p className="text-xs text-muted-foreground">{animation.category}</p>
                      </div>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Created Templates</h2>
          <div className="text-sm text-muted-foreground">
            {templates?.length || 0} templates
          </div>
        </div>

        {isLoadingTemplates ? (
          <div className="flex flex-col items-center justify-center p-8">
            <LoadingAnimation size="md" />
            <p className="mt-4 text-sm text-muted-foreground">Loading aesthetic templates...</p>
          </div>
        ) : templatesError ? (
          <div className="text-center p-8 text-destructive">
            <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Error loading templates</p>
            <p className="text-sm mt-1">{templatesError}</p>
            <button 
              onClick={fetchTemplates}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        ) : templates?.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates created yet. Click "Create Template" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(templates) && templates.map((template) => renderTemplateCard(template))}
          </div>
        )}
      </div>
    </div>
  );
}