import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserCheck, Users, History, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useUserMenuAccess, UserWithMenuOverrides } from '@/hooks/use-user-menu-access';
import { UserSearchCombobox } from '@/components/admin/UserSearchCombobox';
import { UserMenuAccessPanel } from '@/components/admin/UserMenuAccessPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AuditLogEntry {
  id: string;
  target_user_id: string;
  actor_id: string | null;
  action: string;
  menu_item_ids: string[] | null;
  notes: string | null;
  created_at: string;
}

export default function UserMenuAccessConfig() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const isRtl = direction === 'rtl';

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('configure');

  const { usersWithOverrides, overridesLoading, menuItems } = useUserMenuAccess();

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ['user-menu-access-audit-logs', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('user_menu_access_audit_logs')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: activeTab === 'audit' && !!profile?.tenant_id,
  });

  // Fetch user names for audit logs
  const { data: userProfiles = {} } = useQuery({
    queryKey: ['user-profiles-for-audit', auditLogs.map(l => l.target_user_id)],
    queryFn: async () => {
      const userIds = [...new Set([
        ...auditLogs.map(l => l.target_user_id),
        ...auditLogs.map(l => l.actor_id).filter(Boolean)
      ])];

      if (userIds.length === 0) return {};

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (error) throw error;

      return (data || []).reduce((acc, p) => {
        acc[p.id] = p.full_name;
        return acc;
      }, {} as Record<string, string | null>);
    },
    enabled: auditLogs.length > 0,
  });

  const handleUserSelect = (userId: string | null, user: { full_name: string | null } | null) => {
    setSelectedUserId(userId);
    setSelectedUserName(user?.full_name || null);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'grant':
        return <Badge variant="default" className="bg-green-600">{t('admin.userMenuAccess.granted')}</Badge>;
      case 'revoke':
        return <Badge variant="destructive">{t('admin.userMenuAccess.revoked')}</Badge>;
      case 'reset':
        return <Badge variant="secondary">{t('admin.userMenuAccess.reset')}</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getMenuNames = (menuItemIds: string[] | null) => {
    if (!menuItemIds || menuItemIds.length === 0) return '-';
    
    const names = menuItemIds
      .map(id => {
        const item = menuItems.find(m => m.id === id);
        if (!item) return null;
        return isRtl && item.name_ar ? item.name_ar : item.name;
      })
      .filter(Boolean);

    if (names.length <= 3) {
      return names.join(', ');
    }
    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
  };

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t('admin.userMenuAccess.title')}</h1>
            <p className="text-muted-foreground">{t('admin.userMenuAccess.description')}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/menu-access')}>
          <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
          {t('admin.menuAccess.roleBasedAccess')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
        <TabsList>
          <TabsTrigger value="configure">
            <UserCheck className="h-4 w-4 me-2" />
            {t('admin.userMenuAccess.configure')}
          </TabsTrigger>
          <TabsTrigger value="overrides">
            <Users className="h-4 w-4 me-2" />
            {t('admin.userMenuAccess.usersWithOverrides')}
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 me-2" />
            {t('admin.userMenuAccess.auditLog')}
          </TabsTrigger>
        </TabsList>

        {/* Configure Tab */}
        <TabsContent value="configure">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.userMenuAccess.configureUserAccess')}</CardTitle>
              <CardDescription>{t('admin.userMenuAccess.configureUserDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Selector */}
              <div className="max-w-md">
                <label className="text-sm font-medium mb-2 block">
                  {t('admin.userMenuAccess.selectUser')}
                </label>
                <UserSearchCombobox
                  value={selectedUserId}
                  onSelect={handleUserSelect}
                />
              </div>

              {/* User Access Panel */}
              {selectedUserId ? (
                <UserMenuAccessPanel
                  userId={selectedUserId}
                  userName={selectedUserName}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mb-4 opacity-50" />
                  <p>{t('admin.userMenuAccess.selectUserPrompt')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users with Overrides Tab */}
        <TabsContent value="overrides">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.userMenuAccess.usersWithOverrides')}</CardTitle>
              <CardDescription>{t('admin.userMenuAccess.usersWithOverridesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {overridesLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : usersWithOverrides.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.userMenuAccess.noUsersWithOverrides')}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.user')}</TableHead>
                        <TableHead>{t('common.email')}</TableHead>
                        <TableHead>{t('admin.userMenuAccess.employeeId')}</TableHead>
                        <TableHead className="text-center">{t('admin.userMenuAccess.overrideCount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersWithOverrides.map((user) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setSelectedUserName(user.full_name);
                            setActiveTab('configure');
                          }}
                        >
                          <TableCell className="font-medium">
                            {user.full_name || t('common.unnamed')}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.employee_id || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className="bg-green-600">
                              {user.override_count}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.userMenuAccess.auditLog')}</CardTitle>
              <CardDescription>{t('admin.userMenuAccess.auditLogDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.userMenuAccess.noAuditLogs')}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.menuAccess.dateTime')}</TableHead>
                        <TableHead>{t('common.user')}</TableHead>
                        <TableHead>{t('admin.menuAccess.action')}</TableHead>
                        <TableHead>{t('admin.userMenuAccess.menuItems')}</TableHead>
                        <TableHead>{t('admin.userMenuAccess.changedBy')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                          </TableCell>
                          <TableCell>
                            {userProfiles[log.target_user_id] || log.target_user_id}
                          </TableCell>
                          <TableCell>
                            {getActionBadge(log.action)}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={log.menu_item_ids?.join(', ')}>
                            {getMenuNames(log.menu_item_ids)}
                          </TableCell>
                          <TableCell>
                            {log.actor_id ? (userProfiles[log.actor_id] || log.actor_id) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
