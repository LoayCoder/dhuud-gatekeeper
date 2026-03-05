// Stub for use-assets hook type
export interface AssetWithRelations {
  id: string;
  asset_tag: string;
  name: string;
  status: string;
  tenant_id: string;
  branch_id?: string;
  [key: string]: unknown;
}

export function useAssets() {
  return { data: [] as AssetWithRelations[], isLoading: false, error: null };
}

export function useAsset(id: string | undefined) {
  return { data: null as AssetWithRelations | null, isLoading: false, error: null };
}
