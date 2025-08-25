import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, TrendingDown, Calculator, Settings, DollarSign, Users, AlertCircle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function GuaranteeTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dismissReason, setDismissReason] = useState("");

  // Fetch clients at risk
  const { data: clientsAtRisk, isLoading: loadingClients } = useQuery({
    queryKey: ["/api/guarantee-tracking/clients-at-risk"],
  });

  // Fetch tracking metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["/api/guarantee-tracking/metrics"],
  });

  // Fetch alerts
  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ["/api/guarantee-tracking/alerts"],
  });

  // Fetch settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["/api/guarantee-tracking/settings"],
  });

  // Run calculations mutation
  const runCalculations = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/guarantee-tracking/run-calculations", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Calculations Updated",
        description: "Guarantee tracking calculations have been refreshed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guarantee-tracking/clients-at-risk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guarantee-tracking/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guarantee-tracking/alerts"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run calculations.",
        variant: "destructive",
      });
    },
  });

  // Dismiss alert mutation
  const dismissAlert = useMutation({
    mutationFn: async ({ alertId, dismissedBy, actionTaken }: { alertId: number; dismissedBy: string; actionTaken?: string }) => {
      return await apiRequest(`/api/guarantee-tracking/alerts/${alertId}/dismiss`, {
        method: "POST",
        body: JSON.stringify({ dismissedBy, actionTaken }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Alert Dismissed",
        description: "Alert has been dismissed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guarantee-tracking/alerts"] });
      setDismissReason("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss alert.",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (settingsData: any) => {
      return await apiRequest("/api/guarantee-tracking/settings", {
        method: "POST",
        body: JSON.stringify(settingsData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Guarantee tracking settings have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guarantee-tracking/settings"] });
      setShowSettings(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatPercentage = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num.toFixed(1)}%`;
  };

  if (loadingClients || loadingMetrics || loadingAlerts || loadingSettings) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guarantee Tracking</h1>
          <p className="text-muted-foreground">
            Monitor clients at risk of missing their guaranteed earnings targets
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runCalculations.mutate()}
            disabled={runCalculations.isPending}
          >
            <Calculator className="w-4 h-4 mr-2" />
            {runCalculations.isPending ? "Calculating..." : "Refresh Calculations"}
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalClientsTracked || 0}</div>
            <p className="text-xs text-muted-foreground">Clients with guarantees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics?.clientsAtRisk || 0}</div>
            <p className="text-xs text-muted-foreground">Behind target pace</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics?.criticalRisk || 0}</div>
            <p className="text-xs text-muted-foreground">25%+ behind target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(metrics?.averagePerformance || 0)}</div>
            <p className="text-xs text-muted-foreground">Of guarantee targets</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="at-risk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="at-risk">Clients at Risk</TabsTrigger>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="at-risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clients Not on Track</CardTitle>
              <CardDescription>
                Clients whose projected monthly earnings are below their guaranteed targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!clientsAtRisk || clientsAtRisk.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">All Clients on Track</h3>
                  <p className="text-muted-foreground">No clients are currently at risk of missing their guarantees.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Guarantee</TableHead>
                      <TableHead>Current Earnings</TableHead>
                      <TableHead>Projected Total</TableHead>
                      <TableHead>Behind Target</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientsAtRisk.map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{client.clientName}</div>
                            <div className="text-sm text-muted-foreground">@{client.clientUsername}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(client.guaranteedEarnings)}</TableCell>
                        <TableCell>{formatCurrency(client.currentMonthEarnings)}</TableCell>
                        <TableCell>{formatCurrency(client.projectedMonthlyTotal)}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {formatPercentage(client.percentBehindTarget)} behind
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {client.lastCalculatedAt && 
                            formatDistanceToNow(new Date(client.lastCalculatedAt), { addSuffix: true })
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClient(client)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                System-generated alerts for clients at risk
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!alerts || alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Active Alerts</h3>
                  <p className="text-muted-foreground">All alerts have been resolved or dismissed.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Alert Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert: any) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.clientName}</div>
                            <div className="text-sm text-muted-foreground">@{alert.clientUsername}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {alert.alertType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Dismiss
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Dismiss Alert</DialogTitle>
                                <DialogDescription>
                                  Provide details about the action taken to address this alert.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="action">Action Taken</Label>
                                  <Textarea
                                    id="action"
                                    placeholder="Describe what actions were taken..."
                                    value={dismissReason}
                                    onChange={(e) => setDismissReason(e.target.value)}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    onClick={() => {
                                      dismissAlert.mutate({
                                        alertId: alert.id,
                                        dismissedBy: "current_user", // Should be actual user
                                        actionTaken: dismissReason,
                                      });
                                    }}
                                    disabled={dismissAlert.isPending}
                                  >
                                    {dismissAlert.isPending ? "Dismissing..." : "Dismiss Alert"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Client Details Modal */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedClient.clientName} - Performance Details</DialogTitle>
              <DialogDescription>
                Detailed breakdown of earnings and projections
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Guaranteed Earnings</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedClient.guaranteedEarnings)}
                  </div>
                </div>
                <div>
                  <Label>Current Month Earnings</Label>
                  <div className="text-2xl font-bold">
                    {formatCurrency(selectedClient.currentMonthEarnings)}
                  </div>
                </div>
                <div>
                  <Label>Projected Monthly Total</Label>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(selectedClient.projectedMonthlyTotal)}
                  </div>
                </div>
                <div>
                  <Label>Behind Target</Label>
                  <div className="text-2xl font-bold text-red-600">
                    {formatPercentage(selectedClient.percentBehindTarget)}
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div className="font-medium text-yellow-800">Risk Assessment</div>
                </div>
                <p className="text-yellow-700">{selectedClient.flagReason}</p>
              </div>

              <div className="text-sm text-muted-foreground">
                Last calculated: {selectedClient.lastCalculatedAt && 
                  formatDistanceToNow(new Date(selectedClient.lastCalculatedAt), { addSuffix: true })
                }
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Guarantee Tracking Settings</DialogTitle>
              <DialogDescription>
                Configure thresholds and notification preferences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="flagThreshold">Flag Threshold (%)</Label>
                <Input
                  id="flagThreshold"
                  type="number"
                  defaultValue={settings?.flagThresholdPercent || "10"}
                  placeholder="10"
                />
              </div>
              <div>
                <Label htmlFor="criticalThreshold">Critical Threshold (%)</Label>
                <Input
                  id="criticalThreshold"
                  type="number"
                  defaultValue={settings?.criticalThresholdPercent || "25"}
                  placeholder="25"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const flagThreshold = (document.getElementById('flagThreshold') as HTMLInputElement)?.value;
                    const criticalThreshold = (document.getElementById('criticalThreshold') as HTMLInputElement)?.value;
                    
                    updateSettings.mutate({
                      flagThresholdPercent: flagThreshold,
                      criticalThresholdPercent: criticalThreshold,
                    });
                  }}
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}