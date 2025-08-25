import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ClientGrowthMetricsProps {
  creatorId: number;
  className?: string;
}

export function ClientGrowthMetrics({ creatorId, className }: ClientGrowthMetricsProps) {
  const { data: growthMetrics, isLoading } = useQuery({
    queryKey: [`/api/creators/${creatorId}/growth-metrics`],
  });

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Growth Since Joining Tasty</CardTitle>
          <CardDescription>Your performance improvements since joining</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!growthMetrics) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Growth Since Joining Tasty</CardTitle>
          <CardDescription>Your performance improvements since joining</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-medium mb-2">Growth Data Not Available</h4>
            <p className="text-sm text-muted-foreground">
              Growth metrics will be available once your initial performance data is recorded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const earningsGrowth = parseFloat(growthMetrics.earningsGrowthPercent || "0");
  const subsGrowth = parseFloat(growthMetrics.subsGrowthPercent || "0");
  const joinedDate = new Date(growthMetrics.joinedDate);
  const monthsSinceJoining = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600 dark:text-green-400";
    if (growth < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-5 w-5" />;
    if (growth < 0) return <TrendingDown className="h-5 w-5" />;
    return <div className="w-5 h-5" />;
  };

  const getGrowthBadge = (growth: number) => {
    if (growth > 50) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Excellent Growth</Badge>;
    if (growth > 25) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Strong Growth</Badge>;
    if (growth > 0) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Steady Growth</Badge>;
    if (growth < 0) return <Badge variant="destructive">Needs Attention</Badge>;
    return <Badge variant="secondary">Stable</Badge>;
  };

  const formatGrowthText = (growth: number, type: string) => {
    const absGrowth = Math.abs(growth);
    if (growth > 0) {
      return `You've grown your ${type} by +${absGrowth.toFixed(1)}% since joining Tasty.`;
    } else if (growth < 0) {
      return `Your ${type} has decreased by ${absGrowth.toFixed(1)}% since joining Tasty.`;
    } else {
      return `Your ${type} has remained stable since joining Tasty.`;
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              📈 Growth Since Joining Tasty
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Growth percentages calculated by comparing your current weekly averages 
                      to your initial performance when you joined Tasty.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              Joined {joinedDate.toLocaleDateString()} ({monthsSinceJoining} months ago)
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Earnings Growth */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h4 className="font-medium">Earnings Growth</h4>
            </div>
            {getGrowthBadge(earningsGrowth)}
          </div>
          
          <div className={cn("flex items-center gap-3 text-2xl font-bold", getGrowthColor(earningsGrowth))}>
            {getGrowthIcon(earningsGrowth)}
            <span>
              {earningsGrowth > 0 ? "+" : ""}{earningsGrowth.toFixed(1)}%
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {formatGrowthText(earningsGrowth, "earnings")}
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="block">Initial Weekly</span>
              <span className="font-medium">${parseFloat(growthMetrics.initialWeeklyEarnings || "0").toFixed(2)}</span>
            </div>
            <div>
              <span className="block">Current Weekly</span>
              <span className="font-medium">${parseFloat(growthMetrics.currentWeeklyEarnings || "0").toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Subscriber Growth */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium">Subscriber Growth</h4>
            </div>
            {getGrowthBadge(subsGrowth)}
          </div>
          
          <div className={cn("flex items-center gap-3 text-2xl font-bold", getGrowthColor(subsGrowth))}>
            {getGrowthIcon(subsGrowth)}
            <span>
              {subsGrowth > 0 ? "+" : ""}{subsGrowth.toFixed(1)}%
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {formatGrowthText(subsGrowth, "subscriber count")}
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="block">Initial Weekly</span>
              <span className="font-medium">{growthMetrics.initialWeeklySubs || 0} subs</span>
            </div>
            <div>
              <span className="block">Current Weekly</span>
              <span className="font-medium">{growthMetrics.currentWeeklySubs || 0} subs</span>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="font-medium mb-2">Performance Summary</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            {earningsGrowth > 0 && subsGrowth > 0 && (
              <p>Outstanding performance! Both your earnings and subscriber growth are trending upward since joining Tasty.</p>
            )}
            {earningsGrowth > 0 && subsGrowth <= 0 && (
              <p>Strong earnings growth! Focus on subscriber acquisition strategies to match your revenue success.</p>
            )}
            {earningsGrowth <= 0 && subsGrowth > 0 && (
              <p>Great subscriber growth! Consider monetization strategies to better convert your growing audience.</p>
            )}
            {earningsGrowth <= 0 && subsGrowth <= 0 && (
              <p>Let's work together to identify new growth opportunities and strategies that align with your goals.</p>
            )}
            {growthMetrics.lastSyncedAt && (
              <p className="text-xs mt-2">
                Last updated: {new Date(growthMetrics.lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}