import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Users, LogIn, UserX, AlertCircle, AlertTriangle, User, Shield, Building2, Briefcase, Check } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { isContractorType } from '@/lib/license-utils';
import { RoleSelectorEnhanced } from '@/components/roles/RoleSelectorEnhanced';
import { TeamAssignmentDialog } from '@/components/hierarchy/TeamAssignmentDialog';

export function RolesTab({ state }: { state: unknown }) {
  const { t, isAdmin, selectedRoleIds, setSelectedRoleIds, user, setShowTeamAssignment, currentManagerId, roles } = state;
  return (
    <>
      {/* Tab 2: Roles & Permissions */}

                <TabsContent value="roles" className="space-y-4 mt-0">
                  {isAdmin ? (
                    <>
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <div className="text-start">
                            <Label className="font-medium text-base">{t('roles.roleAssignment')}</Label>
                            <p className="text-sm text-muted-foreground">{t('roles.roleAssignmentDescription')}</p>
                          </div>
                          <RoleSelectorEnhanced
                            selectedRoleIds={selectedRoleIds}
                            onChange={setSelectedRoleIds}
                            userId={user?.id}
                          />
                        </CardContent>
                      </Card>

                      {/* Team Assignment for existing users */}
                      {user && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-start">
                                <Label className="font-medium">{t('hierarchy.teamAssignment')}</Label>
                                <p className="text-sm text-muted-foreground">{t('hierarchy.teamAssignmentDescription')}</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTeamAssignment(true)}
                                className="gap-2"
                              >
                                <Users className="h-4 w-4" />
                                {currentManagerId ? t('hierarchy.changeManager') : t('hierarchy.assignToTeam')}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>{t('roles.adminOnlyAccess', 'Role management requires admin privileges')}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>


    </>
  );
}
