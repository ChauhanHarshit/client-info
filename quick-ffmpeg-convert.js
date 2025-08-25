#!/usr/bin/env node

// Quick FFmpeg conversion for remaining MOV files
// Converts only MOV files that don't already have MP4 equivalents

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function convertSingleMov(inputPath) {
  const outputPath = inputPath.replace('.mov', '.mp4');
  
  if (fs.existsSync(outputPath)) {
    console.log(`⚠️  ${path.basename(outputPath)} already exists, skipping`);
    return { success: true, status: 'exists' };
  }
  
  console.log(`🔄 Converting ${path.basename(inputPath)}...`);
  
  try {
    await execAsync(`ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`);
    
    if (fs.existsSync(outputPath)) {
      const inputSize = (fs.statSync(inputPath).size / 1024 / 1024).toFixed(1);
      const outputSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
      console.log(`✅ ${path.basename(outputPath)} created (${inputSize}MB → ${outputSize}MB)`);
      return { success: true, status: 'converted', inputSize, outputSize };
    }
  } catch (error) {
    console.error(`❌ Failed: ${path.basename(inputPath)} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function convertRemaining() {
  console.log('🎬 Quick FFmpeg Conversion - Remaining MOV Files');
  console.log('=================================================');
  
  try {
    const { stdout } = await execAsync('find uploads/ -name "*.mov" -type f');
    const movFiles = stdout.trim().split('\n').filter(f => f.length > 0);
    
    console.log(`📋 Found ${movFiles.length} MOV files, checking for existing MP4s...\n`);
    
    const results = [];
    for (const movFile of movFiles) {
      const result = await convertSingleMov(movFile);
      results.push(result);
    }
    
    const converted = results.filter(r => r.status === 'converted').length;
    const existed = results.filter(r => r.status === 'exists').length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 RESULTS: ${converted} converted, ${existed} already existed, ${failed} failed`);
    console.log('🎉 FFmpeg conversion complete!');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

convertRemaining();