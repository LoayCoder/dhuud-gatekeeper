export type TableType = 'branches' | 'divisions' | 'departments' | 'sections' | 'sites' | 'buildings' | 'floor_zones';

export interface Branch {
  id: string;
  name: string;
  name_ar?: string | null;
  code?: string | null;
  is_active?: boolean;
}

export interface Division {
  id: string;
  name: string;
  name_ar?: string | null;
  branch_id?: string | null;
}

export interface Department {
  id: string;
  name: string;
  name_ar?: string | null;
  branch_id?: string | null;
  division_id?: string | null;
}

export interface Section {
  id: string;
  name: string;
  name_ar?: string | null;
  department_id?: string | null;
}

export interface Site {
  id: string;
  name: string;
  name_ar?: string | null;
  branch_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Building {
  id: string;
  name: string;
  name_ar?: string | null;
  site_id?: string | null;
}

export interface FloorZone {
  id: string;
  name: string;
  name_ar?: string | null;
  building_id?: string | null;
}
