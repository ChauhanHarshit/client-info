import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary (credentials from environment)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryConversionResult {
  success: boolean;
  contentId: number;
  originalPath: string;
  mp4Url?: string;
  publicId?: string;
  error?: string;
}

export async function uploadAndConvertVideo(contentId: number, localPath: string): Promise<CloudinaryConversionResult> {
  try {
    console.log(`🔄 Starting Cloudinary conversion for content ${contentId}: ${localPath}`);
    
    // Check if file exists
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${localPath}`);
    }

    // Generate unique public ID for Cloudinary
    const fileName = path.basename(localPath, path.extname(localPath));
    const publicId = `converted_videos/content_${contentId}_${fileName}`;

    // Upload to Cloudinary with MP4 conversion
    const uploadResult = await cloudinary.uploader.upload(localPath, {
      resource_type: 'video',
      public_id: publicId,
      format: 'mp4', // Force MP4 output
      video_codec: 'h264', // H.264 codec for universal compatibility
      audio_codec: 'aac', // AAC audio for compatibility
      quality: 'auto:good', // Automatic quality optimization
      transformation: [
        {
          video_codec: 'h264',
          audio_codec: 'aac',
          format: 'mp4'
        }
      ]
    });

    console.log(`✅ Cloudinary conversion successful for content ${contentId}`);
    console.log(`📎 MP4 URL: ${uploadResult.secure_url}`);

    return {
      success: true,
      contentId,
      originalPath: localPath,
      mp4Url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    };

  } catch (error) {
    console.error(`❌ Cloudinary conversion failed for content ${contentId}:`, error);
    return {
      success: false,
      contentId,
      originalPath: localPath,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function batchConvertVideos(contentIds: number[]): Promise<CloudinaryConversionResult[]> {
  console.log(`🚀 Starting batch Cloudinary conversion for ${contentIds.length} videos`);
  
  const results: CloudinaryConversionResult[] = [];
  
  for (const contentId of contentIds) {
    try {
      // Get file path from database (you'll need to implement this query)
      const filePath = await getFilePathForContent(contentId);
      
      if (filePath) {
        const result = await uploadAndConvertVideo(contentId, filePath);
        results.push(result);
        
        // Add small delay between conversions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        results.push({
          success: false,
          contentId,
          originalPath: 'unknown',
          error: 'File path not found in database'
        });
      }
    } catch (error) {
      results.push({
        success: false,
        contentId,
        originalPath: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`📊 Batch Cloudinary conversion complete: ${successful} successful, ${failed} failed`);
  
  return results;
}

// Helper function to get file path from database
async function getFilePathForContent(contentId: number): Promise<string | null> {
  // This will integrate with your existing database query
  // For now, return the known file paths based on your content IDs
  const knownFiles: Record<number, string> = {
    37: 'uploads/file-1750956419395-166816306.mov',
    38: 'uploads/file-1750956567444-723442329.mov',
    40: 'uploads/file-1750956879569-651825072.mov',
    55: 'uploads/file-1751042893506-430625031.mov',
    193: 'uploads/file-1751768691488-253516434.mov',
    195: 'uploads/file-1751768897630-17244636.mov',
    202: 'uploads/file-1752006249094-807656868.mov',
    204: 'uploads/file-1752006411293-431126770.mov'
  };
  
  return knownFiles[contentId] || null;
}

export { cloudinary };