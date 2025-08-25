import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CrmAuthProvider } from "@/contexts/CrmAuthContext";
import { CreatorAuthProvider } from "@/contexts/CreatorAuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/toaster";
import App from "./App";
import "./index.css";

// Import optimization systems
import { healthMonitor } from "@/lib/health-monitoring";
import { comprehensiveOptimizer } from "@/lib/comprehensive-optimization";
import { uiPerformanceOptimizer } from "@/lib/ui-performance";
import { contentOptimizer } from "@/lib/content-optimization";
import { analyticsOptimizer } from "@/lib/analytics-optimization";
import { initializeRoutingOptimizations } from "@/lib/routing-optimization";
import { initializeDataSyncOptimizations } from "@/lib/data-sync-optimization";
import { initializeComponentOptimizations } from "@/lib/component-optimization";
import { PerformanceUtils } from "@/lib/performance-utils";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  // Initialize performance optimizations
  console.log('🚀 Initializing comprehensive performance optimizations...');
  
  // Initialize health monitoring
  healthMonitor.initialize();
  
  // Initialize comprehensive optimization system
  comprehensiveOptimizer.init();
  
  // Initialize UI performance optimizations
  uiPerformanceOptimizer.init();
  
  // Initialize content optimization
  contentOptimizer.init();
  
  // Initialize analytics optimization
  analyticsOptimizer.init();
  
  // Initialize routing optimizations
  initializeRoutingOptimizations();
  
  // Initialize data synchronization optimizations
  initializeDataSyncOptimizations();
  
  // Initialize component optimizations
  initializeComponentOptimizations();
  
  // Prefetch common routes after app initialization
  setTimeout(() => {
    PerformanceUtils.prefetchCommonRoutes().catch(console.error);
  }, 2000); // Delay to let the app initialize first
  
  console.log('✅ All performance optimizations initialized');
  
  const root = createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <ThemeProvider>
          <App />
          <Toaster />
        </ThemeProvider>
      </SidebarProvider>
    </QueryClientProvider>
  );

} catch (error) {
  console.error('main.tsx - Error during app initialization:', error);
  // Show error message on the page
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>Application Error</h1>
        <p>Failed to initialize the application. Please refresh the page.</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error}</pre>
      </div>
    `;
  }
}
