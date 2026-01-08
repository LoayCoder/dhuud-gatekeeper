-- Phase 1a: Add 'contractor' to role_category enum
ALTER TYPE role_category ADD VALUE IF NOT EXISTS 'contractor';