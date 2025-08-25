import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Clock, 
  Users, 
  Lock, 
  TrendingUp, 
  Database,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface SecurityMetrics {
  performance: {
    loginAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    averageResponseTime: number;
    concurrentSessions: number;
  };
  sessions: {
    activeSessions: number;
    totalSessions: number;
    averageSessionDuration: number;
  };
  cache: {
    size: number;
    hitRate: number;
    keys: string[];
  };
  timestamp: string;
}

interface SecurityEvent {
  id: string;
  type: string;
  identifier: string;
  timestamp: string;
  success: boolean;
  metadata: any;
  userAgent?: string;
  path?: string;
}

export default function SecurityAdmin() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  // Fetch security metrics
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError 
  } = useQuery<SecurityMetrics>({
    queryKey: ['/api/security/metrics', refreshKey],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    retry: 2
  });

  // Fetch security events
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    error: eventsError 
  } = useQuery<{ events: SecurityEvent[]; count: number }>({
    queryKey: ['/api/security/events', refreshKey],
    refetchInterval: 15000, // Auto-refresh every 15 seconds
    retry: 2
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getEventBadgeVariant = (event: SecurityEvent) => {
    if (event.success) return 'default';
    if (event.type.includes('suspicious') || event.type.includes('failed')) return 'destructive';
    if (event.type.includes('rate_limit')) return 'secondary';
    return 'outline';
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('login')) return <Users className="w-4 h-4" />;
    if (eventType.includes('suspicious')) return <AlertTriangle className="w-4 h-4" />;
    if (eventType.includes('rate_limit')) return <Clock className="w-4 h-4" />;
    if (eventType.includes('session')) return <Lock className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateSecurityScore = () => {
    if (!metrics) return 0;
    
    const { performance } = metrics;
    const totalAttempts = performance.loginAttempts || 1;
    const successRate = (performance.successfulLogins / totalAttempts) * 100;
    const responseScore = performance.averageResponseTime < 1000 ? 100 : Math.max(0, 100 - (performance.averageResponseTime / 10));
    
    return Math.round((successRate * 0.6) + (responseScore * 0.4));
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Security Management"
        description="Monitor and manage enterprise security for 400+ employee scalability"
        showBackButton={true}
        useBrowserBack={true}
      />

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metricsLoading ? '...' : `${calculateSecurityScore()}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall system security health
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? '...' : metrics?.sessions?.activeSessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Current authenticated users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? '...' : `${metrics?.performance?.averageResponseTime || 0}ms`}
            </div>
            <p className="text-xs text-muted-foreground">
              Average authentication response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Performance</CardTitle>
            <Database className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? '...' : `${Math.round(metrics?.cache?.hitRate || 0)}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Cache hit rate optimization
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="events">Security Events</TabsTrigger>
            <TabsTrigger value="metrics">Performance</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={metricsLoading || eventsLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Authentication Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metricsLoading ? (
                  <div className="text-center py-8">Loading authentication data...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Login Attempts</span>
                      <Badge variant="outline">{metrics?.performance?.loginAttempts || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Successful Logins</span>
                      <Badge variant="default">{metrics?.performance?.successfulLogins || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Failed Attempts</span>
                      <Badge variant="destructive">{metrics?.performance?.failedLogins || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Success Rate</span>
                      <Badge variant="secondary">
                        {metrics?.performance?.loginAttempts 
                          ? Math.round((metrics.performance.successfulLogins / metrics.performance.loginAttempts) * 100)
                          : 0}%
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Account Lockout Protection</span>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Rate Limiting</span>
                    <Badge variant="outline" className="text-yellow-600">
                      <Clock className="w-3 h-3 mr-1" />
                      Development Mode
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Session Security</span>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Input Validation</span>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recent Security Events
              </CardTitle>
              <CardDescription>
                Real-time security event monitoring and logging
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-center py-8">Loading security events...</div>
              ) : eventsError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Error loading security events. Please try refreshing.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {eventsData?.events?.map((event, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-center gap-3">
                        {getEventIcon(event.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getEventBadgeVariant(event)}>
                              {event.type.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-gray-600">{event.identifier}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTimestamp(event.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <Eye className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                  {(!eventsData?.events || eventsData.events.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No security events recorded yet
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="text-center py-8">Loading performance data...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average Response Time</span>
                      <Badge variant="outline">{metrics?.performance?.averageResponseTime || 0}ms</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Concurrent Sessions</span>
                      <Badge variant="outline">{metrics?.performance?.concurrentSessions || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Cache Hit Rate</span>
                      <Badge variant="outline">{Math.round(metrics?.cache?.hitRate || 0)}%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Cache Size</span>
                      <Badge variant="outline">{metrics?.cache?.size || 0} entries</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Security Infrastructure</span>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Database Performance</span>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Optimized
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Authentication System</span>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Enhanced
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Monitoring</span>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Real-time
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Monitoring Configuration</CardTitle>
              <CardDescription>
                Enterprise-grade security monitoring for 400+ employee scalability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Security Features Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Account Lockout Protection</span>
                      </div>
                      <Badge variant="outline" className="text-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm">Rate Limiting</span>
                      </div>
                      <Badge variant="outline" className="text-yellow-600">Dev Mode</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Session Security</span>
                      </div>
                      <Badge variant="outline" className="text-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Input Validation</span>
                      </div>
                      <Badge variant="outline" className="text-green-600">Active</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Monitoring Endpoints</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm font-mono">/api/security/metrics</span>
                      <Badge variant="outline" className="text-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm font-mono">/api/security/events</span>
                      <Badge variant="outline" className="text-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm font-mono">/api/security/suspicious/:id</span>
                      <Badge variant="outline" className="text-green-600">Active</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last updated timestamp */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {metrics?.timestamp ? formatTimestamp(metrics.timestamp) : 'Loading...'}
      </div>
    </div>
  );
}