// Stub: use-material-gate-passes hooks
export interface MaterialGatePass {
  id: string;
  [key: string]: any;
}

export interface GatePassFilters {
  status?: string;
  passType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}

export function useMaterialGatePasses() {
  return { data: [], isLoading: false };
}
