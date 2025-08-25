#!/usr/bin/env node

/**
 * S3 Migration Script
 * Migrates all existing media files from uploads/ directory to S3
 * Updates all database references to use new S3 URLs
 * Maintains full accessibility and functionality
 */

import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROGRESS_FILE = path.join(__dirname, 'migration-progress.json');

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Migration state for resumability
let migrationState = {
  totalFiles: 0,
  processedFiles: 0,
  successfulUploads: [],
  failedUploads: [],
  dbUpdates: {
    creators: 0,
    contentInspirationPages: 0,
    customContents: 0,
    pageBanners: 0,
    inspoPageContent: 0,
    contentInspirationItems: 0
  }
};

// Load previous progress if exists
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    migrationState = progress;
    console.log(`📥 Loaded previous progress: ${migrationState.processedFiles}/${migrationState.totalFiles} files processed`);
  }
}

// Save progress for resumability
function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(migrationState, null, 2));
}

// Get all files to migrate
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Generate S3 key from local path
function generateS3Key(localPath) {
  const relativePath = path.relative(UPLOADS_DIR, localPath);
  const timestamp = Date.now();
  const ext = path.extname(localPath);
  const basename = path.basename(localPath, ext);
  
  // Preserve directory structure but add timestamp for uniqueness
  const dir = path.dirname(relativePath);
  if (dir === '.') {
    return `uploads/${basename}-${timestamp}${ext}`;
  }
  return `uploads/${dir}/${basename}-${timestamp}${ext}`;
}

// Get content type for file
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// Upload single file to S3
async function uploadFileToS3(localPath) {
  const fileKey = generateS3Key(localPath);
  const fileContent = fs.readFileSync(localPath);
  const contentType = getContentType(localPath);
  const fileSize = fs.statSync(localPath).size;

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: fileContent,
    ContentType: contentType,
    CacheControl: 'max-age=31536000'
  };

  try {
    const startTime = Date.now();
    const result = await s3.upload(uploadParams).promise();
    const uploadTime = Date.now() - startTime;
    
    console.log(`✅ Uploaded: ${path.basename(localPath)} (${(fileSize / 1024 / 1024).toFixed(2)}MB in ${uploadTime}ms)`);
    
    return {
      success: true,
      localPath: localPath.replace(__dirname + '/', ''),
      s3Url: result.Location,
      s3Key: fileKey,
      size: fileSize,
      contentType
    };
  } catch (error) {
    console.error(`❌ Failed to upload ${localPath}:`, error.message);
    return {
      success: false,
      localPath: localPath.replace(__dirname + '/', ''),
      error: error.message
    };
  }
}

