import React, { useState, useCallback } from 'react';
import MuxUploader from '@mux/mux-uploader-react';
import { Upload, FileVideo, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface MuxUploaderComponentProps {
  onUploadSuccess: (assetId: string, playbackId: string) => void;
  onUploadError?: (error: string) => void;
  contentId?: number;
  creatorId?: number;
  className?: string;
  title?: string;
  description?: string;
  acceptedFormats?: string[];
}

export const MuxUploaderComponent: React.FC<MuxUploaderComponentProps> = ({
  onUploadSuccess,
  onUploadError,
  contentId,
  creatorId,
  className = "",
  title,
  description,
  acceptedFormats = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/mkv', 'video/quicktime']
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [uploadUrl, setUploadUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();

  const initializeUpload = useCallback(async () => {
    try {
      console.log('🎬 Initializing Mux upload...', { contentId, creatorId, title });
      
      const response = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId,
          creatorId,
          title: title || 'Video Upload',
          description: description || 'Video uploaded via Mux'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initialize upload');
      }

      const data = await response.json();
      console.log('✅ Mux upload URL created:', data.uploadUrl);
      setUploadUrl(data.uploadUrl);
      return data.uploadUrl;
    } catch (error) {
      console.error('❌ Error initializing Mux upload:', error);
      setUploadStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize upload';
      setErrorMessage(errorMsg);
      if (onUploadError) {
        onUploadError(errorMsg);
      }
      return null;
    }
  }, [contentId, creatorId, title, description, onUploadError]);

  const handleUploadStart = useCallback(() => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    toast({
      title: "Upload started",
      description: "Your video is being uploaded to MUX"
    });
  }, [toast]);

  const handleUploadProgress = useCallback((progress: number) => {
    setUploadProgress(progress);
  }, []);

  const handleUploadSuccess = useCallback(async (detail: any) => {
    console.log('🎬 Mux upload completed:', detail);
    setUploadStatus('processing');
    setUploadProgress(100);
    toast({
      title: "Upload complete",
      description: "Your video is being processed by Mux for optimal streaming"
    });

    // Extract asset ID from upload completion
    const assetId = detail.asset_id;
    if (!assetId) {
      console.error('❌ No asset ID in upload response');
      setUploadStatus('error');
      setErrorMessage('Upload completed but no asset ID received');
      return;
    }

    // Poll for asset readiness with proper timeout and retries
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes with 5-second intervals
    
    const pollAssetStatus = async () => {
      try {
        attempts++;
        console.log(`🔄 Polling Mux asset status (attempt ${attempts}/${maxAttempts}):`, assetId);
        
        const response = await fetch(`/api/mux/asset/${assetId}`);
        if (!response.ok) {
          throw new Error(`Asset status check failed: ${response.statusText}`);
        }
        
        const assetData = await response.json();
        const asset = assetData.asset;
        
        console.log(`📊 Asset status: ${asset.status}`);
        
        if (asset.status === 'ready' && asset.playback_ids?.length > 0) {
          const playbackId = asset.playback_ids[0].id;
          console.log('✅ Mux asset ready for streaming:', { assetId, playbackId });
          
          setUploadStatus('success');
          onUploadSuccess(assetId, playbackId);
          toast({
            title: "Video ready",
            description: "Your video is now optimized and ready for streaming"
          });
        } else if (asset.status === 'errored') {
          throw new Error('Video processing failed');
        } else if (attempts < maxAttempts) {
          // Continue polling
          setTimeout(pollAssetStatus, 5000);
        } else {
          throw new Error('Video processing timeout - please check status manually');
        }
      } catch (error) {
        console.error('❌ Asset status polling error:', error);
        setUploadStatus('error');
        const errorMsg = error instanceof Error ? error.message : 'Failed to check video processing status';
        setErrorMessage(errorMsg);
        if (onUploadError) {
          onUploadError(errorMsg);
        }
      }
    };

    // Start polling after a short delay
    setTimeout(pollAssetStatus, 2000);
  }, [onUploadSuccess, onUploadError, toast]);

  const handleUploadError = useCallback((error: any) => {
    setUploadStatus('error');
    const errorMsg = error.detail?.message || 'Upload failed';
    setErrorMessage(errorMsg);
    if (onUploadError) {
      onUploadError(errorMsg);
    }
    toast({
      title: "Upload failed",
      description: errorMsg,
      variant: "destructive"
    });
  }, [onUploadError, toast]);

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setUploadUrl('');
  };

  if (uploadStatus === 'success') {
    return (
      <div className={`flex flex-col items-center space-y-4 p-6 border border-green-200 rounded-lg bg-green-50 ${className}`}>
        <CheckCircle className="w-12 h-12 text-green-600" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-green-800">Upload Successful!</h3>
          <p className="text-green-600">Your video has been processed and is ready for playback.</p>
        </div>
        <Button onClick={resetUpload} variant="outline" size="sm">
          Upload Another Video
        </Button>
      </div>
    );
  }

  if (uploadStatus === 'error') {
    return (
      <div className={`flex flex-col items-center space-y-4 p-6 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-600" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-800">Upload Failed</h3>
          <p className="text-red-600">{errorMessage}</p>
        </div>
        <Button onClick={resetUpload} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  if (uploadStatus === 'uploading' || uploadStatus === 'processing') {
    return (
      <div className={`flex flex-col items-center space-y-4 p-6 border border-blue-200 rounded-lg bg-blue-50 ${className}`}>
        <FileVideo className="w-12 h-12 text-blue-600" />
        <div className="w-full max-w-md space-y-2">
          <div className="flex justify-between text-sm">
            <span>{uploadStatus === 'uploading' ? 'Uploading...' : 'Processing...'}</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
        <p className="text-blue-600 text-center">
          {uploadStatus === 'uploading' 
            ? 'Your video is being uploaded to MUX' 
            : 'Your video is being processed and will be ready soon'
          }
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <MuxUploader
        endpoint={uploadUrl}
        onUploadStart={handleUploadStart}
        onProgress={(evt: CustomEvent<number>) => handleUploadProgress(evt.detail)}
        onSuccess={handleUploadSuccess}
        onError={handleUploadError}
        onDroppedFile={initializeUpload}
        style={{
          '--uploader-font-family': 'system-ui, sans-serif',
          '--uploader-font-size': '14px',
          '--button-border-radius': '8px',
          '--progress-bar-fill-color': '#3b82f6',
          '--button-background-color': '#3b82f6',
          '--button-border-color': '#3b82f6',
        }}
      />
    </div>
  );
};

export default MuxUploaderComponent;