#!/usr/bin/env node

// Cloudinary Batch Video Conversion Script
// Converts the 8 existing .mov files to .mp4 using Cloudinary

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadAndConvertVideo(contentId, localPath) {
  try {
    console.log(`🔄 Starting Cloudinary chunked conversion for content ${contentId}: ${localPath}`);
    
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${localPath}`);
    }

    const stats = fs.statSync(localPath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    console.log(`📏 File size: ${fileSizeInMB.toFixed(2)} MB`);

    const fileName = localPath.split('/').pop().replace('.mov', '');
    const publicId = `converted_videos/content_${contentId}_${fileName}`;

    // Use standard upload with large file support and proper configuration
    const uploadResult = await cloudinary.uploader.upload(localPath, {
      resource_type: 'video',
      public_id: publicId,
      format: 'mp4',
      video_codec: 'h264',
      audio_codec: 'aac',
      quality: 'auto:good',
      chunk_size: 50000000, // Enable chunking for large files
      eager: [
        {
          video_codec: 'h264',
          audio_codec: 'aac',
          format: 'mp4',
          quality: 'auto:good'
        }
      ],
      eager_async: false, // Wait for conversion to complete
      overwrite: true,
      invalidate: true
    });

    console.log(`✅ Cloudinary conversion successful for content ${contentId}`);
    
    // Extract the correct URL and details from the result
    const mp4Url = uploadResult.secure_url || uploadResult.url;
    const bytes = uploadResult.bytes || 'unknown';
    const format = uploadResult.format || 'mp4';
    
    console.log(`📎 MP4 URL: ${mp4Url}`);
    console.log(`📊 Upload details: ${bytes} bytes, format: ${format}`);

    return {
      success: true,
      contentId,
      originalPath: localPath,
      mp4Url: mp4Url,
      publicId: uploadResult.public_id,
      fileSizeBytes: bytes,
      format: format,
      fullResult: uploadResult
    };

  } catch (error) {
    console.error(`❌ Cloudinary chunked conversion failed for content ${contentId}:`, error);
    return {
      success: false,
      contentId,
      originalPath: localPath,
      error: error.message
    };
  }
}

console.log('🎬 Cloudinary Batch Video Conversion');
console.log('=====================================');

// The 8 known .mov files that need conversion with their correct file paths from database
const targetVideos = [
  { contentId: 37, path: 'uploads/file-1751142214354-666643320.mov', title: 'Making waves 🌊' },
  { contentId: 38, path: 'uploads/file-1751142605354-383437274.mov', title: 'Too cute to handle' },
  { contentId: 40, path: 'uploads/file-1751142996863-342961782.mov', title: 'Living my best life ✨' },
  { contentId: 55, path: 'uploads/file-1751576896177-229486939.mov', title: 'Feeling myself in this bikini 😉' },
  { contentId: 193, path: 'uploads/file-1750831116413-933595952.mov', title: 'test 2' },
  { contentId: 195, path: 'uploads/file-1751768897630-17244636.mov', title: 'testinglala2' },
  { contentId: 202, path: 'uploads/file-1752006249094-807656868.mov', title: 'testingmov2' },
  { contentId: 204, path: 'uploads/file-1752006411293-431126770.mov', title: 'testingmov3' }
];

console.log(`📋 Target content IDs: ${targetVideos.map(v => v.contentId).join(', ')}`);
console.log(`🔄 Starting conversion of ${targetVideos.length} videos...\n`);

try {
  const results = [];
  
  for (const video of targetVideos) {
    const result = await uploadAndConvertVideo(video.contentId, video.path);
    results.push(result);
    
    // Add delay between conversions to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 CONVERSION RESULTS:');
  console.log('======================');
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ Content ${result.contentId}: SUCCESS`);
      console.log(`   📎 MP4 URL: ${result.mp4Url}`);
      console.log(`   📁 Original: ${result.originalPath}`);
    } else {
      console.log(`❌ Content ${result.contentId}: FAILED`);
      console.log(`   🚫 Error: ${result.error}`);
      console.log(`   📁 Path: ${result.originalPath}`);
    }
    console.log('');
  });
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`📈 SUMMARY: ${successful} successful, ${failed} failed conversions`);
  
  if (successful > 0) {
    console.log('\n🎉 Cloudinary conversions completed!');
    console.log('All converted videos are now available as MP4 format.');
    console.log('The URLs can be used directly or saved to database as needed.');
  }
  
} catch (error) {
  console.error('💥 Batch conversion error:', error);
  process.exit(1);
}