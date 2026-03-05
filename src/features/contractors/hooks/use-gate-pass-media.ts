import { useMemo, useCallback, useState } from "react";
import { useGatePassItems, useGatePassPhotos, GatePassItem, GatePassPhoto } from "./use-gate-pass-details";
import { useQueryClient } from "@tanstack/react-query";

export interface GatePassMediaResult {
  items: GatePassItem[];
  photos: GatePassPhoto[];
  itemCount: number;
  photoCount: number;
  isLoading: boolean;
  /** Invalidate and re-fetch items + photos (regenerates signed URLs) */
  refreshMedia: () => void;
}

/**
 * Unified hook for fetching gate pass items and photos.
 * Handles isPublic branching, signed URL generation, and coordinated loading states.
 *
 * @param passId - Gate pass ID
 * @param isPublic - Whether it's a public gate pass (uses different tables/buckets)
 */
export function useGatePassMedia(
  passId: string | null,
  isPublic: boolean = false
): GatePassMediaResult {
  const queryClient = useQueryClient();

  const { data: items, isLoading: isLoadingItems } = useGatePassItems(passId, isPublic);
  const { data: photos, isLoading: isLoadingPhotos } = useGatePassPhotos(passId, isPublic);

  const refreshMedia = useCallback(() => {
    if (!passId) return;
    queryClient.invalidateQueries({ queryKey: ["gate-pass-items", passId, isPublic] });
    queryClient.invalidateQueries({ queryKey: ["gate-pass-photos", passId, isPublic] });
  }, [queryClient, passId, isPublic]);

  const result = useMemo<GatePassMediaResult>(() => ({
    items: items || [],
    photos: photos || [],
    itemCount: items?.length || 0,
    photoCount: photos?.length || 0,
    isLoading: isLoadingItems || isLoadingPhotos,
    refreshMedia,
  }), [items, photos, isLoadingItems, isLoadingPhotos, refreshMedia]);

  return result;
}
