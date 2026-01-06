-- Restore admin role for Luay.Madkhali@golfsaudi.com at Golf Saudi
INSERT INTO user_role_assignments (user_id, role_id, tenant_id, assigned_by)
VALUES (
  '9e5ae1f2-c51d-4afd-9386-b45d06c13a61',
  '67c1e03d-3dd7-4f26-aba2-fbea37a3d952',
  'e30ae1a5-7eab-4776-bd0b-bb0b391e68e8',
  NULL
)
ON CONFLICT DO NOTHING;