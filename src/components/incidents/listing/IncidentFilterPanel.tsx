import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useAITags, type AITag } from '@/hooks/use-ai-tags';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface IncidentFilters {
  search: string;
  status: string;
  severity: string;
  eventType: string;
  branchId: string;
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
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const activeFilterCount = [
    filters.status,
    filters.severity,
    filters.eventType,
    filters.branchId,
    filters.dateRange,
    filters.tags.length > 0,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      status: '',
      severity: '',
      eventType: '',
      branchId: '',
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

  const filteredTags = availableTags.filter(tag => {
    if (!tagSearchQuery) return true;
    const searchLower = tagSearchQuery.toLowerCase();
    return tag.name.toLowerCase().includes(searchLower) || 
           (tag.name_ar && tag.name_ar.includes(tagSearchQuery));
  });

  return (
    <div className="space-y-3">
      {/* Search and Quick Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search', 'Search by title or reference ID...')}
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="ps-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select 
            value={filters.status || 'all'} 
            onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('incidents.status.label', 'Status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'All Status')}</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`incidents.status.${status}`, status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filters.severity || 'all'} 
            onValueChange={(v) => updateFilter('severity', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('incidents.severity', 'Severity')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'All Severity')}</SelectItem>
              {SEVERITY_OPTIONS.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {t(`severity.${severity}.label`, severity)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {t('common.filters', 'Filters')}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Expanded Filters */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-3">
          <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg border">
            <Select 
              value={filters.eventType || 'all'} 
              onValueChange={(v) => updateFilter('eventType', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('incidents.eventType', 'Event Type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', 'All Types')}</SelectItem>
                {EVENT_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`incidents.eventCategories.${type}`, type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {branches.length > 0 && (
              <Select 
                value={filters.branchId || 'all'} 
                onValueChange={(v) => updateFilter('branchId', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('incidents.branch', 'Branch')} />
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
            )}

            <DatePickerWithRange
              date={filters.dateRange}
              onDateChange={(range) => updateFilter('dateRange', range)}
            />

            {/* Tag Filter */}
            {availableTags.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 min-w-[140px]">
                    <Tag className="h-4 w-4" />
                    {t('ai.tags.label', 'Tags')}
                    {filters.tags.length > 0 && (
                      <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {filters.tags.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start" dir={direction}>
                  <div className="space-y-2">
                    <Input
                      placeholder={t('common.searchTags', 'Search tags...')}
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      className="h-8"
                    />
                    <ScrollArea className="h-48">
                      <div className="space-y-1">
                        {filteredTags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleTagToggle(tag.name)}
                          >
                            <Checkbox
                              checked={filters.tags.includes(tag.name)}
                              onCheckedChange={() => handleTagToggle(tag.name)}
                            />
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: tag.color || '#6b7280' }}
                            />
                            <span className="text-sm truncate">{getTagLabel(tag)}</span>
                          </div>
                        ))}
                        {filteredTags.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {t('common.noTagsFound', 'No tags found')}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                    {filters.tags.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => updateFilter('tags', [])}
                      >
                        {t('common.clearTags', 'Clear selected tags')}
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {activeFilterCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                {t('common.clearAll', 'Clear All')}
              </Button>
            )}
          </div>
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
  );
}
