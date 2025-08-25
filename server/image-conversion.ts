import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import heicConvert from 'heic-convert';

// Image formats that should be converted to JPEG
const CONVERSION_FORMATS = [
  'image/heic',
  'image/heif', 
  'image/tiff',
  'image/tif',
  'image/bmp',
  'image/webp',
  'image/avif',
  'image/png' // Will check for transparency
];

// File extensions that should be converted to JPEG
const CONVERSION_EXTENSIONS = [
  '.heic',
  '.heif',
  '.tiff',
  '.tif', 
  '.bmp',
  '.webp',
  '.avif',
  '.png' // Will check for transparency
];

/**
 * Check if an image format needs conversion to JPEG
 */
export function needsJpegConversion(filename: string, mimeType: string): boolean {
  const extension = path.extname(filename).toLowerCase();
  
  // Special handling for HEIC files - browsers often send them with incorrect MIME types
  const isHEICFile = extension === '.heic' || extension === '.heif';
  const isHEICWithBadMimeType = isHEICFile && (mimeType === 'application/octet-stream' || !mimeType);
  
  return CONVERSION_FORMATS.includes(mimeType) || CONVERSION_EXTENSIONS.includes(extension) || isHEICWithBadMimeType;
}

/**
 * Check if PNG has transparency (alpha channel)
 */
async function pngHasTransparency(filePath: string): Promise<boolean> {
  try {
    const metadata = await sharp(filePath).metadata();
    return metadata.hasAlpha === true;
  } catch (error) {
    console.error('Error checking PNG transparency:', error);
    return false; // Default to false if we can't determine
  }
}

/**
 * Convert HEIC/HEIF image to JPEG using heic-convert
 */
