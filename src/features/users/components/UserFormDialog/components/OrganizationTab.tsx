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

export function OrganizationTab({ state }: { state: unknown }) {
  const { t, form, hasFullBranchAccess, selectedBranchIds, setSelectedBranchIds, hierarchy, direction, filteredDivisions, filteredDepartments, filteredSections, filteredSites } = state;
  return (
    <>
      {/* Tab 3: Organization */}

                <TabsContent value="organization" className="space-y-4 mt-0">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      {/* Full Branch Access Toggle */}
                      <FormField
                        control={form.control}
                        name="has_full_branch_access"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                              <FormLabel className="font-medium">{t('userManagement.fullBranchAccess')}</FormLabel>
                              <FormDescription className="text-xs">
                                {t('userManagement.fullBranchAccessDescription')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  if (checked) {
                                    setSelectedBranchIds([]);
                                    form.setValue('assigned_branch_id', null);
                                  }
                                }} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {/* Multi-Branch Selection */}
                      {!hasFullBranchAccess && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">{t('userManagement.selectBranches', 'Select Branches')}</Label>
                          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3 bg-background">
                            {hierarchy.branches.map((branch) => (
                              <div key={branch.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`branch-${branch.id}`}
                                  checked={selectedBranchIds.includes(branch.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedBranchIds([...selectedBranchIds, branch.id]);
                                    } else {
                                      setSelectedBranchIds(selectedBranchIds.filter(id => id !== branch.id));
                                    }
                                  }}
                                />
                                <label htmlFor={`branch-${branch.id}`} className="text-sm cursor-pointer">
                                  {branch.name}
                                </label>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedBranchIds.length === 0 
                              ? t('userManagement.noBranchesSelected', 'No branches selected - user will have no branch access')
                              : t('userManagement.branchesSelected', '{{count}} branch(es) selected', { count: selectedBranchIds.length })}
                          </p>
                        </div>
                      )}
                      
                      {/* Hierarchy Selects */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="assigned_division_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('orgStructure.division')}</FormLabel>
                              <Select 
                                onValueChange={(v) => {
                                  field.onChange(v === 'none' ? null : v);
                                  form.setValue('assigned_department_id', null);
                                  form.setValue('assigned_section_id', null);
                                }} 
                                value={field.value || 'none'}
                                dir={direction}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('common.select')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent dir={direction} className="bg-popover">
                                  <SelectItem value="none">{t('common.none')}</SelectItem>
                                  {filteredDivisions.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="assigned_department_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('orgStructure.department')}</FormLabel>
                              <Select 
                                onValueChange={(v) => {
                                  field.onChange(v === 'none' ? null : v);
                                  form.setValue('assigned_section_id', null);
                                }} 
                                value={field.value || 'none'}
                                dir={direction}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('common.select')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent dir={direction} className="bg-popover">
                                  <SelectItem value="none">{t('common.none')}</SelectItem>
                                  {filteredDepartments.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="assigned_section_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('orgStructure.section')}</FormLabel>
                              <Select 
                                onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                                value={field.value || 'none'}
                                dir={direction}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('common.select')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent dir={direction} className="bg-popover">
                                  <SelectItem value="none">{t('common.none')}</SelectItem>
                                  {filteredSections.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Site Assignment */}
                      <FormField
                        control={form.control}
                        name="assigned_site_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('userManagement.assignedSite', 'Assigned Site')}</FormLabel>
                            <Select 
                              onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                              value={field.value || 'none'}
                              dir={direction}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('common.select')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent dir={direction} className="bg-popover">
                                <SelectItem value="none">{t('common.none')}</SelectItem>
                                {filteredSites.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              {t('userManagement.assignedSiteDescription', 'Physical work location for this user')}
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>


    </>
  );
}
