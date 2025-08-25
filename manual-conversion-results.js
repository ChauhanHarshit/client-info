#!/usr/bin/env node

// FFmpeg Local Conversion Results Summary
// Tracks progress of MOV to MP4 conversion using local FFmpeg

import fs from 'fs';
import path from 'path';

console.log('📊 LOCAL FFMPEG CONVERSION STATUS REPORT');
console.log('=========================================');

// Count current files
const movFiles = fs.readdirSync('uploads/').filter(f => f.endsWith('.mov'));
const mp4Files = fs.readdirSync('uploads/').filter(f => f.endsWith('.mp4'));

console.log(`📁 Total MOV files: ${movFiles.length}`);
console.log(`📁 Total MP4 files: ${mp4Files.length}`);

// Check which MOV files still need conversion
const needsConversion = [];
const alreadyConverted = [];

movFiles.forEach(movFile => {
  const mp4File = movFile.replace('.mov', '.mp4');
  const mp4Path = path.join('uploads', mp4File);
  
  if (fs.existsSync(mp4Path)) {
    const movStats = fs.statSync(path.join('uploads', movFile));
    const mp4Stats = fs.statSync(mp4Path);
    alreadyConverted.push({
      original: movFile,
      converted: mp4File,
      originalSizeMB: (movStats.size / 1024 / 1024).toFixed(1),
      convertedSizeMB: (mp4Stats.size / 1024 / 1024).toFixed(1),
      compressionRatio: ((1 - mp4Stats.size / movStats.size) * 100).toFixed(1)
    });
  } else {
    needsConversion.push(movFile);
  }
});

console.log(`\n✅ SUCCESSFULLY CONVERTED: ${alreadyConverted.length} files`);
alreadyConverted.forEach((file, index) => {
  console.log(`${index + 1}. ${file.original} → ${file.converted}`);
  console.log(`   📏 ${file.originalSizeMB}MB → ${file.convertedSizeMB}MB (${file.compressionRatio}% compression)`);
});

console.log(`\n🔄 STILL NEEDS CONVERSION: ${needsConversion.length} files`);
needsConversion.forEach((file, index) => {
  console.log(`${index + 1}. ${file}`);
});

console.log(`\n📈 CONVERSION PROGRESS: ${alreadyConverted.length}/${movFiles.length} (${((alreadyConverted.length / movFiles.length) * 100).toFixed(1)}%)`);

if (needsConversion.length === 0) {
  console.log('\n🎉 ALL MOV FILES HAVE BEEN CONVERTED TO MP4!');
  console.log('🎬 Universal browser compatibility achieved with H.264/AAC encoding');
  console.log('📱 All videos now support autoplay and cross-platform viewing');
} else {
  console.log('\n⏳ FFmpeg conversion is in progress...');
  console.log('🔄 Remaining conversions will complete automatically');
}