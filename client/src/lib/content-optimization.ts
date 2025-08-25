/**
 * Content Optimization System
 * Optimizes content loading, caching, and delivery without altering functionality
 */

// Content Prefetching System
export class ContentPrefetcher {
  private prefetchCache = new Map<string, Promise<any>>();
  private prefetchQueue: string[] = [];
  private maxCacheSize = 50;
  private isProcessing = false;

  init() {
    this.setupIntersectionObserver();
    this.processQueue();
  }

  private setupIntersectionObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const contentId = element.dataset.contentId;
            if (contentId) {
              this.prefetchContent(contentId);
            }
          }
        });
      },
      { rootMargin: '100px' }
    );

    // Observe all content containers
    document.querySelectorAll('[data-content-id]').forEach(el => {
      observer.observe(el);
    });
  }

  prefetchContent(contentId: string): Promise<any> {
    if (this.prefetchCache.has(contentId)) {
      return this.prefetchCache.get(contentId)!;
    }

    const promise = this.fetchContent(contentId);
    this.prefetchCache.set(contentId, promise);
    this.manageCacheSize();
    
    return promise;
  }

  private async fetchContent(contentId: string): Promise<any> {
    try {
      const response = await fetch(`/api/content/${contentId}/prefetch`);
      if (!response.ok) throw new Error('Prefetch failed');
      return await response.json();
    } catch (error) {
      console.warn('Content prefetch failed:', error);
      return null;
    }
  }

  private manageCacheSize() {
    if (this.prefetchCache.size > this.maxCacheSize) {
      const oldestKey = this.prefetchCache.keys().next().value;
      this.prefetchCache.delete(oldestKey);
    }
  }

  private processQueue() {
    if (this.isProcessing || this.prefetchQueue.length === 0) return;

    this.isProcessing = true;
    const contentId = this.prefetchQueue.shift();
    
    if (contentId) {
      this.prefetchContent(contentId).finally(() => {
        this.isProcessing = false;
        setTimeout(() => this.processQueue(), 100);
      });
    }
  }

  queuePrefetch(contentId: string) {
    if (!this.prefetchQueue.includes(contentId)) {
      this.prefetchQueue.push(contentId);
    }
  }

  getCachedContent(contentId: string): Promise<any> | null {
    return this.prefetchCache.get(contentId) || null;
  }

  clearCache() {
    this.prefetchCache.clear();
  }
}

// Video Optimization System
export class VideoOptimizer {
  private videoCache = new Map<string, HTMLVideoElement>();
  private thumbnailCache = new Map<string, string>();
  private preloadQueue: string[] = [];
  private qualityMap = new Map<string, string>();

  init() {
    this.detectNetworkConditions();
    this.setupVideoPreloading();
  }

