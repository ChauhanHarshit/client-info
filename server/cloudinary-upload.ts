import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary (credentials from environment)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
  width?: number;
  height?: number;
  format?: string;
}

export async function uploadToCloudinary(filePath: string, options?: {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  format?: string;
  transformation?: any[];
}): Promise<CloudinaryUploadResult> {
  try {
    console.log(`🔄 Starting Cloudinary upload for: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Generate unique public ID
    const fileName = path.basename(filePath, path.extname(filePath));
    const timestamp = Date.now();
    const publicId = `${options?.folder || 'uploads'}/${fileName}_${timestamp}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: options?.resourceType || 'auto',
      public_id: publicId,
      folder: options?.folder,
      format: options?.format,
      transformation: options?.transformation,
      overwrite: true,
      invalidate: true
    });

    console.log(`✅ Cloudinary upload successful: ${uploadResult.secure_url}`);

    return {
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format
    };

  } catch (error) {
    console.error(`❌ Cloudinary upload failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error(`❌ Cloudinary delete failed:`, error);
    return false;
  }
}
