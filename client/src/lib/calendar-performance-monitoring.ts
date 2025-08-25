/**
 * Calendar Performance Monitoring System
 * Implements comprehensive performance tracking, metrics collection, and analytics
 * Category 10: Performance Monitoring and Metrics Collection
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Performance Metrics Types
interface CalendarMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'load' | 'render' | 'interaction' | 'memory' | 'network' | 'error';
  context?: Record<string, any>;
}

interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

interface PerformanceReport {
  timestamp: number;
  metrics: CalendarMetric[];
  summary: {
    averageLoadTime: number;
    averageRenderTime: number;
    errorRate: number;
    memoryUsage: number;
    userSatisfactionScore: number;
  };
  recommendations: string[];
}

// Performance Monitoring Engine
class CalendarPerformanceMonitor {
  private static instance: CalendarPerformanceMonitor;
  private metrics: CalendarMetric[] = [];
  private thresholds: PerformanceThreshold[] = [];
  private observers: PerformanceObserver[] = [];
  private startTimes: Map<string, number> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private maxMetricsCount = 1000;
  private reportInterval = 60000; // 1 minute

  static getInstance(): CalendarPerformanceMonitor {
    if (!CalendarPerformanceMonitor.instance) {
      CalendarPerformanceMonitor.instance = new CalendarPerformanceMonitor();
      CalendarPerformanceMonitor.instance.initialize();
    }
    return CalendarPerformanceMonitor.instance;
  }

  private initialize(): void {
    this.setupDefaultThresholds();
    this.setupPerformanceObservers();
    this.startPeriodicReporting();
  }

  private setupDefaultThresholds(): void {
    this.thresholds = [
      { metric: 'calendar_load_time', warning: 2000, critical: 5000, unit: 'ms' },
      { metric: 'calendar_render_time', warning: 100, critical: 500, unit: 'ms' },
      { metric: 'memory_usage', warning: 50, critical: 100, unit: 'MB' },
      { metric: 'api_response_time', warning: 1000, critical: 3000, unit: 'ms' },
      { metric: 'error_rate', warning: 0.05, critical: 0.1, unit: 'percentage' },
      { metric: 'user_interaction_delay', warning: 100, critical: 300, unit: 'ms' }
    ];
  }

  private setupPerformanceObservers(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric({
              id: `nav_${Date.now()}`,
              name: 'page_load_time',
              value: navEntry.loadEventEnd - navEntry.navigationStart,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'load'
            });
          }
        });
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation observer not supported');
      }

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('/api/creator/') && entry.name.includes('/events')) {
            this.recordMetric({
              id: `api_${Date.now()}`,
              name: 'api_response_time',
              value: entry.responseEnd - entry.requestStart,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'network',
              context: { url: entry.name }
            });
          }
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported');
      }

      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric({
            id: `longtask_${Date.now()}`,
            name: 'long_task_duration',
            value: entry.duration,
            unit: 'ms',
            timestamp: Date.now(),
            category: 'render',
            context: { startTime: entry.startTime }
          });
        });
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported');
      }
    }
  }

  private startPeriodicReporting(): void {
    this.intervalId = setInterval(() => {
      this.generatePerformanceReport();
      this.cleanupOldMetrics();
    }, this.reportInterval);
  }

  // Record a performance metric
  recordMetric(metric: Omit<CalendarMetric, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): void {
    const fullMetric: CalendarMetric = {
      id: metric.id || `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: metric.timestamp || Date.now(),
      ...metric
    };

    this.metrics.push(fullMetric);
    
    // Check thresholds
    this.checkThresholds(fullMetric);
    
    // Maintain metrics count
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics = this.metrics.slice(-this.maxMetricsCount);
    }
  }

  // Start timing a performance measurement
  startTiming(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  // End timing and record metric
  endTiming(operation: string, category: CalendarMetric['category'] = 'render', context?: Record<string, any>): void {
    const startTime = this.startTimes.get(operation);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name: operation,
        value: duration,
        unit: 'ms',
        category,
        context
      });
      this.startTimes.delete(operation);
    }
  }

  // Record memory usage
  recordMemoryUsage(): void {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.recordMetric({
        name: 'memory_usage',
        value: memory.usedJSHeapSize / 1024 / 1024, // Convert to MB
        unit: 'MB',
        category: 'memory',
        context: {
          totalJSHeapSize: memory.totalJSHeapSize / 1024 / 1024,
          jsHeapSizeLimit: memory.jsHeapSizeLimit / 1024 / 1024
        }
      });
    }
  }

  // Record user interaction timing
  recordUserInteraction(interactionType: string, duration: number, context?: Record<string, any>): void {
    this.recordMetric({
      name: `user_interaction_${interactionType}`,
      value: duration,
      unit: 'ms',
      category: 'interaction',
      context
    });
  }

  // Record error
  recordError(error: Error, context?: Record<string, any>): void {
    this.recordMetric({
      name: 'error_occurred',
      value: 1,
      unit: 'count',
      category: 'error',
      context: {
        message: error.message,
        stack: error.stack,
        ...context
      }
    });
  }

  // Check performance thresholds
  private checkThresholds(metric: CalendarMetric): void {
    const threshold = this.thresholds.find(t => t.metric === metric.name);
    if (!threshold) return;

    if (metric.value >= threshold.critical) {
      console.error(`Critical performance threshold exceeded: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${threshold.critical}${threshold.unit})`);
      this.recordMetric({
        name: 'threshold_critical',
        value: metric.value,
        unit: metric.unit,
        category: 'error',
        context: {
          originalMetric: metric.name,
          threshold: threshold.critical
        }
      });
    } else if (metric.value >= threshold.warning) {
      console.warn(`Performance threshold warning: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${threshold.warning}${threshold.unit})`);
      this.recordMetric({
        name: 'threshold_warning',
        value: metric.value,
        unit: metric.unit,
        category: 'error',
        context: {
          originalMetric: metric.name,
          threshold: threshold.warning
        }
      });
    }
  }

  // Generate performance report
  generatePerformanceReport(): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < this.reportInterval);
    
    const loadMetrics = recentMetrics.filter(m => m.category === 'load');
    const renderMetrics = recentMetrics.filter(m => m.category === 'render');
    const errorMetrics = recentMetrics.filter(m => m.category === 'error');
    const memoryMetrics = recentMetrics.filter(m => m.category === 'memory');
    
    const averageLoadTime = loadMetrics.length > 0 ? 
      loadMetrics.reduce((sum, m) => sum + m.value, 0) / loadMetrics.length : 0;
    
    const averageRenderTime = renderMetrics.length > 0 ? 
      renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length : 0;
    
    const errorRate = recentMetrics.length > 0 ? 
      errorMetrics.length / recentMetrics.length : 0;
    
    const memoryUsage = memoryMetrics.length > 0 ? 
      memoryMetrics[memoryMetrics.length - 1].value : 0;
    
    const userSatisfactionScore = this.calculateUserSatisfactionScore(recentMetrics);
    
    const report: PerformanceReport = {
      timestamp: now,
      metrics: recentMetrics,
      summary: {
        averageLoadTime,
        averageRenderTime,
        errorRate,
        memoryUsage,
        userSatisfactionScore
      },
      recommendations: this.generateRecommendations(recentMetrics)
    };
    
    // Log report for debugging
    console.log('Calendar Performance Report:', report);
    
    return report;
  }

  // Calculate user satisfaction score based on performance metrics
  private calculateUserSatisfactionScore(metrics: CalendarMetric[]): number {
    let score = 100;
    
    // Penalize slow load times
    const loadMetrics = metrics.filter(m => m.name.includes('load'));
    if (loadMetrics.length > 0) {
      const avgLoadTime = loadMetrics.reduce((sum, m) => sum + m.value, 0) / loadMetrics.length;
      if (avgLoadTime > 2000) score -= 20;
      if (avgLoadTime > 5000) score -= 30;
    }
    
    // Penalize slow render times
    const renderMetrics = metrics.filter(m => m.name.includes('render'));
    if (renderMetrics.length > 0) {
      const avgRenderTime = renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length;
      if (avgRenderTime > 100) score -= 15;
      if (avgRenderTime > 500) score -= 25;
    }
    
    // Penalize errors
    const errorMetrics = metrics.filter(m => m.category === 'error');
    const errorRate = metrics.length > 0 ? errorMetrics.length / metrics.length : 0;
    if (errorRate > 0.05) score -= 25;
    if (errorRate > 0.1) score -= 40;
    
    // Penalize high memory usage
    const memoryMetrics = metrics.filter(m => m.name === 'memory_usage');
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
      if (avgMemory > 50) score -= 10;
      if (avgMemory > 100) score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Generate performance recommendations
  private generateRecommendations(metrics: CalendarMetric[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze load times
    const loadMetrics = metrics.filter(m => m.name.includes('load'));
    if (loadMetrics.length > 0) {
      const avgLoadTime = loadMetrics.reduce((sum, m) => sum + m.value, 0) / loadMetrics.length;
      if (avgLoadTime > 2000) {
        recommendations.push('Consider implementing data prefetching to reduce load times');
      }
      if (avgLoadTime > 5000) {
        recommendations.push('Enable caching mechanisms to improve load performance');
      }
    }
    
    // Analyze render performance
    const renderMetrics = metrics.filter(m => m.name.includes('render'));
    if (renderMetrics.length > 0) {
      const avgRenderTime = renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length;
      if (avgRenderTime > 100) {
        recommendations.push('Implement virtual scrolling to improve render performance');
      }
      if (avgRenderTime > 500) {
        recommendations.push('Consider using Web Workers for heavy computations');
      }
    }
    
    // Analyze memory usage
    const memoryMetrics = metrics.filter(m => m.name === 'memory_usage');
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
      if (avgMemory > 50) {
        recommendations.push('Implement memory cleanup strategies');
      }
      if (avgMemory > 100) {
        recommendations.push('Reduce memory footprint by optimizing data structures');
      }
    }
    
    // Analyze error rates
    const errorMetrics = metrics.filter(m => m.category === 'error');
    const errorRate = metrics.length > 0 ? errorMetrics.length / metrics.length : 0;
    if (errorRate > 0.05) {
      recommendations.push('Implement better error handling and recovery mechanisms');
    }
    
    // Analyze API performance
    const apiMetrics = metrics.filter(m => m.name.includes('api'));
    if (apiMetrics.length > 0) {
      const avgApiTime = apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length;
      if (avgApiTime > 1000) {
        recommendations.push('Optimize API queries and implement request batching');
      }
    }
    
    return recommendations;
  }

  // Get metrics by category
  getMetricsByCategory(category: CalendarMetric['category'], timeRange?: number): CalendarMetric[] {
    const cutoff = timeRange ? Date.now() - timeRange : 0;
    return this.metrics.filter(m => m.category === category && m.timestamp >= cutoff);
  }

  // Get metrics by name
  getMetricsByName(name: string, timeRange?: number): CalendarMetric[] {
    const cutoff = timeRange ? Date.now() - timeRange : 0;
    return this.metrics.filter(m => m.name === name && m.timestamp >= cutoff);
  }

  // Get performance summary
  getPerformanceSummary(timeRange: number = 3600000): Record<string, any> {
    const cutoff = Date.now() - timeRange;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    const summary: Record<string, any> = {};
    
    // Group metrics by name
    const metricGroups = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.name]) {
        groups[metric.name] = [];
      }
      groups[metric.name].push(metric);
      return groups;
    }, {} as Record<string, CalendarMetric[]>);
    
    // Calculate statistics for each metric
    Object.entries(metricGroups).forEach(([name, metrics]) => {
      const values = metrics.map(m => m.value);
      summary[name] = {
        count: values.length,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1],
        unit: metrics[0].unit
      };
    });
    
    return summary;
  }

  // Clean up old metrics
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }

  // Cleanup observers
  cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
  }
}

// Performance Analytics Hook
export const useCalendarPerformanceMonitoring = (username: string) => {
  const [performanceData, setPerformanceData] = useState<PerformanceReport | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const monitor = CalendarPerformanceMonitor.getInstance();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Generate reports every minute
    intervalRef.current = setInterval(() => {
      const report = monitor.generatePerformanceReport();
      setPerformanceData(report);
    }, 60000);
    
    // Initial report
    const initialReport = monitor.generatePerformanceReport();
    setPerformanceData(initialReport);
    
    // Record memory usage periodically
    const memoryInterval = setInterval(() => {
      monitor.recordMemoryUsage();
    }, 10000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(memoryInterval);
    };
  }, [isMonitoring, monitor]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    setIsMonitoring(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isMonitoring]);

  // Record custom metric
  const recordMetric = useCallback((metric: Omit<CalendarMetric, 'id' | 'timestamp'>) => {
    monitor.recordMetric(metric);
  }, [monitor]);

  // Time operation
  const timeOperation = useCallback((operation: string, fn: () => Promise<any> | any) => {
    monitor.startTiming(operation);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          monitor.endTiming(operation);
        });
      } else {
        monitor.endTiming(operation);
        return result;
      }
    } catch (error) {
      monitor.endTiming(operation);
      monitor.recordError(error as Error, { operation });
      throw error;
    }
  }, [monitor]);

  // Get performance summary
  const getPerformanceSummary = useCallback((timeRange?: number) => {
    return monitor.getPerformanceSummary(timeRange);
  }, [monitor]);

  // Get metrics by category
  const getMetricsByCategory = useCallback((category: CalendarMetric['category'], timeRange?: number) => {
    return monitor.getMetricsByCategory(category, timeRange);
  }, [monitor]);

  // Initialize monitoring
  useEffect(() => {
    if (username) {
      startMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [username, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    performanceData,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordMetric,
    timeOperation,
    getPerformanceSummary,
    getMetricsByCategory,
    monitor
  };
};

export default useCalendarPerformanceMonitoring;