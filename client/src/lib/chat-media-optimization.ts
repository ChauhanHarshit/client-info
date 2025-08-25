/**
 * Chat Real-time Optimization System
 * 
 * Handles real-time updates, presence indicators, and connection management
 * without requiring WebSocket changes to existing infrastructure
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Types
interface PresenceData {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  isTyping: boolean;
  typingIn?: string;
}

interface RealtimeConfig {
  pollInterval?: number;
  presenceInterval?: number;
  typingDebounceTime?: number;
  maxReconnectAttempts?: number;
  enablePresence?: boolean;
  enableTypingIndicators?: boolean;
}

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;
}

/**
 * Real-time Polling Manager
 * Optimized polling system with intelligent intervals
 */
export class ChatRealtimePollingManager {
  private activePolls = new Map<string, NodeJS.Timeout>();
  private pollIntervals = new Map<string, number>();
  private lastActivity = new Map<string, number>();
  private queryClient: any;
  private defaultInterval: number;
  private adaptivePolling: boolean;
  
  constructor(queryClient: any, config: RealtimeConfig = {}) {
    this.queryClient = queryClient;
    this.defaultInterval = config.pollInterval || 2000;
    this.adaptivePolling = true;
  }
  
  /**
   * Start polling for a chat
   */
  startPolling(chatId: string, customInterval?: number): void {
    if (this.activePolls.has(chatId)) {
      this.stopPolling(chatId);
    }
    
    const interval = customInterval || this.getAdaptiveInterval(chatId);
    this.pollIntervals.set(chatId, interval);
    
    const pollFunction = () => {
      this.pollChat(chatId);
      
      // Schedule next poll with potentially updated interval
      const nextInterval = this.getAdaptiveInterval(chatId);
      if (nextInterval !== this.pollIntervals.get(chatId)) {
        this.pollIntervals.set(chatId, nextInterval);
        this.stopPolling(chatId);
        this.startPolling(chatId, nextInterval);
      } else {
        const timeoutId = setTimeout(pollFunction, nextInterval);
        this.activePolls.set(chatId, timeoutId);
      }
    };
    
    const timeoutId = setTimeout(pollFunction, interval);
    this.activePolls.set(chatId, timeoutId);
  }
  
  /**
   * Stop polling for a chat
   */
  stopPolling(chatId: string): void {
    const timeoutId = this.activePolls.get(chatId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activePolls.delete(chatId);
    }
    this.pollIntervals.delete(chatId);
  }
  
  /**
   * Update activity timestamp
   */
  updateActivity(chatId: string): void {
    this.lastActivity.set(chatId, Date.now());
  }
  
  /**
   * Get adaptive polling interval
   */
  private getAdaptiveInterval(chatId: string): number {
    if (!this.adaptivePolling) {
      return this.defaultInterval;
    }
    
    const lastActivity = this.lastActivity.get(chatId) || 0;
    const timeSinceActivity = Date.now() - lastActivity;
    
    // Adaptive intervals based on activity
    if (timeSinceActivity < 30000) { // 30 seconds
      return 1000; // 1 second for active chats
    } else if (timeSinceActivity < 300000) { // 5 minutes
      return 3000; // 3 seconds for recently active
    } else if (timeSinceActivity < 900000) { // 15 minutes
      return 10000; // 10 seconds for inactive
    } else {
      return 30000; // 30 seconds for very inactive
    }
  }
  
  /**
   * Poll individual chat
   */
  private async pollChat(chatId: string): Promise<void> {
    try {
      // Invalidate queries to trigger fresh data fetch
      await this.queryClient.invalidateQueries({ 
        queryKey: [`/api/group-chats/${chatId}/messages`],
        exact: false 
      });
      
      // Also invalidate chat list to update last message
      await this.queryClient.invalidateQueries({ 
        queryKey: ['/api/group-chats'],
        exact: false 
      });
      
    } catch (error) {
      console.error(`Polling failed for chat ${chatId}:`, error);
    }
  }
  
  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    this.activePolls.forEach((timeoutId, chatId) => {
      clearTimeout(timeoutId);
    });
    this.activePolls.clear();
    this.pollIntervals.clear();
  }
  
  /**
   * Get active polls count
   */
  getActivePollsCount(): number {
    return this.activePolls.size;
  }
}

