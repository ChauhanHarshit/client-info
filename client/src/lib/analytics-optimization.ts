/**
 * Analytics & Monitoring Optimization System
 * Provides comprehensive performance monitoring and user behavior analytics
 */

// Performance Analytics
export class PerformanceAnalytics {
  private metrics: Map<string, any[]> = new Map();
  private sessionId: string;
  private userId: string | null = null;
  private pageLoadTime: number = 0;
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.pageLoadTime = performance.now();
  }

  init() {
    // Temporarily disabled to prevent excessive API calls
    // This prevents performance issues from analytics collection
    return;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceObservers() {
    // Navigation timing
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('navigation', {
          type: entry.entryType,
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
          timestamp: Date.now()
        });
      }
    });
    navObserver.observe({ entryTypes: ['navigation'] });
    this.observers.push(navObserver);

    // Resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('resource', {
          name: entry.name,
          duration: entry.duration,
          size: (entry as any).transferSize || 0,
          type: this.getResourceType(entry.name),
          timestamp: Date.now()
        });
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);

    // Long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('longTask', {
          duration: entry.duration,
          startTime: entry.startTime,
          timestamp: Date.now()
        });
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
    this.observers.push(longTaskObserver);
  }

  private getResourceType(url: string): string {
    if (url.includes('.css')) return 'css';
    if (url.includes('.js')) return 'js';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.gif')) return 'image';
    if (url.includes('.mp4') || url.includes('.mov')) return 'video';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private trackPageLoad() {
    window.addEventListener('load', () => {
      const loadTime = performance.now() - this.pageLoadTime;
      this.recordMetric('pageLoad', {
        duration: loadTime,
        path: window.location.pathname,
        timestamp: Date.now()
      });
    });
  }

  private trackUserTiming() {
    const userObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('userTiming', {
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
          timestamp: Date.now()
        });
      }
    });
    userObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(userObserver);
  }

  private trackResourceTiming() {
    // Track specific resource categories
    const trackResource = (selector: string, type: string) => {
      document.querySelectorAll(selector).forEach(element => {
        const url = element.getAttribute('src') || element.getAttribute('href');
        if (url) {
          this.recordMetric('resourceLoad', {
            url,
            type,
            timestamp: Date.now()
          });
        }
      });
    };

    // Track different resource types
    trackResource('img', 'image');
    trackResource('video', 'video');
    trackResource('link[rel="stylesheet"]', 'css');
    trackResource('script', 'js');
  }

  private trackCoreWebVitals() {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('coreWebVitals', {
          name: 'LCP',
          value: entry.startTime,
          timestamp: Date.now()
        });
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(lcpObserver);

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('coreWebVitals', {
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          timestamp: Date.now()
        });
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    this.observers.push(fidObserver);

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          this.recordMetric('coreWebVitals', {
            name: 'CLS',
            value: (entry as any).value,
            timestamp: Date.now()
          });
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(clsObserver);
  }

  private recordMetric(category: string, data: any) {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }
    
    const metrics = this.metrics.get(category)!;
    metrics.push({
      ...data,
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // Keep only last 100 entries per category
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    // Send metrics to server periodically
    this.sendMetricsToServer(category, data);
  }

  private async sendMetricsToServer(category: string, data: any) {
    // Temporarily disabled to prevent excessive API calls
    // This prevents performance issues from analytics collection
    return;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  startTiming(name: string) {
    performance.mark(`${name}-start`);
  }

  endTiming(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  }

  getMetrics(category?: string): any {
    if (category) {
      return this.metrics.get(category) || [];
    }
    return Object.fromEntries(this.metrics);
  }

  getPerformanceSummary(): any {
    const navigation = this.metrics.get('navigation') || [];
    const resources = this.metrics.get('resource') || [];
    const longTasks = this.metrics.get('longTask') || [];
    const coreWebVitals = this.metrics.get('coreWebVitals') || [];
    
    return {
      pageLoadTime: navigation.length > 0 ? navigation[0].duration : 0,
      resourceCount: resources.length,
      totalResourceSize: resources.reduce((sum, r) => sum + (r.size || 0), 0),
      longTaskCount: longTasks.length,
      coreWebVitals: coreWebVitals.reduce((acc, metric) => {
        acc[metric.name] = metric.value;
        return acc;
      }, {} as any)
    };
  }
}

// User Behavior Analytics
export class UserBehaviorAnalytics {
  private interactions: any[] = [];
  private sessionStart: number = Date.now();
  private currentPage: string = window.location.pathname;
  private scrollDepth: number = 0;
  private clickHeatmap: Map<string, number> = new Map();

  init() {
    // Temporarily disabled to prevent excessive API calls
    // This prevents performance issues from user behavior analytics
    return;
  }

  private trackPageViews() {
    // Track initial page view
    this.recordInteraction('pageView', {
      path: this.currentPage,
      referrer: document.referrer,
      timestamp: Date.now()
    });

    // Track route changes (for SPA)
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      window.dispatchEvent(new Event('routeChange'));
    };

    window.addEventListener('routeChange', () => {
      this.currentPage = window.location.pathname;
      this.recordInteraction('pageView', {
        path: this.currentPage,
        timestamp: Date.now()
      });
    });
  }

  private trackClicks() {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const selector = this.getSelector(target);
      
      // Update click heatmap
      const currentCount = this.clickHeatmap.get(selector) || 0;
      this.clickHeatmap.set(selector, currentCount + 1);
      
      this.recordInteraction('click', {
        selector,
        text: target.textContent?.slice(0, 50) || '',
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
      });
    });
  }

  private trackScrolling() {
    let maxScrollDepth = 0;
    
    const trackScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / scrollHeight) * 100;
      
      if (scrollPercent > maxScrollDepth) {
        maxScrollDepth = scrollPercent;
        this.scrollDepth = scrollPercent;
      }
      
      // Record scroll milestones
      if (scrollPercent > 25 && !this.hasScrollMilestone(25)) {
        this.recordInteraction('scroll', { depth: 25, timestamp: Date.now() });
      }
      if (scrollPercent > 50 && !this.hasScrollMilestone(50)) {
        this.recordInteraction('scroll', { depth: 50, timestamp: Date.now() });
      }
      if (scrollPercent > 75 && !this.hasScrollMilestone(75)) {
        this.recordInteraction('scroll', { depth: 75, timestamp: Date.now() });
      }
      if (scrollPercent > 90 && !this.hasScrollMilestone(90)) {
        this.recordInteraction('scroll', { depth: 90, timestamp: Date.now() });
      }
    };
    
    window.addEventListener('scroll', this.throttle(trackScroll, 250));
  }

  private hasScrollMilestone(depth: number): boolean {
    return this.interactions.some(i => 
      i.type === 'scroll' && i.data.depth === depth && i.data.path === this.currentPage
    );
  }

  private trackFormInteractions() {
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        this.recordInteraction('formInput', {
          selector: this.getSelector(target),
          type: target.type,
          name: target.name,
          timestamp: Date.now()
        });
      }
    });

    document.addEventListener('submit', (event) => {
      const target = event.target as HTMLFormElement;
      this.recordInteraction('formSubmit', {
        selector: this.getSelector(target),
        action: target.action,
        timestamp: Date.now()
      });
    });
  }

  private trackTimeOnPage() {
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - this.sessionStart;
      this.recordInteraction('pageExit', {
        timeOnPage,
        scrollDepth: this.scrollDepth,
        timestamp: Date.now()
      });
    });
  }

  private getSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private recordInteraction(type: string, data: any) {
    this.interactions.push({
      type,
      data: {
        ...data,
        path: this.currentPage,
        sessionId: (window as any).analyticsSessionId || 'unknown'
      }
    });
    
    // Send to server
    this.sendInteractionToServer(type, data);
  }

  private async sendInteractionToServer(type: string, data: any) {
    // Temporarily disabled to prevent excessive API calls
    // This prevents performance issues from interaction tracking
    return;
  }

  private throttle(func: Function, delay: number) {
    let timeoutId: NodeJS.Timeout;
    let lastExecTime = 0;
    
    return function(...args: any[]) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  getInteractions(): any[] {
    return this.interactions;
  }

  getClickHeatmap(): Map<string, number> {
    return this.clickHeatmap;
  }

  getBehaviorSummary(): any {
    const pageViews = this.interactions.filter(i => i.type === 'pageView');
    const clicks = this.interactions.filter(i => i.type === 'click');
    const scrolls = this.interactions.filter(i => i.type === 'scroll');
    
    return {
      pageViews: pageViews.length,
      clicks: clicks.length,
      maxScrollDepth: this.scrollDepth,
      timeOnSite: Date.now() - this.sessionStart,
      mostClickedElements: Array.from(this.clickHeatmap.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }
}

// A/B Testing System
export class ABTestingSystem {
  private experiments: Map<string, any> = new Map();
  private userVariant: Map<string, string> = new Map();
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  init() {
    // Temporarily disabled to prevent excessive API calls
    // This prevents performance issues from A/B testing system
    return;
  }

  private async loadExperiments() {
    try {
      const response = await fetch('/api/analytics/experiments');
      const experiments = await response.json();
      
      experiments.forEach((exp: any) => {
        this.experiments.set(exp.id, exp);
      });
    } catch (error) {
      console.warn('Failed to load experiments:', error);
    }
  }

  private assignUserVariants() {
    this.experiments.forEach((experiment, experimentId) => {
      if (!this.userVariant.has(experimentId)) {
        const variant = this.assignVariant(experiment);
        this.userVariant.set(experimentId, variant);
        
        // Track assignment
        this.trackEvent('experimentAssignment', {
          experimentId,
          variant,
          userId: this.userId
        });
      }
    });
  }

  private assignVariant(experiment: any): string {
    const hash = this.hashUserId(this.userId + experiment.id);
    const variants = experiment.variants;
    const index = hash % variants.length;
    return variants[index].id;
  }

  private hashUserId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  getVariant(experimentId: string): string | null {
    return this.userVariant.get(experimentId) || null;
  }

  isInExperiment(experimentId: string): boolean {
    return this.experiments.has(experimentId) && this.userVariant.has(experimentId);
  }

  trackConversion(experimentId: string, goal: string, value?: number) {
    const variant = this.getVariant(experimentId);
    if (variant) {
      this.trackEvent('conversion', {
        experimentId,
        variant,
        goal,
        value,
        userId: this.userId
      });
    }
  }

  private async trackEvent(eventType: string, data: any) {
    // Temporarily disabled to prevent excessive API calls
    // This prevents performance issues from event tracking
    return;
  }
}

// Export all analytics optimizers
export const analyticsOptimizer = {
  performanceAnalytics: new PerformanceAnalytics(),
  userBehaviorAnalytics: new UserBehaviorAnalytics(),
  abTestingSystem: null as ABTestingSystem | null,
  
  // Initialize all optimizers
  init(userId?: string) {
    this.performanceAnalytics.init();
    this.userBehaviorAnalytics.init();
    
    if (userId) {
      this.performanceAnalytics.setUserId(userId);
      this.abTestingSystem = new ABTestingSystem(userId);
      this.abTestingSystem.init();
    }
  }
};