/**
 * Application Health Monitoring System
 * Monitors performance, errors, and system health for CRM optimization
 */

// Health monitoring types
interface HealthMetrics {
  timestamp: number;
  responseTime: number;
  errorRate: number;
  memoryUsage: number;
  activeUsers: number;
  apiCalls: number;
  cacheHitRate: number;
}

interface ErrorReport {
  timestamp: number;
  type: string;
  message: string;
  stack?: string;
  url: string;
  userId?: string;
  userAgent: string;
}

// Health monitoring singleton
class HealthMonitor {
  private static instance: HealthMonitor;
  private metrics: HealthMetrics[] = [];
  private errors: ErrorReport[] = [];
  private apiResponseTimes: Map<string, number[]> = new Map();
  private isMonitoring = false;

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  // Initialize health monitoring
  initialize(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🏥 Health monitoring initialized (minimal mode)');
    
    // Temporarily disabled to prevent fetch errors
    // Only keeping minimal logging without server reporting
    return;
  }

  // Start performance monitoring
  private startPerformanceMonitoring(): void {
    // Monitor memory usage
    setInterval(() => {
      if (typeof performance !== 'undefined' && performance.memory) {
        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        
        if (usedMB > 150) {
          console.warn(`🚨 High memory usage: ${usedMB.toFixed(2)}MB`);
          this.reportHealthIssue('high_memory', `Memory usage: ${usedMB.toFixed(2)}MB`);
        }
      }
    }, 30000); // Check every 30 seconds

    // Monitor page load times
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      if (loadTime > 3000) {
        console.warn(`🐌 Slow page load: ${loadTime}ms`);
        this.reportHealthIssue('slow_load', `Page load time: ${loadTime}ms`);
      }
    });
  }

  // Set up error tracking
  private setupErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.recordError({
        timestamp: Date.now(),
        type: 'javascript_error',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        userAgent: navigator.userAgent,
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        timestamp: Date.now(),
        type: 'promise_rejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });
  }

  // Set up API monitoring
  private setupApiMonitoring(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const start = Date.now();
      const url = args[0] as string;
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - start;
        
        this.recordApiCall(url, duration, response.ok);
        
        // Log slow API calls
        if (duration > 2000) {
          console.warn(`🐌 Slow API call: ${url} took ${duration}ms`);
          this.reportHealthIssue('slow_api', `API call ${url} took ${duration}ms`);
        }
        
        return response;
      } catch (error) {
        const duration = Date.now() - start;
        this.recordApiCall(url, duration, false);
        
        this.recordError({
          timestamp: Date.now(),
          type: 'api_error',
          message: `API call failed: ${url}`,
          stack: error instanceof Error ? error.stack : undefined,
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
        
        throw error;
      }
    };
  }

  // Record API call metrics
  private recordApiCall(url: string, duration: number, success: boolean): void {
    if (!this.apiResponseTimes.has(url)) {
      this.apiResponseTimes.set(url, []);
    }
    
    const times = this.apiResponseTimes.get(url)!;
    times.push(duration);
    
    // Keep only last 100 calls
    if (times.length > 100) {
      times.shift();
    }
    
    // Update error rate if failed
    if (!success) {
      this.reportHealthIssue('api_failure', `API call failed: ${url}`);
    }
  }

  // Record error
  private recordError(error: ErrorReport): void {
    this.errors.push(error);
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors.shift();
    }
    
    console.error('Health Monitor - Error recorded:', error);
  }

  // Report health issue
  private reportHealthIssue(type: string, message: string): void {
    // Temporarily disabled to prevent "Failed to fetch" errors on /creator-app-layout
    // This prevents the health monitoring system from creating performance issues
    return;
  }

  // Schedule regular health checks
  private scheduleHealthChecks(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  // Perform comprehensive health check
  private performHealthCheck(): void {
    const now = Date.now();
    const metrics: HealthMetrics = {
      timestamp: now,
      responseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate(),
      memoryUsage: this.getMemoryUsage(),
      activeUsers: 1, // Current user
      apiCalls: this.getTotalApiCalls(),
      cacheHitRate: this.getCacheHitRate(),
    };

    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Log health status
    console.log('🏥 Health Check:', {
      responseTime: `${metrics.responseTime}ms`,
      errorRate: `${(metrics.errorRate * 100).toFixed(1)}%`,
      memoryUsage: `${metrics.memoryUsage.toFixed(1)}MB`,
      apiCalls: metrics.apiCalls,
      cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
    });
  }

  // Get average response time
  private getAverageResponseTime(): number {
    let total = 0;
    let count = 0;
    
    for (const [, times] of this.apiResponseTimes) {
      total += times.reduce((a, b) => a + b, 0);
      count += times.length;
    }
    
    return count > 0 ? total / count : 0;
  }

  // Get error rate
  private getErrorRate(): number {
    const recentErrors = this.errors.filter(e => Date.now() - e.timestamp < 300000); // Last 5 minutes
    const totalCalls = this.getTotalApiCalls();
    
    return totalCalls > 0 ? recentErrors.length / totalCalls : 0;
  }

  // Get memory usage
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  // Get total API calls
  private getTotalApiCalls(): number {
    let total = 0;
    for (const [, times] of this.apiResponseTimes) {
      total += times.length;
    }
    return total;
  }

  // Get cache hit rate (placeholder)
  private getCacheHitRate(): number {
    // This would integrate with actual cache metrics
    return 0.85; // 85% placeholder
  }

  // Get health report
  getHealthReport(): any {
    return {
      current: this.metrics[this.metrics.length - 1] || null,
      history: this.metrics.slice(-10), // Last 10 metrics
      errors: this.errors.slice(-10), // Last 10 errors
      apiMetrics: this.getApiMetrics(),
    };
  }

  // Get API metrics summary
  private getApiMetrics(): any {
    const summary: any = {};
    
    for (const [url, times] of this.apiResponseTimes) {
      summary[url] = {
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length,
      };
    }
    
    return summary;
  }

  // Check if system is healthy
  isHealthy(): boolean {
    const current = this.metrics[this.metrics.length - 1];
    if (!current) return true;
    
    return (
      current.responseTime < 2000 &&
      current.errorRate < 0.05 &&
      current.memoryUsage < 200
    );
  }

  // Get health status
  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const current = this.metrics[this.metrics.length - 1];
    if (!current) return 'healthy';
    
    if (current.responseTime > 5000 || current.errorRate > 0.1 || current.memoryUsage > 300) {
      return 'critical';
    }
    
    if (current.responseTime > 2000 || current.errorRate > 0.05 || current.memoryUsage > 200) {
      return 'warning';
    }
    
    return 'healthy';
  }
}

// Initialize health monitoring
export const healthMonitor = HealthMonitor.getInstance();

// React hook for health monitoring
export const useHealthMonitoring = () => {
  const getHealthReport = () => healthMonitor.getHealthReport();
  const isHealthy = () => healthMonitor.isHealthy();
  const getHealthStatus = () => healthMonitor.getHealthStatus();
  
  return {
    getHealthReport,
    isHealthy,
    getHealthStatus,
  };
};

// Initialize health monitoring on module load
if (typeof window !== 'undefined') {
  healthMonitor.initialize();
}

export default healthMonitor;