/**
 * Presence Manager
 * Handles user presence and typing indicators
 */
export class ChatPresenceManager {
  private presenceData = new Map<string, PresenceData>();
  private presenceInterval: NodeJS.Timeout | null = null;
  private typingTimeouts = new Map<string, NodeJS.Timeout>();
  private lastPresenceUpdate = 0;
  private updateInterval: number;
  private typingDebounceTime: number;
  
  constructor(config: RealtimeConfig = {}) {
    this.updateInterval = config.presenceInterval || 10000; // 10 seconds
    this.typingDebounceTime = config.typingDebounceTime || 3000; // 3 seconds
  }
  
  /**
   * Start presence tracking
   */
  startPresenceTracking(): void {
    if (this.presenceInterval) return;
    
    this.presenceInterval = setInterval(() => {
      this.updatePresence();
    }, this.updateInterval);
    
    // Initial update
    this.updatePresence();
  }
  
  /**
   * Stop presence tracking
   */
  stopPresenceTracking(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }
  
  /**
   * Update user presence
   */
  private async updatePresence(): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastPresenceUpdate < this.updateInterval / 2) {
        return; // Too frequent updates
      }
      
      // Here you would typically send a heartbeat to the server
      // For now, we'll just update local presence
      this.lastPresenceUpdate = now;
      
      // Clean up old presence data
      this.cleanupPresenceData();
      
    } catch (error) {
      console.error('Presence update failed:', error);
    }
  }
  
  /**
   * Set typing indicator
   */
  setTyping(userId: string, chatId: string, isTyping: boolean): void {
    const key = `${userId}:${chatId}`;
    
    if (isTyping) {
      // Clear existing timeout
      const existingTimeout = this.typingTimeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Set typing status
      this.presenceData.set(userId, {
        ...this.presenceData.get(userId),
        userId,
        status: 'online',
        lastSeen: new Date(),
        isTyping: true,
        typingIn: chatId
      } as PresenceData);
      
      // Auto-clear typing after debounce time
      const timeout = setTimeout(() => {
        this.setTyping(userId, chatId, false);
      }, this.typingDebounceTime);
      
      this.typingTimeouts.set(key, timeout);
    } else {
      // Clear typing status
      const currentData = this.presenceData.get(userId);
      if (currentData) {
        this.presenceData.set(userId, {
          ...currentData,
          isTyping: false,
          typingIn: undefined
        });
      }
      
      // Clear timeout
      const timeout = this.typingTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }
  }
  
  /**
   * Get presence data for user
   */
  getPresence(userId: string): PresenceData | null {
    return this.presenceData.get(userId) || null;
  }
  
  /**
   * Get typing users for chat
   */
  getTypingUsers(chatId: string): PresenceData[] {
    const typingUsers: PresenceData[] = [];
    
    this.presenceData.forEach(presence => {
      if (presence.isTyping && presence.typingIn === chatId) {
        typingUsers.push(presence);
      }
    });
    
    return typingUsers;
  }
  
  /**
   * Clean up old presence data
   */
  private cleanupPresenceData(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    this.presenceData.forEach((presence, userId) => {
      if (now - presence.lastSeen.getTime() > maxAge) {
        this.presenceData.delete(userId);
      }
    });
  }
}

/**
 * Connection Manager
 * Handles connection state and reconnection logic
 */
export class ChatConnectionManager {
  private connectionState: ConnectionState = {
    isConnected: true,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastError: null
  };
  
  private maxReconnectAttempts: number;
  private reconnectInterval: number = 1000;
  private maxReconnectInterval: number = 30000;
  private listeners: ((state: ConnectionState) => void)[] = [];
  
