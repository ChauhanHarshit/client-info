import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, MessageSquare, Clock } from "lucide-react";
import { CenteredSectionLoader } from "@/components/ui/loading-animation";

interface KpiCardsProps {
  teamId?: number;
  onActiveCreatorsClick?: () => void;
}

export function KpiCards({ teamId, onActiveCreatorsClick }: KpiCardsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/analytics/stats", { team: teamId || "all" }],
  });

  const kpiData = [
    {
      label: "Total Revenue",
      value: stats ? `$${Number(stats.totalRevenue).toLocaleString()}` : "$0",
      icon: DollarSign,
      change: "+12.5%",
      positive: true,
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
      clickable: false,
    },
    {
      label: "Active Creators",
      value: stats ? stats.activeCreators.toString() : "0",
      icon: Users,
      change: "+8.2%",
      positive: true,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      clickable: true,
    },
    {
      label: "Messages Sent",
      value: stats ? Number(stats.totalMessages).toLocaleString() : "0",
      icon: MessageSquare,
      change: "+15.3%",
      positive: true,
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
      clickable: false,
    },
    {
      label: "Avg Response Rate",
      value: stats ? `${Number(stats.avgResponseRate).toFixed(1)}%` : "0%",
      icon: Clock,
      change: "+5.1%",
      positive: true,
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500",
      clickable: false,
    },
  ];

  if (isLoading) {
    return <CenteredSectionLoader message="Loading KPI data..." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiData.map((metric, index) => {
        const Icon = metric.icon;
        const TrendIcon = metric.positive ? TrendingUp : TrendingDown;
        
        return (
          <Card 
            key={index} 
            className={`border border-slate-200 shadow-sm ${
              metric.clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
            }`}
            onClick={metric.clickable && metric.label === "Active Creators" ? onActiveCreatorsClick : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">{metric.label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{metric.value}</p>
                  <div className="flex items-center mt-1">
                    <TrendIcon className="text-accent mr-1" size={12} />
                    <span className="text-xs text-accent font-medium">{metric.change}</span>
                    <span className="text-xs text-slate-500 ml-1">vs last month</span>
                  </div>
                </div>
                <div className={`w-10 h-10 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={metric.iconColor} size={18} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
