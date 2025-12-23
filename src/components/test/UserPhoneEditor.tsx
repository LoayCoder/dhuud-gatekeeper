/**
 * User Phone Number Editor
 * Manage and validate phone numbers for notification testing
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Phone, 
  Save, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
}

// Validate E.164 format
function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

export function UserPhoneEditor() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === 'ar';
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Fetch users with phone numbers
  const { data: users, isLoading } = useQuery({
    queryKey: ['test-users-phones', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone_number')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      return (data || []) as UserProfile[];
    },
    enabled: !!profile?.tenant_id,
  });

  // Update phone number mutation
  const updatePhoneMutation = useMutation({
    mutationFn: async ({ userId, phoneNumber }: { userId: string; phoneNumber: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber || null })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-users-phones'] });
      setEditingUserId(null);
      setEditValue('');
      toast.success(isRTL ? 'تم تحديث رقم الهاتف' : 'Phone number updated');
    },
    onError: (error: any) => {
      toast.error(error.message || (isRTL ? 'فشل في التحديث' : 'Failed to update'));
    },
  });

  // Find duplicate phone numbers
  const duplicates = users?.reduce((acc, user) => {
    if (user.phone_number) {
      acc[user.phone_number] = (acc[user.phone_number] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const hasDuplicates = Object.values(duplicates).some(count => count > 1);

  const handleEdit = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditValue(user.phone_number || '');
  };

  const handleSave = (userId: string) => {
    updatePhoneMutation.mutate({ userId, phoneNumber: editValue.trim() });
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setEditValue('');
  };

  return (
    <div className="space-y-4">
      {/* Warning for duplicates */}
      {hasDuplicates && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isRTL 
              ? 'تحذير: يوجد أرقام هواتف مكررة! كل مستخدم يحتاج رقم فريد لاستلام الإشعارات بشكل صحيح.'
              : 'Warning: Duplicate phone numbers detected! Each user needs a unique number to receive notifications correctly.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Users Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isRTL ? 'أرقام هواتف المستخدمين' : 'User Phone Numbers'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'تأكد من أن كل مستخدم لديه رقم هاتف فريد بصيغة E.164'
              : 'Ensure each user has a unique phone number in E.164 format'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {users?.map((user) => {
                const isDuplicate = user.phone_number && duplicates[user.phone_number] > 1;
                const isValid = user.phone_number ? isValidE164(user.phone_number) : true;
                const isEditing = editingUserId === user.id;

                return (
                  <div 
                    key={user.id}
                    className={`
                      flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border
                      ${isDuplicate ? 'border-destructive bg-destructive/5' : ''}
                      ${!isValid && user.phone_number ? 'border-amber-500 bg-amber-500/5' : ''}
                    `}
                  >
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.full_name || user.email || user.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>

                    {/* Phone Number */}
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="+966500000000"
                            className="w-40"
                            dir="ltr"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSave(user.id)}
                            disabled={updatePhoneMutation.isPending}
                          >
                            {updatePhoneMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <code className="text-sm font-mono" dir="ltr">
                              {user.phone_number || '—'}
                            </code>
                          </div>

                          {/* Validation badges */}
                          {user.phone_number && (
                            <>
                              {isDuplicate && (
                                <Badge variant="destructive" className="text-xs">
                                  {isRTL ? 'مكرر' : 'Duplicate'}
                                </Badge>
                              )}
                              {!isValid && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                                  {isRTL ? 'صيغة خاطئة' : 'Invalid'}
                                </Badge>
                              )}
                              {isValid && !isDuplicate && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {users?.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                  {isRTL ? 'لا يوجد مستخدمون' : 'No users found'}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* E.164 Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isRTL ? 'دليل صيغة E.164' : 'E.164 Format Guide'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {isRTL 
                ? 'صيغة E.164 هي المعيار الدولي لأرقام الهواتف:'
                : 'E.164 is the international standard for phone numbers:'
              }
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{isRTL ? 'يبدأ بـ + ورمز الدولة' : 'Starts with + and country code'}</li>
              <li>{isRTL ? 'بدون مسافات أو شرطات' : 'No spaces or dashes'}</li>
              <li>{isRTL ? 'الحد الأقصى 15 رقم' : 'Maximum 15 digits'}</li>
            </ul>
            <div className="grid gap-2 sm:grid-cols-2 pt-2">
              <div className="p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'السعودية' : 'Saudi Arabia'}
                </p>
                <code className="text-sm font-mono">+966500000000</code>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'الإمارات' : 'UAE'}
                </p>
                <code className="text-sm font-mono">+971500000000</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
