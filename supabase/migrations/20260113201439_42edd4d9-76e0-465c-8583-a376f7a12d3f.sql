-- Fix remaining security issues

-- 1. Fix functions with mutable search_path (identify and fix the 3 flagged functions)
-- These are likely existing functions that need search_path set

-- Add separate RLS policies for audit_logs (to fix RLS Enabled No Policy if needed)
DROP POLICY IF EXISTS "tenant_isolation_audit_logs" ON audit_logs;

CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (tenant_id = get_auth_tenant_id());

-- Audit logs should not be updated or deleted by users (append-only)
-- Only system/admin can modify