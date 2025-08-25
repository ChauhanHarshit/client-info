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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Settings, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingAnimation } from "@/components/ui/loading-animation";

const benchmarkFormSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  weeklyAverage: z.coerce.number().min(0, "Weekly average must be positive"),
  monthlyAverage: z.coerce.number().min(0, "Monthly average must be positive"),
});

type BenchmarkFormData = z.infer<typeof benchmarkFormSchema>;

export default function ContentOutputAdmin() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<any>(null);

  // Data queries
  const { data: benchmarks = [], isLoading: benchmarksLoading, refetch: refetchBenchmarks } = useQuery({
    queryKey: ['/api/content-benchmarks'],
  });

  // Form setup
  const form = useForm<BenchmarkFormData>({
    resolver: zodResolver(benchmarkFormSchema),
    defaultValues: {
      platform: "",
      weeklyAverage: 0,
      monthlyAverage: 0,
    },
  });

  // Mutations
  const createBenchmarkMutation = useMutation({
    mutationFn: async (data: BenchmarkFormData) => {
      return await apiRequest('/api/content-benchmarks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Content benchmark created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/content-benchmarks'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create benchmark: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateBenchmarkMutation = useMutation({
    mutationFn: async ({ platform, data }: { platform: string; data: Partial<BenchmarkFormData> }) => {
      return await apiRequest(`/api/content-benchmarks/${platform}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Content benchmark updated successfully",
      });
      setEditingBenchmark(null);
      queryClient.invalidateQueries({ queryKey: ['/api/content-benchmarks'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update benchmark: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteBenchmarkMutation = useMutation({
    mutationFn: async (platform: string) => {
      return await apiRequest(`/api/content-benchmarks/${platform}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Content benchmark deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/content-benchmarks'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete benchmark: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateBenchmark = (data: BenchmarkFormData) => {
    createBenchmarkMutation.mutate(data);
  };

  const handleUpdateBenchmark = (data: BenchmarkFormData) => {
    if (editingBenchmark) {
      updateBenchmarkMutation.mutate({
        platform: editingBenchmark.platform,
        data,
      });
    }
  };

  const handleDeleteBenchmark = (platform: string) => {
    if (confirm("Are you sure you want to delete this benchmark?")) {
      deleteBenchmarkMutation.mutate(platform);
    }
  };

  const openEditDialog = (benchmark: any) => {
    setEditingBenchmark(benchmark);
    form.reset({
      platform: benchmark.platform,
      weeklyAverage: benchmark.weeklyAverage,
      monthlyAverage: benchmark.monthlyAverage,
    });
  };

  if (benchmarksLoading) {
    return <LoadingAnimation message="Loading content output benchmarks..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Output Benchmarks</h1>
          <p className="text-muted-foreground">
            Manage platform-specific content output targets for creator comparisons
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Benchmark
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Content Benchmark</DialogTitle>
              <DialogDescription>
                Set content output targets for a platform that creators can compare against.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateBenchmark)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., OnlyFans, Instagram, Twitter, TikTok" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weeklyAverage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weekly Average Posts</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="18" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthlyAverage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Average Posts</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="72" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createBenchmarkMutation.isPending}>
                    {createBenchmarkMutation.isPending ? "Creating..." : "Create Benchmark"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Benchmarks Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {benchmarks.map((benchmark: any) => (
          <Card key={benchmark.platform}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {benchmark.platform}
              </CardTitle>
              <Badge variant="outline">{benchmark.platform}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Weekly</span>
                  <span className="font-semibold">{benchmark.weeklyAverage} posts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly</span>
                  <span className="font-semibold">{benchmark.monthlyAverage} posts</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(benchmark)}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteBenchmark(benchmark.platform)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {benchmarks.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Benchmarks Set</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create content output benchmarks to help creators compare their performance
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Benchmark
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Benchmarks Table */}
      {benchmarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Platform Benchmarks</CardTitle>
            <CardDescription>
              Manage content output targets for creator performance comparisons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Weekly Average</TableHead>
                  <TableHead>Monthly Average</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks.map((benchmark: any) => (
                  <TableRow key={benchmark.platform}>
                    <TableCell className="font-medium capitalize">
                      {benchmark.platform}
                    </TableCell>
                    <TableCell>{benchmark.weeklyAverage} posts</TableCell>
                    <TableCell>{benchmark.monthlyAverage} posts</TableCell>
                    <TableCell>
                      {benchmark.lastUpdated
                        ? new Date(benchmark.lastUpdated).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(benchmark)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBenchmark(benchmark.platform)}
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Benchmark Dialog */}
      <Dialog open={!!editingBenchmark} onOpenChange={() => setEditingBenchmark(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content Benchmark</DialogTitle>
            <DialogDescription>
              Update content output targets for {editingBenchmark?.platform}.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateBenchmark)} className="space-y-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weeklyAverage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weekly Average Posts</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthlyAverage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Average Posts</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingBenchmark(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateBenchmarkMutation.isPending}>
                  {updateBenchmarkMutation.isPending ? "Updating..." : "Update Benchmark"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}