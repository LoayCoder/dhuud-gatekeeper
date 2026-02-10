ALTER TABLE material_gate_passes ADD COLUMN purpose TEXT;
ALTER TABLE material_gate_passes ADD COLUMN notes TEXT;
NOTIFY pgrst, 'reload schema';