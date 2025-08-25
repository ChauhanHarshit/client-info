/**
 * UI Performance Optimization System
 * Enhances user interface responsiveness without altering existing functionality
 */

// Skeleton Loading System
export class SkeletonLoader {
  private static skeletonStyles = `
    .skeleton {
      animation: skeleton-loading 1.5s infinite ease-in-out;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
    }
    
    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .skeleton-text {
      height: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 4px;
    }
    
    .skeleton-avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
    }
    
    .skeleton-card {
      height: 8rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    
    .skeleton-button {
      height: 2.5rem;
      width: 6rem;
      border-radius: 6px;
    }
  `;

  static init() {
    // Add skeleton styles to page
    const style = document.createElement('style');
    style.textContent = this.skeletonStyles;
    document.head.appendChild(style);
  }

  static createSkeleton(type: 'text' | 'avatar' | 'card' | 'button', count = 1): HTMLElement {
    const container = document.createElement('div');
    
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = `skeleton skeleton-${type}`;
      container.appendChild(skeleton);
    }
    
    return container;
  }

  static replaceSkeleton(skeletonElement: HTMLElement, realElement: HTMLElement) {
    skeletonElement.parentNode?.replaceChild(realElement, skeletonElement);
  }
}

// Optimistic Updates
export class OptimisticUpdater {
  private pendingUpdates = new Map<string, any>();
  private rollbackData = new Map<string, any>();

  performOptimisticUpdate(id: string, updateFn: () => void, rollbackFn: () => void) {
    // Store rollback data
    this.rollbackData.set(id, rollbackFn);
    
    // Perform optimistic update
    updateFn();
    
    // Mark as pending
    this.pendingUpdates.set(id, Date.now());
  }

  confirmUpdate(id: string) {
    this.pendingUpdates.delete(id);
    this.rollbackData.delete(id);
  }

  rollbackUpdate(id: string) {
    const rollbackFn = this.rollbackData.get(id);
    if (rollbackFn) {
      rollbackFn();
      this.pendingUpdates.delete(id);
      this.rollbackData.delete(id);
    }
  }

  getPendingUpdates(): string[] {
    return Array.from(this.pendingUpdates.keys());
  }
}

// Debounced Input Handler
export class DebouncedInputHandler {
  private timers = new Map<string, NodeJS.Timeout>();

  handleInput(id: string, callback: () => void, delay = 300) {
    // Clear existing timer
    const existingTimer = this.timers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);

    this.timers.set(id, timer);
  }

  clearTimer(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  clearAllTimers() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

// Progressive Loading
export class ProgressiveLoader {
  private loadingQueue: { element: HTMLElement; loader: () => Promise<any> }[] = [];
  private isProcessing = false;
  private concurrentLoads = 3;
  private activeLoads = 0;

  addToQueue(element: HTMLElement, loader: () => Promise<any>) {
    this.loadingQueue.push({ element, loader });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.activeLoads >= this.concurrentLoads) return;
    
    const item = this.loadingQueue.shift();
    if (!item) return;

    this.activeLoads++;
    
    try {
      await item.loader();
      item.element.classList.add('loaded');
    } catch (error) {
      item.element.classList.add('error');
      console.error('Progressive loading failed:', error);
    } finally {
      this.activeLoads--;
      this.processQueue();
    }
  }

  setPriority(element: HTMLElement, priority: 'high' | 'normal' | 'low') {
    const index = this.loadingQueue.findIndex(item => item.element === element);
    if (index === -1) return;

    const item = this.loadingQueue.splice(index, 1)[0];
    
    switch (priority) {
      case 'high':
        this.loadingQueue.unshift(item);
        break;
      case 'normal':
        this.loadingQueue.splice(Math.floor(this.loadingQueue.length / 2), 0, item);
        break;
      case 'low':
        this.loadingQueue.push(item);
        break;
    }
  }
}

// Gesture Recognition
export class GestureRecognizer {
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private element: HTMLElement | null = null;
  private callbacks = new Map<string, (event: any) => void>();

  init(element: HTMLElement) {
    this.element = element;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.element) return;

    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    
    // Mouse events for desktop
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
  }

  private handleTouchMove(e: TouchEvent) {
    // Prevent default scrolling behavior during gesture recognition
    e.preventDefault();
  }

  private handleTouchEnd(e: TouchEvent) {
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    this.processGesture(endX, endY, endTime);
  }

  private handleMouseDown(e: MouseEvent) {
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTime = Date.now();
  }

  private handleMouseMove(e: MouseEvent) {
    // Handle mouse drag gestures
  }

  private handleMouseUp(e: MouseEvent) {
    this.processGesture(e.clientX, e.clientY, Date.now());
  }

  private processGesture(endX: number, endY: number, endTime: number) {
    const deltaX = endX - this.startX;
    const deltaY = endY - this.startY;
    const deltaTime = endTime - this.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime;

    // Detect gesture type
    if (deltaTime < 200 && distance < 10) {
      this.fireCallback('tap', { x: endX, y: endY });
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 50) {
        this.fireCallback('swipeRight', { deltaX, velocity });
      } else if (deltaX < -50) {
        this.fireCallback('swipeLeft', { deltaX, velocity });
      }
    } else {
      if (deltaY > 50) {
        this.fireCallback('swipeDown', { deltaY, velocity });
      } else if (deltaY < -50) {
        this.fireCallback('swipeUp', { deltaY, velocity });
      }
    }
  }

  private fireCallback(gesture: string, data: any) {
    const callback = this.callbacks.get(gesture);
    if (callback) {
      callback(data);
    }
  }

  onGesture(gesture: string, callback: (event: any) => void) {
    this.callbacks.set(gesture, callback);
  }

  removeGesture(gesture: string) {
    this.callbacks.delete(gesture);
  }
}

// Performance Monitoring
export class UIPerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private observers = new Map<string, PerformanceObserver>();

  init() {
    this.setupPerformanceObservers();
    this.monitorFrameRate();
  }

  private setupPerformanceObservers() {
    // Monitor navigation timing
    const navigationObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('navigation', entry.duration);
      }
    });
    navigationObserver.observe({ entryTypes: ['navigation'] });
    this.observers.set('navigation', navigationObserver);

    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('resource', entry.duration);
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.set('resource', resourceObserver);

    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('longTask', entry.duration);
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
    this.observers.set('longTask', longTaskObserver);
  }

  private monitorFrameRate() {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFrameRate = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = frameCount / ((currentTime - lastTime) / 1000);
        this.recordMetric('fps', fps);
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);
  }

  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(): { [key: string]: any } {
    const result: { [key: string]: any } = {};
    
    for (const [name, values] of this.metrics) {
      if (values.length > 0) {
        result[name] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }
    
    return result;
  }

  startTiming(label: string) {
    performance.mark(`${label}-start`);
  }

  endTiming(label: string) {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    this.recordMetric(label, measure.duration);
  }
}

// Export all UI performance optimizers
export const uiPerformanceOptimizer = {
  skeletonLoader: SkeletonLoader,
  optimisticUpdater: new OptimisticUpdater(),
  debouncedInputHandler: new DebouncedInputHandler(),
  progressiveLoader: new ProgressiveLoader(),
  gestureRecognizer: new GestureRecognizer(),
  performanceMonitor: new UIPerformanceMonitor(),
  
  // Initialize all optimizers
  init() {
    SkeletonLoader.init();
    this.performanceMonitor.init();
  }
};