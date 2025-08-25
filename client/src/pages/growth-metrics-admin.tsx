import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, TrendingUp, TrendingDown, DollarSign, Users, RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const growthMetricsFormSchema = z.object({
  creatorId: z.coerce.number().min(1, "Creator is required"),
  joinedDate: z.string().min(1, "Join date is required"),
  initialWeeklyEarnings: z.coerce.number().min(0, "Initial earnings must be positive"),
  currentWeeklyEarnings: z.coerce.number().min(0, "Current earnings must be positive"),
  initialWeeklySubs: z.coerce.number().min(0, "Initial subscribers must be positive"),
  currentWeeklySubs: z.coerce.number().min(0, "Current subscribers must be positive"),
});

type GrowthMetricsFormData = z.infer<typeof growthMetricsFormSchema>;

export default function GrowthMetricsAdmin() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMetrics, setEditingMetrics] = useState<any>(null);

  // Data queries
  const { data: growthMetrics = [], isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/growth-metrics'],
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['/api/creators'],
  });

  // Form setup
  const form = useForm<GrowthMetricsFormData>({
    resolver: zodResolver(growthMetricsFormSchema),
    defaultValues: {
      creatorId: 0,
      joinedDate: "",
      initialWeeklyEarnings: 0,
      currentWeeklyEarnings: 0,
      initialWeeklySubs: 0,
      currentWeeklySubs: 0,
    },
  });

  // Mutations
  const createMetricsMutation = useMutation({
    mutationFn: async (data: GrowthMetricsFormData) => {
      return await apiRequest(`/api/creators/${data.creatorId}/growth-metrics`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          joinedDate: new Date(data.joinedDate).toISOString(),
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Growth metrics created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/growth-metrics'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create growth metrics: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMetricsMutation = useMutation({
    mutationFn: async ({ creatorId, data }: { creatorId: number; data: Partial<GrowthMetricsFormData> }) => {
      return await apiRequest(`/api/creators/${creatorId}/growth-metrics`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          joinedDate: data.joinedDate ? new Date(data.joinedDate).toISOString() : undefined,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Growth metrics updated successfully",
      });
      setEditingMetrics(null);
      queryClient.invalidateQueries({ queryKey: ['/api/growth-metrics'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update growth metrics: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const syncGrowthMutation = useMutation({
    mutationFn: async ({ creatorId, currentWeeklyEarnings, currentWeeklySubs }: { 
      creatorId: number; 
      currentWeeklyEarnings: number; 
      currentWeeklySubs: number; 
    }) => {
      return await apiRequest(`/api/creators/${creatorId}/sync-growth`, {
        method: 'POST',
        body: JSON.stringify({
          currentWeeklyEarnings,
          currentWeeklySubs,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Growth data synced successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/growth-metrics'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to sync growth data: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateMetrics = (data: GrowthMetricsFormData) => {
    createMetricsMutation.mutate(data);
  };

  const handleUpdateMetrics = (data: GrowthMetricsFormData) => {
    if (editingMetrics) {
      updateMetricsMutation.mutate({
        creatorId: editingMetrics.creatorId,
        data,
      });
    }
  };

  const handleSyncGrowth = (creatorId: number, currentWeeklyEarnings: number, currentWeeklySubs: number) => {
    syncGrowthMutation.mutate({
      creatorId,
      currentWeeklyEarnings,
      currentWeeklySubs,
    });
  };

  const openEditDialog = (metrics: any) => {
    setEditingMetrics(metrics);
    form.reset({
      creatorId: metrics.creatorId,
      joinedDate: new Date(metrics.joinedDate).toISOString().split('T')[0],
      initialWeeklyEarnings: parseFloat(metrics.initialWeeklyEarnings || "0"),
      currentWeeklyEarnings: parseFloat(metrics.currentWeeklyEarnings || "0"),
      initialWeeklySubs: metrics.initialWeeklySubs || 0,
      currentWeeklySubs: metrics.currentWeeklySubs || 0,
    });
  };

  const getCreatorName = (creatorId: number) => {
    const creator = (creators as any[]).find((c: any) => c.id === creatorId);
    return creator ? creator.displayName : `Creator ${creatorId}`;
  };

  const calculateGrowth = (initial: number, current: number) => {
    if (initial === 0) return 0;
    return ((current - initial) / initial) * 100;
  };

  if (metricsLoading || creatorsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Growth Metrics Admin</h1>
          <p className="text-muted-foreground">
            Manage client growth tracking and "Growth Since Joining Tasty" metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchMetrics()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Growth Metrics
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Growth Metrics</DialogTitle>
                <DialogDescription>
                  Set up growth tracking for a creator to show their progress since joining Tasty.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateMetrics)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="creatorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Creator</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select creator" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(creators as any[]).map((creator: any) => (
                                <SelectItem key={creator.id} value={creator.id.toString()}>
                                  {creator.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="joinedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Join Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="initialWeeklyEarnings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Weekly Earnings ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentWeeklyEarnings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Weekly Earnings ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="initialWeeklySubs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Weekly Subscribers</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentWeeklySubs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Weekly Subscribers</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMetricsMutation.isPending}>
                      {createMetricsMutation.isPending ? "Creating..." : "Create Metrics"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Growth Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Creators Tracked</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(growthMetrics as any[]).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Earnings Growth</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(growthMetrics as any[]).length > 0
                ? `+${((growthMetrics as any[]).reduce((acc: number, m: any) => 
                    acc + calculateGrowth(parseFloat(m.initialWeeklyEarnings || "0"), parseFloat(m.currentWeeklyEarnings || "0")), 0) 
                    / (growthMetrics as any[]).length).toFixed(1)}%`
                : "0%"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Subscriber Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(growthMetrics as any[]).length > 0
                ? `+${((growthMetrics as any[]).reduce((acc: number, m: any) => 
                    acc + calculateGrowth(m.initialWeeklySubs || 0, m.currentWeeklySubs || 0), 0) 
                    / (growthMetrics as any[]).length).toFixed(1)}%`
                : "0%"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(growthMetrics as any[]).length > 0
                ? getCreatorName((growthMetrics as any[]).reduce((best: any, current: any) => {
                    const currentGrowth = calculateGrowth(parseFloat(current.initialWeeklyEarnings || "0"), parseFloat(current.currentWeeklyEarnings || "0"));
                    const bestGrowth = calculateGrowth(parseFloat(best.initialWeeklyEarnings || "0"), parseFloat(best.currentWeeklyEarnings || "0"));
                    return currentGrowth > bestGrowth ? current : best;
                  }).creatorId)
                : "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Creator Growth Metrics</CardTitle>
          <CardDescription>
            Track earnings and subscriber growth since creators joined Tasty
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead>Earnings Growth</TableHead>
                <TableHead>Subscriber Growth</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(growthMetrics as any[]).map((metrics: any) => {
                const earningsGrowth = calculateGrowth(
                  parseFloat(metrics.initialWeeklyEarnings || "0"), 
                  parseFloat(metrics.currentWeeklyEarnings || "0")
                );
                const subsGrowth = calculateGrowth(
                  metrics.initialWeeklySubs || 0, 
                  metrics.currentWeeklySubs || 0
                );

                return (
                  <TableRow key={metrics.id}>
                    <TableCell className="font-medium">
                      {getCreatorName(metrics.creatorId)}
                    </TableCell>
                    <TableCell>
                      {new Date(metrics.joinedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {earningsGrowth > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : earningsGrowth < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span className={earningsGrowth > 0 ? "text-green-600" : earningsGrowth < 0 ? "text-red-600" : ""}>
                          {earningsGrowth > 0 ? "+" : ""}{earningsGrowth.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {subsGrowth > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : subsGrowth < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span className={subsGrowth > 0 ? "text-green-600" : subsGrowth < 0 ? "text-red-600" : ""}>
                          {subsGrowth > 0 ? "+" : ""}{subsGrowth.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {metrics.lastSyncedAt
                        ? new Date(metrics.lastSyncedAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(metrics)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncGrowth(
                            metrics.creatorId,
                            parseFloat(metrics.currentWeeklyEarnings || "0"),
                            metrics.currentWeeklySubs || 0
                          )}
                          disabled={syncGrowthMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {(growthMetrics as any[]).length === 0 && (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Growth Metrics</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking creator growth by adding their initial performance data.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Growth Metrics
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Metrics Dialog */}
      <Dialog open={!!editingMetrics} onOpenChange={() => setEditingMetrics(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Growth Metrics</DialogTitle>
            <DialogDescription>
              Update growth tracking data for {editingMetrics && getCreatorName(editingMetrics.creatorId)}.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateMetrics)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="creatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creator</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger disabled>
                            <SelectValue placeholder="Select creator" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(creators as any[]).map((creator: any) => (
                            <SelectItem key={creator.id} value={creator.id.toString()}>
                              {creator.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="joinedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Join Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="initialWeeklyEarnings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Weekly Earnings ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentWeeklyEarnings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Weekly Earnings ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="initialWeeklySubs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Weekly Subscribers</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentWeeklySubs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Weekly Subscribers</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMetrics(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMetricsMutation.isPending}>
                  {updateMetricsMutation.isPending ? "Updating..." : "Update Metrics"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}