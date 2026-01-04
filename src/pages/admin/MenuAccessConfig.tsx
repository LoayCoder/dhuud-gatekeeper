import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, RotateCcw, ChevronRight, ChevronDown, Menu, History, Plus, Minus, UserCheck, ArrowRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';

interface Role {
  id: string;
  code: string;
  name: string;
  category: string;
}

interface MenuItem {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  parent_code: string | null;
  url: string | null;
  sort_order: number;
}

interface RoleMenuAccess {
  role_id: string;
  menu_item_id: string;
}

interface AuditLogEntry {
  id: string;
  role_id: string;
  actor_id: string | null;
  action: string;
  menu_item_id: string;
  created_at: string;
  role?: { name: string };
  menu_item?: { name: string; name_ar: string | null };
  actor?: { full_name: string | null };
}

export default function MenuAccessConfig() {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const isRtl = direction === 'rtl';

  const [roles, setRoles] = useState<Role[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [accessMap, setAccessMap] = useState<Set<string>>(new Set());
  const [originalAccessMap, setOriginalAccessMap] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('configuration');
  
  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>('all');

  // Fetch roles and menu items
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [rolesRes, menuRes] = await Promise.all([
          supabase.from('roles').select('id, code, name, category').eq('is_active', true).order('sort_order'),
          supabase.from('menu_items').select('*').order('sort_order')
        ]);

        if (rolesRes.data) setRoles(rolesRes.data);
        if (menuRes.data) setMenuItems(menuRes.data);

        // Auto-select first role
        if (rolesRes.data && rolesRes.data.length > 0) {
          setSelectedRoleId(rolesRes.data[0].id);
        }

        // Auto-expand top-level groups
        if (menuRes.data) {
          const topGroups = menuRes.data
            .filter(m => !m.parent_code && !m.url)
            .map(m => m.code);
          setExpandedGroups(new Set(topGroups));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t]);

  // Fetch access when role changes
  useEffect(() => {
    const fetchAccess = async () => {
      if (!selectedRoleId || !profile?.tenant_id) return;

      try {
        const { data, error } = await supabase
          .from('role_menu_access')
          .select('menu_item_id')
          .eq('tenant_id', profile.tenant_id)
          .eq('role_id', selectedRoleId);

        if (error) throw error;

        const accessSet = new Set((data || []).map(d => d.menu_item_id));
        setAccessMap(accessSet);
        setOriginalAccessMap(new Set(accessSet));
      } catch (err) {
        console.error('Error fetching access:', err);
      }
    };

    fetchAccess();
  }, [selectedRoleId, profile?.tenant_id]);

  // Fetch audit logs when tab changes
  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (activeTab !== 'audit' || !profile?.tenant_id) return;
      
      setAuditLoading(true);
      try {
        let query = supabase
          .from('menu_access_audit_logs')
          .select(`
            id,
            role_id,
            actor_id,
            action,
            menu_item_id,
            created_at
          `)
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (auditRoleFilter !== 'all') {
          query = query.eq('role_id', auditRoleFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Enrich with role and menu item names
        const enrichedLogs = (data || []).map(log => {
          const role = roles.find(r => r.id === log.role_id);
          const menuItem = menuItems.find(m => m.id === log.menu_item_id);
          return {
            ...log,
            role: role ? { name: role.name } : undefined,
            menu_item: menuItem ? { name: menuItem.name, name_ar: menuItem.name_ar } : undefined
          };
        });

        setAuditLogs(enrichedLogs);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setAuditLoading(false);
      }
    };

    fetchAuditLogs();
  }, [activeTab, profile?.tenant_id, auditRoleFilter, roles, menuItems]);

  // Build menu tree
  const menuTree = useMemo(() => {
    const getChildren = (parentCode: string | null): MenuItem[] => {
      return menuItems
        .filter(m => m.parent_code === parentCode)
        .sort((a, b) => a.sort_order - b.sort_order);
    };

    return getChildren(null);
  }, [menuItems]);

  const getMenuName = (item: MenuItem | { name: string; name_ar: string | null }) => {
    return isRtl && item.name_ar ? item.name_ar : item.name;
  };

  const toggleAccess = (menuItemId: string) => {
    setAccessMap(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuItemId)) {
        newSet.delete(menuItemId);
      } else {
        newSet.add(menuItemId);
      }
      return newSet;
    });
  };

  const toggleGroup = (groupCode: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupCode)) {
        newSet.delete(groupCode);
      } else {
        newSet.add(groupCode);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setAccessMap(new Set(menuItems.map(m => m.id)));
  };

  const clearAll = () => {
    setAccessMap(new Set());
  };

  const resetToOriginal = () => {
    setAccessMap(new Set(originalAccessMap));
  };

  const hasChanges = useMemo(() => {
    if (accessMap.size !== originalAccessMap.size) return true;
    for (const id of accessMap) {
      if (!originalAccessMap.has(id)) return true;
    }
    return false;
  }, [accessMap, originalAccessMap]);

  const handleSave = async () => {
    if (!selectedRoleId || !profile?.tenant_id || !user?.id) return;

    setIsSaving(true);
    try {
      // Calculate changes for audit logging
      const granted: string[] = [];
      const revoked: string[] = [];
      
      for (const id of accessMap) {
        if (!originalAccessMap.has(id)) {
          granted.push(id);
        }
      }
      for (const id of originalAccessMap) {
        if (!accessMap.has(id)) {
          revoked.push(id);
        }
      }

      // Delete existing access for this role
      await supabase
        .from('role_menu_access')
        .delete()
        .eq('tenant_id', profile.tenant_id)
        .eq('role_id', selectedRoleId);

      // Insert new access
      if (accessMap.size > 0) {
        const inserts = Array.from(accessMap).map(menuItemId => ({
          tenant_id: profile.tenant_id,
          role_id: selectedRoleId,
          menu_item_id: menuItemId
        }));

        const { error } = await supabase.from('role_menu_access').insert(inserts);
        if (error) throw error;
      }

      // Log audit entries for changes
      const auditEntries = [
        ...granted.map(menuItemId => ({
          tenant_id: profile.tenant_id,
          role_id: selectedRoleId,
          actor_id: user.id,
          action: 'grant',
          menu_item_id: menuItemId
        })),
        ...revoked.map(menuItemId => ({
          tenant_id: profile.tenant_id,
          role_id: selectedRoleId,
          actor_id: user.id,
          action: 'revoke',
          menu_item_id: menuItemId
        }))
      ];

      if (auditEntries.length > 0) {
        await supabase.from('menu_access_audit_logs').insert(auditEntries);
      }

      setOriginalAccessMap(new Set(accessMap));
      toast.success(t('admin.menuAccess.saved'));
    } catch (err) {
      console.error('Error saving:', err);
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    const children = menuItems.filter(m => m.parent_code === item.code);
    const hasChildren = children.length > 0;
    const isExpanded = expandedGroups.has(item.code);
    const isChecked = accessMap.has(item.id);

    const paddingClass = depth === 0 ? '' : depth === 1 ? 'ps-6' : 'ps-12';

    if (hasChildren) {
      return (
        <Collapsible 
          key={item.id} 
          open={isExpanded} 
          onOpenChange={() => toggleGroup(item.code)}
        >
          <div className={`flex items-center gap-2 py-2 ${paddingClass}`}>
            <Checkbox
              id={item.id}
              checked={isChecked}
              onCheckedChange={() => toggleAccess(item.id)}
            />
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rtl:rotate-180" />}
              </Button>
            </CollapsibleTrigger>
            <label htmlFor={item.id} className="font-medium cursor-pointer">
              {getMenuName(item)}
            </label>
          </div>
          <CollapsibleContent>
            {children.map(child => renderMenuItem(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <div key={item.id} className={`flex items-center gap-2 py-2 ${paddingClass}`}>
        <Checkbox
          id={item.id}
          checked={isChecked}
          onCheckedChange={() => toggleAccess(item.id)}
        />
        <label htmlFor={item.id} className="cursor-pointer">
          {getMenuName(item)}
        </label>
        {item.url && (
          <span className="text-xs text-muted-foreground">{item.url}</span>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6" dir={direction}>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Menu className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t('admin.menuAccess.title')}</h1>
            <p className="text-muted-foreground">{t('admin.menuAccess.description')}</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={() => navigate('/admin/user-menu-access')}
          className="gap-2"
        >
          <UserCheck className="h-4 w-4" />
          {t('admin.menuAccess.goToUserAccess')}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
        <TabsList>
          <TabsTrigger value="configuration">
            <Menu className="h-4 w-4 me-2" />
            {t('admin.menuAccess.configuration')}
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 me-2" />
            {t('admin.menuAccess.auditLog')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.menuAccess.configureRole')}</CardTitle>
              <CardDescription>{t('admin.menuAccess.selectRoleDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Selector */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger className="w-full sm:w-64" dir={direction}>
                    <SelectValue placeholder={t('admin.menuAccess.selectRole')} />
                  </SelectTrigger>
                  <SelectContent dir={direction}>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} ({role.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {t('common.selectAll')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    {t('common.clearAll')}
                  </Button>
                </div>
              </div>

              {/* Menu Tree */}
              <div className="border rounded-lg p-4 max-h-[500px] overflow-y-auto">
                {menuTree.map(item => renderMenuItem(item, 0))}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={resetToOriginal}
                  disabled={!hasChanges}
                >
                  <RotateCcw className="h-4 w-4 me-2" />
                  {t('common.reset')}
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                >
                  <Save className="h-4 w-4 me-2" />
                  {isSaving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.menuAccess.auditLog')}</CardTitle>
              <CardDescription>{t('admin.menuAccess.auditLogDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Role Filter */}
              <Select value={auditRoleFilter} onValueChange={setAuditRoleFilter}>
                <SelectTrigger className="w-full sm:w-64" dir={direction}>
                  <SelectValue placeholder={t('admin.menuAccess.filterByRole')} />
                </SelectTrigger>
                <SelectContent dir={direction}>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Audit Log Table */}
              {auditLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.menuAccess.noAuditLogs')}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.menuAccess.dateTime')}</TableHead>
                        <TableHead>{t('admin.menuAccess.role')}</TableHead>
                        <TableHead>{t('admin.menuAccess.action')}</TableHead>
                        <TableHead>{t('admin.menuAccess.menuItem')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                          </TableCell>
                          <TableCell>
                            {log.role?.name || log.role_id}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={log.action === 'grant' ? 'default' : 'destructive'}
                              className="gap-1"
                            >
                              {log.action === 'grant' ? (
                                <Plus className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {log.action === 'grant' 
                                ? t('admin.menuAccess.granted') 
                                : t('admin.menuAccess.revoked')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.menu_item 
                              ? getMenuName(log.menu_item)
                              : log.menu_item_id}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}