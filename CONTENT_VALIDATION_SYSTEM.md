# Content Validation System

## Critical Requirements

### 1. Video Always Plays (No Black Screens)
- **Frontend Error Handling**: Videos that fail to load show clear error messages instead of black screens
- **File Verification**: Upload endpoints verify file existence and readability before accepting uploads
- **Graceful Fallbacks**: Invalid video files display error messages with debugging information

### 2. Correct Video Always Displays for Each Content Piece
- **Unique File Mapping**: Each content piece must have its own unique video file
- **No Cross-Contamination**: Videos cannot be shared between different content pieces
- **Upload Validation**: System prevents overwriting or mixing up video files

## Implementation Details

### Frontend Error Handling (✅ COMPLETED)
- Added comprehensive `onError` handlers to video elements
- Videos that fail to load display error screen with:
  - Warning icon and clear error message
  - File path for debugging
  - Content ID for identification
- Added loading and playback event logging for debugging

### Backend File Validation (✅ COMPLETED)
- **File Existence Check**: Verifies uploaded files actually exist on disk
- **Size Verification**: Confirms file size matches upload size
- **Video Readability Test**: For videos, tests that file can be read and is not empty
- **File Verification API**: `/api/verify-file/*` endpoint to check file accessibility

### Upload System Enhancements (✅ COMPLETED)
- Enhanced logging for upload debugging
- Comprehensive error responses with debug information
- File path and size validation before accepting uploads

## Database Validation Rules

### Content-Video Mapping Rules
1. **Unique Assignment**: Each `inspo_page_content` record must have unique `file_url`
2. **No Duplicates**: Same video file cannot be used for multiple content pieces
3. **Proper Validation**: Before saving content, verify the video file exists and is accessible

## Testing Requirements

### Before Deployment
1. **Upload Test**: Upload new video content and verify it displays correctly
2. **Error Test**: Try accessing content with missing video files to verify error handling
3. **Unique Content Test**: Verify different content pieces show different videos

### User Testing Steps
1. Upload different video files for each content piece
2. Verify each piece shows its own unique video
3. Test video playback in Creator App Feed
4. Confirm no black screens or wrong videos display

## Debugging Tools

### Video File Verification
```bash
# Check if video file exists
ls -la uploads/[filename].mov

# Verify file is not empty
wc -c uploads/[filename].mov

# Check database mapping
SELECT id, title, file_url FROM inspo_page_content WHERE title IN ('ContentName1', 'ContentName2');
```

### Frontend Debug Logging
- All video load events are logged to browser console
- Error messages show specific file paths and content IDs
- Upload responses include validation details

## Resolution Process

When video display issues occur:

1. **Check Console Logs**: Look for video loading errors and file paths
2. **Verify Files Exist**: Use file verification API or check uploads directory
3. **Check Database Mapping**: Ensure content points to correct unique files
4. **Test Upload System**: Verify new uploads work correctly
5. **Update Content**: If necessary, re-upload videos for specific content pieces

## Success Criteria

✅ **No Black Screens**: All video failures show clear error messages
✅ **Unique Videos**: Each content piece displays its own uploaded video
✅ **Proper Upload**: New video uploads work correctly and persist
✅ **Error Recovery**: System provides debugging information for troubleshooting