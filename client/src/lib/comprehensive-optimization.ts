/**
 * Comprehensive CRM & Creator App Optimization System
 * Provides transparent performance enhancements without altering existing functionality
 */

// Virtual Scrolling for Large Content Lists
export class VirtualScrollManager {
  private container: HTMLElement | null = null;
  private itemHeight = 100;
  private visibleItems = 10;
  private scrollBuffer = 5;
  private items: any[] = [];
  private renderedItems = new Map<number, HTMLElement>();

  init(container: HTMLElement, items: any[], itemHeight = 100) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight);
    this.setupVirtualScroll();
  }

  private setupVirtualScroll() {
    if (!this.container) return;
    
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
    this.renderVisibleItems();
  }

  private handleScroll() {
    if (!this.container) return;
    
    const scrollTop = this.container.scrollTop;
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + this.visibleItems + this.scrollBuffer, this.items.length);
    
    this.renderVisibleItems(startIndex, endIndex);
  }

  private renderVisibleItems(startIndex = 0, endIndex = this.visibleItems) {
    // Clear existing items
    this.renderedItems.forEach((element, index) => {
      if (index < startIndex || index >= endIndex) {
        element.remove();
        this.renderedItems.delete(index);
      }
    });

    // Render new items
    for (let i = startIndex; i < endIndex; i++) {
      if (!this.renderedItems.has(i)) {
        const item = this.createItemElement(this.items[i], i);
        this.renderedItems.set(i, item);
        this.container?.appendChild(item);
      }
    }
  }

  private createItemElement(item: any, index: number): HTMLElement {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.top = `${index * this.itemHeight}px`;
    element.style.height = `${this.itemHeight}px`;
    element.style.width = '100%';
    return element;
  }

  updateItems(newItems: any[]) {
    this.items = newItems;
    this.renderedItems.clear();
    this.renderVisibleItems();
  }
}

// Database Query Optimization
export class QueryOptimizer {
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private batchQueue = new Map<string, any[]>();
  private batchTimeout: NodeJS.Timeout | null = null;

