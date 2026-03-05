// Stub: NotificationPopover
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotificationPopover() {
  return (
    <Button variant="ghost" size="icon" aria-label="Notifications">
      <Bell className="h-4 w-4" />
    </Button>
  );
}
