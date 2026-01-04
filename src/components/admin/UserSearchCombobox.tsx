import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
  employee_id: string | null;
  avatar_url: string | null;
}

interface UserSearchComboboxProps {
  value: string | null;
  onSelect: (userId: string | null, user: UserOption | null) => void;
  placeholder?: string;
  className?: string;
}

export function UserSearchCombobox({
  value,
  onSelect,
  placeholder,
  className
}: UserSearchComboboxProps) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const direction = i18n.dir();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch users for the tenant
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['tenant-users-for-combobox', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, employee_id, avatar_url')
        .eq('tenant_id', profile.tenant_id)
        .order('full_name');

      if (error) throw error;
      return data as UserOption[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!search) return users;

    const lowerSearch = search.toLowerCase();
    return users.filter(user =>
      (user.full_name?.toLowerCase().includes(lowerSearch)) ||
      (user.email?.toLowerCase().includes(lowerSearch)) ||
      (user.employee_id?.toLowerCase().includes(lowerSearch))
    );
  }, [users, search]);

  // Get selected user
  const selectedUser = useMemo(() => {
    if (!value) return null;
    return users.find(u => u.id === value) || null;
  }, [users, value]);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          dir={direction}
        >
          {selectedUser ? (
            <div className="flex items-center gap-2 text-start">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {selectedUser.full_name || selectedUser.email}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || t('admin.userMenuAccess.selectUser')}
            </span>
          )}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" dir={direction}>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={t('admin.userMenuAccess.searchUser')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : filteredUsers.length === 0 ? (
              <CommandEmpty>
                {t('common.noResults')}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => {
                      onSelect(user.id === value ? null : user.id, user.id === value ? null : user);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="flex items-center gap-3 py-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === user.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {user.full_name || t('common.unnamed')}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user.email}
                        {user.employee_id && ` • ${user.employee_id}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
