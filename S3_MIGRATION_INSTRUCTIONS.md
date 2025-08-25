# S3 Migration Instructions

## Overview
This migration will move all 1.8GB of media files from your local `uploads/` directory to AWS S3, while ensuring:
- ✅ All videos and images remain fully accessible and playable
- ✅ No functionality changes for users
- ✅ Database references are automatically updated
- ✅ Full rollback capability if needed

## What Will Happen
1. **360 files** will be uploaded to S3 (95 images, 223 videos, 42 other files)
2. **Database updates** will be made to 6 tables to point to new S3 URLs
3. **Progress is saved** - if interrupted, the migration can be resumed
4. **Verification** ensures all files are accessible after upload
5. **Backup file** is created for potential rollback

## Step 1: Pre-Migration Check
First, verify your S3 configuration is working:
```bash
node test-s3-connection.js
```

## Step 2: Run the Migration
Start the migration process:
```bash
node migrate-uploads-to-s3.js
```

The migration will:
- Process files in batches of 10
- Show real-time progress
- Save state after each batch (can be resumed if interrupted)
- Verify each file is accessible after upload
- Update all database references automatically

Expected duration: ~15-30 minutes depending on your internet speed

## Step 3: Verify the Migration
After migration completes, verify all files are accessible:
```bash
node verify-and-rollback-s3.js verify
```

This will check that every S3 URL is reachable and working.

## Step 4: Test the Application
1. Log into the CRM dashboard
2. Check that creator profile pictures display correctly
3. Verify content pages show their banners
4. Test that videos play properly in the creator app
5. Confirm custom content attachments are accessible

## If Something Goes Wrong

### To check migration status:
```bash
node verify-and-rollback-s3.js status
```

### To rollback to local files:
```bash
node verify-and-rollback-s3.js rollback
```
**Note**: Only rollback if local files still exist in `uploads/` directory

### To resume an interrupted migration:
Simply run the migration command again:
```bash
node migrate-uploads-to-s3.js
```
It will automatically resume from where it left off.

## Post-Migration Cleanup
Once you've verified everything is working correctly:
1. The `uploads/` directory can be safely removed to free 1.8GB
2. Keep the `s3-migration-backup.json` file for reference
3. The `migration-progress.json` can be deleted

## Important Files Created
- `migration-progress.json` - Tracks migration state (auto-generated)
- `s3-migration-backup.json` - Maps local files to S3 URLs (keep this!)

## Database Tables Updated
The migration will update file references in:
- `creators` - Profile images
- `content_inspiration_pages` - Banner images
- `page_banners` - Page banner images
- `inspo_page_content` - Content files
- `content_inspiration_items` - Videos and images
- `custom_contents` - Attachment arrays

## Support
If you encounter any issues:
1. The migration is fully resumable - just run it again
2. All uploads are verified before database updates
3. Full rollback is available if needed
4. Check the console output for specific error messages