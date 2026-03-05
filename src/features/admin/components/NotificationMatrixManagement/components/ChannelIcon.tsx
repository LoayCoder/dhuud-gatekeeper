import React from 'react';
import { Mail, MessageCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChannelIconProps {
  channel: string;
  active?: boolean;
  size?: 'sm' | 'md';
}

export function ChannelIcon({ channel, active = false, size = 'sm' }: ChannelIconProps) {
  const sizeClass = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const colorClass = active ? 'text-foreground' : 'text-muted-foreground/40';
  
  switch (channel) {
    case 'email':
      return <Mail className={cn(sizeClass, colorClass)} />;
    case 'whatsapp':
      return <MessageCircle className={cn(sizeClass, colorClass)} />;
    case 'push':
      return <Smartphone className={cn(sizeClass, colorClass)} />;
    default:
      return null;
  }
}
