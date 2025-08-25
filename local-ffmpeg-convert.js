#!/usr/bin/env node

// Local FFmpeg MOV to MP4 Conversion Script
// Converts all .mov files in uploads/ to .mp4 using FFmpeg locally
// Preserves original filenames and metadata without modifying site logic

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

console.log('🎬 Local FFmpeg MOV to MP4 Conversion');
console.log('====================================');

async function convertMovToMp4(inputPath) {
  try {
    const fileName = path.basename(inputPath, '.mov');
    const outputPath = inputPath.replace('.mov', '.mp4');
    
    console.log(`🔄 Converting: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    
    // Check if MP4 already exists
    if (fs.existsSync(outputPath)) {
      console.log(`⚠️  MP4 already exists: ${path.basename(outputPath)}`);
      return {
        success: true,
        inputPath,
        outputPath,
        status: 'already_exists'
      };
    }
    
    // FFmpeg command with H.264/AAC encoding for universal compatibility
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;
    
    const { stdout, stderr } = await execAsync(ffmpegCommand);
    
    // Verify the output file was created
    if (fs.existsSync(outputPath)) {
      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      
      console.log(`✅ Conversion successful!`);
      console.log(`   📏 Input size: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   📏 Output size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   💾 Compression: ${((1 - outputStats.size / inputStats.size) * 100).toFixed(1)}%`);
      
      return {
        success: true,
        inputPath,
        outputPath,
        inputSizeMB: (inputStats.size / 1024 / 1024).toFixed(2),
        outputSizeMB: (outputStats.size / 1024 / 1024).toFixed(2),
        compressionPercent: ((1 - outputStats.size / inputStats.size) * 100).toFixed(1),
        status: 'converted'
      };
    } else {
      throw new Error('Output file was not created');
    }
    
  } catch (error) {
    console.error(`❌ Conversion failed for ${path.basename(inputPath)}:`, error.message);
    return {
      success: false,
      inputPath,
      error: error.message,
      status: 'failed'
    };
  }
}

async function batchConvertMovFiles() {
  try {
    // Find all .mov files in uploads directory
    const { stdout } = await execAsync('find uploads/ -name "*.mov" -type f');
    const movFiles = stdout.trim().split('\n').filter(file => file.length > 0);
    
    console.log(`📋 Found ${movFiles.length} MOV files to convert:\n`);
    
    const results = [];
    
    for (const movFile of movFiles) {
      const result = await convertMovToMp4(movFile);
      results.push(result);
      console.log(''); // Add spacing between conversions
    }
    
    // Summary
    console.log('📊 CONVERSION SUMMARY:');
    console.log('======================');
    
    const successful = results.filter(r => r.success && r.status === 'converted');
    const alreadyExists = results.filter(r => r.success && r.status === 'already_exists');
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successfully converted: ${successful.length}`);
    console.log(`⚠️  Already existed: ${alreadyExists.length}`);
    console.log(`❌ Failed conversions: ${failed.length}`);
    
    if (successful.length > 0) {
      const totalInputSize = successful.reduce((sum, r) => sum + parseFloat(r.inputSizeMB), 0);
      const totalOutputSize = successful.reduce((sum, r) => sum + parseFloat(r.outputSizeMB), 0);
      const avgCompression = (successful.reduce((sum, r) => sum + parseFloat(r.compressionPercent), 0) / successful.length);
      
      console.log(`\n📈 COMPRESSION STATS:`);
      console.log(`   Total input size: ${totalInputSize.toFixed(2)} MB`);
      console.log(`   Total output size: ${totalOutputSize.toFixed(2)} MB`);
      console.log(`   Average compression: ${avgCompression.toFixed(1)}%`);
    }
    
    if (failed.length > 0) {
      console.log(`\n❌ FAILED CONVERSIONS:`);
      failed.forEach(f => {
        console.log(`   ${path.basename(f.inputPath)}: ${f.error}`);
      });
    }
    
    console.log('\n🎉 Local FFmpeg conversion completed!');
    console.log('All converted MP4 files are ready for universal browser compatibility.');
    
  } catch (error) {
    console.error('💥 Batch conversion error:', error);
    process.exit(1);
  }
}

// Run the batch conversion
batchConvertMovFiles();