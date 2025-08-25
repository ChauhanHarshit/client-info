import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface StickyBackButtonProps {
  href?: string;
  label?: string;
  onClick?: () => void;
}

export function StickyBackButton({ href, label = "Back", onClick }: StickyBackButtonProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      setLocation(href);
    } else {
      window.history.back();
    }
  };

  return (
    <div className="fixed top-4 left-20 z-50 transition-all duration-300 ease-in-out">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </div>
  );
}