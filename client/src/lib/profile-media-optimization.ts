/**
 * Profile Media Optimization System
 * Handles image optimization, lazy loading, and media caching for Profile tab
 */

// Media optimization configuration
const MEDIA_OPTIMIZATION_CONFIG = {
  IMAGE_CACHE_SIZE: 50,
  IMAGE_QUALITY: 0.8,
  LAZY_LOAD_THRESHOLD: 200,
  PRELOAD_DISTANCE: 500,
  COMPRESSION_QUALITY: 0.75,
  THUMBNAIL_SIZE: 150,
  LOADING_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  PROGRESSIVE_LOADING: true,
};

// Image cache with LRU eviction
class ProfileImageCache {
  private cache = new Map<string, { 
    image: HTMLImageElement; 
    timestamp: number; 
    size: number; 
    accessCount: number;
  }>();
  private totalSize = 0;
  private maxSize = MEDIA_OPTIMIZATION_CONFIG.IMAGE_CACHE_SIZE;
  
  set(url: string, image: HTMLImageElement) {
    // Estimate image size
    const size = this.estimateImageSize(image);
    
    // Remove existing entry if present
    if (this.cache.has(url)) {
      this.totalSize -= this.cache.get(url)!.size;
    }
    
    // Evict LRU entries if cache is full
    this.evictIfNeeded(size);
    
    this.cache.set(url, {
      image,
      timestamp: Date.now(),
      size,
      accessCount: 1
    });
    
    this.totalSize += size;
  }
  
  get(url: string): HTMLImageElement | null {
    const entry = this.cache.get(url);
    if (entry) {
      entry.accessCount++;
      entry.timestamp = Date.now();
      return entry.image;
    }
    return null;
  }
  
  private estimateImageSize(image: HTMLImageElement): number {
    return (image.naturalWidth || 150) * (image.naturalHeight || 150) * 4; // 4 bytes per pixel (RGBA)
  }
  
  private evictIfNeeded(requiredSize: number) {
    while (this.totalSize + requiredSize > this.maxSize * 1024 * 1024) { // Convert to bytes
      const lruKey = this.findLRUKey();
      if (lruKey) {
        const entry = this.cache.get(lruKey)!;
        this.totalSize -= entry.size;
        this.cache.delete(lruKey);
      } else {
        break;
      }
    }
  }
  
  private findLRUKey(): string | null {
    let lruKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        lruKey = key;
      }
    }
    
    return lruKey;
  }
  
  clear() {
    this.cache.clear();
    this.totalSize = 0;
  }
  
  getStats() {
    return {
      size: this.cache.size,
      totalSize: this.totalSize,
      hitRate: this.cache.size > 0 ? 
        Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.accessCount, 0) / this.cache.size : 0
    };
  }
}

// Progressive image loader
class ProgressiveImageLoader {
  private cache = new ProfileImageCache();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
  private observerRef: IntersectionObserver | null = null;
  
  constructor() {
    this.initializeIntersectionObserver();
  }
  
