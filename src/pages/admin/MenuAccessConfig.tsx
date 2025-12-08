import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, RotateCcw, ChevronRight, ChevronDown, Menu } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

export default function MenuAccessConfig() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
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

  // Build menu tree
  const menuTree = useMemo(() => {
    const getChildren = (parentCode: string | null): MenuItem[] => {
      return menuItems
        .filter(m => m.parent_code === parentCode)
        .sort((a, b) => a.sort_order - b.sort_order);
    };

    return getChildren(null);
  }, [menuItems]);

  const getMenuName = (item: MenuItem) => {
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
    if (!selectedRoleId || !profile?.tenant_id) return;

    setIsSaving(true);
    try {
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
      <div className="flex items-center gap-3">
        <Menu className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t('admin.menuAccess.title')}</h1>
          <p className="text-muted-foreground">{t('admin.menuAccess.description')}</p>
        </div>
      </div>

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
    </div>
  );
}
