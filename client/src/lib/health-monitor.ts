// Application health monitoring and performance tracking

interface HealthMetric {
  name: string;
  value: number;
  timestamp: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'warning' | 'critical';
  latency?: number;
  error?: string;
  timestamp: number;
}

class HealthMonitor {
  private metrics: Map<string, HealthMetric[]> = new Map();
  private maxMetrics = 100; // Keep last 100 metrics per type
  private healthChecks: Map<string, HealthCheckResult> = new Map();

  // Track API response times
  trackApiCall(endpoint: string, startTime: number, success: boolean, error?: string) {
    const duration = performance.now() - startTime;
    const status = success ? 'healthy' : 'critical';
    
    const metric: HealthMetric = {
      name: `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
      value: duration,
      timestamp: Date.now(),
      status
    };

    this.addMetric(metric);
    
    // Store health check result
    this.healthChecks.set(endpoint, {
      service: endpoint,
      status,
      latency: duration,
      error,
      timestamp: Date.now()
    });
  }

  // Track page load times
  trackPageLoad(page: string, loadTime: number) {
    const status = loadTime < 2000 ? 'healthy' : loadTime < 5000 ? 'warning' : 'critical';
    
    const metric: HealthMetric = {
      name: `page_load_${page}`,
      value: loadTime,
      timestamp: Date.now(),
      status
    };

    this.addMetric(metric);
  }

  // Track user interactions
  trackUserInteraction(action: string, duration: number) {
    const status = duration < 500 ? 'healthy' : duration < 1000 ? 'warning' : 'critical';
    
    const metric: HealthMetric = {
      name: `interaction_${action}`,
      value: duration,
      timestamp: Date.now(),
      status
    };

    this.addMetric(metric);
  }

  // Track memory usage
  trackMemoryUsage() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usagePercent = (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100;
      
      const status = usagePercent < 70 ? 'healthy' : usagePercent < 85 ? 'warning' : 'critical';
      
      const metric: HealthMetric = {
        name: 'memory_usage',
        value: usagePercent,
        timestamp: Date.now(),
        status
      };

      this.addMetric(metric);
    }
  }

  // Add metric to collection
  private addMetric(metric: HealthMetric) {
    const key = metric.name;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metrics = this.metrics.get(key)!;
    metrics.push(metric);
    
    // Keep only recent metrics
    if (metrics.length > this.maxMetrics) {
      metrics.shift();
    }
  }

  // Get health status for a specific service
  getHealthStatus(service: string): HealthCheckResult | null {
    return this.healthChecks.get(service) || null;
  }

  // Get overall application health
  getOverallHealth(): 'healthy' | 'warning' | 'critical' {
    const recentChecks = Array.from(this.healthChecks.values())
      .filter(check => Date.now() - check.timestamp < 60000) // Last minute
      .map(check => check.status);

    if (recentChecks.length === 0) return 'healthy';
    
    if (recentChecks.some(status => status === 'critical')) return 'critical';
    if (recentChecks.some(status => status === 'warning')) return 'warning';
    
    return 'healthy';
  }

  // Get performance metrics
  getMetrics(metricName?: string): HealthMetric[] {
    if (metricName) {
      return this.metrics.get(metricName) || [];
    }
    
    // Return all metrics
    return Array.from(this.metrics.values()).flat();
  }

  // Get average response time for API endpoints
  getAverageApiResponseTime(): number {
    const apiMetrics = this.getMetrics().filter(m => m.name.startsWith('api_'));
    if (apiMetrics.length === 0) return 0;
    
    const total = apiMetrics.reduce((sum, metric) => sum + metric.value, 0);
    return total / apiMetrics.length;
  }

  // Generate health report
  generateHealthReport(): {
    overall: 'healthy' | 'warning' | 'critical';
    services: HealthCheckResult[];
    averageApiResponseTime: number;
    recentErrors: string[];
    timestamp: number;
  } {
    const recentErrors = Array.from(this.healthChecks.values())
      .filter(check => check.error && Date.now() - check.timestamp < 300000) // Last 5 minutes
      .map(check => `${check.service}: ${check.error}`)
      .slice(0, 10); // Last 10 errors

    return {
      overall: this.getOverallHealth(),
      services: Array.from(this.healthChecks.values()),
      averageApiResponseTime: this.getAverageApiResponseTime(),
      recentErrors,
      timestamp: Date.now()
    };
  }

  // Start periodic health monitoring
  startMonitoring(interval: number = 30000) { // 30 seconds
    setInterval(() => {
      this.trackMemoryUsage();
      this.performHealthChecks();
    }, interval);
  }

  // Perform basic health checks
  private async performHealthChecks() {
    const endpoints = [
      '/api/auth/user',
      '/api/creator-auth/status',
      '/api/creators',
      '/api/content-inspiration-pages'
    ];

    for (const endpoint of endpoints) {
      const startTime = performance.now();
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          credentials: 'include'
        });
        
        const success = response.ok;
        const error = success ? undefined : `HTTP ${response.status}`;
        
        this.trackApiCall(endpoint, startTime, success, error);
      } catch (error) {
        this.trackApiCall(endpoint, startTime, false, (error as Error).message);
      }
    }
  }

  // Initialize health monitoring
  init() {
    console.log('📊 Health monitoring initialized');
    this.startMonitoring();
    
    // Track initial page load
    if (typeof window !== 'undefined') {
      const loadTime = performance.now();
      this.trackPageLoad('initial', loadTime);
    }
  }

  // Clear old data
  cleanup() {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(key, filtered);
    }
    
    for (const [key, check] of this.healthChecks.entries()) {
      if (check.timestamp < cutoffTime) {
        this.healthChecks.delete(key);
      }
    }
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor();

// Helper function to wrap API calls with monitoring
export const withHealthMonitoring = async <T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  try {
    const result = await apiCall();
    healthMonitor.trackApiCall(endpoint, startTime, true);
    return result;
  } catch (error) {
    healthMonitor.trackApiCall(endpoint, startTime, false, (error as Error).message);
    throw error;
  }
};

// React hook for health monitoring
export const useHealthMonitor = () => {
  const startPageLoad = (page: string) => {
    const startTime = performance.now();
    return () => {
      const loadTime = performance.now() - startTime;
      healthMonitor.trackPageLoad(page, loadTime);
    };
  };

  const trackInteraction = (action: string) => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      healthMonitor.trackUserInteraction(action, duration);
    };
  };

  return {
    startPageLoad,
    trackInteraction,
    getHealthStatus: (service: string) => healthMonitor.getHealthStatus(service),
    getOverallHealth: () => healthMonitor.getOverallHealth(),
    generateReport: () => healthMonitor.generateHealthReport()
  };
};