import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  type: "profile" | "banner";
  className?: string;
}

export function ImageUpload({ value, onChange, type, className = "" }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const aspectRatio = type === "profile" ? "aspect-square" : "aspect-[4/1]";
  const dimensions = type === "profile" ? "w-32 h-32" : "w-full h-24";
  const recommendedSize = type === "profile" ? "400x400px or higher, square" : "1200x300px or higher, 4:1 ratio";

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, or JPEG image.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onChange(data.url);
      
      toast({
        title: "Upload successful",
        description: `${type === "profile" ? "Profile picture" : "Banner image"} uploaded successfully.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeImage = () => {
    onChange("");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {value ? (
        <div className="relative">
          <div className={`${dimensions} rounded-lg overflow-hidden border-2 border-gray-200 ${type === "banner" ? "" : "rounded-full"}`}>
            <img 
              src={value} 
              alt={`${type} preview`} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = type === "profile" 
                  ? "https://via.placeholder.com/128x128/e2e8f0/64748b?text=?" 
                  : "https://via.placeholder.com/400x100/e2e8f0/64748b?text=Banner";
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
            onClick={removeImage}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div
          className={`${dimensions} border-2 border-dashed ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          } ${type === "banner" ? "rounded-lg" : "rounded-full"} flex flex-col items-center justify-center cursor-pointer transition-colors`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="text-xs text-gray-500 mt-2">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-4">
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-1">
                {isDragging ? "Drop image here" : "Click to upload or drag & drop"}
              </p>
              <p className="text-xs text-gray-400">
                PNG, JPG up to 5MB
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Recommended: {recommendedSize}
        </p>
        {!value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose File
          </Button>
        )}
      </div>
    </div>
  );
}