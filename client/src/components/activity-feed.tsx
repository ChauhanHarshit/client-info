import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActivityLog } from "@shared/schema";

interface ActivityFeedProps {
  teamId?: number;
}

export function ActivityFeed({ teamId }: ActivityFeedProps) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["/api/activity", { team: teamId || "all", limit: "10" }],
  });

  const getActivityColor = (type: string) => {
    switch (type) {
      case "creator_added":
        return "bg-accent";
      case "creator_updated":
        return "bg-blue-500";
      case "message_sent":
        return "bg-blue-500";
      case "revenue_update":
        return "bg-orange-500";
      case "campaign_milestone":
        return "bg-purple-500";
      case "content_approved":
        return "bg-orange-500";
      case "schedule_updated":
        return "bg-green-500";
      default:
        return "bg-slate-400";
    }
  };

  const formatTimeAgo = (createdAt: string) => {
    const now = new Date();
    const activity = new Date(createdAt);
    const diffMs = now.getTime() - activity.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">
          Recent Activity
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-2 animate-pulse">
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full mt-1.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-3 bg-slate-200 rounded w-3/4 mb-1"></div>
                  <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-600">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 6).map((activity: ActivityLog) => (
              <div key={activity.id} className="flex items-start space-x-2">
                <div 
                  className={`w-1.5 h-1.5 ${getActivityColor(activity.type)} rounded-full mt-1.5 flex-shrink-0`}
                ></div>
                <div className="flex-1">
                  <p className="text-xs text-slate-900 leading-relaxed">{activity.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatTimeAgo(activity.createdAt!)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activities.length > 0 && (
          <Button variant="ghost" className="w-full mt-3 text-xs h-7">
            View all activity
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
