// Shared constant for the gate pass SELECT query string

const GATE_PASS_SELECT = `
  id, reference_number, project_id, company_id, pass_type, material_description,
  quantity, vehicle_plate, driver_name, driver_mobile, pass_date, start_date, end_date,
  time_window_start, time_window_end, status, requested_by,
  pm_approved_by, pm_approved_at, pm_notes,
  safety_approved_by, safety_approved_at, safety_notes,
  rejected_by, rejected_at, rejection_reason,
  guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
  is_internal_request, approval_from_id,
  renewal_count, renewed_by, renewed_at, renewal_expires_at,
  project:contractor_projects(project_name, department_id, company:contractor_companies(company_name)),
  company:contractor_companies(company_name),
  requester:profiles!requested_by(full_name),
  approval_from:profiles!approval_from_id(full_name)
`;

export { GATE_PASS_SELECT };
