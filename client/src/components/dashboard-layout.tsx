import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarState } = useSidebar();

  return (
    <div className="h-screen bg-background dark:bg-background w-full flex">
      <Sidebar />
      <div className="flex-1 h-full">
        <main className="h-full overflow-auto p-4 bg-background dark:bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}