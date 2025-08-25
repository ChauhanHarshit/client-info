// Advanced caching strategies without changing site logic

// HTTP cache optimization
export const httpCaching = {
  // Set cache headers for static resources
  optimizeStaticResourceCaching: () => {
    const resources = [
      { pattern: /\.(js|css|woff2|woff|ttf)$/, maxAge: 31536000 }, // 1 year
      { pattern: /\.(png|jpg|jpeg|gif|svg|ico)$/, maxAge: 2592000 }, // 30 days
      { pattern: /\.(json|xml)$/, maxAge: 86400 }, // 1 day
    ];

    return resources;
  },

  // Service worker cache strategies
  createCacheStrategies: () => {
    return {
      // Cache first for static assets
      cacheFirst: {
        urlPattern: /\.(js|css|woff2|png|jpg|jpeg|gif|svg)$/,
        strategy: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: {
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            maxEntries: 100
          }
        }
      },

      // Network first for API calls
      networkFirst: {
        urlPattern: /^https:\/\/.*\/api\//,
        strategy: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 5,
          expiration: {
            maxAgeSeconds: 5 * 60, // 5 minutes
            maxEntries: 50
          }
        }
      },

      // Stale while revalidate for pages
      staleWhileRevalidate: {
        urlPattern: /^https:\/\/.*\.(html|php)$/,
        strategy: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pages-cache',
          expiration: {
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
            maxEntries: 20
          }
        }
      }
    };
  }
};

// Browser storage optimization
export const browserStorage = {
  // Optimize localStorage usage
  optimizeLocalStorage: () => {
    const storage = {
      // Compressed storage with LZ compression-like approach
      setCompressed: (key: string, value: any) => {
        const compressed = JSON.stringify(value);
        // Simple compression: remove unnecessary spaces
        const compressedData = compressed.replace(/\s+/g, ' ');
        localStorage.setItem(key, compressedData);
      },

      getCompressed: (key: string) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      },

      // Storage quota management
      checkQuota: () => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          return navigator.storage.estimate();
        }
        return Promise.resolve({ usage: 0, quota: 0 });
      },

      // Clean old data
      cleanOldData: (maxAge: number = 7 * 24 * 60 * 60 * 1000) => { // 7 days
        const now = Date.now();
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            const data = localStorage.getItem(key);
            if (data) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.timestamp && now - parsed.timestamp > maxAge) {
                  localStorage.removeItem(key);
                }
              } catch (e) {
                // Remove invalid data
                localStorage.removeItem(key);
              }
            }
          }
        });
      }
    };

    return storage;
  },

  // IndexedDB caching for large data
  createIndexedDBCache: () => {
    const dbName = 'CRM_Cache';
    const dbVersion = 1;
    
    return {
      init: () => {
        return new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName, dbVersion);
          
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
          
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // Create object stores
            if (!db.objectStoreNames.contains('api_cache')) {
              const store = db.createObjectStore('api_cache', { keyPath: 'url' });
              store.createIndex('timestamp', 'timestamp');
            }
            
            if (!db.objectStoreNames.contains('user_data')) {
              db.createObjectStore('user_data', { keyPath: 'key' });
            }
          };
        });
      },

      set: async (storeName: string, key: string, value: any, ttl: number = 3600000) => {
        const db = await this.init();
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        await store.put({
          [storeName === 'api_cache' ? 'url' : 'key']: key,
          data: value,
          timestamp: Date.now(),
          ttl
        });
      },

      get: async (storeName: string, key: string) => {
        const db = await this.init();
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        return new Promise((resolve, reject) => {
          const request = store.get(key);
          request.onsuccess = () => {
            const result = request.result;
            if (result && Date.now() - result.timestamp < result.ttl) {
              resolve(result.data);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => reject(request.error);
        });
      }
    };
  }
};