  constructor(config: RealtimeConfig = {}) {
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.handleConnectionChange(true);
      });
      
      window.addEventListener('offline', () => {
        this.handleConnectionChange(false);
      });
    }
  }
  
  /**
   * Add connection state listener
   */
  addListener(listener: (state: ConnectionState) => void): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove connection state listener
   */
  removeListener(listener: (state: ConnectionState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }
  
  /**
   * Handle connection change
   */
  private handleConnectionChange(isConnected: boolean): void {
    if (isConnected && !this.connectionState.isConnected) {
      this.connectionState = {
        isConnected: true,
        isReconnecting: false,
        reconnectAttempts: 0,
        lastError: null
      };
      
      this.notifyListeners();
    } else if (!isConnected && this.connectionState.isConnected) {
      this.connectionState = {
        ...this.connectionState,
        isConnected: false,
        lastError: 'Connection lost'
      };
      
      this.notifyListeners();
      this.startReconnection();
    }
  }
  
  /**
   * Start reconnection process
   */
  private startReconnection(): void {
    if (this.connectionState.isReconnecting) return;
    
    this.connectionState.isReconnecting = true;
    this.attemptReconnection();
  }
  
  /**
   * Attempt reconnection
   */
  private async attemptReconnection(): Promise<void> {
    if (this.connectionState.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionState.isReconnecting = false;
      this.connectionState.lastError = 'Max reconnection attempts reached';
      this.notifyListeners();
      return;
    }
    
    this.connectionState.reconnectAttempts++;
    this.notifyListeners();
    
    // Wait before next attempt
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.connectionState.reconnectAttempts - 1),
      this.maxReconnectInterval
    );
    
    setTimeout(() => {
      if (navigator.onLine) {
        this.handleConnectionChange(true);
      } else {
        this.attemptReconnection();
      }
    }, delay);
  }
  
  /**
   * Notify listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.connectionState);
    });
  }
}

/**
 * Message Sync Manager
 * Handles message synchronization and conflict resolution
 */
export class ChatMessageSyncManager {
  private syncQueue = new Map<string, any[]>();
  private syncInterval: NodeJS.Timeout | null = null;
  private queryClient: any;
  private isProcessing = false;
  
  constructor(queryClient: any) {
    this.queryClient = queryClient;
  }
  