  // Batch multiple queries together
  batchQuery(endpoint: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const key = `${endpoint}:${JSON.stringify(params)}`;
      
      if (!this.batchQueue.has(endpoint)) {
        this.batchQueue.set(endpoint, []);
      }
      
      this.batchQueue.get(endpoint)!.push({ params, resolve, reject });
      
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, 10); // 10ms batch window
    });
  }

  private async processBatch() {
    const batches = Array.from(this.batchQueue.entries());
    this.batchQueue.clear();
    
    for (const [endpoint, requests] of batches) {
      try {
        const batchParams = requests.map(r => r.params);
        const results = await this.executeBatchQuery(endpoint, batchParams);
        
        requests.forEach((request, index) => {
          request.resolve(results[index]);
        });
      } catch (error) {
        requests.forEach(request => {
          request.reject(error);
        });
      }
    }
  }

  private async executeBatchQuery(endpoint: string, params: any[]): Promise<any[]> {
    const response = await fetch(`/api/batch/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: params })
    });
    
    if (!response.ok) {
      throw new Error(`Batch query failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Intelligent query caching
  cacheQuery(key: string, data: any, ttl = 300000) { // 5 minute default
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getCachedQuery(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  invalidateCache(pattern: string) {
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }
}

// File Upload Optimization
export class UploadOptimizer {
  private chunkSize = 1024 * 1024; // 1MB chunks
  private maxConcurrentUploads = 3;
  private uploadQueue: any[] = [];
  private activeUploads = 0;

  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      this.uploadQueue.push({ file, onProgress, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.activeUploads >= this.maxConcurrentUploads || this.uploadQueue.length === 0) {
      return;
    }

    const upload = this.uploadQueue.shift();
    if (!upload) return;

    this.activeUploads++;
    
    try {
      const result = await this.processChunkedUpload(upload);
      upload.resolve(result);
    } catch (error) {
      upload.reject(error);
    } finally {
      this.activeUploads--;
      this.processQueue();
    }
  }

  private async processChunkedUpload({ file, onProgress }: any): Promise<string> {
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('filename', file.name);
      
      const response = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Chunk upload failed: ${response.statusText}`);
      }
      
      const progress = ((chunkIndex + 1) / totalChunks) * 100;
      onProgress?.(progress);
    }
    
    // Complete the upload
    const completeResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, filename: file.name })
    });
    
    if (!completeResponse.ok) {
      throw new Error(`Upload completion failed: ${completeResponse.statusText}`);
    }
    
    const result = await completeResponse.json();
    return result.fileUrl;
  }
}

// Media Optimization
export class MediaOptimizer {
  private imageCache = new Map<string, HTMLImageElement>();
  private videoCache = new Map<string, HTMLVideoElement>();
  private preloadQueue: string[] = [];
  private observer: IntersectionObserver | null = null;

  init() {
    this.setupIntersectionObserver();
    this.setupImagePreloading();
  }

  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadMedia(entry.target as HTMLElement);
          }
        });
      },
      { rootMargin: '50px' }
    );
  }

  private setupImagePreloading() {
    // Preload images based on user scroll direction
    const preloadImages = () => {
      const imagesToPreload = this.preloadQueue.splice(0, 3);
      imagesToPreload.forEach(src => {
        if (!this.imageCache.has(src)) {
          const img = new Image();
          img.src = src;
          this.imageCache.set(src, img);
        }
      });
    };

    setInterval(preloadImages, 100);
  }

  private loadMedia(element: HTMLElement) {
    const src = element.dataset.src;
    if (!src) return;

    if (element.tagName === 'IMG') {
      this.loadImage(element as HTMLImageElement, src);
    } else if (element.tagName === 'VIDEO') {
      this.loadVideo(element as HTMLVideoElement, src);
    }
  }

  private loadImage(img: HTMLImageElement, src: string) {
    if (this.imageCache.has(src)) {
      img.src = src;
      img.classList.add('loaded');
      return;
    }

    const cached = new Image();
    cached.onload = () => {
      img.src = src;
      img.classList.add('loaded');
      this.imageCache.set(src, cached);
    };
    cached.src = src;
  }

  private loadVideo(video: HTMLVideoElement, src: string) {
    if (this.videoCache.has(src)) {
      video.src = src;
      video.classList.add('loaded');
      return;
    }

    video.src = src;
    video.addEventListener('loadeddata', () => {
      video.classList.add('loaded');
      this.videoCache.set(src, video);
    });
  }

  observeElement(element: HTMLElement) {
    this.observer?.observe(element);
  }

  addToPreloadQueue(src: string) {
    if (!this.preloadQueue.includes(src)) {
      this.preloadQueue.push(src);
    }
  }

  generateThumbnail(videoElement: HTMLVideoElement): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      videoElement.addEventListener('loadeddata', () => {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx?.drawImage(videoElement, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      });
    });
  }
}

// Search Optimization
export class SearchOptimizer {
  private searchCache = new Map<string, any[]>();
  private searchIndex = new Map<string, Set<number>>();
  private debounceTimer: NodeJS.Timeout | null = null;

  buildIndex(items: any[], searchableFields: string[]) {
    this.searchIndex.clear();
    
    items.forEach((item, index) => {
      searchableFields.forEach(field => {
        const value = item[field]?.toString().toLowerCase() || '';
        const words = value.split(/\s+/);
        
        words.forEach(word => {
          if (word.length > 2) {
            if (!this.searchIndex.has(word)) {
              this.searchIndex.set(word, new Set());
            }
            this.searchIndex.get(word)!.add(index);
          }
        });
      });
    });
  }

  search(query: string, items: any[], callback: (results: any[]) => void) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const results = this.performSearch(query, items);
      callback(results);
    }, 300);
  }

  private performSearch(query: string, items: any[]): any[] {
    const cacheKey = query.toLowerCase();
    
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    if (words.length === 0) return items;

    let matchingIndices = new Set<number>();
    
    words.forEach((word, index) => {
      const wordMatches = new Set<number>();
      
      for (const [indexWord, indices] of this.searchIndex) {
        if (indexWord.includes(word)) {
          indices.forEach(idx => wordMatches.add(idx));
        }
      }
      
      if (index === 0) {
        matchingIndices = wordMatches;
      } else {
        matchingIndices = new Set([...matchingIndices].filter(idx => wordMatches.has(idx)));
      }
    });

    const results = Array.from(matchingIndices).map(idx => items[idx]);
    this.searchCache.set(cacheKey, results);
    
    return results;
  }

  clearCache() {
    this.searchCache.clear();
  }
}

// Network Optimization
export class NetworkOptimizer {
  private requestQueue: any[] = [];
  private isProcessing = false;
  private connectionType: string = 'unknown';

  init() {
    this.detectConnectionType();
    this.setupRequestBatching();
  }

  private detectConnectionType() {
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      this.connectionType = connection.effectiveType || connection.type || 'unknown';
    }
  }

  private setupRequestBatching() {
    setInterval(() => {
      if (!this.isProcessing && this.requestQueue.length > 0) {
        this.processBatchRequests();
      }
    }, 50);
  }

  private async processBatchRequests() {
    if (this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    const batch = this.requestQueue.splice(0, 10); // Process 10 at a time
    
    try {
      const promises = batch.map(request => this.executeRequest(request));
      await Promise.all(promises);
    } catch (error) {
      console.error('Batch request processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeRequest(request: any) {
    const { url, options, resolve, reject } = request;
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      resolve(data);
    } catch (error) {
      reject(error);
    }
  }

  queueRequest(url: string, options: RequestInit = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ url, options, resolve, reject });
    });
  }

  getOptimalImageQuality(): number {
    switch (this.connectionType) {
      case 'slow-2g':
      case '2g':
        return 0.3;
      case '3g':
        return 0.6;
      case '4g':
      default:
        return 0.8;
    }
  }

  shouldPreload(): boolean {
    return !['slow-2g', '2g'].includes(this.connectionType);
  }
}

// Background Processing
export class BackgroundProcessor {
  private workerPool: Worker[] = [];
  private taskQueue: any[] = [];
  private maxWorkers = navigator.hardwareConcurrency || 4;

  init() {
    this.createWorkerPool();
  }

  private createWorkerPool() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(new URL('./background-worker.js', import.meta.url));
      this.workerPool.push(worker);
    }
  }

  processTask(task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.assignTask();
    });
  }

  private assignTask() {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workerPool.find(worker => !worker.busy);
    if (!availableWorker) return;

    const { task, resolve, reject } = this.taskQueue.shift();
    (availableWorker as any).busy = true;

    availableWorker.postMessage(task);
    
    availableWorker.onmessage = (event) => {
      (availableWorker as any).busy = false;
      resolve(event.data);
      this.assignTask();
    };

    availableWorker.onerror = (error) => {
      (availableWorker as any).busy = false;
      reject(error);
      this.assignTask();
    };
  }
}

// Export all optimizers
export const comprehensiveOptimizer = {
  virtualScroll: new VirtualScrollManager(),
  queryOptimizer: new QueryOptimizer(),
  uploadOptimizer: new UploadOptimizer(),
  mediaOptimizer: new MediaOptimizer(),
  searchOptimizer: new SearchOptimizer(),
  networkOptimizer: new NetworkOptimizer(),
  backgroundProcessor: new BackgroundProcessor(),
  
  // Initialize all optimizers
  init() {
    this.mediaOptimizer.init();
    this.networkOptimizer.init();
    this.backgroundProcessor.init();
  }
};