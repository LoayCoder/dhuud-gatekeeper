-- Allow authenticated users to insert event categories
CREATE POLICY "Authenticated users can insert event categories"
ON hsse_event_categories
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert event subtypes
CREATE POLICY "Authenticated users can insert event subtypes"
ON hsse_event_subtypes
FOR INSERT
TO authenticated
WITH CHECK (true);