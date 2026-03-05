export type TransferType = 'location_transfer' | 'disposal' | 'decommission';
export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'in_transit' | 'completed' | 'cancelled';
export type DisposalMethod = 'sold' | 'scrapped' | 'donated' | 'recycled' | 'returned';

export interface AssetTransfer {
    id: string; asset_id: string; transfer_type: TransferType; status: TransferStatus;
    from_branch_id: string | null; from_site_id: string | null; from_building_id: string | null; from_floor_zone_id: string | null;
    to_branch_id: string | null; to_site_id: string | null; to_building_id: string | null; to_floor_zone_id: string | null;
    disposal_method: DisposalMethod | null; disposal_value: number | null; disposal_notes: string | null;
    reason: string; notes: string | null;
    requested_by: string; requested_at: string; approved_by: string | null; approved_at: string | null;
    rejection_reason: string | null; completed_by: string | null; completed_at: string | null;
    asset?: { id: string; name: string; asset_code: string };
    from_branch?: { id: string; name: string }; from_site?: { id: string; name: string };
    from_building?: { id: string; name: string; name_ar: string | null }; from_floor_zone?: { id: string; name: string; name_ar: string | null };
    to_branch?: { id: string; name: string }; to_site?: { id: string; name: string };
    to_building?: { id: string; name: string; name_ar: string | null }; to_floor_zone?: { id: string; name: string; name_ar: string | null };
    requested_by_profile?: { id: string; full_name: string };
    approved_by_profile?: { id: string; full_name: string };
    completed_by_profile?: { id: string; full_name: string };
}

export interface CreateTransferRequest {
    asset_id: string; transfer_type: TransferType;
    from_branch_id?: string | null; from_site_id?: string | null; from_building_id?: string | null; from_floor_zone_id?: string | null;
    to_branch_id?: string | null; to_site_id?: string | null; to_building_id?: string | null; to_floor_zone_id?: string | null;
    disposal_method?: DisposalMethod | null; disposal_value?: number | null; disposal_notes?: string | null;
    reason: string; notes?: string | null;
}
