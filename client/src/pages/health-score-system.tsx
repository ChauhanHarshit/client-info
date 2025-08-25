import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  Settings, 
  Play, 
  Plus, 
  Edit2, 
  Trash2,
  RefreshCw,
  Info,
  ArrowLeft
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

interface HealthScore {
  id: number;
  clientId: number;
  clientName: string;
  clientUsername: string;
  healthScore: number;
  emoji: string;
  earningsGrowthPercent: string;
  startEarnings: string;
  currentEarnings: string;
  calculationPeriod: string;
  lastCalculatedAt: string;
}

interface HealthScoreRange {
  id: number;
  profileName: string;
  minGrowthPercent: string;
  maxGrowthPercent: string;
  score: number;
  emoji: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

interface HealthScoreAlert {
  id: number;
  clientId: number;
  clientName: string;
  clientUsername: string;
  healthScore: number;
  alertType: string;
  message: string;
  isActive: boolean;
  dismissedAt: string | null;
  dismissedBy: string | null;
  createdAt: string;
}

interface HealthScoreMetrics {
  totalClients: number;
  averageScore: number;
  healthyClients: number;
  atRiskClients: number;
  topPerformers: HealthScore[];
  lowestPerformers: HealthScore[];
}

export default function HealthScoreSystem() {
  const [selectedPeriod, setSelectedPeriod] = useState("30_days");
  const [selectedProfile, setSelectedProfile] = useState("default");
  const [editingRange, setEditingRange] = useState<HealthScoreRange | null>(null);
  const [rangeFormData, setRangeFormData] = useState({
    minGrowthPercent: "",
    maxGrowthPercent: "",
    score: 5,
    emoji: "🙂",
    description: "",
    profileName: "default",
    sortOrder: 0,
  });
  const [showAddRange, setShowAddRange] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Health score data queries
  const { data: healthScores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['/api/health-scores', selectedPeriod],
    queryFn: () => apiRequest(`/api/health-scores?period=${selectedPeriod}`),
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/health-scores/metrics'],
  });

  const { data: ranges = [], isLoading: rangesLoading } = useQuery({
    queryKey: ['/api/health-scores/ranges', selectedProfile],
    queryFn: () => apiRequest(`/api/health-scores/ranges?profile=${selectedProfile}`),
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/health-scores/alerts'],
  });

