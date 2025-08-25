import React, { useRef, useEffect, useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface MuxVideoPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  playsInline?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  fallbackVideoUrl?: string;
}

export const MuxVideoPlayer: React.FC<MuxVideoPlayerProps> = ({
  playbackId,
  title,
  autoPlay = true,
  muted = false, // Default to audio enabled for TikTok-style experience
  loop = true,
  controls = false,
  playsInline = true,
  className = "",
  style,
  onEnded,
  onTimeUpdate,
  fallbackVideoUrl
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const muxPlayerRef = useRef<any>(null);
  const fallbackVideoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    const player = useFallback ? fallbackVideoRef.current : muxPlayerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    const player = useFallback ? fallbackVideoRef.current : muxPlayerRef.current;
    if (!player) return;

    player.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTouchStart = () => {
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000);
  };

  const handleMuxError = (error?: any) => {
    console.warn('🔄 MUX Player failed, falling back to native video:', error);
    setUseFallback(true);
    
    // Log error details for debugging
    if (error) {
      console.error('❌ MUX Player error details:', {
        playbackId,
        error: error.message || error,
        fallbackUrl: fallbackVideoUrl,
        timestamp: new Date().toISOString()
      });
    }
    
    // Notify parent component of fallback usage
    if (onUploadError) {
      onUploadError(`Mux playback failed, using fallback video. Error: ${error?.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    const player = useFallback ? fallbackVideoRef.current : muxPlayerRef.current;
    if (!player) return;

    const handleTimeUpdate = () => {
      if (onTimeUpdate) {
        onTimeUpdate(player.currentTime);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    player.addEventListener('timeupdate', handleTimeUpdate);
    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);
    player.addEventListener('ended', handleEnded);

    return () => {
      player.removeEventListener('timeupdate', handleTimeUpdate);
      player.removeEventListener('play', handlePlay);
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('ended', handleEnded);
    };
  }, [useFallback, onTimeUpdate, onEnded]);

  if (useFallback && fallbackVideoUrl) {
    return (
      <div className={`relative ${className}`} onTouchStart={handleTouchStart}>
        <video
          ref={fallbackVideoRef}
          src={fallbackVideoUrl}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          webkit-playsinline="true"
          className="w-full h-full object-cover"
          controls={controls}
        />
        
        {!controls && (
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center space-x-4 bg-black bg-opacity-50 rounded-full p-4">
              <button
                onClick={handlePlayPause}
                className="text-white p-2 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 transition-all"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              
              <button
                onClick={handleMuteToggle}
                className="text-white p-2 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 transition-all"
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} onTouchStart={handleTouchStart}>
      <MuxPlayer
        ref={muxPlayerRef}
        playbackId={playbackId}
        metadata={{
          video_title: title || 'Creator Content',
        }}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        streamType="on-demand"
        preferMse={true}
        preferCmcd="query"
        preload="metadata"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        onError={(error) => {
          console.warn('🔄 Mux player error, attempting fallback:', error);
          handleMuxError(error);
        }}
        onLoadStart={() => console.log('🎬 Mux player loading:', playbackId)}
        onLoadedData={() => console.log('✅ Mux player loaded successfully:', playbackId)}
        onCanPlay={() => console.log('📹 Mux player ready to play:', playbackId)}
        onTimeUpdate={() => {
          // Player is working correctly if time updates
          if (muxPlayerRef.current && !useFallback) {
            console.log('🎯 Mux playback confirmed working for:', playbackId);
          }
        }}
      />
      
      {!controls && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center space-x-4 bg-black bg-opacity-50 rounded-full p-4">
            <button
              onClick={handlePlayPause}
              className="text-white p-2 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 transition-all"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <button
              onClick={handleMuteToggle}
              className="text-white p-2 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 transition-all"
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MuxVideoPlayer;