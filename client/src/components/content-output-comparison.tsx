import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, BarChart3, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentOutputComparisonProps {
  creatorId: number;
  platform: string;
  className?: string;
}

export function ContentOutputComparison({ creatorId, platform, className }: ContentOutputComparisonProps) {
  const [showComparison, setShowComparison] = useState(false);

  const { data: comparison, isLoading } = useQuery({
    queryKey: [`/api/creators/${creatorId}/content-comparison/${platform}`],
    enabled: showComparison,
  });

  const toggleComparison = () => {
    setShowComparison(!showComparison);
  };

  const getPerformanceColor = (delta: number) => {
    if (delta > 0) return "text-green-600 dark:text-green-400";
    if (delta < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getPerformanceIcon = (delta: number) => {
    if (delta > 0) return <TrendingUp className="h-4 w-4" />;
    if (delta < 0) return <TrendingDown className="h-4 w-4" />;
    return <BarChart3 className="h-4 w-4" />;
  };

  const getPerformanceBadge = (delta: number) => {
    if (delta > 0) return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Above Average</Badge>;
    if (delta < 0) return <Badge variant="destructive">Below Average</Badge>;
    return <Badge variant="secondary">On Target</Badge>;
  };

  const calculatePercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Content Output Performance</CardTitle>
            <CardDescription>
              Compare your {platform} content output to top performers
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleComparison}
            className="flex items-center gap-2"
          >
            {showComparison ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showComparison ? "Hide" : "Compare"} Output
          </Button>
        </div>
      </CardHeader>

      {showComparison && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
            </div>
          ) : comparison ? (
            <div className="space-y-6">
              {/* Weekly Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Weekly Output</h4>
                  {getPerformanceBadge(comparison.weeklyDelta)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Your posts this week</span>
                    <span className="font-semibold">{comparison.creatorWeekly}</span>
                  </div>
                  <Progress 
                    value={calculatePercentage(comparison.creatorWeekly, comparison.benchmarkWeekly)} 
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Top performers average</span>
                    <span>{comparison.benchmarkWeekly} posts/week</span>
                  </div>
                </div>

                <div className={cn("flex items-center gap-2 text-sm", getPerformanceColor(comparison.weeklyDelta))}>
                  {getPerformanceIcon(comparison.weeklyDelta)}
                  <span>
                    You are posting {Math.abs(comparison.weeklyDelta)} {comparison.weeklyDelta >= 0 ? "more" : "fewer"} pieces than top performers
                  </span>
                </div>
              </div>

              {/* Monthly Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Monthly Output</h4>
                  {getPerformanceBadge(comparison.monthlyDelta)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Your posts this month</span>
                    <span className="font-semibold">{comparison.creatorMonthly}</span>
                  </div>
                  <Progress 
                    value={calculatePercentage(comparison.creatorMonthly, comparison.benchmarkMonthly)} 
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Top performers average</span>
                    <span>{comparison.benchmarkMonthly} posts/month</span>
                  </div>
                </div>

                <div className={cn("flex items-center gap-2 text-sm", getPerformanceColor(comparison.monthlyDelta))}>
                  {getPerformanceIcon(comparison.monthlyDelta)}
                  <span>
                    You are posting {Math.abs(comparison.monthlyDelta)} {comparison.monthlyDelta >= 0 ? "more" : "fewer"} pieces than top performers monthly
                  </span>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="font-medium mb-2">Performance Insights</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {comparison.weeklyDelta > 0 && comparison.monthlyDelta > 0 && (
                    <p>Great job! You're consistently posting more content than top performers.</p>
                  )}
                  {comparison.weeklyDelta < 0 && comparison.monthlyDelta < 0 && (
                    <p>Consider increasing your posting frequency to match top performer standards.</p>
                  )}
                  {comparison.weeklyDelta === 0 && comparison.monthlyDelta === 0 && (
                    <p>You're right on target with top performer posting frequency!</p>
                  )}
                  {(comparison.weeklyDelta > 0 && comparison.monthlyDelta < 0) || (comparison.weeklyDelta < 0 && comparison.monthlyDelta > 0) && (
                    <p>Your posting frequency varies - try to maintain consistent output for better performance.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium mb-2">No Comparison Data Available</h4>
              <p className="text-sm text-muted-foreground">
                Comparison data for {platform} is not available yet. Check back later.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}