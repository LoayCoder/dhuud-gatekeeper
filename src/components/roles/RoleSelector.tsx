import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Role, RoleCategory, useUserRoles } from '@/hooks/use-user-roles';
import { RoleBadge, RoleCategoryBadge } from './RoleBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RoleSelectorProps {
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
  disabled?: boolean;
  userId?: string; // The user ID being edited (for self-protection)
}

const categoryOrder: RoleCategory[] = [
  'general',
  'hsse',
  'environmental',
  'ptw',
  'security',
  'audit',
  'food_safety',
  'contractor',
];

export function RoleSelector({ selectedRoleIds, onChange, disabled, userId }: RoleSelectorProps) {
  const { t, i18n } = useTranslation();
  const { roles, rolesByCategory, isLoading } = useUserRoles();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const direction = i18n.dir();

  // Check if editing self
  const isEditingSelf = userId && user?.id === userId;

  // Find protected roles
  const normalUserRole = roles.find(r => r.code === 'normal_user');
  const adminRole = roles.find(r => r.code === 'admin');

  const handleToggleRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    
    // Prevent removing normal_user
    if (role?.code === 'normal_user' && selectedRoleIds.includes(roleId)) {
      return;
    }

    // Prevent admin from removing their own admin role
    if (isEditingSelf && role?.code === 'admin' && selectedRoleIds.includes(roleId)) {
      toast({
        title: t('roles.cannotRemoveOwnAdmin', 'Cannot Remove Admin Role'),
        description: t('roles.cannotRemoveOwnAdminDescription', 'You cannot remove your own admin role. Please ask another admin to do this.'),
        variant: 'destructive'
      });
      return;
    }

    // Show warning when removing admin role from ANY user
    if (role?.code === 'admin' && selectedRoleIds.includes(roleId)) {
      toast({
        title: t('roles.removingAdminWarning', 'Removing Admin Role'),
        description: t('roles.removingAdminWarningDescription', 'Warning: This will remove admin access from this user.'),
        variant: 'destructive'
      });
    }

    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter(id => id !== roleId));
    } else {
      onChange([...selectedRoleIds, roleId]);
    }
  };

  const selectedRoles = roles.filter(r => selectedRoleIds.includes(r.id));

  return (
    <div className="space-y-2" dir={direction}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[40px] h-auto"
            disabled={disabled || isLoading}
          >
            <div className="flex flex-wrap gap-1 flex-1 justify-start">
              {selectedRoles.length === 0 ? (
                <span className="text-muted-foreground text-start">{t('roles.selectRoles')}</span>
              ) : (
                selectedRoles.slice(0, 3).map(role => (
                  <RoleBadge
                    key={role.id}
                    code={role.code}
                    name={role.name}
                    category={role.category}
                    size="sm"
                  />
                ))
              )}
              {selectedRoles.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{selectedRoles.length - 3}
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start" dir={direction}>
          <Command>
            <CommandInput placeholder={t('roles.searchRoles')} />
            <CommandList>
              <CommandEmpty>{t('roles.noRolesFound')}</CommandEmpty>
              <ScrollArea className="h-[300px]">
                {categoryOrder.map(category => {
                  const categoryRoles = rolesByCategory[category];
                  if (!categoryRoles || categoryRoles.length === 0) return null;

                  return (
                    <CommandGroup 
                      key={category} 
                      heading={
                        <div className="flex items-center gap-2">
                          <RoleCategoryBadge category={category} />
                        </div>
                      }
                    >
                      {categoryRoles.map(role => {
                        const isSelected = selectedRoleIds.includes(role.id);
                        const isNormalUser = role.code === 'normal_user';
                        const isAdminRole = role.code === 'admin';
                        // Role is protected if: normal_user OR (editing self AND admin role AND selected)
                        const isProtected = (isNormalUser && isSelected) || 
                          (isEditingSelf && isAdminRole && isSelected);

                        return (
                          <CommandItem
                            key={role.id}
                            value={role.code}
                            onSelect={() => handleToggleRole(role.id)}
                            className={cn(
                              "cursor-pointer",
                              isProtected && "opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className={cn(
                                "w-4 h-4 border rounded flex items-center justify-center",
                                isSelected ? "bg-primary border-primary" : "border-input",
                                isProtected && "cursor-not-allowed"
                              )}>
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <div className="flex flex-col text-start">
                                <span className="font-medium">
                                  {t(`roles.${role.code}`, { defaultValue: role.name })}
                                </span>
                                {role.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {t(`roleDescriptions.${role.code}`, { defaultValue: role.description })}
                                  </span>
                                )}
                              </div>
                              {isProtected && (
                                <div className="flex items-center gap-1 ms-auto" title={t('roles.selfProtected', 'Protected role')}>
                                  <Shield className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  );
                })}
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected roles display */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedRoles.map(role => (
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
