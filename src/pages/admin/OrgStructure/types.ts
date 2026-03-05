export interface Branch {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}
export interface Division { id: string; name: string; branch_id?: string | null; branches?: { name: string } | null; [key: string]: unknown; }
export interface Department { id: string; name: string; division_id: string; branch_id?: string | null; divisions?: { name: string } | null; branches?: { name: string } | null; [key: string]: unknown; }
export interface Section { id: string; name: string; department_id: string; branch_id?: string | null; departments?: { name: string } | null; branches?: { name: string } | null; [key: string]: unknown; }
export interface Coordinate {
  lat: number;
  lng: number;
}
export interface Site {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  branch_id: string | null;
  is_active: boolean | null;
  boundary_polygon?: Coordinate[] | null;
  branches?: { name: string } | null;
}
export interface Building {
  id: string;
  name: string;
  name_ar: string | null;
  site_id: string;
  floor_count: number | null;
  is_active: boolean | null;
  branch_id?: string | null;
  sites?: { name: string } | null;
}
export interface FloorZone {
  id: string;
  name: string;
  name_ar: string | null;
  building_id: string;
  zone_type: string | null;
  level_number: number | null;
  is_active: boolean | null;
  branch_id?: string | null;
  buildings?: { name: string } | null;
}

export type TableType = 'branches' | 'divisions' | 'departments' | 'sections' | 'sites' | 'buildings' | 'floors_zones';
