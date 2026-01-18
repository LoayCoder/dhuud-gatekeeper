/**
 * Visitor Access Zone Manager
 * 
 * Component for managing visitor zone access with time restrictions.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useVisitorZoneAccess, 
  useAssignZoneAccess, 
  useRevokeZoneAccess,
  useAvailableZones 
} from '@/hooks/use-visitor-zone-access';
import { AccessZoneCard } from './AccessZoneCard';
import { AccessZoneTimeSelector } from './AccessZoneTimeSelector';
import { MapPin, Plus, Shield, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisitorAccessZoneManagerProps {
  visitorId: string;
  siteId: string;
  className?: string;
}

export function VisitorAccessZoneManager({ 
  visitorId, 
  siteId,
  className 
}: VisitorAccessZoneManagerProps) {
  const { t } = useTranslation();
  
  const [showAddZone, setShowAddZone] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [allowedDays, setAllowedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [timeFrom, setTimeFrom] = useState('08:00');
  const [timeUntil, setTimeUntil] = useState('17:00');
  const [accessLevel, setAccessLevel] = useState<'escort_required' | 'supervised' | 'unrestricted'>('escort_required');
  const [requiresInduction, setRequiresInduction] = useState(false);

  const { data: currentAccess, isLoading: accessLoading } = useVisitorZoneAccess(visitorId);
  const { data: availableZones, isLoading: zonesLoading } = useAvailableZones(siteId);
  const assignAccess = useAssignZoneAccess();
  const revokeAccess = useRevokeZoneAccess();

  // Filter out zones that already have access
  const accessibleZoneIds = currentAccess?.map((a: { zone_id: string }) => a.zone_id) || [];
  const unassignedZones = availableZones?.filter(z => !accessibleZoneIds.includes(z.id)) || [];

  const handleAssignZone = async () => {
    if (!selectedZoneId) return;

    await assignAccess.mutateAsync({
      visitor_id: visitorId,
      zone_id: selectedZoneId,
      site_id: siteId,
      allowed_days: allowedDays,
      allowed_entry_time_from: timeFrom,
      allowed_entry_time_until: timeUntil,
      access_level: accessLevel,
      requires_induction: requiresInduction,
    });

    // Reset form
    setShowAddZone(false);
    setSelectedZoneId('');
    setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
    setTimeFrom('08:00');
    setTimeUntil('17:00');
    setAccessLevel('escort_required');
    setRequiresInduction(false);
  };

  const handleRevokeAccess = async (ruleId: string) => {
    await revokeAccess.mutateAsync({ ruleId });
  };

  const isLoading = accessLoading || zonesLoading;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Access */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('visitors.zoneAccess.title', 'Zone Access')}
            </CardTitle>
            <CardDescription>
              {t('visitors.zoneAccess.description', 'Manage which areas this visitor can access')}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddZone(!showAddZone)}
            disabled={unassignedZones.length === 0}
          >
            <Plus className="w-4 h-4 me-2" />
            {t('visitors.zoneAccess.addZone', 'Add Zone')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.loading', 'Loading...')}
            </div>
          ) : currentAccess && currentAccess.length > 0 ? (
            <div className="grid gap-3">
              {currentAccess.map((access: { id: string; zone_id: string }) => (
                <AccessZoneCard
                  key={access.id}
                  access={access as any}
                  onRevoke={() => handleRevokeAccess(access.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('visitors.zoneAccess.noAccess', 'No zone access assigned')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Zone Form */}
      {showAddZone && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('visitors.zoneAccess.assignNewZone', 'Assign New Zone Access')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Zone Selection */}
            <div className="space-y-2">
              <Label>{t('visitors.zoneAccess.selectZone', 'Select Zone')}</Label>
              <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('visitors.zoneAccess.choosezone', 'Choose a zone')} />
                </SelectTrigger>
                <SelectContent>
                  {unassignedZones.map((zone: { id: string; zone_type?: string; risk_level?: string }) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      <div className="flex items-center gap-2">
                        <span>{zone.zone_type || zone.id.slice(0, 8)}</span>
                        {zone.risk_level && (
                          <Badge variant="outline" className="text-xs">
                            {zone.risk_level}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Selector */}
            <AccessZoneTimeSelector
              allowedDays={allowedDays}
              onDaysChange={setAllowedDays}
              timeFrom={timeFrom}
              onTimeFromChange={setTimeFrom}
              timeUntil={timeUntil}
              onTimeUntilChange={setTimeUntil}
            />

            {/* Access Level */}
            <div className="space-y-2">
              <Label>{t('visitors.zoneAccess.accessLevel', 'Access Level')}</Label>
              <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as typeof accessLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="escort_required">
                    {t('visitors.zoneAccess.escortRequired', 'Escort Required')}
                  </SelectItem>
                  <SelectItem value="supervised">
                    {t('visitors.zoneAccess.supervised', 'Supervised')}
                  </SelectItem>
                  <SelectItem value="unrestricted">
                    {t('visitors.zoneAccess.unrestricted', 'Unrestricted')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Induction Requirement */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('visitors.zoneAccess.requiresInduction', 'Requires Induction')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('visitors.zoneAccess.requiresInductionDesc', 'Visitor must complete induction before accessing')}
                </p>
              </div>
              <Switch
                checked={requiresInduction}
                onCheckedChange={setRequiresInduction}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddZone(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                onClick={handleAssignZone}
                disabled={!selectedZoneId || assignAccess.isPending}
              >
                {assignAccess.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
