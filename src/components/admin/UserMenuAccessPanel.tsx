import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, ChevronDown, Save, RotateCcw, UserCheck, Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useUserMenuAccess, 
  MenuItem, 
  UserMenuAccessItem 
} from '@/hooks/use-user-menu-access';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserMenuAccessPanelProps {
  userId: string;
  userName: string | null;
}

export function UserMenuAccessPanel({ userId, userName }: UserMenuAccessPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isRtl = direction === 'rtl';

  const {
    menuItems,
    menuLoading,
    fetchUserMenuAccess,
    saveUserAccess,
    resetToRole,
    isGranting,
    isRevoking,
    isResetting,
  } = useUserMenuAccess();

  const [selectedUserMenuIds, setSelectedUserMenuIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  // Fetch user's current access
  const { 
    data: userAccess = [], 
    isLoading: accessLoading,
    refetch: refetchAccess
  } = useQuery({
    queryKey: ['user-menu-access', userId],
    queryFn: () => fetchUserMenuAccess(userId),
    enabled: !!userId,
  });

  // Initialize selected state from user's current access
  useEffect(() => {
    const userSpecificIds = new Set(
      userAccess
        .filter(a => a.access_type === 'user')
        .map(a => a.menu_item_id)
    );
    setSelectedUserMenuIds(userSpecificIds);

    // Auto-expand top-level groups
    const topGroups = menuItems
      .filter(m => !m.parent_code && !m.url)
      .map(m => m.code);
    setExpandedGroups(new Set(topGroups));
  }, [userAccess, menuItems]);

  // Get role-based menu IDs
  const roleBasedMenuIds = useMemo(() => {
    return new Set(
      userAccess
        .filter(a => a.access_type === 'role')
        .map(a => a.menu_item_id)
    );
  }, [userAccess]);

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
    // Don't allow toggling role-based access
    if (roleBasedMenuIds.has(menuItemId)) return;

    setSelectedUserMenuIds(prev => {
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

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    const currentUserIds = new Set(
      userAccess.filter(a => a.access_type === 'user').map(a => a.menu_item_id)
    );

    if (selectedUserMenuIds.size !== currentUserIds.size) return true;
    for (const id of selectedUserMenuIds) {
      if (!currentUserIds.has(id)) return true;
    }
    return false;
  }, [selectedUserMenuIds, userAccess]);

  const handleSave = async () => {
    await saveUserAccess(userId, selectedUserMenuIds, userAccess, notes || undefined);
    setNotes('');
    refetchAccess();
  };

  const handleReset = async () => {
    await resetToRole({ userId });
    refetchAccess();
  };

  const resetToOriginal = () => {
    const userSpecificIds = new Set(
      userAccess.filter(a => a.access_type === 'user').map(a => a.menu_item_id)
    );
    setSelectedUserMenuIds(userSpecificIds);
    setNotes('');
  };

  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    const children = menuItems.filter(m => m.parent_code === item.code);
    const hasChildren = children.length > 0;
    const isExpanded = expandedGroups.has(item.code);
    const isRoleBased = roleBasedMenuIds.has(item.id);
    const isUserOverride = selectedUserMenuIds.has(item.id);
    const isChecked = isRoleBased || isUserOverride;

    const paddingClass = depth === 0 ? '' : depth === 1 ? 'ps-6' : 'ps-12';

    if (hasChildren) {
      return (
        <Collapsible
          key={item.id}
          open={isExpanded}
          onOpenChange={() => toggleGroup(item.code)}
        >
          <div className={cn("flex items-center gap-2 py-2", paddingClass)}>
            <Checkbox
              id={item.id}
              checked={isChecked}
              disabled={isRoleBased}
              onCheckedChange={() => toggleAccess(item.id)}
            />
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                )}
              </Button>
            </CollapsibleTrigger>
            <label
              htmlFor={item.id}
              className={cn(
                "font-medium cursor-pointer",
                isRoleBased && "text-muted-foreground"
              )}
            >
              {getMenuName(item)}
            </label>
            {isRoleBased && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Shield className="h-3 w-3" />
                {t('admin.userMenuAccess.fromRole')}
              </Badge>
            )}
            {isUserOverride && (
              <Badge variant="default" className="text-xs gap-1 bg-green-600">
                <UserCheck className="h-3 w-3" />
                {t('admin.userMenuAccess.userOverride')}
              </Badge>
            )}
          </div>
          <CollapsibleContent>
            {children.map(child => renderMenuItem(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <div key={item.id} className={cn("flex items-center gap-2 py-2", paddingClass)}>
        <Checkbox
          id={item.id}
          checked={isChecked}
          disabled={isRoleBased}
          onCheckedChange={() => toggleAccess(item.id)}
        />
        <label
          htmlFor={item.id}
          className={cn(
            "cursor-pointer",
            isRoleBased && "text-muted-foreground"
          )}
        >
          {getMenuName(item)}
        </label>
        {item.url && (
          <span className="text-xs text-muted-foreground">{item.url}</span>
        )}
        {isRoleBased && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Shield className="h-3 w-3" />
            {t('admin.userMenuAccess.fromRole')}
          </Badge>
        )}
        {isUserOverride && (
          <Badge variant="default" className="text-xs gap-1 bg-green-600">
            <UserCheck className="h-3 w-3" />
            {t('admin.userMenuAccess.userOverride')}
          </Badge>
        )}
      </div>
    );
  };

  if (menuLoading || accessLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const userOverrideCount = selectedUserMenuIds.size;
  const roleAccessCount = roleBasedMenuIds.size;

  return (
    <div className="space-y-4" dir={direction}>
      {/* Summary */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm">
            {t('admin.userMenuAccess.roleAccessCount', { count: roleAccessCount })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-green-600" />
          <span className="text-sm">
            {t('admin.userMenuAccess.userOverrideCount', { count: userOverrideCount })}
          </span>
        </div>
      </div>

      {/* Menu Tree */}
      <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
        {menuTree.map(item => renderMenuItem(item, 0))}
      </div>

      {/* Notes */}
      {hasChanges && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('admin.userMenuAccess.accessNote')}
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('admin.userMenuAccess.accessNotePlaceholder')}
            rows={2}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetToOriginal}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 me-2" />
            {t('common.reset')}
          </Button>

          {userOverrideCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isResetting}>
                  <AlertCircle className="h-4 w-4 me-2" />
                  {t('admin.userMenuAccess.resetToRoleOnly')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir={direction}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('admin.userMenuAccess.resetConfirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('admin.userMenuAccess.resetConfirmDescription', { 
                      name: userName || t('common.thisUser'),
                      count: userOverrideCount
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    {t('common.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isGranting || isRevoking}
        >
          <Save className="h-4 w-4 me-2" />
          {isGranting || isRevoking ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  );
}
