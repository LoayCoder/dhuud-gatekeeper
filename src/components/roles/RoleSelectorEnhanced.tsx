import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Shield, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Role, RoleCategory, useUserRoles } from '@/hooks/use-user-roles';
import { RoleBadge, RoleCategoryBadge } from './RoleBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface RoleSelectorEnhancedProps {
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
  disabled?: boolean;
  userId?: string;
}

const categoryOrder: RoleCategory[] = [
  'general',
  'hsse',
  'environmental',
  'ptw',
  'security',
  'audit',
  'food_safety',
];

const categoryIcons: Record<RoleCategory, string> = {
  general: '👤',
  hsse: '🛡️',
  environmental: '🌿',
  ptw: '📋',
  security: '🔐',
  audit: '📊',
  food_safety: '🍽️',
};

export function RoleSelectorEnhanced({ selectedRoleIds, onChange, disabled, userId }: RoleSelectorEnhancedProps) {
  const { t, i18n } = useTranslation();
  const { roles, rolesByCategory, isLoading } = useUserRoles();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<RoleCategory>('general');
  const direction = i18n.dir();

  const isEditingSelf = userId && user?.id === userId;
  const normalUserRole = roles.find(r => r.code === 'normal_user');

  // Filter roles by search query
  const filteredRolesByCategory = useMemo(() => {
    if (!searchQuery.trim()) return rolesByCategory;
    
    const query = searchQuery.toLowerCase();
    const result: Partial<Record<RoleCategory, Role[]>> = {};
    
    for (const category of categoryOrder) {
      const categoryRoles = rolesByCategory[category];
      if (!categoryRoles) continue;
      
      const filtered = categoryRoles.filter(role => 
        role.name.toLowerCase().includes(query) ||
        role.code.toLowerCase().includes(query) ||
        t(`roles.${role.code}`, { defaultValue: role.name }).toLowerCase().includes(query)
      );
      
      if (filtered.length > 0) {
        result[category] = filtered;
      }
    }
    
    return result as Record<RoleCategory, Role[]>;
  }, [rolesByCategory, searchQuery, t]);

  // Get categories that have roles (for tab display)
  const activeCategories = useMemo(() => {
    return categoryOrder.filter(cat => {
      const roles = filteredRolesByCategory[cat];
      return roles && roles.length > 0;
    });
  }, [filteredRolesByCategory]);

  // Auto-select first available category when search filters out current
  useMemo(() => {
    if (activeCategories.length > 0 && !activeCategories.includes(activeCategory)) {
      setActiveCategory(activeCategories[0]);
    }
  }, [activeCategories, activeCategory]);

  const handleToggleRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    
    if (role?.code === 'normal_user' && selectedRoleIds.includes(roleId)) {
      return;
    }

    if (isEditingSelf && role?.code === 'admin' && selectedRoleIds.includes(roleId)) {
      toast({
        title: t('roles.cannotRemoveOwnAdmin', 'Cannot Remove Admin Role'),
        description: t('roles.cannotRemoveOwnAdminDescription', 'You cannot remove your own admin role.'),
        variant: 'destructive'
      });
      return;
    }

    if (role?.code === 'admin' && selectedRoleIds.includes(roleId)) {
      toast({
        title: t('roles.removingAdminWarning', 'Removing Admin Role'),
        description: t('roles.removingAdminWarningDescription', 'Warning: This will remove admin access.'),
        variant: 'destructive'
      });
    }

    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter(id => id !== roleId));
    } else {
      onChange([...selectedRoleIds, roleId]);
    }
  };

  const handleRemoveRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.code === 'normal_user') return;
    if (isEditingSelf && role?.code === 'admin') return;
    onChange(selectedRoleIds.filter(id => id !== roleId));
  };

  const selectedRoles = roles.filter(r => selectedRoleIds.includes(r.id));
  const displayRoles = selectedRoles.filter(r => r.code !== 'normal_user');
  const currentCategoryRoles = filteredRolesByCategory[activeCategory] || [];

  // Count selected per category
  const selectedCountByCategory = useMemo(() => {
    const counts: Partial<Record<RoleCategory, number>> = {};
    for (const role of selectedRoles) {
      counts[role.category] = (counts[role.category] || 0) + 1;
    }
    return counts;
  }, [selectedRoles]);

  return (
    <div className="space-y-3" dir={direction}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[44px] h-auto"
            disabled={disabled || isLoading}
          >
            <div className="flex items-center gap-2 flex-1 justify-start">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className={displayRoles.length === 0 ? 'text-muted-foreground' : ''}>
                {displayRoles.length === 0 
                  ? t('roles.selectRoles')
                  : t('roles.rolesSelected', { count: displayRoles.length })}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[520px] p-0" 
          align="start" 
          dir={direction}
          sideOffset={4}
        >
          {/* Search Header */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('roles.searchRoles')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 pe-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Two-panel Layout */}
          <div className="flex min-h-[320px]">
            {/* Category Tabs - Left Panel */}
            <div className="w-[140px] border-e bg-muted/30">
              <ScrollArea className="h-[320px]">
                <div className="p-2 space-y-1">
                  {activeCategories.map(category => {
                    const count = selectedCountByCategory[category] || 0;
                    const isActive = category === activeCategory;
                    
                    return (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors text-start",
                          isActive 
                            ? "bg-primary text-primary-foreground font-medium" 
                            : "hover:bg-muted"
                        )}
                      >
                        <span>{categoryIcons[category]}</span>
                        <span className="flex-1 truncate">
                          {t(`roleCategories.${category}`, { defaultValue: category })}
                        </span>
                        {count > 0 && (
                          <Badge 
                            variant={isActive ? "secondary" : "default"} 
                            className="h-5 min-w-[20px] px-1.5 text-xs"
                          >
                            {count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Role Cards - Right Panel */}
            <div className="flex-1">
              <ScrollArea className="h-[320px]">
                <div className="p-3 space-y-2">
                  {currentCategoryRoles.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                      {t('roles.noRolesFound')}
                    </div>
                  ) : (
                    currentCategoryRoles.map(role => {
                      const isSelected = selectedRoleIds.includes(role.id);
                      const isNormalUser = role.code === 'normal_user';
                      const isAdminRole = role.code === 'admin';
                      const isProtected = (isNormalUser && isSelected) || 
                        (isEditingSelf && isAdminRole && isSelected);

                      return (
                        <button
                          key={role.id}
                          onClick={() => handleToggleRole(role.id)}
                          disabled={isProtected}
                          className={cn(
                            "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-start",
                            isSelected 
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                              : "border-border hover:border-primary/50 hover:bg-muted/50",
                            isProtected && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          {/* Checkbox */}
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5",
                            isSelected 
                              ? "bg-primary border-primary" 
                              : "border-muted-foreground/30"
                          )}>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {t(`roles.${role.code}`, { defaultValue: role.name })}
                              </span>
                              {isProtected && (
                                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                            {role.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {t(`roleDescriptions.${role.code}`, { defaultValue: role.description })}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          {/* Selected Summary Footer */}
          {displayRoles.length > 0 && (
            <div className="border-t p-3 bg-muted/30">
              <div className="flex flex-wrap gap-1.5">
                {displayRoles.map(role => (
                  <Badge
                    key={role.id}
                    variant="secondary"
                    className="gap-1 pe-1"
                  >
                    <span className="text-xs">
                      {t(`roles.${role.code}`, { defaultValue: role.name })}
                    </span>
                    {!(role.code === 'normal_user' || (isEditingSelf && role.code === 'admin')) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRole(role.id);
                        }}
                        className="rounded-full hover:bg-destructive/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected roles display below */}
      {displayRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displayRoles.map(role => (
            <RoleBadge
              key={role.id}
              code={role.code}
              name={role.name}
              category={role.category}
            />
          ))}
        </div>
      )}
    </div>
  );
}
