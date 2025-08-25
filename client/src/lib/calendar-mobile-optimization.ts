/**
 * Calendar Mobile Optimization System
 * Implements touch gestures, mobile-specific rendering, and performance optimizations
 * Category 6: Mobile-Specific Optimizations
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Mobile Device Detection
interface DeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isLowEndDevice: boolean;
  hasSlowConnection: boolean;
  supportsWebWorkers: boolean;
  supportsTouch: boolean;
  memoryLimit: number;
  screenSize: 'small' | 'medium' | 'large';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

const detectDeviceCapabilities = (): DeviceCapabilities => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|tablet|playbook|silk/i.test(userAgent);
  const isLowEndDevice = navigator.hardwareConcurrency <= 2;
  
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const hasSlowConnection = connection ? 
    ['slow-2g', '2g', '3g'].includes(connection.effectiveType) : false;
  
  const screenWidth = window.screen.width;
  const screenSize = screenWidth < 768 ? 'small' : screenWidth < 1024 ? 'medium' : 'large';
  
  return {
    isMobile,
    isTablet,
    isLowEndDevice,
    hasSlowConnection,
    supportsWebWorkers: typeof Worker !== 'undefined',
    supportsTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    memoryLimit: (navigator as any).deviceMemory || 4,
    screenSize,
    orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
    pixelRatio: window.devicePixelRatio || 1
  };
};

// Touch Gesture Recognition
interface TouchGesture {
  type: 'swipe' | 'pinch' | 'tap' | 'long-press' | 'double-tap';
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  duration?: number;
  scale?: number;
  position?: { x: number; y: number };
}

class TouchGestureRecognizer {
  private touchStart: { x: number; y: number; time: number } | null = null;
  private touchHistory: Array<{ x: number; y: number; time: number }> = [];
  private longPressTimer: NodeJS.Timeout | null = null;
  private lastTap: { time: number; x: number; y: number } | null = null;
  private initialPinchDistance: number | null = null;
  
  private readonly swipeThreshold = 50;
  private readonly longPressDelay = 500;
  private readonly doubleTapDelay = 300;
  private readonly doubleTapThreshold = 30;

  onTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    this.touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    this.touchHistory = [this.touchStart];
    
    // Setup long press detection
    this.longPressTimer = setTimeout(() => {
      if (this.touchStart) {
        this.onGesture({
          type: 'long-press',
          position: { x: this.touchStart.x, y: this.touchStart.y }
        });
      }
    }, this.longPressDelay);
    
    // Handle pinch gesture start
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.initialPinchDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
    }
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.touchStart) return;
    
    const touch = e.touches[0];
    const currentTime = Date.now();
    
    // Add to history
    this.touchHistory.push({ x: touch.clientX, y: touch.clientY, time: currentTime });
    
    // Keep only recent history
    this.touchHistory = this.touchHistory.filter(h => currentTime - h.time < 500);
    
    // Cancel long press if moved too much
    if (this.longPressTimer) {
      const deltaX = Math.abs(touch.clientX - this.touchStart.x);
      const deltaY = Math.abs(touch.clientY - this.touchStart.y);
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }
    
    // Handle pinch gesture
    if (e.touches.length === 2 && this.initialPinchDistance) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const scale = currentDistance / this.initialPinchDistance;
      this.onGesture({
        type: 'pinch',
        scale,
        position: {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        }
      });
    }
  }

  onTouchEnd(e: TouchEvent): void {
    if (!this.touchStart) return;
    
    const touch = e.changedTouches[0];
    const endTime = Date.now();
    const deltaX = touch.clientX - this.touchStart.x;
    const deltaY = touch.clientY - this.touchStart.y;
    const duration = endTime - this.touchStart.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    // Detect swipe
    if (distance > this.swipeThreshold) {
      const direction = Math.abs(deltaX) > Math.abs(deltaY) ?
        (deltaX > 0 ? 'right' : 'left') :
        (deltaY > 0 ? 'down' : 'up');
      
      this.onGesture({
        type: 'swipe',
        direction,
        distance,
        duration
      });
    } else if (duration < 200) {
      // Detect tap or double-tap
      if (this.lastTap && 
          endTime - this.lastTap.time < this.doubleTapDelay &&
          Math.abs(touch.clientX - this.lastTap.x) < this.doubleTapThreshold &&
          Math.abs(touch.clientY - this.lastTap.y) < this.doubleTapThreshold) {
        
        this.onGesture({
          type: 'double-tap',
          position: { x: touch.clientX, y: touch.clientY }
        });
        this.lastTap = null;
      } else {
        this.onGesture({
          type: 'tap',
          position: { x: touch.clientX, y: touch.clientY }
        });
        this.lastTap = { time: endTime, x: touch.clientX, y: touch.clientY };
      }
    }
    
    // Reset state
    this.touchStart = null;
    this.touchHistory = [];
    this.initialPinchDistance = null;
  }

  private onGesture(gesture: TouchGesture): void {
    // Override this method to handle gestures
  }

  setGestureHandler(handler: (gesture: TouchGesture) => void): void {
    this.onGesture = handler;
  }
}

// Mobile Calendar Renderer
class MobileCalendarRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private devicePixelRatio: number;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.devicePixelRatio = window.devicePixelRatio || 1;
    
    // Create offscreen canvas for double buffering
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    
    this.setupCanvas();
  }

  private setupCanvas(): void {
    if (!this.canvas || !this.ctx) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.devicePixelRatio;
    this.canvas.height = rect.height * this.devicePixelRatio;
    
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    
    // Setup offscreen canvas
    if (this.offscreenCanvas && this.offscreenCtx) {
      this.offscreenCanvas.width = this.canvas.width;
      this.offscreenCanvas.height = this.canvas.height;
      this.offscreenCtx.scale(this.devicePixelRatio, this.devicePixelRatio);
    }
  }

  renderCalendar(events: any[], currentMonth: Date, options: {
    showWeekends?: boolean;
    compactMode?: boolean;
    highContrast?: boolean;
  } = {}): void {
    if (!this.ctx || !this.offscreenCtx) return;
    
    const { showWeekends = true, compactMode = false, highContrast = false } = options;
    
    // Clear offscreen canvas
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas!.width, this.offscreenCanvas!.height);
    
    // Render calendar grid
    this.renderCalendarGrid(this.offscreenCtx, currentMonth, { showWeekends, compactMode, highContrast });
    
    // Render events
    this.renderEvents(this.offscreenCtx, events, currentMonth, { compactMode, highContrast });
    
    // Copy to main canvas
    this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    this.ctx.drawImage(this.offscreenCanvas!, 0, 0);
  }

  private renderCalendarGrid(ctx: CanvasRenderingContext2D, currentMonth: Date, options: any): void {
    // Implementation for rendering calendar grid optimized for mobile
    const cellWidth = this.canvas!.width / 7;
    const cellHeight = this.canvas!.height / 6;
    
    // Render grid lines
    ctx.strokeStyle = options.highContrast ? '#000' : '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 0; i <= 7; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, this.canvas!.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(this.canvas!.width, i * cellHeight);
      ctx.stroke();
    }
  }

  private renderEvents(ctx: CanvasRenderingContext2D, events: any[], currentMonth: Date, options: any): void {
    // Implementation for rendering events optimized for mobile
    events.forEach(event => {
      const eventDate = new Date(event.startDateTime);
      if (eventDate.getMonth() === currentMonth.getMonth() && 
          eventDate.getFullYear() === currentMonth.getFullYear()) {
        
        // Calculate position
        const dayOfMonth = eventDate.getDate();
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const dayOfWeek = firstDayOfMonth.getDay();
        const weekNumber = Math.floor((dayOfMonth + dayOfWeek - 1) / 7);
        const dayInWeek = (dayOfMonth + dayOfWeek - 1) % 7;
        
        const x = dayInWeek * (this.canvas!.width / 7);
        const y = weekNumber * (this.canvas!.height / 6);
        
        // Render event indicator
        ctx.fillStyle = options.highContrast ? '#ff0000' : '#4CAF50';
        ctx.fillRect(x + 5, y + 5, 10, 10);
      }
    });
  }
}

// Network Adaptation Manager
class NetworkAdaptationManager {
  private static instance: NetworkAdaptationManager;
  private connectionType: string = 'unknown';
  private effectiveType: string = 'unknown';
  private downlink: number = 0;
  private rtt: number = 0;
  private saveData: boolean = false;

  static getInstance(): NetworkAdaptationManager {
    if (!NetworkAdaptationManager.instance) {
      NetworkAdaptationManager.instance = new NetworkAdaptationManager();
      NetworkAdaptationManager.instance.initializeNetworkMonitoring();
    }
    return NetworkAdaptationManager.instance;
  }

  private initializeNetworkMonitoring(): void {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      this.updateConnectionInfo(connection);
      
      connection.addEventListener('change', () => {
        this.updateConnectionInfo(connection);
      });
    }
  }

  private updateConnectionInfo(connection: any): void {
    this.connectionType = connection.type || 'unknown';
    this.effectiveType = connection.effectiveType || 'unknown';
    this.downlink = connection.downlink || 0;
    this.rtt = connection.rtt || 0;
    this.saveData = connection.saveData || false;
  }

  getOptimalSyncInterval(): number {
    const baseInterval = 30000; // 30 seconds
    
    switch (this.effectiveType) {
      case 'slow-2g':
        return baseInterval * 4; // 2 minutes
      case '2g':
        return baseInterval * 3; // 1.5 minutes
      case '3g':
        return baseInterval * 2; // 1 minute
      case '4g':
      default:
        return baseInterval; // 30 seconds
    }
  }

  getOptimalImageQuality(): number {
    if (this.saveData) return 0.3;
    
    switch (this.effectiveType) {
      case 'slow-2g':
      case '2g':
        return 0.5;
      case '3g':
        return 0.7;
      case '4g':
      default:
        return 1.0;
    }
  }

  shouldUseLowDataMode(): boolean {
    return this.saveData || ['slow-2g', '2g'].includes(this.effectiveType);
  }

  getNetworkStatus(): {
    connectionType: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } {
    return {
      connectionType: this.connectionType,
      effectiveType: this.effectiveType,
      downlink: this.downlink,
      rtt: this.rtt,
      saveData: this.saveData
    };
  }
}

// Battery Optimization Manager
class BatteryOptimizationManager {
  private static instance: BatteryOptimizationManager;
  private batteryLevel: number = 1;
  private isCharging: boolean = true;
  private chargingTime: number = 0;
  private dischargingTime: number = Infinity;

  static getInstance(): BatteryOptimizationManager {
    if (!BatteryOptimizationManager.instance) {
      BatteryOptimizationManager.instance = new BatteryOptimizationManager();
      BatteryOptimizationManager.instance.initializeBatteryMonitoring();
    }
    return BatteryOptimizationManager.instance;
  }

  private async initializeBatteryMonitoring(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.updateBatteryInfo(battery);
        
        battery.addEventListener('chargingchange', () => this.updateBatteryInfo(battery));
        battery.addEventListener('levelchange', () => this.updateBatteryInfo(battery));
      } catch (error) {
        console.warn('Battery API not supported');
      }
    }
  }

  private updateBatteryInfo(battery: any): void {
    this.batteryLevel = battery.level;
    this.isCharging = battery.charging;
    this.chargingTime = battery.chargingTime;
    this.dischargingTime = battery.dischargingTime;
  }

  shouldReduceAnimations(): boolean {
    return this.batteryLevel < 0.2 && !this.isCharging;
  }

  shouldReduceBackgroundActivity(): boolean {
    return this.batteryLevel < 0.15 && !this.isCharging;
  }

  getOptimalRefreshRate(): number {
    if (this.batteryLevel < 0.1 && !this.isCharging) return 60000; // 1 minute
    if (this.batteryLevel < 0.2 && !this.isCharging) return 45000; // 45 seconds
    return 30000; // 30 seconds
  }

  getBatteryStatus(): {
    level: number;
    isCharging: boolean;
    chargingTime: number;
    dischargingTime: number;
  } {
    return {
      level: this.batteryLevel,
      isCharging: this.isCharging,
      chargingTime: this.chargingTime,
      dischargingTime: this.dischargingTime
    };
  }
}

// Main mobile optimization hook
export const useCalendarMobileOptimization = () => {
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities>(detectDeviceCapabilities());
  const [currentGesture, setCurrentGesture] = useState<TouchGesture | null>(null);
  const [networkStatus, setNetworkStatus] = useState(NetworkAdaptationManager.getInstance().getNetworkStatus());
  const [batteryStatus, setBatteryStatus] = useState(BatteryOptimizationManager.getInstance().getBatteryStatus());
  
  const gestureRecognizer = useRef<TouchGestureRecognizer | null>(null);
  const networkManager = NetworkAdaptationManager.getInstance();
  const batteryManager = BatteryOptimizationManager.getInstance();
  
  // Initialize gesture recognition
  useEffect(() => {
    if (!deviceCapabilities.supportsTouch) return;
    
    gestureRecognizer.current = new TouchGestureRecognizer();
    gestureRecognizer.current.setGestureHandler(setCurrentGesture);
    
    const handleTouchStart = (e: TouchEvent) => gestureRecognizer.current?.onTouchStart(e);
    const handleTouchMove = (e: TouchEvent) => gestureRecognizer.current?.onTouchMove(e);
    const handleTouchEnd = (e: TouchEvent) => gestureRecognizer.current?.onTouchEnd(e);
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [deviceCapabilities.supportsTouch]);

  // Monitor device capabilities changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setDeviceCapabilities(detectDeviceCapabilities());
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(networkManager.getNetworkStatus());
    };
    
    const interval = setInterval(updateNetworkStatus, 5000);
    return () => clearInterval(interval);
  }, [networkManager]);

  // Monitor battery status
  useEffect(() => {
    const updateBatteryStatus = () => {
      setBatteryStatus(batteryManager.getBatteryStatus());
    };
    
    const interval = setInterval(updateBatteryStatus, 10000);
    return () => clearInterval(interval);
  }, [batteryManager]);

  // Create mobile calendar renderer
  const createMobileRenderer = useCallback((canvas: HTMLCanvasElement) => {
    return new MobileCalendarRenderer(canvas);
  }, []);

  // Get optimal settings based on device capabilities
  const getOptimalSettings = useCallback(() => {
    return {
      syncInterval: networkManager.getOptimalSyncInterval(),
      imageQuality: networkManager.getOptimalImageQuality(),
      lowDataMode: networkManager.shouldUseLowDataMode(),
      reduceAnimations: batteryManager.shouldReduceAnimations(),
      reduceBackgroundActivity: batteryManager.shouldReduceBackgroundActivity(),
      refreshRate: batteryManager.getOptimalRefreshRate(),
      enableHardwareAcceleration: !deviceCapabilities.isLowEndDevice,
      enableVirtualScrolling: deviceCapabilities.memoryLimit < 4,
      compactMode: deviceCapabilities.screenSize === 'small',
      highContrast: false // Can be user preference
    };
  }, [deviceCapabilities, networkManager, batteryManager]);

  // Handle calendar navigation gestures
  const handleCalendarGesture = useCallback((gesture: TouchGesture, onNavigate: (direction: string) => void) => {
    if (gesture.type === 'swipe') {
      switch (gesture.direction) {
        case 'left':
          onNavigate('next');
          break;
        case 'right':
          onNavigate('prev');
          break;
        case 'up':
          onNavigate('next-year');
          break;
        case 'down':
          onNavigate('prev-year');
          break;
      }
    }
  }, []);

  return {
    deviceCapabilities,
    currentGesture,
    networkStatus,
    batteryStatus,
    createMobileRenderer,
    getOptimalSettings,
    handleCalendarGesture,
    isMobile: deviceCapabilities.isMobile,
    isLowEndDevice: deviceCapabilities.isLowEndDevice,
    hasSlowConnection: deviceCapabilities.hasSlowConnection,
    shouldUseLowDataMode: networkManager.shouldUseLowDataMode(),
    shouldReduceAnimations: batteryManager.shouldReduceAnimations(),
    shouldReduceBackgroundActivity: batteryManager.shouldReduceBackgroundActivity()
  };
};

export default useCalendarMobileOptimization;