// Verify S3 file is accessible
async function verifyS3Access(s3Url) {
  try {
    const response = await fetch(s3Url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Check if file is an image
function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp'].includes(ext);
}

// Convert S3 URL to ImageKit URL for images
function getPublicUrl(s3Url, filePath) {
  if (!isImageFile(filePath)) {
    return s3Url; // Keep videos on S3
  }
  // Extract path after bucket name and convert to ImageKit URL
  const match = s3Url.match(/s3\.amazonaws\.com\/[^\/]+\/(.*)/);
  if (!match) return s3Url;
  
  const path = match[1];
  return `https://ik.imagekit.io/tasty/${path}`;
}

// Update database references
async function updateDatabaseReferences(uploads) {
  console.log('\n🔄 Updating database references...');
  
  for (const upload of uploads) {
    if (!upload.success) continue;
    
    const localUrl = upload.localPath.startsWith('uploads/') ? '/' + upload.localPath : '/uploads/' + path.basename(upload.localPath);
    const publicUrl = getPublicUrl(upload.s3Url, upload.localPath);
    
    try {
      // Update creators profile images
      const creatorsResult = await pool.query(
        'UPDATE creators SET profile_image_url = $1 WHERE profile_image_url = $2 RETURNING id',
        [publicUrl, localUrl]
      );
      migrationState.dbUpdates.creators += creatorsResult.rowCount;
      
      // Update content inspiration pages banners
      const pagesResult = await pool.query(
        'UPDATE content_inspiration_pages SET banner_url = $1 WHERE banner_url = $2 RETURNING id',
        [publicUrl, localUrl]
      );
      migrationState.dbUpdates.contentInspirationPages += pagesResult.rowCount;
      
      // Update page banners
      const bannersResult = await pool.query(
        'UPDATE page_banners SET banner_image_url = $1 WHERE banner_image_url = $2 RETURNING id',
        [publicUrl, localUrl]
      );
      migrationState.dbUpdates.pageBanners += bannersResult.rowCount;
      
      // Update inspo page content
      const inspoResult = await pool.query(
        'UPDATE inspo_page_content SET file_url = $1 WHERE file_url = $2 RETURNING id',
        [publicUrl, localUrl]
      );
      migrationState.dbUpdates.inspoPageContent += inspoResult.rowCount;
      
      // Update content inspiration items
      const videoResult = await pool.query(
        'UPDATE content_inspiration_items SET video_url = $1 WHERE video_url = $2 RETURNING id',
        [publicUrl, localUrl]
      );
      const imageResult = await pool.query(
        'UPDATE content_inspiration_items SET image_url = $1 WHERE image_url = $2 RETURNING id',
        [publicUrl, localUrl]
      );
      migrationState.dbUpdates.contentInspirationItems += videoResult.rowCount + imageResult.rowCount;
      
      // Update custom contents attachments (JSON array)
      const customContents = await pool.query(
        'SELECT id, attachments FROM custom_contents WHERE attachments::text LIKE $1',
        [`%${localUrl}%`]
      );
      
      for (const row of customContents.rows) {
        if (row.attachments && Array.isArray(row.attachments)) {
          const updatedAttachments = row.attachments.map(url => 
            url === localUrl ? publicUrl : url
          );
          await pool.query(
            'UPDATE custom_contents SET attachments = $1 WHERE id = $2',
            [JSON.stringify(updatedAttachments), row.id]
          );
          migrationState.dbUpdates.customContents++;
        }
      }
      
    } catch (error) {
      console.error(`❌ Database update failed for ${upload.localPath}:`, error.message);
    }
  }
  
  console.log('\n📊 Database update summary:');
  console.log(`  - Creators: ${migrationState.dbUpdates.creators} updated`);
  console.log(`  - Content Inspiration Pages: ${migrationState.dbUpdates.contentInspirationPages} updated`);
  console.log(`  - Page Banners: ${migrationState.dbUpdates.pageBanners} updated`);
  console.log(`  - Inspo Page Content: ${migrationState.dbUpdates.inspoPageContent} updated`);
  console.log(`  - Content Inspiration Items: ${migrationState.dbUpdates.contentInspirationItems} updated`);
  console.log(`  - Custom Contents: ${migrationState.dbUpdates.customContents} updated`);
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting S3 Migration Process');
  console.log('================================');
  console.log(`S3 Bucket: ${BUCKET_NAME}`);
  console.log(`Uploads Directory: ${UPLOADS_DIR}`);
  
  // Load previous progress
  loadProgress();
  
  // Get all files
  const allFiles = getAllFiles(UPLOADS_DIR);
  migrationState.totalFiles = allFiles.length;
  
  console.log(`\n📁 Found ${allFiles.length} files to migrate`);
  
  // Filter out already processed files
  const processedPaths = migrationState.successfulUploads.map(u => u.localPath);
  const filesToProcess = allFiles.filter(file => 
    !processedPaths.includes(file.replace(__dirname + '/', ''))
  );
  
  console.log(`📋 ${filesToProcess.length} files remaining to process`);
  
  // Process files in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
    const batch = filesToProcess.slice(i, i + BATCH_SIZE);
    console.log(`\n🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(filesToProcess.length/BATCH_SIZE)}`);
    
    const uploadPromises = batch.map(file => uploadFileToS3(file));
    const results = await Promise.all(uploadPromises);
    
    // Verify uploads
    for (const result of results) {
      if (result.success) {
        const isAccessible = await verifyS3Access(result.s3Url);
        if (isAccessible) {
          migrationState.successfulUploads.push(result);
          console.log(`✓ Verified: ${result.s3Url}`);
        } else {
          console.error(`⚠️ Warning: File uploaded but not accessible: ${result.s3Url}`);
          result.success = false;
          migrationState.failedUploads.push(result);
        }
      } else {
        migrationState.failedUploads.push(result);
      }
      migrationState.processedFiles++;
    }
    
    // Save progress after each batch
    saveProgress();
    
    // Show progress
    const progress = (migrationState.processedFiles / migrationState.totalFiles * 100).toFixed(1);
    console.log(`\n📊 Progress: ${migrationState.processedFiles}/${migrationState.totalFiles} (${progress}%)`);
  }
  
  // Update database references
  await updateDatabaseReferences(migrationState.successfulUploads);
  
  // Final summary
  console.log('\n✅ Migration Complete!');
  console.log('===================');
  console.log(`Total files: ${migrationState.totalFiles}`);
  console.log(`Successful uploads: ${migrationState.successfulUploads.length}`);
  console.log(`Failed uploads: ${migrationState.failedUploads.length}`);
  console.log(`\nSpace freed: ~${(migrationState.successfulUploads.reduce((sum, u) => sum + u.size, 0) / 1024 / 1024 / 1024).toFixed(2)}GB`);
  
  if (migrationState.failedUploads.length > 0) {
    console.log('\n❌ Failed uploads:');
    migrationState.failedUploads.forEach(f => {
      console.log(`  - ${f.localPath}: ${f.error}`);
    });
    console.log('\nYou can re-run the script to retry failed uploads.');
  }
  
  // Save final state
  saveProgress();
  
  // Create backup list
  const backupList = migrationState.successfulUploads.map(u => ({
    local: u.localPath,
    s3: u.s3Url
  }));
  fs.writeFileSync('s3-migration-backup.json', JSON.stringify(backupList, null, 2));
  console.log('\n📄 Backup file created: s3-migration-backup.json');
  
  await pool.end();
}

// Error handling
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Migration interrupted! Progress saved.');
  saveProgress();
  process.exit(0);
});

// Run migration
migrate().catch(error => {
  console.error('\n❌ Migration failed:', error);
  saveProgress();
  process.exit(1);
});