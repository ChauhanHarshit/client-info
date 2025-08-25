import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarState {
  isCollapsed: boolean;
  managementOpen: boolean;
  operationsOpen: boolean;
  businessOpen: boolean;
  contentCommunicationsOpen: boolean;
  teamManagementOpen: boolean;
  inspoPagesOpen: boolean;
  workingOnOpen: boolean;
}

interface SidebarContextType {
  sidebarState: SidebarState;
  updateSidebarState: (updates: Partial<SidebarState>) => void;
  toggleCollapse: () => void;
  setManagementOpen: (open: boolean) => void;
  setOperationsOpen: (open: boolean) => void;
  setBusinessOpen: (open: boolean) => void;
  setContentCommunicationsOpen: (open: boolean) => void;
  setTeamManagementOpen: (open: boolean) => void;
  setInspoPagesOpen: (open: boolean) => void;
  setWorkingOnOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'tasty-sidebar-state';

const defaultSidebarState: SidebarState = {
  isCollapsed: false,
  managementOpen: true,
  operationsOpen: true,
  businessOpen: true,
  contentCommunicationsOpen: true,
  teamManagementOpen: false,
  inspoPagesOpen: true,
  workingOnOpen: true,
};

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarState, setSidebarState] = useState<SidebarState>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedState = JSON.parse(stored);
          return { ...defaultSidebarState, ...parsedState };
        }
      } catch (error) {
        console.error('Failed to load sidebar state from localStorage:', error);
      }
    }
    return defaultSidebarState;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sidebarState));
      } catch (error) {
        console.error('Failed to save sidebar state to localStorage:', error);
      }
    }
  }, [sidebarState]);

  const updateSidebarState = (updates: Partial<SidebarState>) => {
    setSidebarState(prev => ({ ...prev, ...updates }));
  };

  const toggleCollapse = () => {
    setSidebarState(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  };

  const setManagementOpen = (open: boolean) => {
    setSidebarState(prev => ({ ...prev, managementOpen: open }));
  };

  const setOperationsOpen = (open: boolean) => {
    setSidebarState(prev => ({ ...prev, operationsOpen: open }));
  };



  const setBusinessOpen = (open: boolean) => {
    setSidebarState(prev => ({ ...prev, businessOpen: open }));
  };

  const setContentCommunicationsOpen = (open: boolean) => {
    setSidebarState(prev => ({ ...prev, contentCommunicationsOpen: open }));
  };

  const setTeamManagementOpen = (open: boolean) => {
    setSidebarState(prev => ({ ...prev, teamManagementOpen: open }));
  };

  const setInspoPagesOpen = (open: boolean) => {
    setSidebarState(prev => ({ ...prev, inspoPagesOpen: open }));
  };

  const setWorkingOnOpen = (open: boolean) => {
    setSidebarState(prev => ({ ...prev, workingOnOpen: open }));
  };

  const value: SidebarContextType = {
    sidebarState,
    updateSidebarState,
    toggleCollapse,
    setManagementOpen,
    setOperationsOpen,
    setBusinessOpen,
    setContentCommunicationsOpen,
    setTeamManagementOpen,
    setInspoPagesOpen,
    setWorkingOnOpen,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}