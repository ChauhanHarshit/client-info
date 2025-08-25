import fs from 'fs';
import path from 'path';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  fileExists?: boolean;
  isDuplicate?: boolean;
  quarantineReason?: string;
}

interface ContentItem {
  id: number;
  file_url: string;
  page_id: number;
  title: string;
}

export class ContentValidator {
  private static quarantinedFiles: Set<string> = new Set();
  
  /**
   * Validate video file for upload/creation
   */
  static async validateMediaFile(
    filePath: string, 
    pageId: number,
    existingContent: ContentItem[] = []
  ): Promise<ValidationResult> {
    
    // Check if file exists
    const fileExists = await this.checkFileExists(filePath);
    if (!fileExists) {
      return {
        isValid: false,
        error: 'Video file does not exist on disk',
        fileExists: false,
        quarantineReason: 'MISSING_FILE'
      };
    }

    // Check for duplicates within same page
    const isDuplicateInPage = this.checkDuplicateInPage(filePath, pageId, existingContent);
    if (isDuplicateInPage) {
      return {
        isValid: false,
        error: 'Duplicate video file already exists on this page',
        isDuplicate: true,
        quarantineReason: 'DUPLICATE_IN_PAGE'
      };
    }

    // Check if file is quarantined
    if (this.quarantinedFiles.has(filePath)) {
      return {
        isValid: false,
        error: 'File is quarantined due to previous validation failures',
        quarantineReason: 'QUARANTINED'
      };
    }

    // Validate file extension
    const validExtensions = ['.mov', '.mp4', '.avi', '.mkv', '.webm'];
    const fileExtension = path.extname(filePath).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed: ${validExtensions.join(', ')}`,
        quarantineReason: 'INVALID_FORMAT'
      };
    }

    // Validate URL format
    if (!filePath.startsWith('/uploads/') && !filePath.startsWith('http')) {
      return {
        isValid: false,
        error: 'Invalid file URL format. Must start with /uploads/ or http',
        quarantineReason: 'INVALID_URL_FORMAT'
      };
    }

    return { isValid: true, fileExists: true };
  }

  /**
   * Check if file exists on disk
   */
  private static async checkFileExists(filePath: string): Promise<boolean> {
    if (filePath.startsWith('http')) return true; // External URLs assumed valid
    
    const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check for duplicate files within the same page
   */
  private static checkDuplicateInPage(
    filePath: string, 
    pageId: number, 
    existingContent: ContentItem[]
  ): boolean {
    return existingContent.some(item => 
      item.file_url === filePath && item.page_id === pageId
    );
  }

  /**
   * Add file to quarantine
   */
  static quarantineFile(filePath: string, reason: string): void {
    this.quarantinedFiles.add(filePath);
    this.logQuarantine(filePath, reason);
  }

  /**
   * Remove file from quarantine
   */
  static releaseFromQuarantine(filePath: string): void {
    this.quarantinedFiles.delete(filePath);
    this.logRelease(filePath);
  }

  /**
   * Get all quarantined files
   */
  static getQuarantinedFiles(): string[] {
    return Array.from(this.quarantinedFiles);
  }

  /**
   * Log quarantine action
   */
  private static logQuarantine(filePath: string, reason: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[QUARANTINE] ${timestamp} - File quarantined: ${filePath} - Reason: ${reason}`);
    
    // Append to cleanup log
    const logEntry = `\n## Quarantine Action\n- **Time**: ${timestamp}\n- **File**: ${filePath}\n- **Reason**: ${reason}\n- **Status**: QUARANTINED\n`;
    
    try {
      fs.appendFileSync('CLEANUP_LOG.md', logEntry);
    } catch (error) {
      console.error('Failed to write to cleanup log:', error);
    }
  }

  /**
   * Log release action
   */
  private static logRelease(filePath: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[RELEASE] ${timestamp} - File released from quarantine: ${filePath}`);
    
    const logEntry = `\n## Release Action\n- **Time**: ${timestamp}\n- **File**: ${filePath}\n- **Status**: RELEASED\n`;
    
    try {
      fs.appendFileSync('CLEANUP_LOG.md', logEntry);
    } catch (error) {
      console.error('Failed to write to cleanup log:', error);
    }
  }

  /**
   * Scan existing database content for issues
   */
  static async scanExistingContent(): Promise<{
    broken: ContentItem[];
    duplicates: Map<string, ContentItem[]>;
    invalid: ContentItem[];
  }> {
    // This would be called with database content
    // Implementation depends on database query results
    return {
      broken: [],
      duplicates: new Map(),
      invalid: []
    };
  }
}

/**
 * Middleware for Express routes to validate uploads
 */
export const validateUploadMiddleware = async (req: any, res: any, next: any) => {
  if (!req.file) {
    return next();
  }

  const filePath = `/uploads/${req.file.filename}`;
  const pageId = req.params.id || req.body.pageId;
  
  const validation = await ContentValidator.validateMediaFile(filePath, pageId);
  
  if (!validation.isValid) {
    // Remove uploaded file if validation fails
    try {
      await fs.promises.unlink(req.file.path);
    } catch (error) {
      console.error('Failed to cleanup invalid upload:', error);
    }
    
    // Quarantine the file path
    ContentValidator.quarantineFile(filePath, validation.quarantineReason || 'VALIDATION_FAILED');
    
    return res.status(400).json({
      error: validation.error,
      quarantineReason: validation.quarantineReason
    });
  }

  next();
};