  private initializeIntersectionObserver() {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observerRef = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              if (src) {
                this.loadImage(src).then(loadedImg => {
                  img.src = loadedImg.src;
                  img.classList.add('loaded');
                });
              }
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: `${MEDIA_OPTIMIZATION_CONFIG.LAZY_LOAD_THRESHOLD}px`
        }
      );
    }
  }
  
  async loadImage(url: string): Promise<HTMLImageElement> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached) {
      return cached;
    }
    
    // Check if already loading
    const existingPromise = this.loadingPromises.get(url);
    if (existingPromise) {
      return existingPromise;
    }
    
    // Start loading
    const promise = this.loadImageWithRetry(url);
    this.loadingPromises.set(url, promise);
    
    try {
      const image = await promise;
      this.cache.set(url, image);
      return image;
    } finally {
      this.loadingPromises.delete(url);
    }
  }
  
  private async loadImageWithRetry(url: string): Promise<HTMLImageElement> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MEDIA_OPTIMIZATION_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        return await this.loadImageAttempt(url);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < MEDIA_OPTIMIZATION_CONFIG.RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError || new Error('Failed to load image');
  }
  
  private loadImageAttempt(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      const timeout = setTimeout(() => {
        reject(new Error('Image loading timeout'));
      }, MEDIA_OPTIMIZATION_CONFIG.LOADING_TIMEOUT);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }
  
  // Lazy load setup for images
  setupLazyLoading(img: HTMLImageElement, src: string) {
    if (this.observerRef) {
      img.dataset.src = src;
      img.classList.add('lazy-load');
      this.observerRef.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      img.src = src;
    }
  }
  
  // Preload images
  async preloadImages(urls: string[]) {
    const preloadPromises = urls.map(url => this.loadImage(url));
    return Promise.allSettled(preloadPromises);
  }
  
  // Generate optimized image URL
  getOptimizedImageUrl(originalUrl: string, width?: number, height?: number): string {
    if (!originalUrl) return '';
    
    // If it's already an optimized URL, return as-is
    if (originalUrl.includes('w=') || originalUrl.includes('h=')) {
      return originalUrl;
    }
    
    // Add optimization parameters
    const url = new URL(originalUrl, window.location.origin);
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', (MEDIA_OPTIMIZATION_CONFIG.IMAGE_QUALITY * 100).toString());
    
    return url.toString();
  }
  
  // Generate thumbnail URL
  getThumbnailUrl(originalUrl: string): string {
    return this.getOptimizedImageUrl(
      originalUrl, 
      MEDIA_OPTIMIZATION_CONFIG.THUMBNAIL_SIZE, 
      MEDIA_OPTIMIZATION_CONFIG.THUMBNAIL_SIZE
    );
  }
  
  // Clear cache
  clearCache() {
    this.cache.clear();
  }
  
  // Get cache statistics
  getCacheStats() {
    return this.cache.getStats();
  }
  
  // Cleanup
  destroy() {
    if (this.observerRef) {
      this.observerRef.disconnect();
    }
    this.clearCache();
    this.loadingPromises.clear();
  }
}

// Image compression utility
class ImageCompressor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }
  
  async compressImage(
    imageFile: File, 
    quality: number = MEDIA_OPTIMIZATION_CONFIG.COMPRESSION_QUALITY
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const { width, height } = this.calculateOptimalDimensions(img.width, img.height);
        
        // Set canvas size
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Draw and compress
        this.ctx.drawImage(img, 0, 0, width, height);
        
        this.canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(imageFile);
    });
  }
  
  private calculateOptimalDimensions(originalWidth: number, originalHeight: number) {
    const maxDimension = 1200; // Maximum dimension for profile images
    
    if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
      return { width: originalWidth, height: originalHeight };
    }
    
    const aspectRatio = originalWidth / originalHeight;
    
    if (originalWidth > originalHeight) {
      return {
        width: maxDimension,
        height: Math.round(maxDimension / aspectRatio)
      };
    } else {
      return {
        width: Math.round(maxDimension * aspectRatio),
        height: maxDimension
      };
    }
  }
  
  // Create multiple sizes for responsive images
  async createResponsiveImages(imageFile: File): Promise<{
    thumbnail: Blob;
    medium: Blob;
    large: Blob;
  }> {
    const [thumbnail, medium, large] = await Promise.all([
      this.compressToSize(imageFile, 150),
      this.compressToSize(imageFile, 400),
      this.compressToSize(imageFile, 800),
    ]);
    
    return { thumbnail, medium, large };
  }
  
  private async compressToSize(imageFile: File, maxSize: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const width = img.width > img.height ? maxSize : Math.round(maxSize * aspectRatio);
        const height = img.height > img.width ? maxSize : Math.round(maxSize / aspectRatio);
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        this.ctx.drawImage(img, 0, 0, width, height);
        
        this.canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          MEDIA_OPTIMIZATION_CONFIG.COMPRESSION_QUALITY
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  }
}

// Media prefetching system
class MediaPrefetcher {
  private prefetchQueue: string[] = [];
  private prefetched = new Set<string>();
  private loader = new ProgressiveImageLoader();
  
  // Add URLs to prefetch queue
  addToPrefetchQueue(urls: string[]) {
    urls.forEach(url => {
      if (!this.prefetched.has(url) && !this.prefetchQueue.includes(url)) {
        this.prefetchQueue.push(url);
      }
    });
    
    this.processPrefetchQueue();
  }
  
