import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Camera, 
  MapPin, 
  Route,
  Phone,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuardQuickActionsProps {
  onEmergency?: () => void;
  onQuickPhoto?: () => void;
  onStartPatrol?: () => void;
  onIncidentReport?: () => void;
  className?: string;
  variant?: 'bar' | 'grid';
}

export function GuardQuickActions({
  onEmergency,
  onQuickPhoto,
  onStartPatrol,
  onIncidentReport,
  className,
  variant = 'bar',
}: GuardQuickActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = [
    {
      id: 'emergency',
      icon: AlertTriangle,
      label: t('security.quickActions.emergency', 'Emergency'),
      color: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      onClick: onEmergency,
    },
    {
      id: 'patrol',
      icon: Route,
      label: t('security.quickActions.patrol', 'Patrol'),
      color: 'bg-primary text-primary-foreground hover:bg-primary/90',
      onClick: onStartPatrol || (() => navigate('/security/patrols/execute')),
    },
    {
      id: 'incident',
      icon: FileText,
      label: t('security.quickActions.incident', 'Report'),
      color: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      onClick: onIncidentReport,
    },
    {
      id: 'location',
      icon: MapPin,
      label: t('security.quickActions.location', 'Location'),
      color: 'bg-accent text-accent-foreground hover:bg-accent/80',
      onClick: () => navigate('/security/my-location'),
    },
  ];

  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 gap-3', className)}>
        {actions.map(({ id, icon: Icon, label, color, onClick }) => (
          <Button
            key={id}
            variant="ghost"
            className={cn(
              'h-20 flex-col gap-2 rounded-xl',
              color
            )}
            onClick={onClick}
          >
            <Icon className="h-6 w-6" />
            <span className="text-sm font-medium">{label}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      'fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t safe-area-pb',
      className
    )}>
      <div className="flex items-center justify-around py-2 px-4">
        {actions.map(({ id, icon: Icon, label, color, onClick }) => (
          <button
            key={id}
            onClick={onClick}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-all active:scale-95',
              id === 'emergency' && 'text-destructive'
            )}
          >
            <div className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center',
              id === 'emergency' ? 'bg-destructive text-destructive-foreground' : 'bg-muted'
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
