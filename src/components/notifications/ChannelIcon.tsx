import { MessageSquare, Mail, Smartphone, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationChannel = 'whatsapp' | 'email' | 'sms' | 'push';

interface ChannelIconProps {
  channel: NotificationChannel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const channelConfig: Record<NotificationChannel, {
  label: string;
  labelAr: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  whatsapp: {
    label: 'WhatsApp',
    labelAr: 'واتساب',
    icon: MessageSquare,
    color: 'text-green-600',
  },
  email: {
    label: 'Email',
    labelAr: 'البريد الإلكتروني',
    icon: Mail,
    color: 'text-blue-600',
  },
  sms: {
    label: 'SMS',
    labelAr: 'رسالة نصية',
    icon: Smartphone,
    color: 'text-purple-600',
  },
  push: {
    label: 'Push',
    labelAr: 'إشعار',
    icon: Bell,
    color: 'text-amber-600',
  },
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function ChannelIcon({ 
  channel, 
  size = 'md', 
  showLabel = false,
  className 
}: ChannelIconProps) {
  const config = channelConfig[channel] || channelConfig.email;
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Icon className={cn(sizeClasses[size], config.color)} />
      {showLabel && <span className="text-sm">{config.label}</span>}
    </div>
  );
}

export function getChannelLabel(channel: NotificationChannel, lang: 'en' | 'ar' = 'en'): string {
  const config = channelConfig[channel];
  return lang === 'ar' ? config?.labelAr : config?.label || channel;
}
