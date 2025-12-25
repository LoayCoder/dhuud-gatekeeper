import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Lock, Users, History, UserPlus, UserMinus, 
  Shield, AlertTriangle, Search, Check 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ConfidentialitySelector } from './ConfidentialitySelector';
import { ConfidentialityBadge } from '@/components/incidents/ConfidentialityBadge';
import { 
  useIncidentConfidentiality,
  useIncidentAccessList,
  useConfidentialityAudit,
  useUpdateConfidentiality,
  useGrantAccess,
  useRevokeAccess,
  useCanManageAccessList,
  ConfidentialityLevel
} from '@/hooks/use-incident-confidentiality';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ConfidentialityManagementPanelProps {
  incidentId: string;
  tenantId: string;
}

export function ConfidentialityManagementPanel({ incidentId, tenantId }: ConfidentialityManagementPanelProps) {
  const { t } = useTranslation();
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [accessReason, setAccessReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  
  // New level settings for change dialog
  const [newLevel, setNewLevel] = useState<ConfidentialityLevel>('public');
  const [newExpiry, setNewExpiry] = useState<Date | null>(null);
  const [newAutoDeclassify, setNewAutoDeclassify] = useState<'public' | 'restricted' | null>(null);
  const [newExpiryReason, setNewExpiryReason] = useState('');
  
  const { data: canManage } = useCanManageAccessList();
  const { data: settings, isLoading: loadingSettings } = useIncidentConfidentiality(incidentId);
  const { data: accessList = [], isLoading: loadingAccessList } = useIncidentAccessList(incidentId);
  const { data: auditLog = [], isLoading: loadingAudit } = useConfidentialityAudit(incidentId);
  
  const updateConfidentiality = useUpdateConfidentiality();
  const grantAccess = useGrantAccess();
  const revokeAccess = useRevokeAccess();
  
  // Search users for access list
  const { data: searchResults = [] } = useQuery({
    queryKey: ['user-search', tenantId, userSearch],
    queryFn: async () => {
      if (userSearch.length < 2) return [];
      
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
        .limit(10);
      
      return data || [];
    },
    enabled: userSearch.length >= 2 && showAddUserDialog
  });
  
  // Filter out users already in access list
  const availableUsers = searchResults.filter(
    u => !accessList.some(a => a.user_id === u.id)
  );
  
  const handleOpenChangeDialog = () => {
    if (settings) {
      setNewLevel(settings.level);
      setNewExpiry(settings.expiry ? new Date(settings.expiry) : null);
      setNewAutoDeclassify(settings.autoDeclassifyTo);
      setNewExpiryReason(settings.expiryReason || '');
    }
    setShowChangeDialog(true);
  };
  
  const handleConfirmChange = async () => {
    if (newLevel !== 'public' && !newExpiryReason.trim()) return;
    
    await updateConfidentiality.mutateAsync({
      incidentId,
      level: newLevel,
      expiry: newExpiry?.toISOString(),
      autoDeclassifyTo: newAutoDeclassify,
      expiryReason: newExpiryReason.trim()
    });
    
    setShowChangeDialog(false);
  };
  
  const handleGrantAccess = async () => {
    if (!selectedUserId) return;
    
    await grantAccess.mutateAsync({
      incidentId,
      userId: selectedUserId,
      reason: accessReason.trim() || undefined
    });
    
    setShowAddUserDialog(false);
    setSelectedUserId(null);
    setAccessReason('');
    setUserSearch('');
  };
  
  const handleRevokeAccess = async (accessId: string) => {
    const access = accessList.find(a => a.id === accessId);
    if (!access) return;
    
    await revokeAccess.mutateAsync({
      accessId,
      incidentId,
      userId: access.user_id,
      reason: revokeReason.trim() || undefined
    });
    
    setShowRevokeDialog(null);
    setRevokeReason('');
  };
  
  if (!canManage) {
    return null;
  }
  
  if (loadingSettings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </CardContent>
      </Card>
    );
  }
  
  const currentLevel = settings?.level || 'public';
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('confidentiality.management.title', 'Confidentiality Management')}
            </CardTitle>
            <CardDescription>
              {t('confidentiality.management.description', 'Control who can access this incident and investigation')}
            </CardDescription>
          </div>
          <ConfidentialityBadge level={currentLevel} size="lg" />
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="settings">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings" className="gap-2">
              <Lock className="h-4 w-4" />
              {t('confidentiality.tabs.settings', 'Settings')}
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-2" disabled={currentLevel !== 'confidential'}>
              <Users className="h-4 w-4" />
              {t('confidentiality.tabs.accessList', 'Access List')}
              {currentLevel === 'confidential' && (
                <Badge variant="secondary" className="ms-1 text-xs">
                  {accessList.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              {t('confidentiality.tabs.history', 'History')}
            </TabsTrigger>
          </TabsList>
          
          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 pt-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('confidentiality.currentLevel', 'Current Level')}</p>
                  <p className="text-sm text-muted-foreground">
                    {settings?.setAt 
                      ? t('confidentiality.setOn', 'Set on {{date}}', { 
                          date: format(new Date(settings.setAt), 'PPp') 
                        })
                      : t('confidentiality.defaultLevel', 'Default level')
                    }
                  </p>
                  {settings?.expiry && (
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">{t('confidentiality.expiry.expiresOn', 'Expires:')}</span>
                      <span className="ms-1 font-medium">{format(new Date(settings.expiry), 'PPp')}</span>
                      {settings.autoDeclassifyTo && (
                        <Badge variant="outline" className="ms-2 text-xs">
                          → {settings.autoDeclassifyTo}
                        </Badge>
                      )}
                    </p>
                  )}
                </div>
                <Button onClick={handleOpenChangeDialog}>
                  {t('confidentiality.changeLevel', 'Change Level')}
                </Button>
              </div>
              
              {settings?.expiryReason && currentLevel !== 'public' && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">{t('confidentiality.classificationReason', 'Classification Reason:')}</p>
                  <p className="text-sm mt-1">{settings.expiryReason}</p>
                </div>
              )}
            </div>
            
            {currentLevel !== 'public' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {t('confidentiality.accessRestricted', 'Access Restricted')}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {currentLevel === 'confidential'
                        ? t('confidentiality.warnings.confidential', 'Only HSSE Manager and users on the access list can view this incident.')
                        : t('confidentiality.warnings.restricted', 'Only department members and HSSE team can view this incident.')
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Access List Tab */}
          <TabsContent value="access" className="space-y-4 pt-4">
            {currentLevel === 'confidential' ? (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {t('confidentiality.accessList.description', 'Users with explicit access to this confidential incident')}
                  </p>
                  <Button size="sm" onClick={() => setShowAddUserDialog(true)}>
                    <UserPlus className="h-4 w-4 me-2" />
                    {t('confidentiality.accessList.addUser', 'Add User')}
                  </Button>
                </div>
                
                {loadingAccessList ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('common.loading', 'Loading...')}
                  </div>
                ) : accessList.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      {t('confidentiality.accessList.empty', 'No users have been granted access yet')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('confidentiality.accessList.emptyHint', 'Only HSSE Manager has access by default')}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {accessList.map((access) => (
                        <div 
                          key={access.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {access.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{access.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {t('confidentiality.accessList.grantedBy', 'Granted by {{name}} on {{date}}', {
                                  name: access.granted_by_name,
                                  date: format(new Date(access.granted_at), 'PP')
                                })}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setShowRevokeDialog(access.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('confidentiality.accessList.notConfidential', 'Access list is only available for Confidential level')}</p>
              </div>
            )}
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="pt-4">
            {loadingAudit ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('common.loading', 'Loading...')}
              </div>
            ) : auditLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('confidentiality.history.empty', 'No changes recorded yet')}</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        entry.action === 'access_granted' && "bg-green-100 text-green-600",
                        entry.action === 'access_revoked' && "bg-red-100 text-red-600",
                        entry.action === 'level_set' && "bg-blue-100 text-blue-600",
                        entry.action === 'level_changed' && "bg-amber-100 text-amber-600",
                        entry.action === 'auto_declassified' && "bg-purple-100 text-purple-600"
                      )}>
                        {entry.action === 'access_granted' && <UserPlus className="h-4 w-4" />}
                        {entry.action === 'access_revoked' && <UserMinus className="h-4 w-4" />}
                        {(entry.action === 'level_set' || entry.action === 'level_changed') && <Lock className="h-4 w-4" />}
                        {entry.action === 'auto_declassified' && <Shield className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {entry.action === 'level_set' && t('confidentiality.audit.levelSet', 'Level set to {{level}}', { level: entry.new_level })}
                          {entry.action === 'level_changed' && t('confidentiality.audit.levelChanged', 'Level changed from {{old}} to {{new}}', { old: entry.old_level, new: entry.new_level })}
                          {entry.action === 'access_granted' && t('confidentiality.audit.accessGranted', 'Access granted to {{user}}', { user: entry.affected_user_name })}
                          {entry.action === 'access_revoked' && t('confidentiality.audit.accessRevoked', 'Access revoked from {{user}}', { user: entry.affected_user_name })}
                          {entry.action === 'auto_declassified' && t('confidentiality.audit.autoDeclassified', 'Auto-declassified to {{level}}', { level: entry.new_level })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.actor_name} • {format(new Date(entry.created_at), 'PPp')}
                        </p>
                        {entry.reason && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{entry.reason}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Change Level Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('confidentiality.changeLevel', 'Change Confidentiality Level')}</DialogTitle>
            <DialogDescription>
              {t('confidentiality.changeLevelDescription', 'Update the access restrictions for this incident')}
            </DialogDescription>
          </DialogHeader>
          
          <ConfidentialitySelector
            value={newLevel}
            onChange={setNewLevel}
            expiry={newExpiry}
            onExpiryChange={setNewExpiry}
            autoDeclassifyTo={newAutoDeclassify}
            onAutoDeclassifyChange={setNewAutoDeclassify}
            expiryReason={newExpiryReason}
            onExpiryReasonChange={setNewExpiryReason}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleConfirmChange}
              disabled={updateConfidentiality.isPending || (newLevel !== 'public' && !newExpiryReason.trim())}
            >
              {updateConfidentiality.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confidentiality.accessList.addUser', 'Grant Access to User')}</DialogTitle>
            <DialogDescription>
              {t('confidentiality.accessList.addUserDescription', 'Search for a user to grant access to this incident')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('confidentiality.accessList.searchPlaceholder', 'Search by name or email...')}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            
            {userSearch.length >= 2 && (
              <ScrollArea className="h-[200px] border rounded-lg">
                {availableUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('confidentiality.accessList.noResults', 'No users found')}
                  </div>
                ) : (
                  <div className="p-1">
                    {availableUsers.map((user) => (
                      <button
                        key={user.id}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-md text-start transition-colors",
                          selectedUserId === user.id 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        )}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{user.full_name}</p>
                          <p className="text-xs opacity-70 truncate">{user.email}</p>
                        </div>
                        {selectedUserId === user.id && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
            
            <div className="space-y-2">
              <Label>{t('confidentiality.accessList.reason', 'Reason (optional)')}</Label>
              <Textarea
                placeholder={t('confidentiality.accessList.reasonPlaceholder', 'Why does this user need access?')}
                value={accessReason}
                onChange={(e) => setAccessReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleGrantAccess}
              disabled={!selectedUserId || grantAccess.isPending}
            >
              {grantAccess.isPending ? t('common.granting', 'Granting...') : t('confidentiality.accessList.grantAccess', 'Grant Access')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Revoke Access Dialog */}
      <AlertDialog open={!!showRevokeDialog} onOpenChange={(open) => !open && setShowRevokeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confidentiality.accessList.revokeAccess', 'Revoke Access')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confidentiality.accessList.revokeDescription', 'This user will no longer be able to view this incident. This action is logged.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t('confidentiality.accessList.revokeReason', 'Reason (optional)')}</Label>
            <Textarea
              placeholder={t('confidentiality.accessList.revokeReasonPlaceholder', 'Why is access being revoked?')}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => showRevokeDialog && handleRevokeAccess(showRevokeDialog)}
              disabled={revokeAccess.isPending}
            >
              {revokeAccess.isPending ? t('common.revoking', 'Revoking...') : t('confidentiality.accessList.revoke', 'Revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
