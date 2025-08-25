/**
 * Calendar Real-time Optimization System
 * Implements WebSocket connections, background sync, and optimistic updates
 * Category 3: Real-time Data Synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// WebSocket Connection Manager
class CalendarWebSocketManager {
  private static instance: CalendarWebSocketManager;
  private connections = new Map<string, WebSocket>();
  private messageHandlers = new Map<string, ((data: any) => void)[]>();
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  static getInstance(): CalendarWebSocketManager {
    if (!CalendarWebSocketManager.instance) {
      CalendarWebSocketManager.instance = new CalendarWebSocketManager();
    }
    return CalendarWebSocketManager.instance;
  }

  // Connect to WebSocket for real-time calendar updates
  connect(username: string, onMessage: (data: any) => void): void {
    const connectionKey = `calendar_${username}`;
    
    if (this.connections.has(connectionKey)) {
      // Add message handler to existing connection
      const handlers = this.messageHandlers.get(connectionKey) || [];
      handlers.push(onMessage);
      this.messageHandlers.set(connectionKey, handlers);
      return;
    }

    try {
      // Create WebSocket connection
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/calendar/${username}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Calendar WebSocket connected for:', username);
        this.reconnectAttempts.set(connectionKey, 0);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const handlers = this.messageHandlers.get(connectionKey) || [];
          handlers.forEach(handler => handler(data));
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onclose = () => {
        console.log('Calendar WebSocket disconnected for:', username);
        this.connections.delete(connectionKey);
        this.attemptReconnect(connectionKey, username);
      };

      ws.onerror = (error) => {
        console.error('Calendar WebSocket error:', error);
      };

      this.connections.set(connectionKey, ws);
      this.messageHandlers.set(connectionKey, [onMessage]);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      // Fallback to polling if WebSocket fails
      this.fallbackToPolling(username, onMessage);
    }
  }

  // Attempt to reconnect WebSocket
  private attemptReconnect(connectionKey: string, username: string): void {
    const attempts = this.reconnectAttempts.get(connectionKey) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        console.log(`Attempting to reconnect WebSocket for ${username}, attempt ${attempts + 1}`);
        this.reconnectAttempts.set(connectionKey, attempts + 1);
        
        const handlers = this.messageHandlers.get(connectionKey) || [];
        if (handlers.length > 0) {
          this.connect(username, handlers[0]);
        }
      }, this.reconnectDelay * Math.pow(2, attempts)); // Exponential backoff
    }
  }

  // Fallback to polling when WebSocket is not available
  private fallbackToPolling(username: string, onMessage: (data: any) => void): void {
    const pollInterval = 30000; // 30 seconds
    const connectionKey = `calendar_${username}`;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/creator/${username}/events/changes`);
        if (response.ok) {
          const data = await response.json();
          if (data.changes && data.changes.length > 0) {
            onMessage(data);
          }
        }
      } catch (error) {
        console.warn('Polling failed:', error);
      }
    };

    const intervalId = setInterval(poll, pollInterval);
    
    // Store interval ID for cleanup
    this.messageHandlers.set(connectionKey, [onMessage]);
    (this.connections as any).set(connectionKey, { intervalId, type: 'polling' });
  }

  // Disconnect WebSocket
  disconnect(username: string): void {
    const connectionKey = `calendar_${username}`;
    const connection = this.connections.get(connectionKey);
    
    if (connection) {
      if (connection instanceof WebSocket) {
        connection.close();
      } else if ((connection as any).type === 'polling') {
        clearInterval((connection as any).intervalId);
      }
      
      this.connections.delete(connectionKey);
      this.messageHandlers.delete(connectionKey);
      this.reconnectAttempts.delete(connectionKey);
    }
  }

  // Send message through WebSocket
  send(username: string, message: any): void {
    const connectionKey = `calendar_${username}`;
    const connection = this.connections.get(connectionKey);
    
    if (connection instanceof WebSocket && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not available for sending message');
    }
  }

  // Get connection status
  getConnectionStatus(username: string): 'connected' | 'connecting' | 'disconnected' | 'polling' {
    const connectionKey = `calendar_${username}`;
    const connection = this.connections.get(connectionKey);
    
    if (!connection) return 'disconnected';
    
    if (connection instanceof WebSocket) {
      switch (connection.readyState) {
        case WebSocket.CONNECTING: return 'connecting';
        case WebSocket.OPEN: return 'connected';
        case WebSocket.CLOSING:
        case WebSocket.CLOSED: return 'disconnected';
        default: return 'disconnected';
      }
    } else if ((connection as any).type === 'polling') {
      return 'polling';
    }
    
    return 'disconnected';
  }
}

// Background Sync Manager
class CalendarBackgroundSyncManager {
  private static instance: CalendarBackgroundSyncManager;
  private syncIntervals = new Map<string, NodeJS.Timeout>();
  private syncCallbacks = new Map<string, (() => Promise<void>)[]>();
  private defaultSyncInterval = 30000; // 30 seconds
  private isVisible = true;
  private isOnline = navigator.onLine;

  static getInstance(): CalendarBackgroundSyncManager {
    if (!CalendarBackgroundSyncManager.instance) {
      CalendarBackgroundSyncManager.instance = new CalendarBackgroundSyncManager();
      CalendarBackgroundSyncManager.instance.initializeVisibilityHandlers();
    }
    return CalendarBackgroundSyncManager.instance;
  }

  // Initialize visibility and online status handlers
  private initializeVisibilityHandlers(): void {
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      this.adjustSyncFrequency();
    });

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.resumeAllSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.pauseAllSync();
    });
  }

  // Start background sync for a user
  startSync(username: string, syncCallback: () => Promise<void>, interval?: number): void {
    const actualInterval = interval || this.defaultSyncInterval;
    const syncKey = `calendar_sync_${username}`;
    
    // Add callback to list
    const callbacks = this.syncCallbacks.get(syncKey) || [];
    callbacks.push(syncCallback);
    this.syncCallbacks.set(syncKey, callbacks);

    // Start sync interval if not already running
    if (!this.syncIntervals.has(syncKey)) {
      const intervalId = setInterval(async () => {
        if (this.isVisible && this.isOnline) {
          await this.executeSync(syncKey);
        }
      }, actualInterval);
      
      this.syncIntervals.set(syncKey, intervalId);
    }
  }

  // Stop background sync for a user
  stopSync(username: string): void {
    const syncKey = `calendar_sync_${username}`;
    const intervalId = this.syncIntervals.get(syncKey);
    
    if (intervalId) {
      clearInterval(intervalId);
      this.syncIntervals.delete(syncKey);
    }
    
    this.syncCallbacks.delete(syncKey);
  }

  // Execute sync for a specific key
  private async executeSync(syncKey: string): Promise<void> {
    const callbacks = this.syncCallbacks.get(syncKey) || [];
    
    await Promise.all(callbacks.map(async (callback) => {
      try {
        await callback();
      } catch (error) {
        console.error('Background sync error:', error);
      }
    }));
  }

  // Adjust sync frequency based on visibility
  private adjustSyncFrequency(): void {
    const multiplier = this.isVisible ? 1 : 3; // Slow down when not visible
    
    for (const [syncKey, intervalId] of this.syncIntervals) {
      clearInterval(intervalId);
      
      const newInterval = setInterval(async () => {
        if (this.isVisible && this.isOnline) {
          await this.executeSync(syncKey);
        }
      }, this.defaultSyncInterval * multiplier);
      
      this.syncIntervals.set(syncKey, newInterval);
    }
  }

  // Resume all sync operations
  private resumeAllSync(): void {
    for (const syncKey of this.syncIntervals.keys()) {
      this.executeSync(syncKey);
    }
  }

  // Pause all sync operations
  private pauseAllSync(): void {
    // Sync operations will be skipped by the visibility/online checks
  }

  // Get sync status
  getSyncStatus(username: string): { isActive: boolean; lastSync: Date | null } {
    const syncKey = `calendar_sync_${username}`;
    return {
      isActive: this.syncIntervals.has(syncKey),
      lastSync: null // Could be enhanced to track last sync time
    };
  }
}

// Optimistic Update Manager
class CalendarOptimisticUpdateManager {
  private static instance: CalendarOptimisticUpdateManager;
  private pendingUpdates = new Map<string, { data: any; timestamp: number; retryCount: number }>();
  private maxRetries = 3;
  private retryDelay = 1000;

  static getInstance(): CalendarOptimisticUpdateManager {
    if (!CalendarOptimisticUpdateManager.instance) {
      CalendarOptimisticUpdateManager.instance = new CalendarOptimisticUpdateManager();
    }
    return CalendarOptimisticUpdateManager.instance;
  }

  // Apply optimistic update
  applyOptimisticUpdate(
    updateId: string,
    data: any,
    onSuccess: (data: any) => void,
    onError: (error: any) => void
  ): void {
    // Apply update immediately
    onSuccess(data);
    
    // Store for potential rollback
    this.pendingUpdates.set(updateId, {
      data,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    // Attempt to confirm update with server
    this.confirmUpdate(updateId, data, onSuccess, onError);
  }

  // Confirm update with server
  private async confirmUpdate(
    updateId: string,
    data: any,
    onSuccess: (data: any) => void,
    onError: (error: any) => void
  ): Promise<void> {
    try {
      const response = await fetch('/api/calendar/events/optimistic-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateId, data })
      });

      if (response.ok) {
        const result = await response.json();
        this.pendingUpdates.delete(updateId);
        onSuccess(result);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      const update = this.pendingUpdates.get(updateId);
      if (update && update.retryCount < this.maxRetries) {
        // Retry with exponential backoff
        update.retryCount++;
        setTimeout(() => {
          this.confirmUpdate(updateId, data, onSuccess, onError);
        }, this.retryDelay * Math.pow(2, update.retryCount));
      } else {
        // Rollback optimistic update
        this.pendingUpdates.delete(updateId);
        onError(error);
      }
    }
  }

  // Get pending updates
  getPendingUpdates(): Map<string, { data: any; timestamp: number; retryCount: number }> {
    return new Map(this.pendingUpdates);
  }

  // Clear pending updates
  clearPendingUpdates(): void {
    this.pendingUpdates.clear();
  }
}

// Main real-time optimization hook
export const useCalendarRealTimeOptimization = (username: string) => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'polling'>('disconnected');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, any>>(new Map());
  
  const queryClient = useQueryClient();
  const wsManager = CalendarWebSocketManager.getInstance();
  const syncManager = CalendarBackgroundSyncManager.getInstance();
  const optimisticManager = CalendarOptimisticUpdateManager.getInstance();
  
  const syncCallbackRef = useRef<(() => Promise<void>) | null>(null);

  // Handle real-time messages
  const handleRealTimeMessage = useCallback((data: any) => {
    if (data.type === 'calendar_update') {
      // Invalidate and refetch calendar data
      queryClient.invalidateQueries({ queryKey: [`/api/creator/${username}/events`] });
      setLastSync(new Date());
    }
  }, [username, queryClient]);

  // Sync callback for background sync
  const syncCallback = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: [`/api/creator/${username}/events`] });
      setLastSync(new Date());
    } catch (error) {
      console.error('Sync callback error:', error);
    }
  }, [username, queryClient]);

  // Initialize real-time connection
  useEffect(() => {
    if (!username) return;

    syncCallbackRef.current = syncCallback;

    // Connect WebSocket
    wsManager.connect(username, handleRealTimeMessage);
    
    // Start background sync
    syncManager.startSync(username, syncCallback);

    // Update connection status
    const statusInterval = setInterval(() => {
      setConnectionStatus(wsManager.getConnectionStatus(username));
    }, 1000);

    return () => {
      wsManager.disconnect(username);
      syncManager.stopSync(username);
      clearInterval(statusInterval);
    };
  }, [username, handleRealTimeMessage, syncCallback]);

  // Optimistic update function
  const applyOptimisticUpdate = useCallback((updateId: string, data: any) => {
    return new Promise((resolve, reject) => {
      optimisticManager.applyOptimisticUpdate(
        updateId,
        data,
        (result) => {
          // Update local state
          setPendingUpdates(prev => new Map(prev).set(updateId, result));
          resolve(result);
        },
        (error) => {
          // Remove from pending updates
          setPendingUpdates(prev => {
            const newMap = new Map(prev);
            newMap.delete(updateId);
            return newMap;
          });
          reject(error);
        }
      );
    });
  }, [optimisticManager]);

  // Manual sync function
  const syncNow = useCallback(async () => {
    if (syncCallbackRef.current) {
      await syncCallbackRef.current();
    }
  }, []);

  // Send real-time message
  const sendMessage = useCallback((message: any) => {
    wsManager.send(username, message);
  }, [username, wsManager]);

  // Get sync status
  const getSyncStatus = useCallback(() => {
    return syncManager.getSyncStatus(username);
  }, [username, syncManager]);

  return {
    connectionStatus,
    lastSync,
    pendingUpdates,
    applyOptimisticUpdate,
    syncNow,
    sendMessage,
    getSyncStatus,
    isConnected: connectionStatus === 'connected',
    isPolling: connectionStatus === 'polling'
  };
};

export default useCalendarRealTimeOptimization;