  private detectNetworkConditions() {
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      
      // Set quality based on connection
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          this.qualityMap.set('default', 'low');
          break;
        case '3g':
          this.qualityMap.set('default', 'medium');
          break;
        case '4g':
        default:
          this.qualityMap.set('default', 'high');
          break;
      }
    }
  }

  private setupVideoPreloading() {
    setInterval(() => {
      this.processPreloadQueue();
    }, 500);
  }

  private processPreloadQueue() {
    if (this.preloadQueue.length === 0) return;

    const videoUrl = this.preloadQueue.shift();
    if (videoUrl && !this.videoCache.has(videoUrl)) {
      this.preloadVideoInternal(videoUrl);
    }
  }

  private preloadVideoInternal(videoUrl: string) {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = this.optimizeVideoUrl(videoUrl);
    
    video.addEventListener('loadedmetadata', () => {
      this.videoCache.set(videoUrl, video);
      this.generateThumbnail(video, videoUrl);
    });
    
    video.addEventListener('error', () => {
      console.warn('Video preload failed:', videoUrl);
    });
  }

  private optimizeVideoUrl(originalUrl: string): string {
    const quality = this.qualityMap.get('default') || 'high';
    
    // Apply quality-based optimization
    if (originalUrl.includes('cloudinary.com')) {
      return originalUrl.replace('/upload/', `/upload/q_${quality === 'low' ? '30' : quality === 'medium' ? '60' : '80'}/`);
    }
    
    return originalUrl;
  }

  private generateThumbnail(video: HTMLVideoElement, videoUrl: string) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    video.currentTime = 1; // Seek to 1 second
    
    video.addEventListener('seeked', () => {
      ctx.drawImage(video, 0, 0);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      this.thumbnailCache.set(videoUrl, thumbnail);
    });
  }

  preloadVideo(videoUrl: string) {
    if (!this.preloadQueue.includes(videoUrl) && !this.videoCache.has(videoUrl)) {
      this.preloadQueue.push(videoUrl);
    }
  }

  getCachedVideo(videoUrl: string): HTMLVideoElement | null {
    return this.videoCache.get(videoUrl) || null;
  }

  getThumbnail(videoUrl: string): string | null {
    return this.thumbnailCache.get(videoUrl) || null;
  }

  optimizeVideoElement(videoElement: HTMLVideoElement) {
    // Add loading optimization
    videoElement.preload = 'metadata';
    
    // Add error handling
    videoElement.addEventListener('error', () => {
      this.handleVideoError(videoElement);
    });
    
    // Add loading indicators
    videoElement.addEventListener('loadstart', () => {
      videoElement.parentElement?.classList.add('loading');
    });
    
    videoElement.addEventListener('loadeddata', () => {
      videoElement.parentElement?.classList.remove('loading');
      videoElement.parentElement?.classList.add('loaded');
    });
  }

  private handleVideoError(videoElement: HTMLVideoElement) {
    const fallbackUrl = videoElement.dataset.fallback;
    if (fallbackUrl && videoElement.src !== fallbackUrl) {
      videoElement.src = fallbackUrl;
    } else {
      videoElement.parentElement?.classList.add('error');
    }
  }
}

// Image Optimization System
export class ImageOptimizer {
  private imageCache = new Map<string, HTMLImageElement>();
  private loadingQueue: { url: string; element: HTMLImageElement }[] = [];
  private isProcessing = false;
  private maxConcurrentLoads = 3;
  private activeLoads = 0;

  init() {
    this.setupIntersectionObserver();
    this.processLoadingQueue();
  }

  private setupIntersectionObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              this.loadImage(img, src);
              observer.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    // Observe all lazy images
    document.querySelectorAll('img[data-src]').forEach(img => {
      observer.observe(img);
    });
  }

  private processLoadingQueue() {
    if (this.activeLoads >= this.maxConcurrentLoads || this.loadingQueue.length === 0) {
      setTimeout(() => this.processLoadingQueue(), 100);
      return;
    }

    const item = this.loadingQueue.shift();
    if (!item) return;

    this.activeLoads++;
    this.processImageLoad(item).finally(() => {
      this.activeLoads--;
      this.processLoadingQueue();
    });
  }

  private async processImageLoad({ url, element }: { url: string; element: HTMLImageElement }) {
    try {
      const optimizedUrl = this.optimizeImageUrl(url);
      
      if (this.imageCache.has(optimizedUrl)) {
        const cached = this.imageCache.get(optimizedUrl)!;
        element.src = cached.src;
        element.classList.add('loaded');
        return;
      }

      const img = new Image();
      img.onload = () => {
        element.src = optimizedUrl;
        element.classList.add('loaded');
        this.imageCache.set(optimizedUrl, img);
      };
      
      img.onerror = () => {
        element.classList.add('error');
        this.handleImageError(element, url);
      };
      
      img.src = optimizedUrl;
    } catch (error) {
      element.classList.add('error');
      console.warn('Image optimization failed:', error);
    }
  }

  private optimizeImageUrl(originalUrl: string): string {
    // Apply automatic format and quality optimization
    if (originalUrl.includes('cloudinary.com')) {
      return originalUrl.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    
    // For local images, we could add format conversion here
    return originalUrl;
  }

  private handleImageError(element: HTMLImageElement, originalUrl: string) {
    const fallbackUrl = element.dataset.fallback;
    if (fallbackUrl && element.src !== fallbackUrl) {
      element.src = fallbackUrl;
    } else {
      // Show placeholder or error state
      element.alt = 'Image failed to load';
    }
  }

  loadImage(element: HTMLImageElement, url: string) {
    this.loadingQueue.push({ url, element });
  }

  preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const optimizedUrl = this.optimizeImageUrl(url);
      
      if (this.imageCache.has(optimizedUrl)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.imageCache.set(optimizedUrl, img);
        resolve();
      };
      img.onerror = reject;
      img.src = optimizedUrl;
    });
  }

  generateWebPVersion(imageUrl: string): string {
    if (this.supportsWebP()) {
      return imageUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    return imageUrl;
  }

  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }
}

