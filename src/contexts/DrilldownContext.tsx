import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { DrillDownFilter } from "@/hooks/use-dashboard-drilldown";

interface DrilldownState {
  isOpen: boolean;
  filters: DrillDownFilter;
  title: string;
}

interface DrilldownContextValue extends DrilldownState {
  openDrilldown: (filters: DrillDownFilter, title: string) => void;
  closeDrilldown: () => void;
}

const DrilldownContext = createContext<DrilldownContextValue | undefined>(undefined);

export function DrilldownProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DrilldownState>({
    isOpen: false,
    filters: {},
    title: "",
  });

  const openDrilldown = useCallback((filters: DrillDownFilter, title: string) => {
    setState({ isOpen: true, filters, title });
  }, []);

  const closeDrilldown = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
  }, []);

  return (
    <DrilldownContext.Provider value={{ ...state, openDrilldown, closeDrilldown }}>
      {children}
    </DrilldownContext.Provider>
  );
}

// Optional hook that returns null when outside provider (safe for conditional usage)
export function useDrilldownContextOptional() {
  return useContext(DrilldownContext);
}

// Strict hook that throws if outside provider
export function useDrilldownContext() {
  const context = useContext(DrilldownContext);
  if (!context) {
    throw new Error("useDrilldownContext must be used within a DrilldownProvider");
  }
  return context;
}
