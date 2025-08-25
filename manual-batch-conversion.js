#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function runBatchConversion() {
  const remainingFiles = [
    'uploads/file-1750970648810-421820218.mov',
    'uploads/file-1750970668260-809029314.mov', 
    'uploads/files-1751001266850-287069352.mov',
    'uploads/file-1751141840382-288242833.mov',
    'uploads/file-1751142214354-666643320.mov',
    'uploads/file-1751142605354-383437274.mov',
    'uploads/file-1751142621597-490327072.mov',
    'uploads/file-1751142996863-342961782.mov',
    'uploads/file-1751143011745-364971808.mov',
    'uploads/file-1751576893521-851320292.mov',
    'uploads/file-1751576896177-229486939.mov',
    'uploads/file-1751632205195-552663854.mov',
    'uploads/file-1751768897630-17244636.mov',
    'uploads/file-1752005968691-504337169.mov',
    'uploads/file-1752006249094-807656868.mov',
    'uploads/file-1752006411293-431126770.mov'
  ];

  console.log(`🎬 Converting ${remainingFiles.length} remaining MOV files...`);
  
  for (let i = 0; i < remainingFiles.length; i++) {
    const file = remainingFiles[i];
    const mp4File = file.replace('.mov', '.mp4');
    
    console.log(`[${i+1}/${remainingFiles.length}] Converting ${file.split('/').pop()}...`);
    
    try {
      await execAsync(`ffmpeg -i "${file}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${mp4File}" -y`);
      
      if (fs.existsSync(mp4File)) {
        const size = (fs.statSync(mp4File).size / 1024 / 1024).toFixed(1);
        console.log(`✅ Created ${mp4File.split('/').pop()} (${size}MB)`);
      }
    } catch (error) {
      console.log(`❌ Failed: ${file.split('/').pop()}`);
    }
  }
  
  console.log('\n🎉 Batch conversion completed!');
}

runBatchConversion();