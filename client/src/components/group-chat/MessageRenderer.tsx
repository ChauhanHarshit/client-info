import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';

interface MessageRendererProps {
  message: any;
  isOwn: boolean;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({ message, isOwn }) => {
  // CRITICAL FIX: Force ALL HEIC files to be treated as images
  const isImage = message.mediaFileName && (
    message.mediaFileName.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i) ||
    message.mediaMimeType?.startsWith('image/')
  );



  // Text-only message (no media)
  if (message.messageType === 'text' && !message.mediaFileName) {
    return (
      <p className={`text-sm ${isOwn ? 'text-white' : 'text-gray-900'}`}>
        {message.content}
      </p>
    );
  }

  // Image message (including HEIC)
  if (isImage) {
    const isHEIC = message.mediaFileName && 
      (message.mediaFileName.toLowerCase().includes('.heic') || 
       message.mediaFileName.toLowerCase().includes('.heif') ||
       message.mediaMimeType === 'image/heic' ||
       message.mediaMimeType === 'image/heif');

    const imageSrc = isHEIC && message.mediaUrl 
      ? `/api/convert-heic/${message.mediaUrl.split('/').pop()}`
      : message.mediaUrl || '';

    return (
      <div className="space-y-2">
        {/* COMPLETELY HIDE filename text for media files */}
        {message.content && 
         !message.content.startsWith('Shared file:') && 
         !message.content.match(/^Shared file: .*\.(jpg|jpeg|png|heic|mov|mp4|gif|webp|heif|avi|webm)$/i) && (
          <p className={`text-sm ${isOwn ? 'text-white' : 'text-gray-900'}`}>
            {message.content}
          </p>
        )}
        <img
          src={imageSrc}
          alt="Shared image"
          className="max-w-xs rounded-lg"
          onError={(e) => {
            console.log('Image failed to load:', imageSrc);
          }}
        />
      </div>
    );
  }

  // Video message
  if (message.messageType === 'video') {
    return (
      <div className="space-y-2">
        {/* COMPLETELY HIDE filename text for video files */}
        {message.content && 
         !message.content.startsWith('Shared file:') && 
         !message.content.match(/^Shared file: .*\.(mov|mp4|avi|webm)$/i) && (
          <p className={`text-sm ${isOwn ? 'text-white' : 'text-gray-900'}`}>
            {message.content}
          </p>
        )}
        <video
          src={message.mediaUrl || ''}
          controls
          className="max-w-xs rounded-lg"
        />
      </div>
    );
  }

  // File attachment (non-image, non-video)
  if (message.mediaUrl && message.mediaFileName && !isImage) {
    const bgColor = isOwn ? 'bg-blue-400 border-blue-300' : 'bg-white border';
    const textColor = isOwn ? 'text-white' : 'text-gray-900';
    const iconColor = isOwn ? 'text-white' : 'text-gray-600';

    return (
      <div className="space-y-2">
        <p className={`text-sm ${textColor}`}>{message.content}</p>
        <div className={`${bgColor} rounded-lg p-3 max-w-xs`}>
          <div className="flex items-center gap-2 mb-2">
            <FileText className={`h-4 w-4 ${iconColor}`} />
            <span className={`text-sm font-medium ${textColor} truncate`}>
              {message.mediaFileName}
            </span>
          </div>
          <div className="flex gap-2">
            <a
              href={message.mediaUrl}
              download={message.mediaFileName}
              className={`flex items-center gap-1 px-2 py-1 ${
                isOwn ? 'bg-blue-300 text-blue-900' : 'bg-gray-100 text-gray-700'
              } text-xs rounded hover:bg-opacity-80 transition-colors`}
            >
              <Download className="h-3 w-3" />
              Download
            </a>
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 px-2 py-1 ${
                isOwn ? 'bg-blue-300 text-blue-900' : 'bg-gray-100 text-gray-700'
              } text-xs rounded hover:bg-opacity-80 transition-colors`}
            >
              <Eye className="h-3 w-3" />
              Preview
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for any other case
  return (
    <p className={`text-sm ${isOwn ? 'text-white' : 'text-gray-900'}`}>
      {message.content}
    </p>
  );
};