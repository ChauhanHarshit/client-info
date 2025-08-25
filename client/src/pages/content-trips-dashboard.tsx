import { useState, useEffect, useMemo, useRef, useCallback, useTransition } from 'react';
// Removed React Query imports as we're using direct fetch with zero-caching
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Plane, 
  Star, 
  DollarSign, 
  Camera, 
  LinkIcon as Link, 
  Upload, 
  Settings,
  ArrowLeft,
  ArrowRight,
  X,
  Check,
  Users,
  Send,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Crop as CropIcon,
  Move,
  RotateCcw,
  Save,
  ZoomIn,
  Smartphone,
  Monitor
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
// Removed apiRequest import as we're using direct fetch with zero-caching
import { TripScheduleCalendar } from '@/components/trip-schedule-calendar';
import { useCrmAuth } from '@/contexts/CrmAuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreatorAvatar } from '@/components/ui/creator-avatar';

import type { TripRsvp, Creator } from '@shared/schema';

// Schema for content trip form
const contentTripFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  location: z.string().min(1, 'Location is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  managedAttendees: z.array(z.number()).default([]),
  backgroundImageUrl: z.string().optional(),
  coverPhotos: z.array(z.string()).default([]),
  housePhotoLink: z.string().optional(),
  flyerPdfLinks: z.array(z.string()).default([]),
  inspoPageLink: z.string().optional(),
  outfitLinks: z.string().optional(),
  feedbackFormLink: z.string().optional(),
  finalDriveLink: z.string().optional(),
  tripCost: z.string().optional(),
  rating: z.string().optional(),
  notes: z.string().optional(),
  preAnnouncement: z.string().optional(),
  contentGoals: z.string().optional(),
});

type ContentTripFormData = z.infer<typeof contentTripFormSchema>;

// Photo interface with cropping data
interface PhotoItem {
  id: string;
  src: string;
  crop?: PixelCrop;
  croppedSrc?: string;
}

