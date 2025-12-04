-- =====================================================
-- DATABASE INDEXING STRATEGY FOR 20,000+ USERS
-- =====================================================

-- BRANCHES TABLE
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON public.branches(tenant_id);

-- DEPARTMENTS TABLE
CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON public.departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_division_id ON public.departments(division_id);

-- DIVISIONS TABLE
CREATE INDEX IF NOT EXISTS idx_divisions_tenant_id ON public.divisions(tenant_id);

-- INVITATIONS TABLE
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_used ON public.invitations(used);

-- MANAGER_TEAM TABLE
CREATE INDEX IF NOT EXISTS idx_manager_team_tenant_id ON public.manager_team(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manager_team_manager_id ON public.manager_team(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_team_user_id ON public.manager_team(user_id);

-- MFA_BACKUP_CODES TABLE
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_id ON public.mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_used_at ON public.mfa_backup_codes(used_at);

-- MODULES TABLE
CREATE INDEX IF NOT EXISTS idx_modules_code ON public.modules(code);
CREATE INDEX IF NOT EXISTS idx_modules_is_active ON public.modules(is_active);
CREATE INDEX IF NOT EXISTS idx_modules_sort_order ON public.modules(sort_order);

-- PLAN_MODULES TABLE
CREATE INDEX IF NOT EXISTS idx_plan_modules_plan_id ON public.plan_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_modules_module_id ON public.plan_modules(module_id);

-- PLANS TABLE
CREATE INDEX IF NOT EXISTS idx_plans_name ON public.plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON public.plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON public.plans(sort_order);

-- PROFILES TABLE (HIGH TRAFFIC)
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_branch_id ON public.profiles(assigned_branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_division_id ON public.profiles(assigned_division_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_department_id ON public.profiles(assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_section_id ON public.profiles(assigned_section_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_site_id ON public.profiles(assigned_site_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON public.profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_has_login ON public.profiles(has_login);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_active ON public.profiles(tenant_id, is_active, is_deleted);

-- ROLES TABLE
CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_category ON public.roles(category);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON public.roles(is_active);

-- SECTIONS TABLE
CREATE INDEX IF NOT EXISTS idx_sections_tenant_id ON public.sections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sections_department_id ON public.sections(department_id);

-- SECURITY_BLACKLIST TABLE
CREATE INDEX IF NOT EXISTS idx_security_blacklist_tenant_id ON public.security_blacklist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_blacklist_national_id ON public.security_blacklist(national_id);

-- SITES TABLE
CREATE INDEX IF NOT EXISTS idx_sites_tenant_id ON public.sites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sites_branch_id ON public.sites(branch_id);
CREATE INDEX IF NOT EXISTS idx_sites_is_active ON public.sites(is_active);

-- SUBSCRIPTION_EVENTS TABLE
CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant_id ON public.subscription_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON public.subscription_events(created_at);

-- SUBSCRIPTION_REQUESTS TABLE
CREATE INDEX IF NOT EXISTS idx_subscription_requests_tenant_id ON public.subscription_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_requested_plan_id ON public.subscription_requests(requested_plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_approved_plan_id ON public.subscription_requests(approved_plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON public.subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_created_at ON public.subscription_requests(created_at);

-- SUPPORT_TICKETS TABLE (HIGH TRAFFIC)
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON public.support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON public.support_tickets(ticket_number);

-- TENANT_BILLING_RECORDS TABLE
CREATE INDEX IF NOT EXISTS idx_tenant_billing_records_tenant_id ON public.tenant_billing_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_billing_records_plan_id ON public.tenant_billing_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenant_billing_records_billing_month ON public.tenant_billing_records(billing_month);
CREATE INDEX IF NOT EXISTS idx_tenant_billing_records_status ON public.tenant_billing_records(status);

-- TENANT_MODULES TABLE
CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_id ON public.tenant_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_module_id ON public.tenant_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_enabled ON public.tenant_modules(enabled);

-- TENANT_PROFILE_USAGE TABLE
CREATE INDEX IF NOT EXISTS idx_tenant_profile_usage_tenant_id ON public.tenant_profile_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_profile_usage_billing_month ON public.tenant_profile_usage(billing_month);

-- TENANT_PROFILES TABLE (HIGH TRAFFIC)
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_tenant_id ON public.tenant_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_profile_type ON public.tenant_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_is_active ON public.tenant_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_is_deleted ON public.tenant_profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_has_login ON public.tenant_profiles(has_login);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_email ON public.tenant_profiles(email);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_national_id ON public.tenant_profiles(national_id);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_created_at ON public.tenant_profiles(created_at);
-- Composite index for billing calculations
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_billing ON public.tenant_profiles(tenant_id, profile_type, has_login, is_deleted);

-- TENANTS TABLE
CREATE INDEX IF NOT EXISTS idx_tenants_plan_id ON public.tenants(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON public.tenants(created_at);

-- TICKET_MESSAGES TABLE
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON public.ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_is_internal ON public.ticket_messages(is_internal);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON public.ticket_messages(created_at);

-- TRUSTED_DEVICES TABLE
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_device_token ON public.trusted_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_trusted_until ON public.trusted_devices(trusted_until);

-- USER_ACTIVITY_LOGS TABLE (HIGH TRAFFIC)
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_event_type ON public.user_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at);
-- Composite index for audit queries
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_audit ON public.user_activity_logs(user_id, event_type, created_at DESC);

-- USER_ROLE_ASSIGNMENTS TABLE (HIGH TRAFFIC)
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON public.user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_tenant_id ON public.user_role_assignments(tenant_id);

-- USER_ROLES TABLE
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- VISIT_REQUESTS TABLE
CREATE INDEX IF NOT EXISTS idx_visit_requests_tenant_id ON public.visit_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_visitor_id ON public.visit_requests(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_site_id ON public.visit_requests(site_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_host_id ON public.visit_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_status ON public.visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visit_requests_created_at ON public.visit_requests(created_at);

-- VISITORS TABLE
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_id ON public.visitors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON public.visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_national_id ON public.visitors(national_id);
CREATE INDEX IF NOT EXISTS idx_visitors_qr_code_token ON public.visitors(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_visitors_is_active ON public.visitors(is_active);