// Content Delivery Optimization
export class ContentDeliveryOptimizer {
  private cdnUrls = new Map<string, string>();
  private compressionCache = new Map<string, any>();
  private deliveryMetrics = new Map<string, number[]>();

  init() {
    this.setupCDNMapping();
    this.monitorDeliveryPerformance();
  }

  private setupCDNMapping() {
    // Map local URLs to CDN URLs
    const cdnBase = 'https://cdn.example.com';
    
    this.cdnUrls.set('/uploads/', `${cdnBase}/uploads/`);
    this.cdnUrls.set('/assets/', `${cdnBase}/assets/`);
    this.cdnUrls.set('/images/', `${cdnBase}/images/`);
  }

  private monitorDeliveryPerformance() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('/uploads/') || entry.name.includes('/assets/')) {
          this.recordDeliveryMetric(entry.name, entry.duration);
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }

  private recordDeliveryMetric(url: string, duration: number) {
    if (!this.deliveryMetrics.has(url)) {
      this.deliveryMetrics.set(url, []);
    }
    
    const metrics = this.deliveryMetrics.get(url)!;
    metrics.push(duration);
    
    // Keep only last 10 measurements
    if (metrics.length > 10) {
      metrics.shift();
    }
  }

  optimizeUrl(originalUrl: string): string {
    // Check for CDN mapping
    for (const [path, cdnUrl] of this.cdnUrls) {
      if (originalUrl.includes(path)) {
        return originalUrl.replace(path, cdnUrl);
      }
    }
    
    return originalUrl;
  }

  compressContent(content: string): string {
    // Simple compression for text content
    if (this.compressionCache.has(content)) {
      return this.compressionCache.get(content);
    }
    
    // Basic compression (in real implementation, use proper compression)
    const compressed = content.replace(/\s+/g, ' ').trim();
    this.compressionCache.set(content, compressed);
    
    return compressed;
  }

  getBestDeliveryUrl(urls: string[]): string {
    if (urls.length === 1) return urls[0];
    
    // Find URL with best performance
    let bestUrl = urls[0];
    let bestPerformance = Infinity;
    
    for (const url of urls) {
      const metrics = this.deliveryMetrics.get(url);
      if (metrics && metrics.length > 0) {
        const avgDuration = metrics.reduce((a, b) => a + b, 0) / metrics.length;
        if (avgDuration < bestPerformance) {
          bestPerformance = avgDuration;
          bestUrl = url;
        }
      }
    }
    
    return bestUrl;
  }

  preloadCriticalContent(urls: string[]) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = this.optimizeUrl(url);
      
      if (url.includes('.css')) {
        link.as = 'style';
      } else if (url.includes('.js')) {
        link.as = 'script';
      } else if (url.includes('.woff')) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
    });
  }
}

// Export all content optimizers
export const contentOptimizer = {
  prefetcher: new ContentPrefetcher(),
  videoOptimizer: new VideoOptimizer(),
  imageOptimizer: new ImageOptimizer(),
  deliveryOptimizer: new ContentDeliveryOptimizer(),
  
  // Initialize all optimizers
  init() {
    this.prefetcher.init();
    this.videoOptimizer.init();
    this.imageOptimizer.init();
    this.deliveryOptimizer.init();
  }
};