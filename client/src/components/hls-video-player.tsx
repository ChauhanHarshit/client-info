import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HLSVideoPlayerProps {
  src?: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  className?: string;
}

export const HLSVideoPlayer: React.FC<HLSVideoPlayerProps> = ({
  src,
  poster,
  autoPlay = false,
  muted = true,
  loop = true,
  onPlay,
  onPause,
  onTimeUpdate,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const setupHLS = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if HLS is natively supported
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src;
        } else {
          // Use hls.js for browsers that don't support HLS natively
          const { default: Hls } = await import('hls.js');
          
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
              backBufferLength: 90
            });

            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              if (autoPlay) {
                video.play().catch(console.error);
              }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                setError('Failed to load video');
                setIsLoading(false);
              }
            });

            // Cleanup function
            return () => {
              hls.destroy();
            };
          } else {
            setError('HLS not supported in this browser');
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('HLS setup error:', err);
        setError('Failed to initialize video player');
        setIsLoading(false);
      }
    };

    const cleanup = setupHLS();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [src, autoPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleTimeUpdate = () => {
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setError('Video playback error');
      setIsLoading(false);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, [onPlay, onPause, onTimeUpdate]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  if (error) {
    return (
      <div className={`relative bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-white text-center p-4">
          <div className="text-sm opacity-75">Video unavailable</div>
          <div className="text-xs opacity-50 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        muted={isMuted}
        loop={loop}
        playsInline
        className="w-full h-full object-cover cursor-pointer"
        onClick={togglePlayPause}
      />

      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-white text-sm">Loading...</div>
        </div>
      )}

      {/* Play/Pause Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!isPlaying && !isLoading && (
          <Button
            variant="secondary"
            size="lg"
            className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white border-0"
            onClick={togglePlayPause}
          >
            <Play className="h-8 w-8" />
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <Button
          variant="secondary"
          size="sm"
          className="bg-black/50 hover:bg-black/70 text-white border-0"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};