// Memory caching optimization
export const memoryCache = {
  // LRU cache implementation
  createLRUCache: <T>(maxSize: number = 100) => {
    const cache = new Map<string, { value: T; timestamp: number }>();
    
    return {
      get: (key: string): T | null => {
        const item = cache.get(key);
        if (item) {
          // Move to end (most recently used)
          cache.delete(key);
          cache.set(key, item);
          return item.value;
        }
        return null;
      },

      set: (key: string, value: T) => {
        // Remove oldest if at capacity
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        
        cache.set(key, { value, timestamp: Date.now() });
      },

      has: (key: string): boolean => {
        return cache.has(key);
      },

      clear: () => {
        cache.clear();
      },

      size: () => cache.size
    };
  },

  // Memoization with TTL
  createMemoizedCache: <T extends (...args: any[]) => any>(
    fn: T,
    ttl: number = 300000 // 5 minutes
  ): T => {
    const cache = new Map<string, { result: ReturnType<T>; timestamp: number }>();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = JSON.stringify(args);
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.result;
      }
      
      const result = fn(...args);
      cache.set(key, { result, timestamp: Date.now() });
      
      return result;
    }) as T;
  }
};

// CDN and static asset caching
export const cdnOptimization = {
  // Optimize image URLs for CDN
  optimizeImageUrls: (urls: string[]) => {
    return urls.map(url => {
      if (url.includes('/uploads/')) {
        // Add CDN parameters for optimization
        const filename = url.split('/').pop();
        return `https://res.cloudinary.com/dlewnypg/image/upload/f_auto,q_auto,w_auto/${filename}`;
      }
      return url;
    });
  },

  // Preload critical assets
  preloadCriticalAssets: (assets: Array<{ url: string; type: 'image' | 'script' | 'style' }>) => {
    assets.forEach(asset => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = asset.type;
      link.href = asset.url;
      
      if (asset.type === 'script') {
        link.setAttribute('crossorigin', 'anonymous');
      }
      
      document.head.appendChild(link);
    });
  },

  // Resource hints for better performance
  addResourceHints: (domains: string[]) => {
    domains.forEach(domain => {
      // DNS prefetch
      const dnsLink = document.createElement('link');
      dnsLink.rel = 'dns-prefetch';
      dnsLink.href = `//${domain}`;
      document.head.appendChild(dnsLink);
      
      // Preconnect
      const connectLink = document.createElement('link');
      connectLink.rel = 'preconnect';
      connectLink.href = `https://${domain}`;
      connectLink.setAttribute('crossorigin', 'anonymous');
      document.head.appendChild(connectLink);
    });
  }
};

// Request optimization
export const requestOptimization = {
  // Batch multiple requests
  createRequestBatcher: (delay: number = 100) => {
    const batches = new Map<string, Array<{ resolve: Function; reject: Function; data: any }>>();
    
    return {
      batch: <T>(endpoint: string, data: any): Promise<T> => {
        return new Promise((resolve, reject) => {
          if (!batches.has(endpoint)) {
            batches.set(endpoint, []);
            
            setTimeout(() => {
              const batch = batches.get(endpoint);
              if (batch) {
                // Process batch
                const batchData = batch.map(item => item.data);
                
                // Make single request with batched data
                fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ batch: batchData })
                })
                .then(response => response.json())
                .then(results => {
                  batch.forEach((item, index) => {
                    item.resolve(results[index]);
                  });
                })
                .catch(error => {
                  batch.forEach(item => item.reject(error));
                });
                
                batches.delete(endpoint);
              }
            }, delay);
          }
          
          batches.get(endpoint)!.push({ resolve, reject, data });
        });
      }
    };
  },

  // Request deduplication
  createRequestDeduplicator: () => {
    const pendingRequests = new Map<string, Promise<any>>();
    
    return {
      deduplicate: <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
        if (pendingRequests.has(key)) {
          return pendingRequests.get(key)!;
        }
        
        const promise = requestFn().finally(() => {
          pendingRequests.delete(key);
        });
        
        pendingRequests.set(key, promise);
        return promise;
      }
    };
  }
};

// Complete caching strategy suite
export const cachingStrategies = {
  httpCaching,
  browserStorage,
  memoryCache,
  cdnOptimization,
  requestOptimization,

  // Initialize all caching strategies
  init: () => {
    // Initialize browser storage optimization
    const storage = browserStorage.optimizeLocalStorage();
    storage.cleanOldData();

    // Add CDN resource hints
    cdnOptimization.addResourceHints([
      'res.cloudinary.com',
      'fonts.googleapis.com',
      'cdnjs.cloudflare.com'
    ]);

    // Preload critical assets
    cdnOptimization.preloadCriticalAssets([
      { url: '/favicon.ico', type: 'image' },
      { url: '/api/auth/user', type: 'script' }
    ]);

    console.log('💾 Caching strategies initialized');
  }
};