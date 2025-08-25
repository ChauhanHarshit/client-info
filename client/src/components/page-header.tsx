import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface PageHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  backTo?: string;
  useBrowserBack?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  showBackButton = false, 
  backTo = "/",
  useBrowserBack = false,
  actions 
}: PageHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (useBrowserBack) {
      window.history.back();
    } else {
      setLocation(backTo);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex items-center justify-between w-full min-h-[48px]">
        <div className="flex items-center gap-3 flex-1">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <ArrowLeft size={16} />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center space-x-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}