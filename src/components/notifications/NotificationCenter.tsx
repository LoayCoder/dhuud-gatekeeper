// Stub: NotificationCenter
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotificationCenter() {
  return (
    <Button variant="ghost" size="icon" aria-label="Notifications">
      <Bell className="h-4 w-4" />
    </Button>
  );
}