  // Process prefetch queue
  private async processPrefetchQueue() {
    if (this.prefetchQueue.length === 0) return;
    
    const batchSize = 3; // Prefetch in small batches
    const batch = this.prefetchQueue.splice(0, batchSize);
    
    const prefetchPromises = batch.map(async (url) => {
      try {
        await this.loader.loadImage(url);
        this.prefetched.add(url);
      } catch (error) {
        console.warn(`Failed to prefetch image: ${url}`, error);
      }
    });
    
    await Promise.allSettled(prefetchPromises);
    
    // Continue processing queue
    if (this.prefetchQueue.length > 0) {
      setTimeout(() => this.processPrefetchQueue(), 100);
    }
  }
  
  // Prefetch images based on scroll position
  prefetchBasedOnScroll(visibleImages: string[], allImages: string[]) {
    const currentIndex = allImages.findIndex(img => visibleImages.includes(img));
    const prefetchRange = 3; // Prefetch 3 images ahead
    
    const startIndex = Math.max(0, currentIndex - prefetchRange);
    const endIndex = Math.min(allImages.length, currentIndex + prefetchRange);
    
    const toPrefetch = allImages.slice(startIndex, endIndex);
    this.addToPrefetchQueue(toPrefetch);
  }
  
  // Clear prefetch data
  clear() {
    this.prefetchQueue = [];
    this.prefetched.clear();
  }
}

// Main media optimization interface
export class ProfileMediaOptimizer {
  private imageLoader = new ProgressiveImageLoader();
  private imageCompressor = new ImageCompressor();
  private mediaPrefetcher = new MediaPrefetcher();
  
  // Load optimized profile image
  async loadProfileImage(url: string): Promise<HTMLImageElement> {
    const optimizedUrl = this.imageLoader.getOptimizedImageUrl(url, 150, 150);
    return await this.imageLoader.loadImage(optimizedUrl);
  }
  
  // Setup lazy loading for profile images
  setupLazyLoading(img: HTMLImageElement, src: string) {
    const optimizedSrc = this.imageLoader.getOptimizedImageUrl(src, 150, 150);
    this.imageLoader.setupLazyLoading(img, optimizedSrc);
  }
  
  // Preload bookmark folder images
  async preloadBookmarkImages(bookmarkData: any[]) {
    const imageUrls = bookmarkData
      .filter(item => item.thumbnailUrl || item.imageUrl)
      .map(item => item.thumbnailUrl || item.imageUrl);
    
    await this.imageLoader.preloadImages(imageUrls);
  }
  
  // Compress uploaded profile image
  async compressProfileImage(file: File): Promise<Blob> {
    return await this.imageCompressor.compressImage(file);
  }
  
  // Create responsive profile images
  async createResponsiveProfileImages(file: File) {
    return await this.imageCompressor.createResponsiveImages(file);
  }
  
  // Setup prefetching for profile content
  setupPrefetching(profileData: any) {
    const imageUrls: string[] = [];
    
    // Add profile image
    if (profileData.profileImageUrl) {
      imageUrls.push(profileData.profileImageUrl);
    }
    
    // Add bookmark images
    if (profileData.bookmarks && profileData.bookmarks.folders) {
      profileData.bookmarks.folders.forEach((folder: any) => {
        if (folder.items) {
          folder.items.forEach((item: any) => {
            if (item.thumbnailUrl) imageUrls.push(item.thumbnailUrl);
            if (item.imageUrl) imageUrls.push(item.imageUrl);
          });
        }
      });
    }
    
    this.mediaPrefetcher.addToPrefetchQueue(imageUrls);
  }
  
  // Get optimization statistics
  getOptimizationStats() {
    return {
      imageCache: this.imageLoader.getCacheStats(),
      prefetchedCount: this.mediaPrefetcher['prefetched'].size,
      queueLength: this.mediaPrefetcher['prefetchQueue'].length,
    };
  }
  
  // Clear all caches
  clearAllCaches() {
    this.imageLoader.clearCache();
    this.mediaPrefetcher.clear();
  }
  
  // Cleanup resources
  destroy() {
    this.imageLoader.destroy();
    this.mediaPrefetcher.clear();
  }
}

// Export the main optimizer and utilities
export const profileMediaOptimizer = new ProfileMediaOptimizer();
export { MEDIA_OPTIMIZATION_CONFIG, ProfileImageCache, ProgressiveImageLoader, ImageCompressor, MediaPrefetcher };