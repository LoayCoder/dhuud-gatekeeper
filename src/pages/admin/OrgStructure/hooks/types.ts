export type TableType = 'branches' | 'divisions' | 'departments' | 'sections' | 'sites' | 'buildings' | 'floor_zones' | 'floors_zones';

export interface Branch {
  id: string;
  name: string;
  name_ar?: string | null;
  code?: string | null;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: any;
}

export interface Division {
  id: string;
  name: string;
  name_ar?: string | null;
  branch_id?: string | null;
  [key: string]: any;
}

export interface Department {
  id: string;
  name: string;
  name_ar?: string | null;
  branch_id?: string | null;
  division_id?: string | null;
  divisions?: { name: string } | null;
  [key: string]: any;
}

export interface Section {
  id: string;
  name: string;
  name_ar?: string | null;
  department_id?: string | null;
  branch_id?: string | null;
  departments?: { name: string } | null;
  [key: string]: any;
}

export interface Site {
  id: string;
  name: string;
  name_ar?: string | null;
  branch_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  branches?: { name: string } | null;
  [key: string]: any;
}

export interface Building {
  id: string;
  name: string;
  name_ar?: string | null;
  site_id?: string | null;
  sites?: { name: string } | null;
  [key: string]: any;
}

export interface FloorZone {
  id: string;
  name: string;
  name_ar?: string | null;
  building_id?: string | null;
  level_number?: number | null;
  buildings?: { name: string } | null;
  [key: string]: any;
}