// Image Crop Dialog Component
function ImageCropDialog({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  imageSrc: string; 
  onSave: (croppedImageSrc: string) => void; 
}) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [zoom, setZoom] = useState(100);
  const [isDragging, setIsDragging] = useState(false);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setCrop({
      unit: '%',
      width: 90,
      height: 90,
      x: 5,
      y: 5
    });
  };

  const handleSaveCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) return;

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = () => {
        // Force immediate update by calling onSave with instant data
        const croppedResult = reader.result as string;
        onSave(croppedResult);
        onClose();
        
        // Trigger immediate re-render of slideshow
        setTimeout(() => {
          const slideshowImg = document.querySelector('.slideshow-main-image') as HTMLImageElement;
          if (slideshowImg) {
            slideshowImg.src = croppedResult;
            slideshowImg.style.opacity = '1';
          }
        }, 10);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.95);
  }, [completedCrop, onSave, onClose]);

  const resetCrop = () => {
    setCrop({
      unit: '%',
      width: 90,
      height: 90,
      x: 5,
      y: 5
    });
    setZoom(100);
  };

  const zoomPresets = [
    { label: '50%', value: 50 },
    { label: '75%', value: 75 },
    { label: '100%', value: 100 },
    { label: '125%', value: 125 },
    { label: '150%', value: 150 },
    { label: '200%', value: 200 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            Advanced Image Editor
          </DialogTitle>
          <DialogDescription>
            Zoom, crop, and reposition your image with precision controls for optimal slideshow performance
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* High-Performance Zoom Controls */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
            <Label className="text-sm font-medium flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              Zoom:
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="25"
                max="300"
                step="25"
                value={zoom}
                onChange={(e) => setZoom(parseInt(e.target.value))}
                className="w-32 accent-blue-600"
              />
              <span className="text-sm font-medium w-12 text-blue-600">{zoom}%</span>
            </div>
            <div className="flex gap-1">
              {zoomPresets.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant={zoom === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setZoom(preset.value)}
                  className="px-2 py-1 text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Optimized Editor Area */}
          <div 
            className="relative overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300" 
            style={{ height: '450px' }}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <div 
              className={`transition-transform duration-200 ease-out ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center'
              }}
            >
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => {
                  setCrop(percentCrop);
                  // Real-time crop feedback
                  if (percentCrop.width > 0 && percentCrop.height > 0) {
                    setCompletedCrop({
                      x: percentCrop.x,
                      y: percentCrop.y,
                      width: percentCrop.width,
                      height: percentCrop.height,
                      unit: 'px'
                    });
                  }
                }}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={16/9}
                minWidth={100}
                minHeight={60}
                className="max-w-full max-h-[400px]"
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageSrc}
                  style={{ maxHeight: '400px', maxWidth: '100%' }}
                  onLoad={onImageLoad}
                  className="object-contain select-none"
                  draggable={false}
                />
              </ReactCrop>
            </div>
            
            {/* Real-time Performance Indicators */}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
              <Move className="h-3 w-3" />
              Drag to reposition • Use zoom controls • Adjust crop handles
            </div>
            
            {/* Zoom Feedback */}
            <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded">
              {zoom}% zoom
            </div>
          </div>
          
          {/* Optimized Action Controls */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={resetCrop}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveCrop}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Save Crop
              </Button>
            </div>
          </div>
        </div>
        
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </DialogContent>
    </Dialog>
  );
}

// Lazy Image Component for AWS S3 optimization
function LazyImage({ src, alt, className, style }: { src: string, alt: string, className?: string, style?: React.CSSProperties }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };
    img.src = src;
  }, [src]);

  if (hasError) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`} style={style}>
        <ImageIcon className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className} bg-gradient-to-br from-blue-100 to-indigo-200 animate-pulse flex items-center justify-center`} style={style}>
        <Plane className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc!}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
    />
  );
}

function TripCoverSlideshow({ photos, tripTitle }: { photos: string[], tripTitle: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Auto-advance slideshow every 3 seconds
  useEffect(() => {
    if (!isAutoPlaying || photos.length <= 1) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, photos.length]);

  // Pause auto-play on hover, resume on mouse leave
  const handleMouseEnter = () => {
    setIsAutoPlaying(false);
  };

  const handleMouseLeave = () => {
    setIsAutoPlaying(true);
  };

  if (!photos || photos.length === 0) return null;

  return (
    <div 
      className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <LazyImage
        src={photos[currentIndex]}
        alt={`${tripTitle} - Photo ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-opacity duration-500"
      />
      
      {photos.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          
          {/* Photo counter with auto-play indicator */}
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            {isAutoPlaying && <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>}
            {currentIndex + 1} / {photos.length}
          </div>
          
          {/* Dot indicators for direct navigation */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex 
                    ? 'bg-white' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Background Image Slideshow Manager Component
function BackgroundImageManager({ 
  images, 
  onImagesChange,
  label = "Background Images"
}: { 
  images: string[], 
  onImagesChange: (images: string[]) => void,
  label?: string
}) {
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleAddUrl = () => {
    if (newImageUrl.trim() && !images.includes(newImageUrl.trim())) {
      onImagesChange([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(file);
    // In a real implementation, you would upload to a file storage service
    // For now, we'll create a local URL
    const url = URL.createObjectURL(file);
    onImagesChange([...images, url]);
    setUploadingFile(null);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    if (currentSlideIndex >= newImages.length && newImages.length > 0) {
      setCurrentSlideIndex(newImages.length - 1);
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange(newImages);
  };

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>
      
      {/* Image Upload Section */}
      <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
        {/* URL Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="https://example.com/image.jpg"
              className="pl-10"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
            />
          </div>
          <Button
            type="button"
            onClick={handleAddUrl}
            disabled={!newImageUrl.trim()}
            size="sm"
          >
            Add URL
          </Button>
        </div>

        {/* File Upload */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('bg-image-upload')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Image
          </Button>
          <input
            id="bg-image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
              }
            }}
          />
          {uploadingFile && (
            <span className="text-sm text-gray-600">
              Uploading {uploadingFile.name}...
            </span>
          )}
        </div>
      </div>

      {/* Images Preview & Management */}
      {images.length > 0 && (
        <div className="space-y-4">
          {/* Main Slideshow Preview */}
          <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={images[currentSlideIndex]}
              alt={`Background image ${currentSlideIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                  {currentSlideIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Management */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">
              Manage Images ({images.length})
            </Label>
            <div className="grid grid-cols-4 gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <div 
                    className={`relative h-20 bg-gray-100 rounded border-2 cursor-pointer transition-colors ${
                      index === currentSlideIndex ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setCurrentSlideIndex(index)}
                  >
                    <img
                      src={image}
                      alt={`Background ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded" />
                  </div>
                  
                  {/* Image Controls */}
                  <div className="absolute -top-2 -right-2 flex gap-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Move Controls */}
                  <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-5 w-5 p-0 text-xs"
                        onClick={() => moveImage(index, index - 1)}
                      >
                        <ArrowLeft className="h-2 w-2" />
                      </Button>
                    )}
                    {index < images.length - 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-5 w-5 p-0 text-xs"
                        onClick={() => moveImage(index, index + 1)}
                      >
                        <ArrowRight className="h-2 w-2" />
                      </Button>
                    )}
                  </div>

                  {/* Position Indicator */}
                  <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Trip Invite Management Component (temporarily simplified for zero-caching implementation)
function TripInviteManager({ tripId }: { tripId: number }) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [rsvps, setRsvps] = useState<TripRsvp[]>([]);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const { toast } = useToast();

  // Direct fetch for RSVPs (no caching)
  const fetchRsvps = async () => {
    if (!tripId) return;
    
    try {
      const response = await fetch(`/api/content-trips/${tripId}/rsvps?timestamp=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRsvps(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch RSVPs:', error);
      setRsvps([]);
    }
  };

  // Direct invite creation (no React Query)
  const handleCreateInviteRequest = async (email: string, name?: string) => {
    setIsCreatingInvite(true);
    try {
      const response = await fetch(`/api/content-trips/${tripId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ creatorEmail: email, creatorName: name }),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert to branded domain for sharing
      const brandedDomain = 'https://tastyyyy.com';
      const inviteUrl = data.inviteUrl.replace('http://localhost:5000', brandedDomain).replace(window.location.origin, brandedDomain);
      
      setGeneratedInviteUrl(inviteUrl);
      await fetchRsvps(); // Refresh RSVPs
      
      toast({
        title: "Invite created successfully",
        description: "The invite link has been generated and is ready to share.",
      });
      
    } catch (error) {
      console.error('Invite creation error:', error);
      toast({
        title: "Error creating invite",
        description: "Failed to generate trip invite. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvite(false);
    }
  };

  // Load RSVPs on mount
  useEffect(() => {
    if (tripId) {
      fetchRsvps();
    }
  }, [tripId]);

  const handleCreateInvite = () => {
    if (!creatorEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a creator email address.",
        variant: "destructive",
      });
      return;
    }

    handleCreateInviteRequest(
      creatorEmail.trim(),
      creatorName.trim() || undefined
    );
  };

  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(generatedInviteUrl);
      toast({
        title: "Link copied",
        description: "Invite link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Failed to copy link. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const resetInviteDialog = () => {
    setCreatorEmail('');
    setCreatorName('');
    setGeneratedInviteUrl('');
    setIsInviteDialogOpen(false);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'going': return 'bg-green-100 text-green-800';
      case 'not_going': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'going': return 'Going';
      case 'not_going': return 'Not Going';
      default: return 'Pending';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Trip Invites ({rsvps.length})
        </h3>
        <Button
          onClick={() => setIsInviteDialogOpen(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          Send Invite
        </Button>
      </div>

      {/* RSVPs List */}
      {rsvps.length > 0 && (
        <div className="space-y-2">
          {rsvps.map((rsvp) => (
            <div key={rsvp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium">
                  {rsvp.creatorName || rsvp.creatorEmail}
                </p>
                {rsvp.creatorName && (
                  <p className="text-sm text-gray-600">{rsvp.creatorEmail}</p>
                )}
                {rsvp.comment && (
                  <p className="text-sm text-gray-700 mt-1 italic">"{rsvp.comment}"</p>
                )}
              </div>
              <Badge className={getStatusBadgeColor(rsvp.status)}>
                {getStatusText(rsvp.status)}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Invite Creation Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Trip Invite</DialogTitle>
            <DialogDescription>
              Create a shareable invite link for a creator to RSVP to this trip.
            </DialogDescription>
          </DialogHeader>

          {!generatedInviteUrl ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="creator-email">Creator Email *</Label>
                <Input
                  id="creator-email"
                  type="email"
                  placeholder="creator@example.com"
                  value={creatorEmail}
                  onChange={(e) => setCreatorEmail(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="creator-name">Creator Name (Optional)</Label>
                <Input
                  id="creator-name"
                  placeholder="Creator Name"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={resetInviteDialog} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateInvite} 
                  disabled={isCreatingInvite}
                  className="flex-1"
                >
                  {isCreatingInvite ? 'Creating...' : 'Create Invite'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Invite Link Generated</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={generatedInviteUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={copyInviteUrl} size="sm" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  <Check className="h-4 w-4 inline mr-2" />
                  Invite created successfully! Share this link with the creator.
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={resetInviteDialog} variant="outline" className="flex-1">
                  Create Another
                </Button>
                <Button 
                  onClick={() => window.open(generatedInviteUrl, '_blank')} 
                  className="flex-1 flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Draggable Photo Manager Component
function DraggablePhotoManager({ 
  photos, 
  onPhotosChange, 
  onPhotoUpload 
}: { 
  photos: PhotoItem[]; 
  onPhotosChange: (photos: PhotoItem[]) => void; 
  onPhotoUpload: (file: File) => void; 
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropPhotoId, setCropPhotoId] = useState('');

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(photos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onPhotosChange(items);
    
    // Adjust current slide index if needed
    if (currentSlideIndex === result.source.index) {
      setCurrentSlideIndex(result.destination.index);
    } else if (currentSlideIndex > result.source.index && currentSlideIndex <= result.destination.index) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else if (currentSlideIndex < result.source.index && currentSlideIndex >= result.destination.index) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handleDragStart = (start: any) => {
    // Create custom drag image for precise cursor alignment using actual photo
    const draggedElement = document.querySelector(`[data-rbd-draggable-id="${start.draggableId}"]`) as HTMLElement;
    if (draggedElement) {
      const img = draggedElement.querySelector('img') as HTMLImageElement;
      if (img) {
        // Create enhanced drag preview
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 56;
        canvas.height = 56;
        
        if (ctx) {
          // Create rounded clipping path
          ctx.beginPath();
          ctx.roundRect(4, 4, 48, 48, 8);
          ctx.clip();
          
          // Draw the actual image
          ctx.drawImage(img, 4, 4, 48, 48);
          
          // Reset clipping and add border
          ctx.restore();
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(4, 4, 48, 48, 8);
          ctx.stroke();
          
          // Add shadow effect
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          // Create drag image element
          const dragImg = new Image();
          dragImg.src = canvas.toDataURL();
          
          // Set centered drag image with next tick to ensure proper timing
          setTimeout(() => {
            if (draggedElement && dragImg.complete) {
              const dragStartEvent = new Event('dragstart') as any;
              dragStartEvent.dataTransfer = {
                setDragImage: (img: HTMLImageElement, x: number, y: number) => {
                  // Center the drag image precisely on cursor (28 = half of 56px canvas)
                  if (img.complete) {
                    const style = draggedElement.style;
                    style.transform = 'rotate(3deg) scale(1.1)';
                    style.zIndex = '9999';
                  }
                }
              };
              dragStartEvent.dataTransfer.setDragImage(dragImg, 28, 28);
            }
          }, 10);
        }
      }
    }
  };

  const handleCropPhoto = (photoId: string, src: string) => {
    setCropPhotoId(photoId);
    setCropImageSrc(src);
    setCropDialogOpen(true);
  };

  const handleCropSave = (croppedImageSrc: string) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === cropPhotoId 
        ? { ...photo, croppedSrc: croppedImageSrc }
        : photo
    );
    onPhotosChange(updatedPhotos);
  };

  const removePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    onPhotosChange(updatedPhotos);
    
    // Adjust current slide index if needed
    const removedIndex = photos.findIndex(photo => photo.id === photoId);
    if (currentSlideIndex >= removedIndex && currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % photos.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const displaySrc = (photo: PhotoItem) => photo.croppedSrc || photo.src;

  return (
    <div className="space-y-4">

      
      {/* Main Slideshow Display with Instant Upload Feedback */}
      {photos.length > 0 && photos[currentSlideIndex] && (
        <div className="relative">
          <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={displaySrc(photos[currentSlideIndex])}
              alt={`Cover photo ${currentSlideIndex + 1}`}
              className="slideshow-main-image w-full h-full object-cover transition-all duration-300 ease-out transform hover:scale-105"
              onLoad={() => {
                // Immediate display with smooth entrance animation
                const img = document.querySelector('.slideshow-main-image') as HTMLImageElement;
                if (img) {
                  img.style.opacity = '1';
                  img.style.visibility = 'visible';
                  img.style.transform = 'scale(1)';
                }
              }}
              onError={(e) => {
                console.error('Main slideshow image failed to load:', displaySrc(photos[currentSlideIndex]));
                // Show fallback with image icon
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.style.backgroundColor = '#f3f4f6';
                  parent.style.display = 'flex';
                  parent.style.alignItems = 'center';
                  parent.style.justifyContent = 'center';
                  parent.innerHTML = '<div class="text-gray-500 text-sm flex items-center gap-2"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"></path></svg>Image Preview</div>';
                }
              }}
              style={{ opacity: 1, visibility: 'visible', minHeight: '192px' }}
            />
            
            {/* Instant Upload Success Indicator */}
            {photos[currentSlideIndex]?.src?.startsWith('data:') && (
              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
                New Upload
              </div>
            )}
            
            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Instant Crop Controls */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                type="button"
                onClick={() => handleCropPhoto(photos[currentSlideIndex].id, displaySrc(photos[currentSlideIndex]))}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-all duration-200 hover:scale-110 shadow-lg"
                title="Adjust Crop (Real-time)"
              >
                <CropIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removePhoto(photos[currentSlideIndex].id)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                title="Remove Image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Slide Indicators */}
            {photos.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentSlideIndex 
                        ? 'bg-white' 
                        : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Draggable Thumbnail Navigation */}
      {photos.length > 1 && (
        <div className="mt-2">
          <Label className="text-xs text-muted-foreground mb-2 block">
            <Move className="inline h-3 w-3 mr-1" />
            Drag to reorder photos
          </Label>
          <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <Droppable droppableId="photos" direction="horizontal">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex gap-2 pb-2"
                  style={{ 
                    overflow: 'visible',
                    position: 'relative',
                    minHeight: '60px'
                  }}
                >
                  {photos.map((photo, index) => (
                    <Draggable 
                      key={`draggable-${photo.id}`} 
                      draggableId={`draggable-${photo.id}`} 
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`relative flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-all duration-200 ease-out cursor-move hover:scale-105 ${
                            index === currentSlideIndex 
                              ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
                              : 'border-gray-300 hover:border-blue-400'
                          } ${
                            snapshot.isDragging ? 'scale-110 rotate-3 shadow-2xl z-50 border-blue-500 transform-gpu' : ''
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                            position: snapshot.isDragging ? 'fixed' : 'relative',
                            zIndex: snapshot.isDragging ? 9999 : 'auto',
                            transform: snapshot.isDragging 
                              ? `${provided.draggableProps.style?.transform} rotate(3deg) scale(1.1)`
                              : provided.draggableProps.style?.transform,
                            // Ensure precise cursor alignment
                            transformOrigin: 'center center',
                            willChange: 'transform'
                          }}
                          onClick={() => setCurrentSlideIndex(index)}
                        >
                          <img
                            src={displaySrc(photo)}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover pointer-events-none transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              console.error('Thumbnail image failed to load:', displaySrc(photo));
                              // Show fallback background with image icon
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.style.backgroundColor = '#f3f4f6';
                                parent.style.display = 'flex';
                                parent.style.alignItems = 'center';
                                parent.style.justifyContent = 'center';
                                parent.innerHTML = '<div class="text-gray-500 text-xs">Image</div>';
                              }
                            }}
                            onLoad={() => {
                              // Ensure image is visible when loaded
                              const target = document.querySelector(`img[src="${displaySrc(photo)}"]`) as HTMLImageElement;
                              if (target) {
                                target.style.display = 'block';
                                target.style.opacity = '1';
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-all duration-200 flex items-end justify-center pb-1">
                            <div className="text-white text-xs font-bold">
                              {index + 1}
                            </div>
                          </div>
                          {photo.croppedSrc && (
                            <div className="absolute top-0 right-0 bg-green-500 rounded-bl text-white text-xs px-1 shadow-sm">
                              <CropIcon className="h-2 w-2" />
                            </div>
                          )}
                          {index === currentSlideIndex && (
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* Image Crop Dialog */}
      <ImageCropDialog
        isOpen={cropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        imageSrc={cropImageSrc}
        onSave={handleCropSave}
      />
    </div>
  );
}

export default function ContentTripsDashboard() {
  const [viewMode, setViewMode] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [isNewTripDialogOpen, setIsNewTripDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [attendanceTrip, setAttendanceTrip] = useState<any>(null);
  const [shareTripId, setShareTripId] = useState<number | null>(null);
  const [shareableLink, setShareableLink] = useState<string>('');

  // Enhanced photo management states
  const [coverPhotos, setCoverPhotos] = useState<PhotoItem[]>([]);
  const [editCoverPhotos, setEditCoverPhotos] = useState<PhotoItem[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [editCurrentSlideIndex, setEditCurrentSlideIndex] = useState(0);

  // Custom background states
  const [iosBackground, setIosBackground] = useState<string>('');
  const [pcBackground, setPcBackground] = useState<string>('');
  const [editIosBackground, setEditIosBackground] = useState<string>('');
  const [editPcBackground, setEditPcBackground] = useState<string>('');

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<(() => void) | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionStates, setActionStates] = useState({
    creating: false,
    updating: false,
    deleting: false,
    validating: false,
    generating: false,
  });
  
  // Initial loading state
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const { toast } = useToast();

  // Date formatting function
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No Date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Only fetch trips when component is actually rendered (not just imported)
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Get authentication state from CRM context
  const { isAuthenticated, employee } = useCrmAuth();
  
  console.log('🔐 Content Trips Auth State:', { isAuthenticated, employee: employee?.email });

  // Manual trips fetching (no React Query caching)
  const [trips, setTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchTrips = async () => {
    if (!isAuthenticated) {
      setError(new Error('Authentication required'));
      setIsLoading(false);
      return;
    }

    try {
      setIsFetching(true);
      console.log('🔍 Fetching trips from /api/content-trips/upcoming using direct fetch with zero-caching...');
      
      // Direct fetch with cache busting and no-cache headers
      const response = await fetch(`/api/content-trips/upcoming?timestamp=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Trips fetch success:', data);
      
      // Handle authentication error response
      if (data && typeof data === 'object' && 'message' in data && (data.requiresLogin || data.message?.includes('Authentication required'))) {
        throw new Error('Authentication required');
      }
      
      // Ensure we always set an array
      setTrips(Array.isArray(data) ? data : []);
      setError(null);
      
    } catch (err) {
      console.error('Content trips fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch trips'));
      setTrips([]);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  // Initial fetch on mount and authentication
  useEffect(() => {
    if (isMounted && isAuthenticated) {
      fetchTrips();
    }
  }, [isMounted, isAuthenticated]);



  // Effect to handle initial loading state
  useEffect(() => {
    if (!isLoading && !error) {
      setIsInitialLoading(false);
    }
  }, [isLoading, error]);



  // Manual creators fetching (no React Query caching)
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isCreatorsLoading, setIsCreatorsLoading] = useState(true);

  const fetchCreators = async () => {
    if (!isAuthenticated) {
      setIsCreatorsLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching creators from /api/creators using direct fetch with zero-caching...');
      
      // Direct fetch with cache busting and no-cache headers
      const response = await fetch(`/api/creators?timestamp=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Creators fetch success:', data?.length, 'creators loaded');
      setCreators(Array.isArray(data) ? data : []);
      
    } catch (err) {
      console.error('Creators fetch error:', err);
      setCreators([]);
    } finally {
      setIsCreatorsLoading(false);
    }
  };

  // Initial creators fetch
  useEffect(() => {
    if (isMounted && isAuthenticated) {
      fetchCreators();
    }
  }, [isMounted, isAuthenticated]);

  // Effect to fetch attendance when dialog opens
  useEffect(() => {
    if (isAttendanceDialogOpen && attendanceTrip?.id) {
      console.log('🔄 Attendance dialog opened, fetching fresh data...');
      fetchTripAttendance(attendanceTrip.id);
    }
  }, [isAttendanceDialogOpen, attendanceTrip?.id]);

  // Manual trip attendance fetching (no React Query caching)
  const [tripAttendance, setTripAttendance] = useState<any[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<Error | null>(null);

  const fetchTripAttendance = async (tripId: number) => {
    if (!tripId || !isAuthenticated) {
      setTripAttendance([]);
      setIsAttendanceLoading(false);
      return;
    }

    try {
      setIsAttendanceLoading(true);
      setAttendanceError(null);
      console.log('🎯 Fetching trip attendance for trip:', tripId, 'using direct fetch with zero-caching...');
      
      // Direct fetch with cache busting and no-cache headers
      const response = await fetch(`/api/content-trips/${tripId}/attendance?timestamp=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Trip attendance fetch success - Raw data:', data);
      console.log('✅ Trip attendance - Is array?', Array.isArray(data));
      console.log('✅ Trip attendance - Length:', data?.length);
      
      const result = Array.isArray(data) ? data : [];
      console.log('✅ Trip attendance - Final result:', result);
      setTripAttendance(result);
      
    } catch (err) {
      console.error('Trip attendance fetch error:', err);
      setAttendanceError(err instanceof Error ? err : new Error('Failed to fetch attendance'));
      setTripAttendance([]);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const refetchAttendance = () => {
    if (attendanceTrip?.id) {
      fetchTripAttendance(attendanceTrip.id);
    }
  };

  // Manual add attendance function (no React Query caching)
  const handleAddAttendance = async (tripId: number, creatorId: number, status: string) => {
    try {
      console.log('➕ Adding creator to trip attendance using direct fetch...');
      
      // Direct POST request with no-cache headers
      const response = await fetch(`/api/content-trips/${tripId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ creatorId, status }),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Creator added successfully, refreshing attendance data...');
      
      // Immediately refetch attendance data
      await fetchTripAttendance(tripId);
      
      toast({
        title: "Success",
        description: "Creator added to trip attendance!",
      });
      
    } catch (error: any) {
      console.error('Add attendance error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add creator to trip attendance",
        variant: "destructive",
      });
    }
  };

  // Manual update attendance function (no React Query caching)
  const handleUpdateAttendance = async (tripId: number, attendanceId: number, status: string) => {
    try {
      console.log('🔄 Updating attendance status using direct fetch...');
      
      // Optimistic update to local state
      setTripAttendance(prev => 
        prev.map(attendance => 
          attendance.id === attendanceId 
            ? { ...attendance, status }
            : attendance
        )
      );
      
      // Direct PATCH request with no-cache headers
      const response = await fetch(`/api/content-trips/${tripId}/attendance/${attendanceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ status }),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Attendance status updated successfully, refreshing data...');
      
      // Fetch fresh data from server to confirm update
      await fetchTripAttendance(tripId);
      
      toast({
        title: "Success",
        description: "Attendance status updated!",
      });
      
    } catch (error: any) {
      console.error('Update attendance error:', error);
      
      // Revert optimistic update on error
      await fetchTripAttendance(tripId);
      
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance status",
        variant: "destructive",
      });
    }
  };

  // Manual remove attendance function (no React Query caching)
  const handleRemoveAttendance = async (tripId: number, attendanceId: number) => {
    try {
      console.log('🗑️ Removing creator from trip attendance using direct fetch...');
      
      // Direct DELETE request with no-cache headers
      const response = await fetch(`/api/content-trips/${tripId}/attendance/${attendanceId}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Creator removed successfully, refreshing attendance data...');
      
      // Immediately refetch attendance data
      await fetchTripAttendance(tripId);
      
      toast({
        title: "Success",
        description: "Creator removed from trip attendance!",
      });
      
    } catch (error: any) {
      console.error('Remove attendance error:', error);
      
      // If we get a 404, it means the attendance is already deleted, still refresh data
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        console.log('🔄 Attendance already deleted, refreshing data...');
        await fetchTripAttendance(tripId);
        
        toast({
          title: "Removed",
          description: "Creator removed from trip attendance",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to remove creator from trip attendance",
          variant: "destructive",
        });
      }
    }
  };

  const form = useForm<ContentTripFormData>({
    resolver: zodResolver(contentTripFormSchema),
    defaultValues: {
      title: '',
      location: '',
      startDate: '',
      endDate: '',
      managedAttendees: [],
      backgroundImageUrl: '',
      coverPhotos: [],
      housePhotoLink: '',
      flyerPdfLinks: [],
      inspoPageLink: '',
      outfitLinks: '',
      feedbackFormLink: '',
      finalDriveLink: '',
      tripCost: '',
      rating: '',
      notes: '',
      preAnnouncement: '',
      contentGoals: '',
    },
  });

  // Track form changes for unsaved changes detection
  const watchedFields = form.watch();
  const initialFormValues = form.formState.defaultValues;

  useEffect(() => {
    // Check if any form field has changed from initial values or if photos were added
    const hasFormChanges = Object.keys(watchedFields).some((key) => {
      const currentValue = watchedFields[key as keyof ContentTripFormData];
      const initialValue = initialFormValues?.[key as keyof ContentTripFormData];
      
      // Handle array fields
      if (Array.isArray(currentValue) && Array.isArray(initialValue)) {
        return JSON.stringify(currentValue) !== JSON.stringify(initialValue);
      }
      
      // Handle string fields (trim to ignore whitespace-only changes)
      if (typeof currentValue === 'string' && typeof initialValue === 'string') {
        return currentValue.trim() !== initialValue.trim();
      }
      
      return currentValue !== initialValue;
    });

    const hasPhotoChanges = coverPhotos.length > 0;
    const formHasChanges = hasFormChanges || hasPhotoChanges;
    
    setHasUnsavedChanges(formHasChanges);
  }, [watchedFields, coverPhotos, initialFormValues]);

  const updateForm = useForm<ContentTripFormData>({
    resolver: zodResolver(contentTripFormSchema),
    defaultValues: {
      title: '',
      location: '',
      startDate: '',
      endDate: '',
      managedAttendees: [],
      backgroundImageUrl: '',
      coverPhotos: [],
      housePhotoLink: '',
      flyerPdfLinks: [],
      inspoPageLink: '',
      outfitLinks: '',
      feedbackFormLink: '',
      finalDriveLink: '',
      tripCost: '',
      rating: '',
      notes: '',
      preAnnouncement: '',
      contentGoals: '',
    },
  });

  // Enhanced photo upload handlers with instant display and multi-file support
  const handleCoverPhotoUpload = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload-s3', {
          method: 'POST',
          body: formData,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store'
        });
        const data = await response.json();
        
        const newPhoto: PhotoItem = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          src: data.file.url
        };
        const updatedPhotos = [...coverPhotos, newPhoto];
        setCoverPhotos(updatedPhotos);
        
        // Auto-select the newly uploaded photo for immediate display
        setCurrentSlideIndex(updatedPhotos.length - 1);
        
        // Convert to string array for form submission
        const photoSrcs = updatedPhotos.map(photo => photo.croppedSrc || photo.src);
        form.setValue('coverPhotos', photoSrcs);

        toast({
          title: "Success",
          description: "Cover photo uploaded successfully",
        });
      } catch (error) {
        console.error('Cover photo upload failed:', error);
        toast({
          title: "Error",
          description: "Failed to upload cover photo. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Multi-file upload handler for cover photos
  const handleMultipleCoverPhotoUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;

    try {
      const uploadPromises = imageFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload-s3', {
          method: 'POST',
          body: formData,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store'
        });
        const data = await response.json();
        return data.file.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      // Convert uploaded URLs to PhotoItem format
      const newPhotos: PhotoItem[] = uploadedUrls.map((url, index) => ({
        id: `photo-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        src: url
      }));

      const updatedPhotos = [...coverPhotos, ...newPhotos];
      setCoverPhotos(updatedPhotos);
      
      // Auto-select the first newly uploaded photo
      setCurrentSlideIndex(coverPhotos.length);
      
      // Convert to string array for form submission
      const photoSrcs = updatedPhotos.map(photo => photo.croppedSrc || photo.src);
      form.setValue('coverPhotos', photoSrcs);

      toast({
        title: "Success",
        description: `${imageFiles.length} photo(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Cover photo upload failed:', error);
      toast({
        title: "Error",
        description: "Failed to upload cover photos. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Edit custom background upload handlers
  const handleEditIosBackgroundUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEditIosBackground(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditPcBackgroundUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEditPcBackground(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditCoverPhotoUpload = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload-s3', {
          method: 'POST',
          body: formData,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store'
        });
        const data = await response.json();
        
        const newPhoto: PhotoItem = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          src: data.file.url
        };
        const updatedPhotos = [...editCoverPhotos, newPhoto];
        setEditCoverPhotos(updatedPhotos);
        
        // Auto-select the newly uploaded photo for immediate display
        setEditCurrentSlideIndex(updatedPhotos.length - 1);
        
        // Convert to string array for form submission
        const photoSrcs = updatedPhotos.map(photo => photo.croppedSrc || photo.src);
        updateForm.setValue('coverPhotos', photoSrcs);

        toast({
          title: "Success",
          description: "Cover photo uploaded successfully",
        });
      } catch (error) {
        console.error('Edit cover photo upload failed:', error);
        toast({
          title: "Error",
          description: "Failed to upload cover photo. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Multi-file upload handler for edit dialog cover photos
  const handleMultipleEditCoverPhotoUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;

    try {
      const uploadPromises = imageFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload-s3', {
          method: 'POST',
          body: formData,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store'
        });
        const data = await response.json();
        return data.file.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      // Convert uploaded URLs to PhotoItem format
      const newPhotos: PhotoItem[] = uploadedUrls.map((url, index) => ({
        id: `photo-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        src: url
      }));

      const updatedPhotos = [...editCoverPhotos, ...newPhotos];
      setEditCoverPhotos(updatedPhotos);
      
      // Auto-select the first newly uploaded photo
      setEditCurrentSlideIndex(editCoverPhotos.length);
      
      // Convert to string array for form submission
      const photoSrcs = updatedPhotos.map(photo => photo.croppedSrc || photo.src);
      updateForm.setValue('coverPhotos', photoSrcs);

      toast({
        title: "Success",
        description: `${imageFiles.length} photo(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Edit cover photo upload failed:', error);
      toast({
        title: "Error",
        description: "Failed to upload cover photos. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle photo changes from DraggablePhotoManager
  const handleCoverPhotosChange = (photos: PhotoItem[]) => {
    setCoverPhotos(photos);
    const photoSrcs = photos.map(photo => photo.croppedSrc || photo.src);
    form.setValue('coverPhotos', photoSrcs);
  };

  const handleEditCoverPhotosChange = (photos: PhotoItem[]) => {
    setEditCoverPhotos(photos);
    const photoSrcs = photos.map(photo => photo.croppedSrc || photo.src);
    updateForm.setValue('coverPhotos', photoSrcs);
  };

  // iOS and PC background upload handlers
  const handleIosBackgroundUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setIosBackground(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePcBackgroundUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPcBackground(result);
      };
      reader.readAsDataURL(file);
    }
  };



  // Initialize edit form with existing trip data
  const initializeEditForm = (trip: any) => {
    updateForm.reset({
      title: trip.title,
      location: trip.location,
      startDate: trip.startDate.split('T')[0],
      endDate: trip.endDate.split('T')[0],
      managedAttendees: trip.managedAttendees || [],
      backgroundImageUrl: trip.backgroundImageUrl || '',
      coverPhotos: trip.coverPhotos || [],
      housePhotoLink: trip.housePhotoLink || '',
      flyerPdfLinks: trip.flyerPdfLinks || [],
      inspoPageLink: trip.inspoPageLink || '',
      outfitLinks: trip.outfitLinks || '',
      feedbackFormLink: trip.feedbackFormLink || '',
      finalDriveLink: trip.finalDriveLink || '',
      tripCost: trip.tripCost || '',
      rating: trip.rating || '',
      notes: trip.notes || '',
      preAnnouncement: trip.pre_announcement || '', // Map backend field name to frontend
      contentGoals: trip.content_goals || '', // Map backend field name to frontend
    });

    // Convert existing cover photos to PhotoItem format
    const existingPhotos: PhotoItem[] = (trip.coverPhotos || []).map((src: string, index: number) => ({
      id: `existing-photo-${index}-${Date.now()}`,
      src: src,
    }));
    setEditCoverPhotos(existingPhotos);
    setEditCurrentSlideIndex(0);
  };



  // Handle dialog close with unsaved changes check
  const handleDialogClose = (closeAction: () => void) => {
    if (hasUnsavedChanges) {
      setPendingCloseAction(() => closeAction);
      setShowUnsavedChangesDialog(true);
    } else {
      closeAction();
    }
  };

  // Confirm discard changes
  const confirmDiscardChanges = () => {
    setShowUnsavedChangesDialog(false);
    setHasUnsavedChanges(false);
    if (pendingCloseAction) {
      pendingCloseAction();
      setPendingCloseAction(null);
    }
  };

  // Cancel discard changes
  const cancelDiscardChanges = () => {
    setShowUnsavedChangesDialog(false);
    setPendingCloseAction(null);
  };

  // Reset forms when dialog closes
  const resetNewTripForm = () => {
    form.reset();
    setCoverPhotos([]);
    setCurrentSlideIndex(0);
    setHasUnsavedChanges(false);
  };

  const resetEditTripForm = () => {
    updateForm.reset();
    setEditCoverPhotos([]);
    setEditCurrentSlideIndex(0);
  };

  // Direct trip creation function (no React Query caching)
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  
  const handleCreateTrip = async (data: any) => {
    setIsCreatingTrip(true);
    try {
      console.log('🔍 Creating trip using direct fetch with zero-caching...');
      
      const response = await fetch('/api/content-trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(data),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Trip created successfully, refreshing trips data...');
      
      // Immediately refetch trips data
      await fetchTrips();
      
      // Close dialog after successful creation
      setIsNewTripDialogOpen(false);
      resetNewTripForm();
      
      toast({
        title: "Success",
        description: "Trip created successfully!",
      });
      
    } catch (error: any) {
      console.error('Trip creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleCreateTripSubmit = async (data: ContentTripFormData) => {
    // Ensure all cover photos are properly uploaded before creating trip
    const validCoverPhotos = coverPhotos.filter(photo => {
      const src = photo.croppedSrc || photo.src;
      return src && !src.startsWith('data:') && !src.startsWith('blob:');
    });
    
    if (coverPhotos.length > 0 && validCoverPhotos.length === 0) {
      toast({
        title: "Error",
        description: "Please wait for all images to finish uploading before creating the trip.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = {
      ...data,
      // Convert empty strings to null for numeric fields
      tripCost: data.tripCost === '' ? null : data.tripCost,
      rating: data.rating === '' ? null : data.rating,
      coverPhotos: validCoverPhotos.map(photo => photo.croppedSrc || photo.src),
      inviteBackgroundIos: iosBackground,
      inviteBackgroundPc: pcBackground,
    };
    
    // Debug logging
    console.log('Creating trip with data:', {
      ...formData,
      coverPhotosCount: formData.coverPhotos.length,
      coverPhotosPreview: formData.coverPhotos.slice(0, 3)
    });
    
    await handleCreateTrip(formData);
  };

  // Direct trip update function (no React Query caching)
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false);
  
  const handleUpdateTripDirect = async (tripId: number, data: any) => {
    setIsUpdatingTrip(true);
    try {
      console.log('🔍 Updating trip using direct fetch with zero-caching...');
      
      const response = await fetch(`/api/content-trips/${tripId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(data),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Trip updated successfully, refreshing trips data...');
      
      // Immediately refetch trips data
      await fetchTrips();
      
      toast({
        title: "Success",
        description: "Trip saved successfully!",
      });
      
    } catch (error: any) {
      console.error('Trip update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTrip(false);
    }
  };

  const handleUpdateTrip = async (data: ContentTripFormData) => {
    // Capture trip ID BEFORE clearing state
    const tripId = editingTrip?.id;
    if (!tripId) {
      toast({
        title: "Error",
        description: "Could not find trip to update",
        variant: "destructive",
      });
      return;
    }
    
    const formData = {
      ...data,
      // Convert empty strings to null for numeric fields
      tripCost: data.tripCost === '' ? null : data.tripCost,
      rating: data.rating === '' ? null : data.rating,
      coverPhotos: editCoverPhotos.map(photo => photo.croppedSrc || photo.src),
      inviteBackgroundIos: editIosBackground,
      inviteBackgroundPc: editPcBackground,
    };
    
    // INSTANT UI UPDATES - Close dialog immediately
    setEditingTrip(null);
    setIsUpdateDialogOpen(false);
    setEditCoverPhotos([]);
    setEditCurrentSlideIndex(0);
    
    // Show instant success feedback
    toast({
      title: "Updating...",
      description: "Trip update in progress",
    });
    
    await handleUpdateTripDirect(tripId, formData);
  };

  const openEditDialog = (trip: any) => {
    setEditingTrip(trip);
    setIsUpdateDialogOpen(true);
    
    // Initialize edit cover photos state - convert URLs to PhotoItem objects
    const coverPhotoItems: PhotoItem[] = Array.isArray(trip.cover_photos) 
      ? trip.cover_photos.map((src: string, index: number) => ({
          id: `existing-photo-${index}-${Date.now()}`,
          src: src,
        }))
      : [];
    setEditCoverPhotos(coverPhotoItems);
    setEditCurrentSlideIndex(0);
    
    // Initialize custom background states
    setEditIosBackground(trip.invite_background_ios || '');
    setEditPcBackground(trip.invite_background_pc || '');
    
    updateForm.reset({
      title: trip.title || '',
      location: trip.location || '',
      startDate: trip.start_date ? new Date(trip.start_date).toISOString().split('T')[0] : '',
      endDate: trip.end_date ? new Date(trip.end_date).toISOString().split('T')[0] : '',
      managedAttendees: Array.isArray(trip.managed_attendees) ? trip.managed_attendees : [],
      backgroundImageUrl: trip.background_image_url || '',
      coverPhotos: Array.isArray(trip.cover_photos) ? trip.cover_photos : [],
      housePhotoLink: trip.house_photo_link || '',
      flyerPdfLinks: Array.isArray(trip.flyer_pdf_links) ? trip.flyer_pdf_links : [],
      inspoPageLink: trip.inspo_page_link || '',
      outfitLinks: trip.outfit_links || '',
      feedbackFormLink: trip.feedback_form_link || '',
      finalDriveLink: trip.final_drive_link || '',
      tripCost: trip.trip_cost || '',
      rating: trip.rating || '',
      notes: trip.notes || '',
      preAnnouncement: trip.pre_announcement || '',
      contentGoals: trip.content_goals || '',
    });
  };

  // Direct trip completion function (no React Query caching)
  const handleCompleteTripDirect = async (tripId: number) => {
    try {
      console.log('🔍 Completing trip using direct fetch with zero-caching...');
      
      const response = await fetch(`/api/content-trips/${tripId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Trip completed successfully, refreshing trips data...');
      
      // Immediately refetch trips data
      await fetchTrips();
      
      toast({
        title: "Success",
        description: "Trip marked as completed!",
      });
      
    } catch (error: any) {
      console.error('Trip completion error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete trip",
        variant: "destructive",
      });
    }
  };

  // Direct trip deletion function (no React Query caching)
  const handleDeleteTripDirect = async (tripId: number) => {
    try {
      console.log('🔍 Deleting trip using direct fetch with zero-caching...');
      
      const response = await fetch(`/api/content-trips/${tripId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Trip deleted successfully, refreshing trips data...');
      
      // Immediately refetch trips data
      await fetchTrips();
      
      toast({
        title: "Success", 
        description: "Trip deleted successfully!",
      });
      
    } catch (error: any) {
      console.error('Delete trip error:', error);
      toast({
        title: "Error", 
        description: "Failed to delete trip",
        variant: "destructive",
      });
    }
  };

  // Direct share link generation function (no React Query caching)
  const generateShareLinkDirect = async (tripId: number) => {
    try {
      console.log('🔍 Generating share link using direct fetch with zero-caching...');
      
      const response = await fetch(`/api/content-trips/${tripId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ 
          creatorEmail: 'invite@link.com', 
          creatorName: 'Shared Invite' 
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { inviteUrl: string; [key: string]: any };
      
      // Convert to branded domain for sharing
      const brandedDomain = 'https://tastyyyy.com';
      const inviteUrl = data.inviteUrl.replace('http://localhost:5000', brandedDomain).replace(window.location.origin, brandedDomain);
      
      setShareableLink(inviteUrl);
      
      toast({
        title: "Share link generated",
        description: "Trip invite link ready to share!",
      });
      
    } catch (error: any) {
      console.error('Share link generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteTrip = (tripId: number) => {
    handleCompleteTripDirect(tripId);
  };

  const handleDeleteTrip = (tripId: number) => {
    if (confirm('Are you sure you want to delete this trip?')) {
      handleDeleteTripDirect(tripId);
    }
  };

  const handleShareTrip = (tripId: number) => {
    setShareTripId(tripId);
    generateShareLinkDirect(tripId);
  };

  const handleCopyLink = async () => {
    if (shareableLink) {
      try {
        await navigator.clipboard.writeText(shareableLink);
        toast({
          title: "Link copied!",
          description: "Trip invite link copied to clipboard - ready to share!",
        });
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareableLink;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          toast({
            title: "Link copied!",
            description: "Trip invite link copied to clipboard - ready to share!",
          });
        } catch (fallbackErr) {
          toast({
            title: "Copy failed",
            description: "Please manually copy the link from the input field",
            variant: "destructive",
          });
        }
        document.body.removeChild(textArea);
      }
    }
  };

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ensure trips is always an array before filtering
    const tripsArray = Array.isArray(trips) ? trips : [];
    
    switch (viewMode) {
      case 'upcoming':
        return tripsArray.filter(trip => {
          const endDate = new Date(trip.end_date);
          // Show in upcoming if end date is in future and not manually completed
          return endDate >= today && !trip.is_completed;
        });
      case 'past':
      default:
        return tripsArray.filter(trip => {
          const endDate = new Date(trip.end_date);
          // Show in past if manually completed OR if end date has passed
          return trip.is_completed || endDate < today;
        });
    }
  }, [trips, viewMode]);

  // Skeleton loader component for better UX
  const SkeletonLoader = () => (
    <div className="space-y-6">
      <PageHeader
        showBackButton={true}
        useBrowserBack={true}
        title="Content Trips"
        description="Manage and track all your content creation trips"
        actions={
          <Button 
            onClick={() => setIsNewTripDialogOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip</span>
          </Button>
        }
      />
      <div className="px-6 pb-6 space-y-6">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {['upcoming', 'past'].map((mode) => (
              <div key={mode} className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
        
        {/* Skeleton Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Card key={index} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardHeader className="pb-3">
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="flex space-x-2 mt-4">
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  // Add debugging and error handling for deployed environment
  if (error) {
    console.error('Content trips fetch error:', error);
    return (
      <div className="space-y-6">
        <PageHeader
          showBackButton={true}
          useBrowserBack={true}
          title="Content Trips"
          description="Manage and track all your content creation trips"
          actions={
            <Button 
              onClick={() => setIsNewTripDialogOpen(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Trip</span>
            </Button>
          }
        />
        <div className="px-6 pb-6 text-center">
          <p className="text-red-600 mb-4">Failed to load trips: {error.message}</p>
          <div className="text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded">
            <div><strong>Auth Status:</strong> {isAuthenticated ? 'Authenticated ✅' : 'Not Authenticated ❌'}</div>
            {employee?.email && <div><strong>User:</strong> {employee.email}</div>}
            <div><strong>Mount Status:</strong> {isMounted ? 'Mounted' : 'Not Mounted'}</div>
            <div><strong>Query Enabled:</strong> {(isMounted && isAuthenticated) ? 'Yes' : 'No'}</div>
          </div>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Only show skeleton loader on initial load when there's no data
  if (isLoading && trips.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        showBackButton={true}
        useBrowserBack={true}
        title="Content Trips"
        description="Manage and track all your content creation trips"
        actions={
          <div className="flex items-center space-x-2">
            {isFetching && (
              <div className="flex items-center text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Updating...
              </div>
            )}
            <Button 
              onClick={() => setIsNewTripDialogOpen(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Trip</span>
            </Button>
          </div>
        }
      />
      <div className="px-6 pb-6 space-y-6">

      {/* View Mode Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={viewMode === 'upcoming' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('upcoming')}
        >
          <Plane className="mr-2 h-4 w-4" />
          Upcoming
        </Button>
        <Button
          variant={viewMode === 'past' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('past')}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Completed
        </Button>
      </div>

      {/* Trip Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTrips.map((trip: any) => (
          <Card key={trip.id} className="group hover:shadow-lg transition-all duration-200">
            <div className="relative">
              {/* Cover Photo Slideshow */}
              {trip.cover_photos && trip.cover_photos.length > 0 ? (
                <TripCoverSlideshow 
                  photos={trip.cover_photos} 
                  tripTitle={trip.title}
                />
              ) : trip.background_image_url ? (
                <div 
                  className="h-48 bg-cover bg-center rounded-t-lg"
                  style={{ backgroundImage: `url(${trip.background_image_url})` }}
                />
              ) : (
                <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-t-lg flex items-center justify-center">
                  <Plane className="h-12 w-12 text-blue-500" />
                </div>
              )}
              
              {(trip.is_completed || new Date(trip.end_date) < new Date()) && (
                <Badge className="absolute top-2 right-2 bg-green-600 z-10">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{trip.title}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-1 h-3 w-3" />
                    {trip.location}
                  </div>
                </div>
                {trip.rating && (
                  <div className="flex items-center text-sm">
                    <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {trip.rating}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-3 w-3" />
                  {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                </div>
                
                {trip.trip_cost && (trip.is_completed || new Date(trip.end_date) < new Date()) && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <DollarSign className="mr-2 h-3 w-3" />
                    ${parseFloat(trip.trip_cost).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {trip.house_photo_link && (
                  <Badge variant="secondary">
                    <Camera className="mr-1 h-3 w-3" />
                    Photos
                  </Badge>
                )}
                {trip.inspo_page_link && (
                  <Badge variant="secondary">
                    <Link className="mr-1 h-3 w-3" />
                    Inspo
                  </Badge>
                )}
                {trip.final_drive_link && (
                  <Badge variant="secondary">
                    <Upload className="mr-1 h-3 w-3" />
                    Content
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedTrip(trip);
                  }}
                  className="px-2"
                  title="View Trip Details"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEditDialog(trip);
                  }}
                  className="px-2"
                  title="Edit Trip"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                {!trip.is_completed && new Date(trip.end_date) >= new Date() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCompleteTrip(trip.id);
                    }}
                    className="px-2"
                    title="Complete Trip"
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShareTrip(trip.id);
                  }}
                  className="px-2"
                  title="Share Trip"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAttendanceTrip(trip);
                    setIsAttendanceDialogOpen(true);
                    // No need to invalidate queries with direct fetch - attendance will be fetched fresh
                  }}
                  className="px-2"
                  title="Manage Attendance"
                >
                  <Users className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedTrip(trip);
                    // Use setTimeout to ensure the dialog opens after state update
                    setTimeout(() => {
                      const scheduleTab = document.querySelector('[data-value="schedule"]') as HTMLButtonElement;
                      if (scheduleTab) {
                        scheduleTab.click();
                      }
                    }, 100);
                  }}
                  className="px-2"
                  title="Open Schedule"
                >
                  <Calendar className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteTrip(trip.id);
                  }}
                  className="px-2"
                  title="Delete Trip"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTrips.length === 0 && (
        <div className="text-center py-12">
          <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No trips found</h3>
          <p className="text-muted-foreground mb-4">
            {viewMode === 'upcoming' 
              ? "No upcoming trips scheduled." 
              : "No completed trips yet."}
          </p>
          <Button onClick={() => setIsNewTripDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Trip
          </Button>
        </div>
      )}

      {/* New Trip Dialog */}
      <Dialog open={isNewTripDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleDialogClose(() => {
            setIsNewTripDialogOpen(false);
            resetNewTripForm();
          });
        } else {
          setIsNewTripDialogOpen(true);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden scale-[0.8] origin-center">
          {/* Sticky Header */}
          <div className="sticky top-10 z-10 bg-background border-b mb-6 -mx-6 px-6 pr-14 h-24 flex flex-col items-center justify-center">
            <DialogHeader className="text-center">
              <DialogTitle className="text-4xl font-bold mb-1">Create New Trip</DialogTitle>
              <DialogDescription className="text-sm">
                Plan your content creation trip with all the necessary details
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)] -mx-6 px-6 pb-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateTrip)} className="space-y-8 pt-8">
              {/* Section 1: Planning the Trip */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold text-foreground">1. Planning the Trip</h3>
                  <p className="text-sm text-muted-foreground">Basic trip information and logistics</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trip Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Malibu Beach Content Trip" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Malibu, CA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>



                  {/* Enhanced Cover Photo Management */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Cover Photo Slideshow</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('cover-photos-upload')?.click()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Photos
                      </Button>
                      <input
                        id="cover-photos-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            handleMultipleCoverPhotoUpload(files);
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>

                    {/* Drag and Drop Zone - Always Available */}
                    <div
                      className={`border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 transition-colors ${
                        coverPhotos.length === 0 ? 'p-8' : 'p-4'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                        const files = Array.from(e.dataTransfer.files);
                        const imageFiles = files.filter(file => file.type.startsWith('image/'));
                        if (imageFiles.length > 0) {
                          handleMultipleCoverPhotoUpload(imageFiles);
                        }
                      }}
                    >
                      {coverPhotos.length === 0 ? (
                        <>
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-gray-500 mb-2">Drag and drop images here, or</p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('cover-photos-upload')?.click()}
                          >
                            Choose Files
                          </Button>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                          <p className="text-gray-500 text-sm mb-2">Drop more images here or</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('cover-photos-upload')?.click()}
                          >
                            Add More Photos
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Enhanced Photo Manager */}
                    <DraggablePhotoManager
                      photos={coverPhotos}
                      onPhotosChange={handleCoverPhotosChange}
                      onPhotoUpload={handleCoverPhotoUpload}
                    />



                    {coverPhotos.length === 0 && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <div className="text-gray-500">
                          <Camera className="mx-auto h-12 w-12 mb-2" />
                          <p className="text-sm">No cover photos uploaded yet</p>
                          <p className="text-xs text-gray-400 mt-1">Click "Add Photos" to upload multiple images</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Invite Page Backgrounds */}
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h4 className="text-md font-medium text-foreground">Custom Invite Page Backgrounds</h4>
                      <p className="text-sm text-muted-foreground">Upload separate backgrounds for iOS and PC to prevent image warping</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      {/* iOS Background Upload */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          iOS Background (9:16 ratio recommended)
                        </Label>
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                          onClick={() => document.getElementById('ios-background-upload')?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                            const files = Array.from(e.dataTransfer.files);
                            const imageFile = files.find(file => file.type.startsWith('image/'));
                            if (imageFile) handleIosBackgroundUpload(imageFile);
                          }}
                        >
                          {iosBackground ? (
                            <div className="space-y-2">
                              <img 
                                src={iosBackground} 
                                alt="iOS Background Preview" 
                                className="w-full h-24 object-cover rounded"
                              />
                              <p className="text-xs text-green-600">iOS background uploaded</p>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIosBackground('');
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Smartphone className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 mb-1">Drop iOS background here</p>
                              <p className="text-xs text-gray-400">Portrait orientation works best</p>
                            </>
                          )}
                        </div>
                        <input
                          id="ios-background-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleIosBackgroundUpload(file);
                            e.target.value = '';
                          }}
                        />
                      </div>

                      {/* PC Background Upload */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          PC/Desktop Background (16:9 ratio recommended)
                        </Label>
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                          onClick={() => document.getElementById('pc-background-upload')?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                            const files = Array.from(e.dataTransfer.files);
                            const imageFile = files.find(file => file.type.startsWith('image/'));
                            if (imageFile) handlePcBackgroundUpload(imageFile);
                          }}
                        >
                          {pcBackground ? (
                            <div className="space-y-2">
                              <img 
                                src={pcBackground} 
                                alt="PC Background Preview" 
                                className="w-full h-24 object-cover rounded"
                              />
                              <p className="text-xs text-green-600">PC background uploaded</p>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPcBackground('');
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Monitor className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 mb-1">Drop PC background here</p>
                              <p className="text-xs text-gray-400">Landscape orientation works best</p>
                            </>
                          )}
                        </div>
                        <input
                          id="pc-background-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePcBackgroundUpload(file);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="housePhotoLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>House Link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://airbnb.com/listing" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="managedAttendees"
                    render={({ field }) => {
                    const selectedCreators = useMemo(() => {
                      const selectedIds = field.value || [];
                      return (creators as any[]).filter((creator: any) => 
                        selectedIds.includes(creator.id)
                      );
                    }, [field.value, creators]);

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Creators Planning to Attend</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={`w-full justify-between ${!selectedCreators.length && "text-muted-foreground"}`}
                              >
                                {selectedCreators.length > 0
                                  ? `${selectedCreators.length} creator${selectedCreators.length > 1 ? 's' : ''} selected`
                                  : "Select creators"}
                                <Settings className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search creators..." />
                              <CommandEmpty>No creators found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {(creators as any[]).map((creator: any) => {
                                  const isSelected = field.value?.includes(creator.id) || false;
                                  return (
                                    <CommandItem
                                      key={creator.id}
                                      onSelect={() => {
                                        const currentValue = field.value || [];
                                        if (isSelected) {
                                          field.onChange(currentValue.filter((id: number) => id !== creator.id));
                                        } else {
                                          field.onChange([...currentValue, creator.id]);
                                        }
                                      }}
                                      className="flex items-center"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          isSelected ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <CreatorAvatar
                                        creator={{
                                          id: creator.id,
                                          username: creator.username,
                                          displayName: creator.displayName,
                                          profileImageUrl: creator.profileImageUrl || null
                                        }}
                                        size="sm"
                                        className="mr-2"
                                      />
                                      <div>
                                        <div>{creator.displayName}</div>
                                        <div className="text-xs text-muted-foreground">@{creator.username}</div>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                </div>

                {/* Section 2: Leading Up to the Trip - Hidden in Create New Trip Modal */}
                {false && (
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="text-lg font-semibold text-foreground">2. Leading Up to the Trip</h3>
                      <p className="text-sm text-muted-foreground">Preparation links and resources</p>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="inspoPageLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inspo Page Link</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/inspiration" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="outfitLinks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Outfits Link</FormLabel>
                          <FormControl>
                            <Input placeholder="https://drive.google.com/outfits" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                  </div>
                )}

                {/* Section 3: After the Trip - Hidden in Create New Trip Modal */}
                {false && (
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="text-lg font-semibold text-foreground">3. After the Trip</h3>
                      <p className="text-sm text-muted-foreground">Post-trip wrap-up and resources</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tripCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Trip Costs (Optional)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="2500" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="rating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rating (0-5)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" min="0" max="5" placeholder="4.5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="feedbackFormLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feedback Form Link</FormLabel>
                          <FormControl>
                            <Input placeholder="https://forms.google.com/feedback" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="finalDriveLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Final Content Drive Link</FormLabel>
                          <FormControl>
                            <Input placeholder="https://drive.google.com/final-content" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <textarea 
                              className="w-full min-h-[100px] p-3 border border-input rounded-md resize-none"
                              placeholder="Add any notes, lessons learned, or highlights from the trip..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-6 border-t pb-12 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(() => {
                      setIsNewTripDialogOpen(false);
                      resetNewTripForm();
                    })}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingTrip}>
                    {isCreatingTrip ? "Creating..." : "Create Trip"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Trip Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden scale-[0.7] origin-center">
          {/* Sticky Header */}
          <div className="sticky top-10 z-10 bg-background border-b mb-6 -mx-6 px-6 pr-14 h-24 flex flex-col items-center justify-center">
            <DialogHeader className="text-center">
              <DialogTitle className="text-4xl font-bold mb-1">Update Trip</DialogTitle>
              <DialogDescription className="text-sm">
                Update your content creation trip with all the necessary details
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)] -mx-6 px-6 pb-6">
            <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(handleUpdateTrip)} className="space-y-8 pt-8">
              {/* Section 1: Planning the Trip */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold text-foreground">1. Planning the Trip</h3>
                  <p className="text-sm text-muted-foreground">Basic trip information and logistics</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trip Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Malibu Beach Content Trip" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={updateForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Malibu, CA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={updateForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Cover Photo Slideshow Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Cover Photo Slideshow</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('edit-cover-photos-upload')?.click()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Photos
                    </Button>
                    <input
                      id="edit-cover-photos-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          handleMultipleEditCoverPhotoUpload(files);
                        }
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {/* Drag and Drop Zone - Always Available */}
                  <div
                    className={`border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 transition-colors ${
                      editCoverPhotos.length === 0 ? 'p-8' : 'p-4'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                      const files = Array.from(e.dataTransfer.files);
                      const imageFiles = files.filter(file => file.type.startsWith('image/'));
                      if (imageFiles.length > 0) {
                        handleMultipleEditCoverPhotoUpload(imageFiles);
                      }
                    }}
                  >
                    {editCoverPhotos.length === 0 ? (
                      <>
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-2">Drag and drop images here, or</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('edit-cover-photos-upload')?.click()}
                        >
                          Choose Files
                        </Button>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                        <p className="text-gray-500 text-sm mb-2">Drop more images here or</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('edit-cover-photos-upload')?.click()}
                        >
                          Add More Photos
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Enhanced Photo Manager */}
                  <DraggablePhotoManager
                    photos={editCoverPhotos}
                    onPhotosChange={handleEditCoverPhotosChange}
                    onPhotoUpload={handleEditCoverPhotoUpload}
                  />
                </div>

                <FormField
                  control={updateForm.control}
                  name="housePhotoLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>House Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://airbnb.com/listing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Invite Page Backgrounds */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h4 className="text-md font-medium text-foreground">Custom Invite Page Backgrounds</h4>
                    <p className="text-sm text-muted-foreground">Upload separate backgrounds for iOS and PC to prevent image warping</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* iOS Background Upload */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        iOS Background (9:16 ratio recommended)
                      </Label>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => document.getElementById('edit-ios-background-upload')?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                          const files = Array.from(e.dataTransfer.files);
                          const imageFile = files.find(file => file.type.startsWith('image/'));
                          if (imageFile) handleEditIosBackgroundUpload(imageFile);
                        }}
                      >
                        {editIosBackground ? (
                          <div className="space-y-2">
                            <img 
                              src={editIosBackground} 
                              alt="iOS Background Preview" 
                              className="w-full h-24 object-cover rounded"
                            />
                            <p className="text-xs text-green-600">iOS background uploaded</p>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditIosBackground('');
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Smartphone className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500 mb-1">Drop iOS background here</p>
                            <p className="text-xs text-gray-400">Portrait orientation works best</p>
                          </>
                        )}
                      </div>
                      <input
                        id="edit-ios-background-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleEditIosBackgroundUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </div>

                    {/* PC Background Upload */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        PC/Desktop Background (16:9 ratio recommended)
                      </Label>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => document.getElementById('edit-pc-background-upload')?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                          const files = Array.from(e.dataTransfer.files);
                          const imageFile = files.find(file => file.type.startsWith('image/'));
                          if (imageFile) handleEditPcBackgroundUpload(imageFile);
                        }}
                      >
                        {editPcBackground ? (
                          <div className="space-y-2">
                            <img 
                              src={editPcBackground} 
                              alt="PC Background Preview" 
                              className="w-full h-24 object-cover rounded"
                            />
                            <p className="text-xs text-green-600">PC background uploaded</p>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditPcBackground('');
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Monitor className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500 mb-1">Drop PC background here</p>
                            <p className="text-xs text-gray-400">Landscape orientation works best</p>
                          </>
                        )}
                      </div>
                      <input
                        id="edit-pc-background-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleEditPcBackgroundUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Leading Up to the Trip */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold text-foreground">2. Leading Up to the Trip</h3>
                  <p className="text-sm text-muted-foreground">Pre-trip preparation and planning</p>
                </div>
                
                <FormField
                  control={updateForm.control}
                  name="tripCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Cost ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="2500.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section 3: After the Trip */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold text-foreground">3. After the Trip</h3>
                  <p className="text-sm text-muted-foreground">Post-trip content and reflections</p>
                </div>
                
                <FormField
                  control={updateForm.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (0-5)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" max="5" placeholder="4.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="feedbackFormLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feedback Form Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://forms.google.com/feedback" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="finalDriveLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Content Drive Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://drive.google.com/final-content" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea 
                          className="w-full min-h-[100px] p-3 border border-input rounded-md resize-none"
                          placeholder="Add any notes, lessons learned, or highlights from the trip..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t pb-12 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpdateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingTrip}>
                  {isUpdatingTrip ? "Updating..." : "Update Trip"}
                </Button>
              </div>
            </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trip Detail Dialog */}
      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTrip && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  {selectedTrip.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedTrip.location} • {formatDate(selectedTrip.startDate)} - {formatDate(selectedTrip.endDate)}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="management">Management</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  {/* Cover Photos */}
                  {selectedTrip.cover_photos && selectedTrip.cover_photos.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Cover Photos</h3>
                      <TripCoverSlideshow 
                        photos={selectedTrip.cover_photos} 
                        tripTitle={selectedTrip.title}
                      />
                    </div>
                  )}

                  {/* Trip Details */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Trip Information</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedTrip.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(selectedTrip.start_date)} - {formatDate(selectedTrip.end_date)}</span>
                        </div>
                        {selectedTrip.trip_cost && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>${selectedTrip.trip_cost}</span>
                          </div>
                        )}
                        {selectedTrip.rating && (
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedTrip.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Quick Links</h3>
                      <div className="space-y-2">
                        {selectedTrip.inspo_page_link && (
                          <Button variant="outline" size="sm" asChild className="w-full justify-start">
                            <a href={selectedTrip.inspo_page_link} target="_blank" rel="noopener noreferrer">
                              <Camera className="h-4 w-4 mr-2" />
                              Inspiration Page
                            </a>
                          </Button>
                        )}
                        {selectedTrip.house_photo_link && (
                          <Button variant="outline" size="sm" asChild className="w-full justify-start">
                            <a href={selectedTrip.house_photo_link} target="_blank" rel="noopener noreferrer">
                              <Link className="h-4 w-4 mr-2" />
                              House Photos
                            </a>
                          </Button>
                        )}
                        {selectedTrip.outfit_links && (
                          <Button variant="outline" size="sm" asChild className="w-full justify-start">
                            <a href={selectedTrip.outfit_links} target="_blank" rel="noopener noreferrer">
                              <Settings className="h-4 w-4 mr-2" />
                              Outfits
                            </a>
                          </Button>
                        )}
                        {selectedTrip.final_drive_link && (
                          <Button variant="outline" size="sm" asChild className="w-full justify-start">
                            <a href={selectedTrip.final_drive_link} target="_blank" rel="noopener noreferrer">
                              <Upload className="h-4 w-4 mr-2" />
                              Final Content
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedTrip.notes && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Notes</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTrip.notes}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="mt-6">
                  <TripScheduleCalendar 
                    trip={selectedTrip} 
                    creators={creators}
                  />
                </TabsContent>

                <TabsContent value="management" className="space-y-6 mt-6">
                  {/* Trip Invite Management */}
                  <TripInviteManager tripId={selectedTrip.id} />
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-6 border-t mt-6">
                <Button onClick={() => openEditDialog(selectedTrip)} className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Trip
                </Button>
                {!selectedTrip.isCompleted && (
                  <Button 
                    onClick={() => {
                      handleCompleteTrip(selectedTrip.id);
                      setSelectedTrip(null);
                    }} 
                    variant="outline"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to discard this trip?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={cancelDiscardChanges}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDiscardChanges}>
              Discard Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Trip Dialog */}
      <Dialog open={!!shareTripId} onOpenChange={() => {setShareTripId(null); setShareableLink('');}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Share Trip
            </DialogTitle>
            <DialogDescription>
              Share this trip with creators using the invite link below. Anyone with this link can RSVP to the trip.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-6">
            {shareableLink ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Shareable Invite Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={shareableLink} 
                    readOnly 
                    className="text-sm bg-gray-50"
                  />
                  <Button onClick={handleCopyLink} size="sm" className="shrink-0">
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <div className="font-medium mb-1">How to use:</div>
                  <ul className="space-y-1">
                    <li>• Send this link to creators you want to invite</li>
                    <li>• They can RSVP directly without needing an account</li>
                    <li>• You'll see their responses in the trip management panel</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Generating share link...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {setShareTripId(null); setShareableLink('');}}
            >
              Close
            </Button>
            {shareableLink && (
              <Button onClick={handleCopyLink} className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Copy & Share
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Attendance Management Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Trip Attendance</DialogTitle>
            <DialogDescription>
              {attendanceTrip ? `Manage attendance for ${attendanceTrip.title}` : 'Select a trip to manage attendance'}
            </DialogDescription>
          </DialogHeader>
          
          {attendanceTrip && (
            <>
              {isAttendanceLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-600">Loading attendance data...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 relative">
                  {/* Loading overlay when mutations are in progress */}
                  {isAttendanceLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">
                          {isAttendanceLoading ? 'Processing...' : 'Loading...'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Attendees */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Current Attendees</h3>

                      {Array.isArray(tripAttendance) && tripAttendance.length > 0 ? (
                    <div className="space-y-2">
                      {tripAttendance.map((attendance: any) => (
                        <div key={attendance.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <CreatorAvatar 
                              creator={{
                                id: attendance.creator_id,
                                username: attendance.creator_username,
                                displayName: attendance.creator_name,
                                profileImageUrl: attendance.profile_image_url
                              }} 
                              size="md" 
                            />
                            <div>
                              <p className="font-medium">{attendance.creator_name}</p>
                              <p className="text-sm text-gray-500">@{attendance.creator_username}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Select
                              value={attendance.status}
                              onValueChange={(status) => 
                                handleUpdateAttendance(
                                  attendanceTrip.id,
                                  attendance.id,
                                  status
                                )
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="declined">Declined</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => 
                                handleRemoveAttendance(
                                  attendanceTrip.id,
                                  attendance.id
                                )
                              }
                              disabled={isAttendanceLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No attendees added yet</p>
                  )}
                </div>

                {/* Add Creators */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Add Creators</h3>
                  <div className="space-y-2">
                    {isCreatorsLoading ? (
                      <div className="flex justify-center items-center p-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-sm text-gray-500">Loading creators...</span>
                      </div>
                    ) : (
                      <>
                        {(creators as any[])
                          .filter((creator: any) => {
                            // Filter out creators who already have attendance records
                            if (!Array.isArray(tripAttendance)) return true;
                            
                            const hasAttendance = tripAttendance.some((attendance: any) => {
                              return attendance.creator_id === creator.id || 
                                     attendance.creator_id === String(creator.id) ||
                                     Number(attendance.creator_id) === Number(creator.id);
                            });
                            
                            console.log(`🎯 Creator ${creator.displayName} - Has attendance:`, hasAttendance);
                            return !hasAttendance;
                          })
                          .map((creator: any) => (
                            <div key={creator.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <CreatorAvatar 
                                  creator={creator} 
                                  size="md" 
                                />
                                <div>
                                  <p className="font-medium">{creator.displayName || creator.username}</p>
                                  <p className="text-sm text-gray-500">@{creator.username}</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => 
                                  handleAddAttendance(
                                    attendanceTrip.id,
                                    creator.id,
                                    'confirmed'
                                  )
                                }
                                disabled={isAttendanceLoading}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                              </Button>
                            </div>
                          ))}
                        {(creators as any[]).length === 0 && (
                          <p className="text-gray-500 text-center p-4">No creators found in the system.</p>
                        )}
                        {(creators as any[]).length > 0 && 
                         (creators as any[]).filter((creator: any) => 
                           !Array.isArray(tripAttendance) || !tripAttendance.some((attendance: any) => attendance.creator_id === creator.id)
                         ).length === 0 && (
                          <p className="text-gray-500 text-center p-4">All creators are already added to this trip.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAttendanceDialogOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}