async function convertHEICToJpeg(originalPath: string, filename: string): Promise<{
  success: boolean;
  jpegPath?: string;
  jpegFilename?: string;
  message?: string;
}> {
  try {
    console.log(`📱 HEIC CONVERSION: Starting conversion of ${filename}`);
    
    // Generate new filename with .jpg extension
    const originalName = path.parse(filename).name;
    const jpegFilename = `${originalName}.jpg`;
    const jpegPath = path.join(path.dirname(originalPath), jpegFilename);
    
    // Read the HEIC file
    const inputBuffer = fs.readFileSync(originalPath);
    console.log(`📁 Input buffer size: ${inputBuffer.length} bytes`);
    
    // Convert HEIC to JPEG using heic-convert
    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.85
    });
    
    console.log(`📁 Output buffer size: ${outputBuffer.length} bytes`);
    
    // Write the converted JPEG
    fs.writeFileSync(jpegPath, outputBuffer);
    
    // Verify the JPEG was created successfully
    if (!fs.existsSync(jpegPath)) {
      throw new Error('JPEG conversion failed - output file not created');
    }
    
    const jpegStats = fs.statSync(jpegPath);
    if (jpegStats.size === 0) {
      throw new Error('JPEG conversion failed - output file is empty');
    }
    
    console.log(`✅ HEIC CONVERSION SUCCESS: ${filename} → ${jpegFilename}`);
    console.log(`📊 File size: ${fs.statSync(originalPath).size} bytes → ${jpegStats.size} bytes`);
    
    // Remove original HEIC file to save space
    try {
      fs.unlinkSync(originalPath);
      console.log(`🗑️ Original HEIC file removed: ${filename}`);
    } catch (cleanupError) {
      console.warn('Warning: Could not remove original HEIC file:', cleanupError);
    }
    
    return {
      success: true,
      jpegPath,
      jpegFilename,
      message: `Successfully converted ${filename} to JPEG format`
    };
    
  } catch (error) {
    console.error('❌ HEIC CONVERSION FAILED:', error);
    return {
      success: false,
      message: `Failed to convert ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Convert image to JPEG format
 */
export async function convertToJpeg(originalPath: string, filename: string, mimeType: string): Promise<{
  success: boolean;
  jpegPath?: string;
  jpegFilename?: string;
  originalKept?: boolean;
  message?: string;
}> {
  try {
    console.log(`🖼️ IMAGE CONVERSION: Starting conversion of ${filename} (${mimeType})`);
    
    // Check if this is a HEIC/HEIF file
    const extension = path.extname(filename).toLowerCase();
    const isHEICFile = extension === '.heic' || extension === '.heif';
    
    if (isHEICFile) {
      console.log(`📱 HEIC DETECTED: Using heic-convert for ${filename}`);
      return await convertHEICToJpeg(originalPath, filename);
    }
    
    // Special handling for PNG - check for transparency
    if (mimeType === 'image/png' || extension === '.png') {
      const hasTransparency = await pngHasTransparency(originalPath);
      if (hasTransparency) {
        console.log(`🖼️ PNG WITH TRANSPARENCY: Keeping original PNG ${filename}`);
        return {
          success: true,
          originalKept: true,
          message: 'PNG has transparency, keeping original format'
        };
      }
    }
    
    // Generate new filename with .jpg extension
    const originalName = path.parse(filename).name;
    const jpegFilename = `${originalName}.jpg`;
    const jpegPath = path.join(path.dirname(originalPath), jpegFilename);
    
    // Convert image to JPEG with high quality using Sharp
    await sharp(originalPath)
      .jpeg({ 
        quality: 85, // High quality JPEG
        progressive: true,
        mozjpeg: true // Use mozjpeg for better compression
      })
      .toFile(jpegPath);
    
    // Verify the JPEG was created successfully
    if (!fs.existsSync(jpegPath)) {
      throw new Error('JPEG conversion failed - output file not created');
    }
    
    const jpegStats = fs.statSync(jpegPath);
    if (jpegStats.size === 0) {
      throw new Error('JPEG conversion failed - output file is empty');
    }
    
    console.log(`✅ IMAGE CONVERSION SUCCESS: ${filename} → ${jpegFilename}`);
    console.log(`📊 File size: ${fs.statSync(originalPath).size} bytes → ${jpegStats.size} bytes`);
    
    // Remove original file to save space (optional)
    try {
      fs.unlinkSync(originalPath);
      console.log(`🗑️ Original file removed: ${filename}`);
    } catch (cleanupError) {
      console.warn('Warning: Could not remove original file:', cleanupError);
    }
    
    return {
      success: true,
      jpegPath,
      jpegFilename,
      originalKept: false,
      message: `Successfully converted ${filename} to JPEG format`
    };
    
  } catch (error) {
    console.error('❌ IMAGE CONVERSION FAILED:', error);
    return {
      success: false,
      message: `Failed to convert ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get supported image formats for conversion
 */
export function getSupportedImageFormats(): string[] {
  return CONVERSION_FORMATS;
}

/**
 * Check if file is an image that supports conversion
 */
export function isImageFormatSupported(mimeType: string): boolean {
  return mimeType.startsWith('image/') || CONVERSION_FORMATS.includes(mimeType);
}

/**
 * Process image upload with automatic JPEG conversion
 */
export async function processImageUpload(filePath: string, filename: string, mimeType: string): Promise<{
  success: boolean;
  finalPath: string;
  finalFilename: string;
  finalMimeType: string;
  converted: boolean;
  message?: string;
}> {
  // Check if image needs conversion
  if (!needsJpegConversion(filename, mimeType)) {
    console.log(`✅ IMAGE OK: ${filename} does not need conversion`);
    return {
      success: true,
      finalPath: filePath,
      finalFilename: filename,
      finalMimeType: mimeType,
      converted: false,
      message: 'No conversion needed'
    };
  }
  
  console.log(`🔄 IMAGE PROCESSING: ${filename} needs JPEG conversion`);
  
  // Convert to JPEG
  const conversionResult = await convertToJpeg(filePath, filename, mimeType);
  
  if (!conversionResult.success) {
    // Conversion failed, keep original
    console.log(`❌ CONVERSION FAILED: Keeping original ${filename}`);
    return {
      success: true,
      finalPath: filePath,
      finalFilename: filename,
      finalMimeType: mimeType,
      converted: false,
      message: conversionResult.message || 'Conversion failed, using original'
    };
  }
  
  if (conversionResult.originalKept) {
    // PNG with transparency, keep original
    return {
      success: true,
      finalPath: filePath,
      finalFilename: filename,
      finalMimeType: mimeType,
      converted: false,
      message: conversionResult.message || 'Original format preserved'
    };
  }
  
  // Conversion successful
  return {
    success: true,
    finalPath: conversionResult.jpegPath!,
    finalFilename: conversionResult.jpegFilename!,
    finalMimeType: 'image/jpeg',
    converted: true,
    message: conversionResult.message || 'Successfully converted to JPEG'
  };
}