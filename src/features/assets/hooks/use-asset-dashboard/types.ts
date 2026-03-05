export interface AssetStats {
    total: number;
    active: number;
    inactive: number;
    under_maintenance: number;
    decommissioned: number;
}

export interface ConditionDistribution {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
}

export interface CategoryDistribution {
    category_id: string;
    category_name: string;
    count: number;
}

export interface OverdueItem {
    id: string;
    name: string;
    asset_code: string;
    due_date: string;
    days_overdue: number;
}
