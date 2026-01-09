import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, User, HardHat } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

interface PersonOption {
  id: string;
  type: 'user' | 'contractor';
  name: string;
  nationalId?: string | null;
  department?: string | null;
  company?: string | null;
}

interface PersonLookupProps {
  value?: {
    id?: string | null;
    type?: 'user' | 'contractor' | null;
    name?: string;
  };
  onSelect: (person: PersonOption | null) => void;
  disabled?: boolean;
}

export function PersonLookup({ value, onSelect, disabled }: PersonLookupProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch platform users
  const { data: users = [] } = useQuery({
    queryKey: ['person-lookup-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      return (data || []).map((u): PersonOption => ({
        id: u.id,
        type: 'user',
        name: u.full_name || '',
        department: u.department,
      }));
    },
  });

  // Fetch contractor workers
  const { data: contractors = [] } = useQuery({
    queryKey: ['person-lookup-contractors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contractor_workers')
        .select('id, full_name, national_id, contractor_companies(name)')
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      return (data || []).map((c): PersonOption => ({
        id: c.id,
        type: 'contractor',
        name: c.full_name || '',
        nationalId: c.national_id,
        company: (c.contractor_companies as { name?: string } | null)?.name,
      }));
    },
  });

  // Combined and filtered options
  const filteredOptions = useMemo(() => {
    const allOptions = [...users, ...contractors];
    if (!search.trim()) return allOptions;

    const searchLower = search.toLowerCase();
    return allOptions.filter(
      (option) =>
        option.name.toLowerCase().includes(searchLower) ||
        option.nationalId?.toLowerCase().includes(searchLower) ||
        option.department?.toLowerCase().includes(searchLower) ||
        option.company?.toLowerCase().includes(searchLower)
    );
  }, [users, contractors, search]);

  const selectedPerson = useMemo(() => {
    if (!value?.id || !value?.type) return null;
    return [...users, ...contractors].find(
      (p) => p.id === value.id && p.type === value.type
    );
  }, [value, users, contractors]);

  const handleSelect = (person: PersonOption) => {
    onSelect(person);
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          type="button"
        >
          {selectedPerson ? (
            <div className="flex items-center gap-2 truncate">
              {selectedPerson.type === 'user' ? (
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <HardHat className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate">{selectedPerson.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {t('investigation.injuries.searchPerson', 'Search for existing user or contractor...')}
            </span>
          )}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50 rtl:rotate-180" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('common.search', 'Search...')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {t('common.noResults', 'No results found')}
            </CommandEmpty>

            {selectedPerson && (
              <CommandGroup>
                <CommandItem onSelect={handleClear} className="text-muted-foreground">
                  {t('common.clear', 'Clear selection')}
                </CommandItem>
              </CommandGroup>
            )}

            {filteredOptions.length > 0 && (
              <>
                {/* Platform Users */}
                {filteredOptions.filter(p => p.type === 'user').length > 0 && (
                  <CommandGroup heading={t('investigation.injuries.platformUsers', 'Platform Users')}>
                    {filteredOptions
                      .filter((p) => p.type === 'user')
                      .slice(0, 10)
                      .map((person) => (
                        <CommandItem
                          key={`user-${person.id}`}
                          value={`user-${person.id}`}
                          onSelect={() => handleSelect(person)}
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4",
                              selectedPerson?.id === person.id && selectedPerson?.type === 'user'
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate">{person.name}</span>
                            </div>
                            {(person.nationalId || person.department) && (
                              <span className="text-xs text-muted-foreground truncate">
                                {[person.nationalId, person.department].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}

                {/* Contractor Workers */}
                {filteredOptions.filter(p => p.type === 'contractor').length > 0 && (
                  <CommandGroup heading={t('investigation.injuries.contractorWorkers', 'Contractor Workers')}>
                    {filteredOptions
                      .filter((p) => p.type === 'contractor')
                      .slice(0, 10)
                      .map((person) => (
                        <CommandItem
                          key={`contractor-${person.id}`}
                          value={`contractor-${person.id}`}
                          onSelect={() => handleSelect(person)}
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4",
                              selectedPerson?.id === person.id && selectedPerson?.type === 'contractor'
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <HardHat className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate">{person.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {t('common.contractor', 'Contractor')}
                              </Badge>
                            </div>
                            {(person.nationalId || person.company) && (
                              <span className="text-xs text-muted-foreground truncate">
                                {[person.nationalId, person.company].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
