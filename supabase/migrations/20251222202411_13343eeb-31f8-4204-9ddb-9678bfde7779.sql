-- Update menu item parent from settings to administration
UPDATE menu_items 
SET parent_code = 'administration',
    url = '/admin/event-categories',
    sort_order = 85
WHERE code = 'settings_event_categories';