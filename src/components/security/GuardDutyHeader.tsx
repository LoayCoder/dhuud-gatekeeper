import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Clock, Shield, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useMyRosterAssignment } from '@/hooks/use-shift-roster';
import { cn } from '@/lib/utils';

interface GuardDutyHeaderProps {
  className?: string;
}

export function GuardDutyHeader({ className }: GuardDutyHeaderProps) {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const { data: rosterAssignment, isLoading } = useMyRosterAssignment();
  
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [phoneDialogData, setPhoneDialogData] = useState<{
    name: string;
    phone: string;
    role: string;
  } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleShowPhone = (name: string, phone: string, role: string) => {
    setPhoneDialogData({ name, phone, role });
    setShowPhoneDialog(true);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const guardName = profile?.full_name || user?.email?.split('@')[0] || t('common.unknown', 'Unknown');
  const guardInitials = guardName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  // Phone is optional and may come from extended profile data
  const guardPhone = (profile as any)?.mobile_number || (profile as any)?.phone || '';
  
  // Mock supervisor data - in production, fetch from roster assignment's zone supervisor
  const supervisorName = t('security.gateDashboard.supervisor', 'Supervisor');
  const supervisorPhone = '+966500000000';

  // Get shift info from roster assignment
  const shiftInfo = rosterAssignment ? {
    name: t('security.gateDashboard.shift', 'Shift'),
    time: rosterAssignment.check_in_time 
      ? new Date(rosterAssignment.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '--:--',
    status: rosterAssignment.status || 'scheduled'
  } : null;

  return (
    <>
      <Card className={cn("overflow-hidden border-primary/20 bg-primary/5", className)}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardContent className="p-2.5 sm:p-3 cursor-pointer hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Guard Avatar */}
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary/30 flex-shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs sm:text-sm font-bold">
                    {guardInitials}
                  </AvatarFallback>
                </Avatar>
                
                {/* Guard Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-sm sm:text-base truncate">{guardName}</p>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                      <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 me-0.5" />
                      {t('security.gateDashboard.onDuty', 'On Duty')}
                    </Badge>
                  </div>
                  
                  {/* Compact shift info on main row */}
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {shiftInfo && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                        <span className="truncate">{shiftInfo.time}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand indicator */}
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                  isExpanded && "rotate-180"
                )} />
              </div>
            </CardContent>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3 pt-0 border-t border-primary/10">
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* My Phone */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs justify-start gap-2"
                  onClick={() => handleShowPhone(guardName, guardPhone, t('security.gateDashboard.guardOnDuty', 'Guard on Duty'))}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span className="truncate">{t('security.gateDashboard.myNumber', 'My Number')}</span>
                </Button>

                {/* Call Supervisor */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs justify-start gap-2 text-primary"
                  onClick={() => handleShowPhone(supervisorName, supervisorPhone, t('security.gateDashboard.supervisor', 'Supervisor'))}
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="truncate">{t('security.gateDashboard.callSupervisor', 'Call Supervisor')}</span>
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Phone Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">{phoneDialogData?.name}</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <Badge variant="secondary" className="text-xs">
              {phoneDialogData?.role}
            </Badge>
            <p className="text-2xl font-mono font-bold tracking-wider" dir="ltr">
              {phoneDialogData?.phone || t('common.noPhoneNumber', 'No phone number')}
            </p>
            {phoneDialogData?.phone && (
              <Button 
                size="lg" 
                className="w-full gap-2"
                onClick={() => handleCall(phoneDialogData.phone)}
              >
                <Phone className="h-5 w-5" />
                {t('common.call', 'Call')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
