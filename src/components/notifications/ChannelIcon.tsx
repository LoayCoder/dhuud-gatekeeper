import { Mail, Bell, MessageSquare } from 'lucide-react';

export function ChannelIcon({ channel, ...rest }: { channel: string; [key: string]: any }) {
  switch (channel) {
    case 'email': return <Mail className="h-4 w-4" />;
    case 'sms': return <MessageSquare className="h-4 w-4" />;
    default: return <Bell className="h-4 w-4" />;
  }
}
