import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, Tag, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useAITags, type AITag } from '@/hooks/use-ai-tags';
import { useContractorCompanies } from '@/hooks/contractor-management/use-contractor-companies';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatStatusLabel } from '@/lib/incident-status-colors';

export interface IncidentFilters {
  search: string;
  status: string;
  severity: string;
  eventType: string;
  branchId: string;
  contractorId?: string;
  dateRange: DateRange | undefined;
  tags: string[];
}

interface IncidentFilterPanelProps {
  filters: IncidentFilters;
  onFiltersChange: (filters: IncidentFilters) => void;
  branches?: Array<{ id: string; name: string }>;
  availableTags?: AITag[];
}

const STATUS_OPTIONS = [
  'submitted',
  'pending_review',
  'expert_screening',
  'investigation_in_progress',
  'pending_closure',
  'closed',
];

const SEVERITY_OPTIONS = [
  'level_1',
  'level_2',
  'level_3',
  'level_4',
  'level_5',
];

const EVENT_TYPE_OPTIONS = [
  'incident',
  'observation',
  'near_miss',
];

export function IncidentFilterPanel({
  filters,
  onFiltersChange,
  branches = [],
  availableTags = []
}: IncidentFilterPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [isExpanded, setIsExpanded] = useState(false);
  const [contractorOpen, setContractorOpen] = useState(false);

  // Fetch contractors for the dropdown
  const { data: contractors = [] } = useContractorCompanies({ status: 'active' });

  const activeFilterCount = [
    filters.status,
    filters.severity,
    filters.eventType,
    filters.branchId,
    filters.contractorId,
    filters.dateRange,
    filters.tags.length > 0
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      status: '',
      severity: '',
      eventType: '',
      branchId: '',
      contractorId: undefined,
      dateRange: undefined,
      tags: [],
    });
  };

  const updateFilter = (key: keyof IncidentFilters, value: string | DateRange | string[] | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleTagToggle = (tagName: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];
    updateFilter('tags', newTags);
  };

  const getTagLabel = (tag: AITag) => {
    return i18n.language === 'ar' && tag.name_ar ? tag.name_ar : tag.name;
  };

  const getContractorLabel = (id: string) => {
    return contractors.find(c => c.id === id)?.company_name || id;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium text-lg">{t('common.filters', 'Filters')}</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-6 px-2">
              {activeFilterCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(activeFilterCount > 0 || filters.search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({
                search: '',
                status: '',
                severity: '',
                eventType: '',
                branchId: '',
                contractorId: undefined,
                dateRange: undefined,
                tags: []
              })}
              className="h-8 px-2 lg:px-3 text-muted-foreground hover:text-foreground"
            >
              <X className="mr-2 h-4 w-4" />
              {t('common.reset', 'Reset')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <Card>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.search', 'Search')}</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('incidents.searchPlaceholder', 'ID, Title...')}
                    value={filters.search}
                    onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('incidents.fields.status', 'Status')}</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all', 'All Statuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all', 'All Statuses')}</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`incidents.status.${status}`, formatStatusLabel(status))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('incidents.fields.severity', 'Severity')}</label>
                <Select
                  value={filters.severity}
                  onValueChange={(value) => onFiltersChange({ ...filters, severity: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all', 'All Severities')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all', 'All Severities')}</SelectItem>
                    {SEVERITY_OPTIONS.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {t(`incidents.severity.${severity}`, severity.replace(/_/g, ' '))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('incidents.fields.eventType', 'Event Type')}</label>
                <Select
                  value={filters.eventType}
                  onValueChange={(value) => onFiltersChange({ ...filters, eventType: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all', 'All Types')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all', 'All Types')}</SelectItem>
                    {EVENT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`incidents.eventType.${type}`, type.replace(/_/g, ' '))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Branch */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('incidents.fields.branch', 'Branch')}</label>
                <Select
                  value={filters.branchId}
                  onValueChange={(value) => onFiltersChange({ ...filters, branchId: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all', 'All Branches')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all', 'All Branches')}</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contractor */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('incidents.fields.contractor', 'Contractor')}</label>
                <Popover open={contractorOpen} onOpenChange={setContractorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={contractorOpen}
                      className="w-full justify-between"
                    >
                      {filters.contractorId
                        ? contractors.find((c) => c.id === filters.contractorId)?.company_name
                        : t('common.selectContractor', 'Select Contractor...')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder={t('common.searchContractor', 'Search contractor...')} />
                      <CommandList>
                        <CommandEmpty>{t('common.noContractorFound', 'No contractor found.')}</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              onFiltersChange({ ...filters, contractorId: undefined });
                              setContractorOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !filters.contractorId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {t('common.all', 'All Contractors')}
                          </CommandItem>
                          {contractors.map((contractor) => (
                            <CommandItem
                              key={contractor.id}
                              value={contractor.company_name}
                              onSelect={() => {
                                onFiltersChange({
                                  ...filters,
                                  contractorId: filters.contractorId === contractor.id ? undefined : contractor.id,
                                });
                                setContractorOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filters.contractorId === contractor.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {contractor.company_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date Range */}
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">{t('common.dateRange', 'Date Range')}</label>
                <DatePickerWithRange
                  date={filters.dateRange}
                  onDateChange={(range) => onFiltersChange({ ...filters, dateRange: range })}
                  className="w-full"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2 lg:col-span-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {t('incidents.fields.tags', 'Tags')}
                </label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                  {availableTags.length > 0 ? availableTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={filters.tags.includes(tag.name) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const newTags = filters.tags.includes(tag.name)
                          ? filters.tags.filter(t => t !== tag.name)
                          : [...filters.tags, tag.name];
                        onFiltersChange({ ...filters, tags: newTags });
                      }}
                      style={filters.tags.includes(tag.name) ? { backgroundColor: tag.color } : { borderColor: tag.color, color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  )) : <span className="text-muted-foreground text-sm px-1">{t('common.noTags', 'No tags available')}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              {t(`incidents.status.${filters.status}`, filters.status)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('status', '')}
              />
            </Badge>
          )}
          {filters.severity && (
            <Badge variant="secondary" className="gap-1">
              {t(`severity.${filters.severity}.label`, filters.severity)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('severity', '')}
              />
            </Badge>
          )}
          {filters.eventType && (
            <Badge variant="secondary" className="gap-1">
              {t(`incidents.eventCategories.${filters.eventType}`, filters.eventType)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('eventType', '')}
              />
            </Badge>
          )}
          {filters.branchId && (
            <Badge variant="secondary" className="gap-1">
              {branches.find(b => b.id === filters.branchId)?.name || filters.branchId}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('branchId', '')}
              />
            </Badge>
          )}
          {filters.contractorId && (
            <Badge variant="secondary" className="gap-1">
              {getContractorLabel(filters.contractorId)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('contractorId', undefined)}
              />
            </Badge>
          )}
          {filters.dateRange && (
            <Badge variant="secondary" className="gap-1">
              {t('common.dateRange', 'Date Range')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('dateRange', undefined)}
              />
            </Badge>
          )}
          {filters.tags.length > 0 && filters.tags.map(tagName => {
            const tag = availableTags.find(t => t.name === tagName);
            return (
              <Badge
                key={tagName}
                variant="secondary"
                className="gap-1"
                style={{
                  backgroundColor: tag?.color ? `${tag.color}20` : undefined,
                  borderColor: tag?.color || undefined
                }}
              >
                {tag ? getTagLabel(tag) : tagName}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleTagToggle(tagName)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  )
}