  // Mutations
  const calculateScoresMutation = useMutation({
    mutationFn: (data: { calculationPeriod: string }) =>
      apiRequest('/api/health-scores/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Health scores calculated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-scores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/health-scores/metrics'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to calculate health scores",
        variant: "destructive",
      });
    },
  });

  const initializeRangesMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/health-scores/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Default health score ranges initialized",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-scores/ranges'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to initialize health score ranges",
        variant: "destructive",
      });
    },
  });

  const createRangeMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/health-scores/ranges', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Health score range created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-scores/ranges'] });
      setShowAddRange(false);
      resetRangeForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create health score range",
        variant: "destructive",
      });
    },
  });

  const updateRangeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/health-scores/ranges/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Health score range updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-scores/ranges'] });
      setEditingRange(null);
      resetRangeForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update health score range",
        variant: "destructive",
      });
    },
  });

  const deleteRangeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/health-scores/ranges/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Health score range deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-scores/ranges'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete health score range",
        variant: "destructive",
      });
    },
  });

  const dismissAlertMutation = useMutation({
    mutationFn: ({ alertId, dismissedBy }: { alertId: number; dismissedBy: string }) =>
      apiRequest(`/api/health-scores/alerts/${alertId}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ dismissedBy }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Alert dismissed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-scores/alerts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss alert",
        variant: "destructive",
      });
    },
  });

  const resetRangeForm = () => {
    setRangeFormData({
      minGrowthPercent: "",
      maxGrowthPercent: "",
      score: 5,
      emoji: "🙂",
      description: "",
      profileName: "default",
      sortOrder: 0,
    });
  };

  const handleEditRange = (range: HealthScoreRange) => {
    setEditingRange(range);
    setRangeFormData({
      minGrowthPercent: range.minGrowthPercent,
      maxGrowthPercent: range.maxGrowthPercent || "",
      score: range.score,
      emoji: range.emoji,
      description: range.description || "",
      profileName: range.profileName,
      sortOrder: range.sortOrder,
    });
  };

  const handleSaveRange = () => {
    if (editingRange) {
      updateRangeMutation.mutate({
        id: editingRange.id,
        data: rangeFormData,
      });
    } else {
      createRangeMutation.mutate(rangeFormData);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    if (score >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return "default";
    if (score >= 6) return "secondary";
    if (score >= 4) return "outline";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Health Score System"
        description="Track and monitor client health scores based on earnings growth with emoji-based visual indicators"
        showBackButton={true}
        backTo="/dashboard"
        actions={
          <Button
            onClick={() => calculateScoresMutation.mutate({ calculationPeriod: selectedPeriod })}
            disabled={calculateScoresMutation.isPending}
            className="flex items-center space-x-2"
          >
            {calculateScoresMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Recalculate Scores</span>
          </Button>
        }
      />
      
      <div className="px-6 pb-6 space-y-6">
        <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Client Scores</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Metrics Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalClients || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Being tracked for health scores
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.averageScore?.toFixed(1) || "0.0"}/10
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall health score average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Healthy Clients</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {metrics?.healthyClients || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Score 7+ (healthy threshold)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Risk Clients</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {metrics?.atRiskClients || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Score ≤3 (requires attention)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top and Bottom Performers */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Clients with highest health scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.topPerformers?.slice(0, 5).map((client: HealthScore) => (
                    <div key={client.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{client.emoji}</span>
                        <div>
                          <p className="font-medium">{client.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {parseFloat(client.earningsGrowthPercent).toFixed(1)}% growth
                          </p>
                        </div>
                      </div>
                      <Badge className={getScoreColor(client.healthScore)}>
                        {client.healthScore}/10
                      </Badge>
                    </div>
                  ))}
                  {(!metrics?.topPerformers || metrics.topPerformers.length === 0) && (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lowest Performers</CardTitle>
                <CardDescription>Clients needing attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.lowestPerformers?.slice(0, 5).map((client: HealthScore) => (
                    <div key={client.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{client.emoji}</span>
                        <div>
                          <p className="font-medium">{client.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {parseFloat(client.earningsGrowthPercent).toFixed(1)}% growth
                          </p>
                        </div>
                      </div>
                      <Badge variant={getScoreBadgeVariant(client.healthScore)}>
                        {client.healthScore}/10
                      </Badge>
                    </div>
                  ))}
                  {(!metrics?.lowestPerformers || metrics.lowestPerformers.length === 0) && (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Client Health Scores</h3>
              <p className="text-sm text-muted-foreground">
                Individual health scores for all tracked clients
              </p>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30_days">30 Days</SelectItem>
                <SelectItem value="90_days">90 Days</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Health Score</TableHead>
                    <TableHead>Growth</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthScores.map((client: HealthScore) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{client.emoji}</span>
                          <div>
                            <p className="font-medium">{client.clientName}</p>
                            <p className="text-sm text-muted-foreground">@{client.clientUsername}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getScoreBadgeVariant(client.healthScore)}>
                          {client.healthScore}/10
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={getScoreColor(client.healthScore)}>
                          {parseFloat(client.earningsGrowthPercent).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>${parseFloat(client.currentEarnings).toLocaleString()}</p>
                          <p className="text-muted-foreground">
                            from ${parseFloat(client.startEarnings).toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(client.lastCalculatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {healthScores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <p>No health scores available</p>
                          <p className="text-sm">Run the calculation to generate health scores</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Health Score Alerts</h3>
            <p className="text-sm text-muted-foreground">
              Active alerts for clients with low health scores or declining trends
            </p>
          </div>

          <div className="space-y-4">
            {alerts.map((alert: HealthScoreAlert) => (
              <Alert key={alert.id}>
                <AlertTriangle className="h-4 w-4" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{alert.clientName}</p>
                      <AlertDescription className="mt-1">
                        {alert.message}
                      </AlertDescription>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dismissAlertMutation.mutate({
                        alertId: alert.id,
                        dismissedBy: "admin"
                      })}
                      disabled={dismissAlertMutation.isPending}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </Alert>
            ))}
            {alerts.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active alerts</p>
                    <p className="text-sm">All clients are performing well</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Health Score Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure scoring ranges and emoji indicators for different growth percentages
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Profile</SelectItem>
                  <SelectItem value="30_day">30 Day Profile</SelectItem>
                  <SelectItem value="90_day">90 Day Profile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => initializeRangesMutation.mutate()}
                disabled={initializeRangesMutation.isPending}
              >
                <Settings className="w-4 h-4 mr-2" />
                Initialize Defaults
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddRange(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Range
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Growth Range</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Emoji</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranges.map((range: HealthScoreRange) => (
                    <TableRow key={range.id}>
                      <TableCell>
                        {range.minGrowthPercent}% - {range.maxGrowthPercent || "∞"}%
                      </TableCell>
                      <TableCell>
                        <Badge>{range.score}/10</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-2xl">{range.emoji}</span>
                      </TableCell>
                      <TableCell>{range.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRange(range)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRangeMutation.mutate(range.id)}
                            disabled={deleteRangeMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ranges.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <p>No scoring ranges configured</p>
                          <p className="text-sm">Add ranges or initialize defaults to get started</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Range Dialog */}
      <Dialog open={showAddRange || !!editingRange} onOpenChange={(open) => {
        if (!open) {
          setShowAddRange(false);
          setEditingRange(null);
          resetRangeForm();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRange ? "Edit Health Score Range" : "Add Health Score Range"}
            </DialogTitle>
            <DialogDescription>
              Configure the growth percentage range and corresponding score with emoji indicator
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minGrowth">Min Growth %</Label>
                <Input
                  id="minGrowth"
                  type="number"
                  value={rangeFormData.minGrowthPercent}
                  onChange={(e) => setRangeFormData({
                    ...rangeFormData,
                    minGrowthPercent: e.target.value
                  })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxGrowth">Max Growth %</Label>
                <Input
                  id="maxGrowth"
                  type="number"
                  value={rangeFormData.maxGrowthPercent}
                  onChange={(e) => setRangeFormData({
                    ...rangeFormData,
                    maxGrowthPercent: e.target.value
                  })}
                  placeholder="Leave empty for no limit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="score">Score (1-10)</Label>
                <Input
                  id="score"
                  type="number"
                  min="1"
                  max="10"
                  value={rangeFormData.score}
                  onChange={(e) => setRangeFormData({
                    ...rangeFormData,
                    score: parseInt(e.target.value) || 1
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={rangeFormData.emoji}
                  onChange={(e) => setRangeFormData({
                    ...rangeFormData,
                    emoji: e.target.value
                  })}
                  placeholder="😐"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={rangeFormData.description}
                onChange={(e) => setRangeFormData({
                  ...rangeFormData,
                  description: e.target.value
                })}
                placeholder="Describe this score range..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddRange(false);
                setEditingRange(null);
                resetRangeForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRange}
              disabled={createRangeMutation.isPending || updateRangeMutation.isPending}
            >
              {editingRange ? "Update" : "Create"} Range
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}