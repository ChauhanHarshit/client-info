import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { useLocation } from "wouter";

interface AdminOverlayProps {
  isVisible: boolean;
  creatorName?: string;
}

export function AdminOverlay({ isVisible, creatorName }: AdminOverlayProps) {
  const [, setLocation] = useLocation();

  if (!isVisible) return null;

  return (
    <div className="relative z-[9999] bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="text-white hover:bg-slate-800 hover:text-white border border-slate-600/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-sm text-slate-300 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Admin Preview Mode
          </div>
        </div>
      </div>
    </div>
  );
}