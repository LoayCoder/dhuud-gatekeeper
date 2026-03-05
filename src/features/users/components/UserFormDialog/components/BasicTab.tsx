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
const userTypeCards = [
  { value: 'employee', icon: '👤', color: 'bg-blue-500/10 border-blue-500/30' },
  { value: 'contractor_longterm', icon: '🔧', color: 'bg-amber-500/10 border-amber-500/30' },
  { value: 'contractor_shortterm', icon: '⚡', color: 'bg-orange-500/10 border-orange-500/30' },
  { value: 'member', icon: '🏅', color: 'bg-purple-500/10 border-purple-500/30' },
  { value: 'visitor', icon: '👋', color: 'bg-gray-500/10 border-gray-500/30' },
];


export function BasicTab({ state }: { state: any }) {
  const { t, form, userType, hasLogin, emailHasChanged, user, direction } = state;
  return (
    <>
      {/* Tab 1: Basic Info */}

                <TabsContent value="basic" className="space-y-4 mt-0">
                  {/* User Type Selection - Visual Cards */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('userManagement.userType')}</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {userTypeCards.map(({ value, icon, color }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => form.setValue('user_type', value as any)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center",
                            userType === value 
                              ? `${color} border-primary ring-2 ring-primary/20` 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="text-xl">{icon}</span>
                          <span className="text-[10px] font-medium truncate w-full">
                            {t(`userTypes.${value.replace('_', '')}`, t(`userTypes.${value}`))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Platform Access Card */}
                  <Card className={cn(
                    "transition-all",
                    hasLogin ? "border-primary/50 bg-primary/5" : "bg-muted/30"
                  )}>
                    <CardContent className="p-4">
                      <FormField
                        control={form.control}
                        name="has_login"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0">
                            <div className="space-y-1">
                              <FormLabel className="text-base font-semibold flex items-center gap-2">
                                {hasLogin ? (
                                  <LogIn className="h-4 w-4 text-primary" />
                                ) : (
                                  <UserX className="h-4 w-4 text-muted-foreground" />
                                )}
                                {t('userManagement.platformAccess', 'Platform Access')}
                              </FormLabel>
                              <FormDescription className="text-sm">
                                {hasLogin 
                                  ? t('userManagement.loginEnabled', 'This user can log in to the platform')
                                  : t('userManagement.loginDisabled', 'Profile only - no login access')}
                              </FormDescription>
                              <Badge variant={hasLogin ? "default" : "secondary"} className="text-xs">
                                {hasLogin 
                                  ? t('userManagement.licensedUser', '🔐 Licensed User')
                                  : t('userManagement.billableProfile', '📋 Profile Only')}
                              </Badge>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-125" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Name & Contact */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.fullName')} *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.phoneNumber')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email with change warning */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          {t('auth.email')} {hasLogin && '*'}
                          {emailHasChanged && (
                            <Badge variant="outline" className="text-amber-600 border-amber-500">
                              <AlertTriangle className="h-3 w-3 me-1" />
                              {t('userManagement.emailChangeWarning', 'Credentials will change')}
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input type="email" {...field} className={cn(emailHasChanged && "border-amber-500")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Delivery Channel for new users */}
                  {!user && hasLogin && (
                    <FormField
                      control={form.control}
                      name="delivery_channel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('invitations.deliveryChannel', 'Invitation Delivery')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'email'} dir={direction}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent dir={direction} className="bg-popover">
                              <SelectItem value="email">📧 {t('invitations.viaEmail', 'Email Only')}</SelectItem>
                              <SelectItem value="whatsapp">💬 {t('invitations.viaWhatsApp', 'WhatsApp Only')}</SelectItem>
                              <SelectItem value="both">📧💬 {t('invitations.viaBoth', 'Email & WhatsApp')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Active Status */}
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0 p-3 rounded-lg border">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">{t('userManagement.isActive')}</FormLabel>
                      </FormItem>
                    )}
                  />
                </TabsContent>


    </>
  );
}