  /**
   * Start message sync
   */
  startSync(): void {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      this.processSync();
    }, 5000); // Sync every 5 seconds
  }
  
  /**
   * Stop message sync
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Add message to sync queue
   */
  queueMessage(chatId: string, message: any): void {
    if (!this.syncQueue.has(chatId)) {
      this.syncQueue.set(chatId, []);
    }
    
    this.syncQueue.get(chatId)!.push(message);
  }
  
  /**
   * Process sync queue
   */
  private async processSync(): Promise<void> {
    if (this.isProcessing || this.syncQueue.size === 0) return;
    
    this.isProcessing = true;
    
    try {
      const syncs = Array.from(this.syncQueue.entries());
      this.syncQueue.clear();
      
      for (const [chatId, messages] of syncs) {
        await this.syncChatMessages(chatId, messages);
      }
    } catch (error) {
      console.error('Message sync failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Sync messages for a chat
   */
  private async syncChatMessages(chatId: string, messages: any[]): Promise<void> {
    try {
      // Invalidate queries to get fresh data
      await this.queryClient.invalidateQueries({ 
        queryKey: [`/api/group-chats/${chatId}/messages`] 
      });
      
      // Process each message
      for (const message of messages) {
        await this.processSyncMessage(chatId, message);
      }
    } catch (error) {
      console.error(`Chat sync failed for ${chatId}:`, error);
    }
  }
  
  /**
   * Process individual sync message
   */
  private async processSyncMessage(chatId: string, message: any): Promise<void> {
    // Here you would implement message conflict resolution
    // For now, we'll just ensure the cache is updated
    
    this.queryClient.setQueryData(
      [`/api/group-chats/${chatId}/messages`],
      (oldData: any[]) => {
        if (!oldData) return [message];
        
        // Check if message already exists
        const exists = oldData.some(msg => msg.id === message.id);
        if (exists) return oldData;
        
        // Add new message
        return [...oldData, message].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    );
  }
}

/**
 * Real-time Chat Optimization Hook
 * Main hook for real-time features
 */
export function useChatRealtimeOptimization(
  chatId: string | null,
  userId: string | null,
  config: RealtimeConfig = {}
) {
  const queryClient = useQueryClient();
  const {
    enablePresence = true,
    enableTypingIndicators = true,
    pollInterval = 2000,
    typingDebounceTime = 3000
  } = config;
  
  // Initialize managers
  const pollingManager = useRef<ChatRealtimePollingManager | null>(null);
  const presenceManager = useRef<ChatPresenceManager | null>(null);
  const connectionManager = useRef<ChatConnectionManager | null>(null);
  const messageSyncManager = useRef<ChatMessageSyncManager | null>(null);
  
  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: true,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastError: null
  });
  const [typingUsers, setTypingUsers] = useState<PresenceData[]>([]);
  
  // Initialize managers
  useEffect(() => {
    if (!pollingManager.current) {
      pollingManager.current = new ChatRealtimePollingManager(queryClient, config);
    }
    
    if (enablePresence && !presenceManager.current) {
      presenceManager.current = new ChatPresenceManager(config);
      presenceManager.current.startPresenceTracking();
    }
    
    if (!connectionManager.current) {
      connectionManager.current = new ChatConnectionManager(config);
      connectionManager.current.addListener(setConnectionState);
    }
    
    if (!messageSyncManager.current) {
      messageSyncManager.current = new ChatMessageSyncManager(queryClient);
      messageSyncManager.current.startSync();
    }
    
    return () => {
      pollingManager.current?.stopAllPolling();
      presenceManager.current?.stopPresenceTracking();
      messageSyncManager.current?.stopSync();
    };
  }, [queryClient, config, enablePresence]);
  
  // Start/stop polling based on active chat
  useEffect(() => {
    if (chatId && pollingManager.current) {
      pollingManager.current.startPolling(chatId);
      
      return () => {
        pollingManager.current?.stopPolling(chatId);
      };
    }
  }, [chatId]);
  
  // Update typing users
  useEffect(() => {
    if (chatId && presenceManager.current && enableTypingIndicators) {
      const updateTypingUsers = () => {
        const users = presenceManager.current!.getTypingUsers(chatId);
        setTypingUsers(users);
      };
      
      updateTypingUsers();
      
      // Update every second
      const interval = setInterval(updateTypingUsers, 1000);
      
      return () => clearInterval(interval);
    }
  }, [chatId, enableTypingIndicators]);
  
  // Update activity when user interacts
  const updateActivity = useCallback(() => {
    if (chatId && pollingManager.current) {
      pollingManager.current.updateActivity(chatId);
    }
  }, [chatId]);
  
  // Set typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    if (chatId && userId && presenceManager.current && enableTypingIndicators) {
      presenceManager.current.setTyping(userId, chatId, isTyping);
    }
  }, [chatId, userId, enableTypingIndicators]);
  
  // Send message with sync
  const sendMessageWithSync = useCallback(async (message: any) => {
    if (chatId && messageSyncManager.current) {
      messageSyncManager.current.queueMessage(chatId, message);
    }
  }, [chatId]);
  
  // Get presence data
  const getPresence = useCallback((targetUserId: string) => {
    return presenceManager.current?.getPresence(targetUserId) || null;
  }, []);
  
  return {
    // Connection state
    connectionState,
    
    // Presence
    typingUsers,
    getPresence,
    
    // Actions
    updateActivity,
    setTyping,
    sendMessageWithSync,
    
    // Managers for advanced usage
    pollingManager: pollingManager.current,
    presenceManager: presenceManager.current,
    connectionManager: connectionManager.current,
    messageSyncManager: messageSyncManager.current,
  };
}

/**
 * Typing Indicator Component
 * Shows typing indicators for chat
 */
export function TypingIndicator({ users }: { users: PresenceData[] }) {
  if (users.length === 0) return null;
  
  const names = users.map(user => user.userId).join(', ');
  
  return (
    <div className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-500">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
      <span>
        {users.length === 1 ? `${names} is typing...` : `${names} are typing...`}
      </span>
    </div>
  );
}

/**
 * Connection Status Component
 * Shows connection status indicator
 */
export function ConnectionStatus({ state }: { state: ConnectionState }) {
  if (state.isConnected && !state.isReconnecting) return null;
  
  return (
    <div className={`
      px-3 py-1 text-xs font-medium rounded-full
      ${state.isReconnecting 
        ? 'bg-yellow-100 text-yellow-800' 
        : 'bg-red-100 text-red-800'
      }
    `}>
      {state.isReconnecting 
        ? `Reconnecting... (${state.reconnectAttempts}/${5})`
        : 'Disconnected'
      }
    </div>
  );
}

/**
 * Export all real-time optimization utilities
 */
export {
  ChatRealtimePollingManager,
  ChatPresenceManager,
  ChatConnectionManager,
  ChatMessageSyncManager
};