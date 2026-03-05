import { useOrgStructureState } from "./useOrgStructureState";
import { useOrgStructureData } from "./useOrgStructureData";
import { useOrgStructureHandlers } from "./useOrgStructureHandlers";

export function useOrgStructure() {
  const state = useOrgStructureState();
  const data = useOrgStructureData(state);
  const handlers = useOrgStructureHandlers(state, data);

  if (state.loading || state.branchLoading) {
    // In original it returns JSX here, but we can't return JSX easily from a hook without keeping it as a component. 
    // Actually original returned a component sometimes? Let's check original.
  }

  return {
    ...state,
    ...data,
    ...handlers
  };
}
