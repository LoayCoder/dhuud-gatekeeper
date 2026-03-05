import { useQuickObservationCardState } from './useQuickObservationCardState';
import { useQuickObservationCardHandlers } from './useQuickObservationCardHandlers';

export function useQuickObservationCard() {
  const state = useQuickObservationCardState();
  const handlers = useQuickObservationCardHandlers(state);
  return { ...state, ...handlers };
}
